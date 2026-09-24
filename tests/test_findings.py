import numpy as np
import pytest

from src.song_dna.features import AudioFeatures
from src.song_dna.findings import generate_findings


def make_features(rms_energy, spectral_centroid) -> AudioFeatures:
    return AudioFeatures(
        file_path="",
        sample_rate=0,
        duration_seconds=0.0,
        times=np.array([]),
        rms_energy=np.array(rms_energy, dtype=np.float64),
        spectral_centroid=np.array(spectral_centroid, dtype=np.float64),
    )


def findings_by_category(findings):
    return {finding["category"]: finding["text"] for finding in findings}


def test_generate_findings_returns_all_four_categories_in_order():
    song_a = make_features(rms_energy=[0.5] * 10, spectral_centroid=[2000] * 10)
    song_b = make_features(rms_energy=[0.5] * 10, spectral_centroid=[2000] * 10)

    findings = generate_findings(song_a, song_b)

    assert [f["category"] for f in findings] == [
        "average_energy",
        "dynamic_range",
        "energy_trend",
        "brightness",
    ]
    assert all(isinstance(f["text"], str) and f["text"] for f in findings)


def test_average_energy_notably_louder_when_difference_is_large():
    loud = make_features(rms_energy=[0.8] * 20, spectral_centroid=[2000] * 20)
    quiet = make_features(rms_energy=[0.2] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(loud, quiet))

    assert "notably louder" in findings["average_energy"]
    assert "Song A" in findings["average_energy"]


def test_average_energy_similar_when_difference_is_small():
    song_a = make_features(rms_energy=[0.50] * 20, spectral_centroid=[2000] * 20)
    song_b = make_features(rms_energy=[0.52] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(song_a, song_b))

    assert findings["average_energy"] == "Song A and Song B have similar average energy."


def test_dynamic_range_flags_the_more_varied_song():
    varied = make_features(
        rms_energy=[0.1, 0.9] * 10,
        spectral_centroid=[2000] * 20,
    )
    flat = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(varied, flat))

    assert "Song A has more dynamic range" in findings["dynamic_range"]
    assert "Song B stays more consistently energetic" in findings["dynamic_range"]


def test_dynamic_range_similar_when_both_flat():
    song_a = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)
    song_b = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(song_a, song_b))

    assert findings["dynamic_range"] == "Song A and Song B have similar dynamic range."


def test_energy_trend_builds_vs_flat():
    builds = make_features(
        rms_energy=[0.1] * 10 + [0.9] * 10,
        spectral_centroid=[2000] * 20,
    )
    flat = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(builds, flat))
    text = findings["energy_trend"]

    assert "Song A builds gradually toward a more energetic second half" in text
    assert "Song B stays relatively flat throughout" in text


def test_energy_trend_fades():
    fades = make_features(
        rms_energy=[0.9] * 10 + [0.1] * 10,
        spectral_centroid=[2000] * 20,
    )
    flat = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(fades, flat))

    assert "Song A starts stronger and eases off through the second half" in findings["energy_trend"]


def test_energy_trend_both_flat_uses_shared_sentence():
    song_a = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)
    song_b = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(generate_findings(song_a, song_b))

    assert findings["energy_trend"] == "Song A and Song B both stay relatively flat throughout."


def test_brightness_notably_brighter_when_difference_is_large():
    bright = make_features(rms_energy=[0.5] * 20, spectral_centroid=[4000] * 20)
    dull = make_features(rms_energy=[0.5] * 20, spectral_centroid=[1000] * 20)

    findings = findings_by_category(generate_findings(bright, dull))

    assert "Song A is spectrally brighter on average than Song B" in findings["brightness"]
    assert "high-frequency content" in findings["brightness"]


def test_brightness_similar_when_difference_is_small():
    song_a = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2000] * 20)
    song_b = make_features(rms_energy=[0.5] * 20, spectral_centroid=[2050] * 20)

    findings = findings_by_category(generate_findings(song_a, song_b))

    assert findings["brightness"] == "Song A and Song B have similar average brightness."


def test_custom_labels_are_used_in_generated_text():
    song_a = make_features(rms_energy=[0.8] * 20, spectral_centroid=[2000] * 20)
    song_b = make_features(rms_energy=[0.2] * 20, spectral_centroid=[2000] * 20)

    findings = findings_by_category(
        generate_findings(song_a, song_b, label_a="Track 1", label_b="Track 2")
    )

    assert "Track 1" in findings["average_energy"]
    assert "Track 2" in findings["average_energy"]
