from dataclasses import dataclass
import numpy as np

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