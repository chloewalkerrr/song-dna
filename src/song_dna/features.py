from dataclasses import dataclass
import numpy as np
import librosa

@dataclass
class AudioFeatures:
    """
    Holds the extracted audio features for a single song.

    All time-series arrays (times, rms_energy, spectral_centroid) are
    aligned frame-by-frame: index i in each array refers to the same
    moment in the song.
    """

    file_path: str
    sample_rate: int
    duration_seconds: float
    times: np.ndarray
    rms_energy: np.ndarray
    spectral_centroid: np.ndarray


def extract_features(file_path: str) -> AudioFeatures:
    """
    Load an audio file and extract its RMS energy and spectral centroid
    over time, returning them as a structured AudioFeatures object.
    """
    waveform, sample_rate = librosa.load(file_path)

    rms_energy = librosa.feature.rms(y = waveform)[0]
    spectral_centroid = librosa.feature.spectral_centroid(y = waveform, sr = sample_rate)[0]

    times = librosa.frames_to_time(range(len(rms_energy)), sr = sample_rate)
    duration_seconds = len(waveform) / sample_rate

    return AudioFeatures(
        file_path = file_path,
        sample_rate = sample_rate,
        duration_seconds = duration_seconds,
        times = times,
        rms_energy = rms_energy,
        spectral_centroid = spectral_centroid,
    )