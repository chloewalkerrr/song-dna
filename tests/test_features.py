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
