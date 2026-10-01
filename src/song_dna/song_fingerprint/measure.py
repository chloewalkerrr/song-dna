"""
E1 measurement: where a track spends its time in (tonality, brightness) space.

Each STFT frame becomes one point:
    x = chroma entropy, 0 (energy in one pitch class) to 1 (spread evenly
        over all 12)
    y = log2 spectral centroid, normalised over 50-11025 Hz

Voiced frames (>= -60 dBFS) are counted into a 256 x 256 histogram (padded
to 556 x 556), divided by the track's *total* frame count and blurred. The
result is the fraction of the track's time spent near each (x, y) state, so
silent stretches lower the whole density rather than being ignored.

This is independent of SongDNA's DNA features (features.py, rms.py): it reads
the audio again, uses its own STFT-based RMS for the gate, and never changes
the DNA RMS/centroid arrays.
"""

import math
from dataclasses import dataclass

import librosa
import numpy as np
from scipy.ndimage import gaussian_filter

from song_dna.song_fingerprint.constants import (
    CENTROID_FLOOR_HZ,
    CENTROID_MAX_HZ,
    CENTROID_MIN_HZ,
    CHROMA_BINS,
    CHROMA_P_FLOOR,
    CHROMA_SUM_FLOOR,
    DENSITY_SIGMA,
    GRID,
    GRID_SIZE,
    HOP_LENGTH,
    N_FFT,
    PAD,
    RMS_FLOOR,
    SAMPLE_RATE,
    SILENCE_DB,
    T_VISITED,
)

# Why a track has no fingerprint. Stored in the library so the UI can say so
# instead of drawing something that isn't measured.
NO_VOICED_FRAMES = "no_voiced_frames"
NO_FRAMES_IN_DOMAIN = "no_frames_in_domain"
BELOW_VISITED_THRESHOLD = "below_visited_threshold"


@dataclass
class FrameFeatures:
    """Per-frame measurements, all the same length (one value per STFT frame)."""

    loudness_db: np.ndarray
    log2_centroid: np.ndarray
    chroma_entropy: np.ndarray


@dataclass
class E1Measurement:
    """
    The canonical fingerprint measurement. `density` is the blurred 556 x 556
    histogram (row 0 = brightest, column 0 = most tonal); the counts explain
    how much of the track it represents.
    """

    density: np.ndarray
    total_frames: int
    voiced_frames: int
    in_domain_frames: int

    @property
    def out_of_domain_frames(self) -> int:
        return self.voiced_frames - self.in_domain_frames


def chroma_entropy(chroma: np.ndarray) -> np.ndarray:
    """
    Normalised Shannon entropy of each chroma column (shape 12 x frames):
    0 when all energy is in one pitch class, 1 when spread evenly over all 12.
    The floors keep all-zero columns finite (they come out as 0).
    """
    p = chroma / np.maximum(chroma.sum(axis=0, keepdims=True), CHROMA_SUM_FLOOR)
    return -(p * np.log2(np.maximum(p, CHROMA_P_FLOOR))).sum(axis=0) / math.log2(CHROMA_BINS)


def normalized_brightness(log2_centroid: np.ndarray) -> np.ndarray:
    """Map log2 Hz onto the fixed domain: 50 Hz -> 0, 11025 Hz -> 1 (not clipped)."""
    low, high = math.log2(CENTROID_MIN_HZ), math.log2(CENTROID_MAX_HZ)
    return (log2_centroid - low) / (high - low)


def frame_features(waveform: np.ndarray) -> FrameFeatures:
    """
    Loudness (dBFS), log2 centroid and chroma entropy for every frame of a
    mono waveform at SAMPLE_RATE.

    librosa computes these in the waveform's float32; the results are then
    widened to float64, which is exactly what the research reference did (its
    frame matrix was float64), so normalisation and binning round identically.
    """
    magnitude = np.abs(librosa.stft(waveform, n_fft=N_FFT, hop_length=HOP_LENGTH, center=True))

    rms = librosa.feature.rms(S=magnitude, frame_length=N_FFT)[0]
    loudness_db = 20 * np.log10(np.maximum(rms, RMS_FLOOR))

    centroid = librosa.feature.spectral_centroid(S=magnitude, sr=SAMPLE_RATE)[0]
    log2_centroid = np.log2(np.maximum(centroid, CENTROID_FLOOR_HZ))

    chroma = librosa.feature.chroma_stft(S=magnitude**2, sr=SAMPLE_RATE)
    entropy = chroma_entropy(chroma)

    return FrameFeatures(
        loudness_db=loudness_db.astype(np.float64),
        log2_centroid=log2_centroid.astype(np.float64),
        chroma_entropy=entropy.astype(np.float64),
    )


def e1_cells(x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Hard-bin normalised (x, y) points into padded grid cells.

    Returns (rows, cols, in_domain). Points outside [0, 1] on either axis
    (edges included in the domain) or NaN are dropped, not clipped; rows and
    cols cover only the in-domain points. x = 1 and y = 0 fall in the last
    cell. y is flipped so brighter frames sit higher (smaller row).
    """
    in_domain = (x >= 0) & (x <= 1) & (y >= 0) & (y <= 1)
    cols = np.minimum((x[in_domain] * GRID).astype(int), GRID - 1) + PAD
    rows = np.minimum(((1 - y[in_domain]) * GRID).astype(int), GRID - 1) + PAD
    return rows, cols, in_domain


def e1_density(frames: FrameFeatures) -> E1Measurement:
    """
    Gate, bin and blur per-frame features into the E1 density. Each voiced,
    in-domain frame adds one count; the histogram is divided by the total
    frame count (silent and out-of-domain frames included) before blurring.
    """
    total = len(frames.loudness_db)
    voiced = frames.loudness_db >= SILENCE_DB

    rows, cols, in_domain = e1_cells(
        frames.chroma_entropy[voiced], normalized_brightness(frames.log2_centroid[voiced])
    )
    histogram = np.zeros((GRID_SIZE, GRID_SIZE))
    np.add.at(histogram, (rows, cols), 1)
    if total > 0:
        histogram /= total

    return E1Measurement(
        density=gaussian_filter(histogram, DENSITY_SIGMA, mode="constant"),
        total_frames=total,
        voiced_frames=int(voiced.sum()),
        in_domain_frames=int(in_domain.sum()),
    )


def measure_waveform(waveform: np.ndarray) -> E1Measurement:
    """E1 measurement of a mono waveform already at SAMPLE_RATE."""
    return e1_density(frame_features(waveform))


def measure_file(path: str) -> E1Measurement:
    """Load an audio file as 22050 Hz mono and measure it."""
    waveform, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    return measure_waveform(waveform)


def unavailable_reason(measurement: E1Measurement) -> str | None:
    """
    Why no fingerprint can be drawn for this measurement, or None if it can.
    Without any visited cell (density >= T_VISITED) there is no shape to
    outline, so no geometry is invented.
    """
    if measurement.voiced_frames == 0:
        return NO_VOICED_FRAMES
    if measurement.in_domain_frames == 0:
        return NO_FRAMES_IN_DOMAIN
    if measurement.density.max() < T_VISITED:
        return BELOW_VISITED_THRESHOLD
    return None
