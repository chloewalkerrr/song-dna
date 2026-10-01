"""
Exact parity with the research reference for Song Fingerprint E1B1/1.

tests/fixtures/song_fingerprint/e1_research_reference.json comes from the
research handoff (see its "provenance"); nothing in it came from this package.
It holds, for the five dev tracks, the research E1 renders (drawn with the
research study's Dref - used here only to reproduce those renders, never for
the production library) and the reference measurement: frame counts and a
hash of the E1 density, computed by running the handoff's own reference code.

Bit-identical densities and paths are only expected in the environment the
research ran in (Windows, same Python/numpy/scipy/librosa): MP3 decoding and
floating point can differ elsewhere. Outside it the exact comparison is
skipped; determinism and structure are covered by test_song_fingerprint_render.py.
"""

import hashlib
import json
import platform
from pathlib import Path

import librosa
import numpy as np
import pytest
import scipy

from song_dna.song_fingerprint import measure_file, render_fingerprint

REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURE = REPO_ROOT / "tests" / "fixtures" / "song_fingerprint" / "e1_research_reference.json"
LIBRARY_DIR = REPO_ROOT / "frontend" / "public" / "library"

REFERENCE = json.loads(FIXTURE.read_text(encoding="utf-8"))
TRACKS = REFERENCE["tracks"]


def environment_mismatches() -> list[str]:
    research = REFERENCE["research_environment"]
    current = {
        "platform": platform.system(),
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "librosa": librosa.__version__,
    }
    expected = {
        "platform": research["platform"].split("-")[0],
        "python": research["python"],
        "numpy": research["numpy"],
        "scipy": research["scipy"],
        "librosa": research["librosa"],
    }
    return [f"{k} {current[k]} != {expected[k]}" for k in expected if current[k] != expected[k]]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def density_sha256(density: np.ndarray) -> str:
    """
    The fixture's density hash (provenance.reference_measurement.density_sha256):
    raw bytes of a C-contiguous little-endian float64 array. Callers check the
    dtype first, so this never hides a dtype difference by converting.
    """
    return sha256(np.ascontiguousarray(density, dtype="<f8").tobytes())


def test_reference_fixture_covers_the_five_dev_tracks():
    assert [t["id"] for t in TRACKS] == [
        "dev-pulse",
        "dev-slow-build",
        "dev-fade-out",
        "dev-sections",
        "dev-sweep",
    ]
    assert REFERENCE["research_dref_E1"] == 0.005909040273794664
    for track in TRACKS:
        assert set(track["reference_measurement"]) == {
            "total_frames",
            "voiced_frames",
            "density_shape",
            "density_dtype",
            "density_sha256",
        }


@pytest.mark.parametrize("track", TRACKS, ids=[t["id"] for t in TRACKS])
def test_library_audio_is_the_audio_the_research_used(track):
    audio = LIBRARY_DIR / track["audio"]
    assert sha256(audio.read_bytes()) == track["audio_sha256"], (
        f"{audio} differs from the research input; parity needs the original dev tracks"
    )


@pytest.mark.skipif(
    bool(environment_mismatches()),
    reason="exact parity needs the research environment: " + "; ".join(environment_mismatches()),
)
@pytest.mark.parametrize("track", TRACKS, ids=[t["id"] for t in TRACKS])
def test_measurement_and_render_match_the_research_reference_exactly(track):
    measurement = measure_file(str(LIBRARY_DIR / track["audio"]))

    # Measurement: frame counts and the density itself, bit for bit.
    expected = track["reference_measurement"]
    assert measurement.total_frames == expected["total_frames"]
    assert measurement.voiced_frames == expected["voiced_frames"]
    assert list(measurement.density.shape) == expected["density_shape"]
    assert str(measurement.density.dtype) == expected["density_dtype"]
    assert density_sha256(measurement.density) == expected["density_sha256"]

    # Render: both tracings, from the research Dref.
    rendered = render_fingerprint(measurement.density, REFERENCE["research_dref_E1"])
    assert rendered.thumb == track["thumb"]
    assert len(rendered.hero) == track["hero_length"]
    assert sha256(rendered.hero.encode("utf-8")) == track["hero_sha256"]
