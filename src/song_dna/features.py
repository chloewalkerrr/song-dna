from dataclasses import dataclass, field
import numpy as np
import librosa

from song_dna.rms import compute_rms_energy

@dataclass
class AudioFeatures:
    """
    Holds the extracted audio features for a single song.

    All time-series arrays (times, rms_energy, spectral_centroid) are
    aligned frame-by-frame: index i in each array refers to the same
    moment in the song. beat_times is different - it's a sparse list of
    timestamps (seconds), one per detected beat, not a frame-aligned
    series - so it's a different length than the other arrays.

    beat_times defaults to an empty array (rather than being required)
    so existing call sites that build an AudioFeatures without caring
    about beats - e.g. /compare's minimal reconstruction from wire data,
    or findings tests - don't need to be touched.
    """

    file_path: str
    sample_rate: int
    duration_seconds: float
    times: np.ndarray
    rms_energy: np.ndarray
    spectral_centroid: np.ndarray
    beat_times: np.ndarray = field(default_factory=lambda: np.array([]))


def extract_features(file_path: str) -> AudioFeatures:
    """
    Load an audio file and extract its RMS energy, spectral centroid,
    and beat positions over time, returning them as a structured
    AudioFeatures object.
    """
    waveform, sample_rate = librosa.load(file_path)

    rms_energy = compute_rms_energy(waveform)
    spectral_centroid = librosa.feature.spectral_centroid(y = waveform, sr = sample_rate)[0]

    # Only beat timestamps are exposed for now - the estimated tempo
    # (beats per minute) that beat_track also returns isn't used yet.
    _tempo, beat_times = librosa.beat.beat_track(y = waveform, sr = sample_rate, units = "time")

    times = librosa.frames_to_time(range(len(rms_energy)), sr = sample_rate)
    duration_seconds = len(waveform) / sample_rate

    return AudioFeatures(
        file_path = file_path,
        sample_rate = sample_rate,
        duration_seconds = duration_seconds,
        times = times,
        rms_energy = rms_energy,
        spectral_centroid = spectral_centroid,
        beat_times = beat_times,
    )