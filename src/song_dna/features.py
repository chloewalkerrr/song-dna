from dataclasses import dataclass, field
import numpy as np
import librosa

from song_dna.rms import compute_rms_energy

# Sample rate used specifically for beat tracking, separate from the
# full-resolution waveform used for RMS/spectral centroid. Beat tracking
# only needs to see the broad rhythmic/percussive energy envelope, not
# the fine high-frequency detail that spectral centroid (a brightness
# measure) genuinely depends on - so it can run on a much lower-resolution
# copy of the audio without meaningfully hurting accuracy. 11025Hz (exactly
# half librosa's own default load rate of 22050) is an established choice
# for rhythm/tempo estimation in MIR: it's used for downsampled tempo
# analysis in published tempo-estimation research, and by Essentia's own
# TempoCNN model, precisely because percussive onset energy sits well
# below its ~5.5kHz Nyquist limit.
BEAT_TRACKING_SAMPLE_RATE = 11025

@dataclass
class AudioFeatures:
    """
    Holds the extracted audio features for a single song.

    All time-series arrays (times, rms_energy, spectral_centroid) are
    aligned frame-by-frame: index i in each array refers to the same
    moment in the song. beat_times is different - it's a sparse list of
    timestamps (seconds), one per detected beat, not a frame-aligned
    series - so it's a different length than the other arrays.

    beat_times and tempo_bpm default to empty/zero (rather than being
    required) so existing call sites that build an AudioFeatures without
    caring about beats - e.g. /compare's minimal reconstruction from wire
    data, or findings tests - don't need to be touched.
    """

    file_path: str
    sample_rate: int
    duration_seconds: float
    times: np.ndarray
    rms_energy: np.ndarray
    spectral_centroid: np.ndarray
    beat_times: np.ndarray = field(default_factory=lambda: np.array([]))
    tempo_bpm: float = 0.0


def extract_features(file_path: str) -> AudioFeatures:
    """
    Load an audio file and extract its RMS energy, spectral centroid,
    and beat positions over time, returning them as a structured
    AudioFeatures object.
    """
    waveform, sample_rate = librosa.load(file_path)

    rms_energy = compute_rms_energy(waveform)
    spectral_centroid = librosa.feature.spectral_centroid(y = waveform, sr = sample_rate)[0]

    # Beat tracking runs on a downsampled copy for speed (see
    # BEAT_TRACKING_SAMPLE_RATE above) - units="time" returns real
    # seconds regardless of the sample rate used internally, so beat
    # timestamps stay correctly aligned with the full-resolution timeline.
    beat_tracking_waveform = librosa.resample(
        waveform, orig_sr = sample_rate, target_sr = BEAT_TRACKING_SAMPLE_RATE
    )
    tempo, beat_times = librosa.beat.beat_track(
        y = beat_tracking_waveform, sr = BEAT_TRACKING_SAMPLE_RATE, units = "time"
    )

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
        # beat_track returns tempo as a scalar or a 1-element array
        # depending on the input, so normalize to a plain float.
        tempo_bpm = float(np.atleast_1d(tempo)[0]),
    )