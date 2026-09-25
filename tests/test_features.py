import numpy as np
import pytest
import soundfile as sf

from src.song_dna.features import extract_features, AudioFeatures

SAMPLE_RATE = 22050
DURATION_SECONDS = 2.0


@pytest.fixture(scope="module")
def synthetic_audio_file(tmp_path_factory):
    """
    A short, deterministic sine-wave WAV file generated fresh at test
    time, rather than a real song read from disk.

    These tests previously depended on a real MP3 living at
    data/audio/JoshWoodward-NQC-11-RiverWentDry.mp3 - but data/ is
    gitignored ("large files, not for version control"), so that file
    was never committed. That worked locally only because a developer
    happened to have it sitting in their own local, gitignored data/
    directory; on a fresh checkout (e.g. CI) it doesn't exist at all,
    which is exactly the FileNotFoundError this fixture avoids.
    """
    t = np.linspace(0, DURATION_SECONDS, int(SAMPLE_RATE * DURATION_SECONDS), endpoint=False)
    waveform = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440 Hz tone

    path = tmp_path_factory.mktemp("audio") / "synthetic.wav"
    sf.write(path, waveform, SAMPLE_RATE)
    return str(path)


def test_extract_features_returns_correct_type(synthetic_audio_file):
    result = extract_features(synthetic_audio_file)
    assert isinstance(result, AudioFeatures)


def test_duration_is_positive_and_reasonable(synthetic_audio_file):
    result = extract_features(synthetic_audio_file)
    assert result.duration_seconds > 0
    assert result.duration_seconds < 3600  # sanity cap: under an hour


def test_feature_arrays_are_same_length(synthetic_audio_file):
    result = extract_features(synthetic_audio_file)
    assert len(result.rms_energy) == len(result.spectral_centroid) == len(result.times)


def test_rms_energy_is_never_negative(synthetic_audio_file):
    result = extract_features(synthetic_audio_file)
    assert (result.rms_energy >= 0).all()


CLICK_TRACK_BPM = 120
CLICK_TRACK_DURATION_SECONDS = 8.0
CLICK_TRACK_SAMPLE_RATE = 22050


def _build_click_track():
    """
    Build a synthetic "click track": a fixed-tempo signal made of short,
    sharp clicks spaced at an exactly known interval, so beat detection
    can be checked against a known-correct answer instead of just
    "did it find something."

    The plain sine tone used above has no rhythmic structure at all -
    there's nothing for a beat tracker to lock onto. A click track is
    the standard way to give one an unambiguous pulse: each click is a
    short, fast-decaying 1kHz burst (50ms, exponential decay) that
    produces a sharp onset of energy, repeated every `beat_interval`
    seconds - the same kind of transient a real drum hit produces.

    Returns (waveform, expected_beat_times), so tests can compare
    detected beats against the exact times the clicks were placed at.
    """
    beat_interval = 60.0 / CLICK_TRACK_BPM
    num_samples = int(CLICK_TRACK_SAMPLE_RATE * CLICK_TRACK_DURATION_SECONDS)
    waveform = np.zeros(num_samples, dtype=np.float64)

    click_duration = 0.05
    click_sample_count = int(CLICK_TRACK_SAMPLE_RATE * click_duration)
    t_click = np.arange(click_sample_count) / CLICK_TRACK_SAMPLE_RATE
    click = np.sin(2 * np.pi * 1000 * t_click) * np.exp(-t_click / 0.01)

    expected_beat_times = np.arange(0, CLICK_TRACK_DURATION_SECONDS, beat_interval)
    for beat_time in expected_beat_times:
        start = int(beat_time * CLICK_TRACK_SAMPLE_RATE)
        end = min(start + click_sample_count, num_samples)
        waveform[start:end] += click[: end - start]

    return waveform, expected_beat_times


@pytest.fixture(scope="module")
def click_track_features(tmp_path_factory):
    waveform, expected_beat_times = _build_click_track()

    path = tmp_path_factory.mktemp("audio") / "click_track.wav"
    sf.write(path, waveform, CLICK_TRACK_SAMPLE_RATE)

    result = extract_features(str(path))
    return result, expected_beat_times


def test_beat_times_are_sorted_and_non_negative(click_track_features):
    result, _ = click_track_features
    assert len(result.beat_times) > 0
    assert (result.beat_times >= 0).all()
    assert (np.diff(result.beat_times) > 0).all()


def test_beat_count_is_close_to_the_known_click_count(click_track_features):
    result, expected_beat_times = click_track_features
    # Beat trackers commonly miss a beat or two while they "warm up" and
    # settle on a tempo estimate, so allow a small shortfall - but never
    # more beats than were actually placed in the signal.
    assert len(expected_beat_times) - 3 <= len(result.beat_times) <= len(expected_beat_times)


def test_beat_spacing_matches_the_known_bpm(click_track_features):
    result, _ = click_track_features
    expected_interval = 60.0 / CLICK_TRACK_BPM
    detected_intervals = np.diff(result.beat_times)

    # 80ms tolerance: librosa quantizes beat positions to analysis frames
    # (hop_length=512 samples =~ 23ms at this sample rate), so some
    # frame-level jitter between consecutive detected beats is expected.
    assert np.median(detected_intervals) == pytest.approx(expected_interval, abs=0.08)


def test_beat_times_land_close_to_the_known_click_positions(click_track_features):
    result, expected_beat_times = click_track_features

    for beat_time in result.beat_times:
        nearest_gap = np.min(np.abs(beat_time - expected_beat_times))
        assert nearest_gap < 0.1  # within ~4 analysis frames of a real click


def test_tempo_matches_the_known_bpm(click_track_features):
    result, _ = click_track_features
    # librosa quantizes tempo estimates (measured: 90/100/120/140 BPM click
    # tracks come back within ~2-3.5 BPM), so allow 5% rather than exact.
    assert isinstance(result.tempo_bpm, float)
    assert result.tempo_bpm == pytest.approx(CLICK_TRACK_BPM, rel=0.05)
