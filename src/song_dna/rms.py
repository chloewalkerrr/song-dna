import numpy as np


def compute_rms_energy(
    waveform: np.ndarray,
    frame_length: int = 2048,
    hop_length: int = 512,
    center: bool = True,
) -> np.ndarray:
    """
    Compute RMS (root-mean-square) energy per frame, using only numpy.

    RMS energy measures how loud a signal is at each moment in time.
    For each frame of `frame_length` samples:
        1. Square every sample (removes sign, emphasises large values).
        2. Take the Mean of those squares.
        3. Take the Square Root of that mean.
    The result ("root-mean-square") can never be negative, since it is
    a square root of a sum of squares.

    Frames are `frame_length` samples wide and `hop_length` samples
    apart, so with the defaults (2048, 512) consecutive frames overlap
    by 75%. This matches the framing convention used by
    librosa.feature.rms, so this function's output stays frame-aligned
    with other features computed via librosa (e.g. spectral centroid)
    for the same audio, and can be swapped in as a drop-in replacement.

    If `center` is True (default), the waveform is zero-padded by
    `frame_length // 2` samples on each side before framing, so frame i
    is centred on sample `i * hop_length` of the ORIGINAL waveform -
    this mirrors librosa's default behaviour. If False, no padding is
    applied and frame 0 starts at sample 0 of the waveform as given -
    simpler to reason about, useful for tests with synthetic arrays.

    Returns
    -------
    np.ndarray of shape (num_frames,), one non-negative RMS value per frame.
    """
    if center:
        pad_width = frame_length // 2
        waveform = np.pad(waveform, pad_width, mode="constant")

    num_frames = 1 + (len(waveform) - frame_length) // hop_length
    rms = np.empty(num_frames, dtype=np.float64)

    for i in range(num_frames):
        start = i * hop_length
        frame = waveform[start : start + frame_length]
        rms[i] = np.sqrt(np.mean(frame.astype(np.float64) ** 2))

    return rms
