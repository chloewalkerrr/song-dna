from src.song_dna.features import extract_features, AudioFeatures

TEST_FILE = "data/audio/JoshWoodward-NQC-11-RiverWentDry.mp3"


def test_extract_features_returns_correct_type():
    result = extract_features(TEST_FILE)
    assert isinstance(result, AudioFeatures)


def test_duration_is_positive_and_reasonable():
    result = extract_features(TEST_FILE)
    assert result.duration_seconds > 0
    assert result.duration_seconds < 3600  # sanity cap: under an hour


def test_feature_arrays_are_same_length():
    result = extract_features(TEST_FILE)
    assert len(result.rms_energy) == len(result.spectral_centroid) == len(result.times)


def test_rms_energy_is_never_negative():
    result = extract_features(TEST_FILE)
    assert (result.rms_energy >= 0).all()