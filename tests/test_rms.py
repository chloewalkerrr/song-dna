import numpy as np

from src.song_dna.rms import compute_rms_energy


def test_silence_gives_zero_rms():
    waveform = np.zeros(10_000)
    result = compute_rms_energy(waveform, frame_length=2048, hop_length=512)
    assert (result == 0).all()


def test_constant_amplitude_gives_constant_rms():
    amplitude = 0.5
    waveform = np.full(10_000, amplitude)

    # center=False avoids zero-padding, so every frame sits fully inside
    # the constant-amplitude signal and should equal it exactly.
    result = compute_rms_energy(
        waveform, frame_length=2048, hop_length=512, center=False
    )

    assert np.allclose(result, amplitude)


def test_constant_amplitude_negative_values_give_positive_rms():
    # RMS squares samples before averaging, so sign should not matter.
    waveform = np.full(10_000, -0.5)
    result = compute_rms_energy(
        waveform, frame_length=2048, hop_length=512, center=False
    )
    assert np.allclose(result, 0.5)


def test_rms_is_never_negative():
    rng = np.random.default_rng(seed=0)
    waveform = rng.uniform(-1.0, 1.0, size=10_000)
    result = compute_rms_energy(waveform)
    assert (result >= 0).all()


def test_output_shape_without_centering():
    frame_length = 2048
    hop_length = 512
    waveform = np.zeros(10_000)

    result = compute_rms_energy(
        waveform, frame_length=frame_length, hop_length=hop_length, center=False
    )

    expected_num_frames = 1 + (len(waveform) - frame_length) // hop_length
    assert result.shape == (expected_num_frames,)


def test_output_shape_with_centering_matches_librosa_convention():
    frame_length = 2048
    hop_length = 512
    waveform = np.zeros(10_000)

    result = compute_rms_energy(
        waveform, frame_length=frame_length, hop_length=hop_length, center=True
    )

    # librosa's centered framing produces 1 + len(waveform) // hop_length frames
    expected_num_frames = 1 + len(waveform) // hop_length
    assert result.shape == (expected_num_frames,)
