import json
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from song_dna.features import AudioFeatures
from song_dna.library import (
    PREVIEW_SEGMENTS,
    bucket_average,
    build_library,
    build_track_features,
    load_metadata,
    make_preview,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_LIBRARY = REPO_ROOT / "frontend" / "public" / "library"


def make_features(rms, centroid, beats=(), duration=10.0, tempo=120.0) -> AudioFeatures:
    return AudioFeatures(
        file_path="",
        sample_rate=22050,
        duration_seconds=duration,
        times=np.array([]),
        rms_energy=np.array(rms, dtype=np.float64),
        spectral_centroid=np.array(centroid, dtype=np.float64),
        beat_times=np.array(beats, dtype=np.float64),
        tempo_bpm=tempo,
    )


# --- bucket_average: same cases as frontend/src/bucketing.test.js -------------


def test_bucket_average_averages_evenly_divisible_groups():
    assert bucket_average(np.array([0, 0, 10, 10, 20, 20]), 3).tolist() == [0, 10, 20]


def test_bucket_average_always_returns_segment_count_values():
    assert len(bucket_average(np.arange(100), 7)) == 7


def test_bucket_average_partitions_every_frame_exactly_once():
    # all ones: any gap or overlap in the bucket boundaries would show up
    # as a non-1 average only if a bucket were empty/NaN
    assert (bucket_average(np.ones(97), 10) == 1).all()


def test_bucket_average_silence_stays_zero():
    assert bucket_average(np.zeros(50), 5).tolist() == [0, 0, 0, 0, 0]


def test_bucket_average_fewer_frames_than_segments_repeats_frames_without_nan():
    result = bucket_average(np.array([1.0, 2.0, 3.0]), 10)
    assert len(result) == 10
    assert not np.isnan(result).any()
    assert set(result.tolist()) == {1.0, 2.0, 3.0}


def test_bucket_average_empty_input_returns_empty():
    assert bucket_average(np.array([]), 10).size == 0


# --- make_preview --------------------------------------------------------------


def test_preview_has_fixed_length_and_energy_peaks_at_one():
    rms = np.linspace(0.01, 0.4, 2000)
    preview = make_preview(make_features(rms, np.full(2000, 1500.0)))

    assert len(preview["energy"]) == PREVIEW_SEGMENTS
    assert len(preview["brightness"]) == PREVIEW_SEGMENTS
    assert max(preview["energy"]) == 1.0


def test_preview_brightness_stays_within_zero_and_one_even_with_outliers():
    centroid = np.full(2000, 1000.0)
    centroid[100] = 90000.0  # a single wild outlier frame
    preview = make_preview(make_features(np.full(2000, 0.1), centroid))

    assert all(0.0 <= value <= 1.0 for value in preview["brightness"])


def test_preview_of_silence_is_all_zero_not_nan():
    preview = make_preview(make_features(np.zeros(500), np.zeros(500)))

    assert preview["energy"] == [0.0] * PREVIEW_SEGMENTS
    assert preview["brightness"] == [0.0] * PREVIEW_SEGMENTS


# --- build_track_features -------------------------------------------------------


def test_track_features_have_the_fields_the_frontend_fingerprint_reads():
    features = make_features([0.123456789, 0.2], [1234.5678, 2000.0], beats=[0.5, 1.0])
    data = build_track_features(features, "some-id")

    for key in ("rms_energy", "spectral_centroid", "beat_times", "duration_seconds"):
        assert key in data
    assert data["id"] == "some-id"
    assert data["tempo_bpm"] == 120.0
    assert "times" not in data  # derivable and unused, so left out to keep files small


def test_track_features_are_rounded_and_json_serializable():
    features = make_features([0.123456789], [1234.56789], beats=[0.123456])
    data = build_track_features(features, "x")

    assert data["rms_energy"] == [0.12346]
    assert data["spectral_centroid"] == [1234.6]
    assert data["beat_times"] == [0.123]
    json.dumps(data)  # numpy floats would raise here


# --- load_metadata ---------------------------------------------------------------


def write_metadata(tmp_path, tracks):
    path = tmp_path / "metadata.json"
    path.write_text(json.dumps(tracks), encoding="utf-8")
    return path


GOOD_TRACK = {"id": "a-track", "title": "A Track", "genre": "Ambient", "file": "a.wav"}


def test_load_metadata_accepts_valid_tracks(tmp_path):
    tracks = load_metadata(write_metadata(tmp_path, [GOOD_TRACK]))
    assert tracks[0]["id"] == "a-track"


@pytest.mark.parametrize("missing", ["id", "title", "genre", "file"])
def test_load_metadata_rejects_a_missing_required_field(tmp_path, missing):
    track = {k: v for k, v in GOOD_TRACK.items() if k != missing}
    with pytest.raises(ValueError, match=missing):
        load_metadata(write_metadata(tmp_path, [track]))


@pytest.mark.parametrize("bad_id", ["Has Space", "UPPER", "../escape", "-leading-hyphen", "dot.ted"])
def test_load_metadata_rejects_unsafe_ids(tmp_path, bad_id):
    with pytest.raises(ValueError, match="id"):
        load_metadata(write_metadata(tmp_path, [{**GOOD_TRACK, "id": bad_id}]))


def test_load_metadata_rejects_duplicate_ids(tmp_path):
    with pytest.raises(ValueError, match="duplicate"):
        load_metadata(write_metadata(tmp_path, [GOOD_TRACK, GOOD_TRACK]))


@pytest.mark.parametrize("bad_content", [[], {"id": "not-a-list"}])
def test_load_metadata_rejects_empty_or_non_list_files(tmp_path, bad_content):
    with pytest.raises(ValueError):
        load_metadata(write_metadata(tmp_path, bad_content))


# --- build_library (end to end, on tiny synthetic audio) -------------------------


def write_click_wav(path, bpm, seconds=6.0, sample_rate=22050):
    n = int(sample_rate * seconds)
    waveform = np.zeros(n)
    t = np.arange(int(sample_rate * 0.05)) / sample_rate
    click = np.sin(2 * np.pi * 1000 * t) * np.exp(-t / 0.01)
    for beat_time in np.arange(0, seconds, 60 / bpm):
        start = int(beat_time * sample_rate)
        end = min(start + len(click), n)
        waveform[start:end] += click[: end - start]
    sf.write(path, waveform, sample_rate)


@pytest.fixture
def small_library(tmp_path):
    (tmp_path / "audio").mkdir()
    write_click_wav(tmp_path / "audio" / "one.wav", bpm=120)
    write_click_wav(tmp_path / "audio" / "two.wav", bpm=90)
    write_metadata(
        tmp_path,
        [
            {"id": "one", "title": "One", "genre": "Electronic", "file": "one.wav",
             "description": "the first"},
            {"id": "two", "title": "Two", "genre": "Ambient", "file": "two.wav"},
        ],
    )
    return tmp_path


def test_build_library_writes_manifest_and_feature_files(small_library):
    tracks = build_library(small_library)

    manifest = json.loads((small_library / "library.json").read_text(encoding="utf-8"))
    assert manifest["version"] == 1
    assert [t["id"] for t in manifest["tracks"]] == ["one", "two"]
    assert [t["id"] for t in tracks] == ["one", "two"]

    for entry in manifest["tracks"]:
        assert (small_library / entry["audio"]).is_file()
        features = json.loads((small_library / entry["features"]).read_text(encoding="utf-8"))
        assert features["id"] == entry["id"]
        assert features["duration_seconds"] == entry["duration_seconds"] == pytest.approx(6.0, abs=0.05)
        assert len(features["rms_energy"]) == len(features["spectral_centroid"]) > 0
        assert len(entry["preview"]["energy"]) == PREVIEW_SEGMENTS
        assert len(features["beat_times"]) > 0


def test_build_library_keeps_description_only_when_provided(small_library):
    by_id = {t["id"]: t for t in build_library(small_library)}

    assert by_id["one"]["description"] == "the first"
    assert "description" not in by_id["two"]


def test_build_library_detects_different_tempos_for_different_tracks(small_library):
    by_id = {t["id"]: t for t in build_library(small_library)}

    assert by_id["one"]["tempo_bpm"] == pytest.approx(120, rel=0.05)
    assert by_id["two"]["tempo_bpm"] == pytest.approx(90, rel=0.05)


def test_build_library_removes_stale_feature_files(small_library):
    features_dir = small_library / "features"
    features_dir.mkdir()
    (features_dir / "removed-track.json").write_text("{}", encoding="utf-8")

    build_library(small_library)

    assert not (features_dir / "removed-track.json").exists()
    assert (features_dir / "one.json").exists()


def test_build_library_fails_fast_on_missing_audio_without_writing_anything(small_library):
    (small_library / "audio" / "two.wav").unlink()

    with pytest.raises(FileNotFoundError, match="two"):
        build_library(small_library)

    assert not (small_library / "library.json").exists()
    assert not (small_library / "features").exists()


# --- the library actually committed in the repo ---------------------------------


def test_committed_library_is_internally_consistent():
    """
    Guards the generated files checked into frontend/public/library: catches
    a track added to metadata.json (or audio swapped) without rerunning
    scripts/build_library.py.
    """
    manifest = json.loads((COMMITTED_LIBRARY / "library.json").read_text(encoding="utf-8"))
    metadata = json.loads((COMMITTED_LIBRARY / "metadata.json").read_text(encoding="utf-8"))

    manifest_ids = [t["id"] for t in manifest["tracks"]]
    assert manifest_ids == [t["id"] for t in metadata], "library.json is stale - rerun scripts/build_library.py"
    assert len(manifest_ids) >= 1

    for entry in manifest["tracks"]:
        assert (COMMITTED_LIBRARY / entry["audio"]).is_file(), f"missing audio for {entry['id']}"

        features = json.loads((COMMITTED_LIBRARY / entry["features"]).read_text(encoding="utf-8"))
        assert features["id"] == entry["id"]
        assert features["duration_seconds"] == entry["duration_seconds"] > 0
        assert len(features["rms_energy"]) == len(features["spectral_centroid"]) > 0
        assert len(entry["preview"]["energy"]) == len(entry["preview"]["brightness"]) == PREVIEW_SEGMENTS

        beats = features["beat_times"]
        assert beats == sorted(beats)
        assert all(0 <= b <= entry["duration_seconds"] for b in beats)

    orphans = {p.stem for p in (COMMITTED_LIBRARY / "features").glob("*.json")} - set(manifest_ids)
    assert not orphans, f"orphaned feature files: {orphans}"
