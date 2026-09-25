"""
Generate the synthetic PLACEHOLDER tracks used to develop the library
pipeline before real, curated tracks exist.

    python scripts/generate_dev_tracks.py [--library-dir frontend/public/library]

Writes one MP3 per track into <library-dir>/audio/. Output is deterministic
(fixed random seed). Each track is built to look different in a fingerprint
(steady vs building vs fading vs sectioned energy, dark vs bright timbre) so
the UI and later features have varied material. To swap in real tracks, put
their audio in <library-dir>/audio/, edit metadata.json, and rerun
scripts/build_library.py - this script isn't needed for that.
"""

import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

SAMPLE_RATE = 22050
DURATION_SECONDS = 30.0
REPO_ROOT = Path(__file__).resolve().parent.parent


def _time_axis() -> np.ndarray:
    return np.arange(int(SAMPLE_RATE * DURATION_SECONDS)) / SAMPLE_RATE


def _envelope(points: list[tuple[float, float]]) -> np.ndarray:
    """Piecewise-linear gain over the whole track from (seconds, gain) points."""
    times, gains = zip(*points)
    return np.interp(_time_axis(), times, gains)


def _hits(bpm: float, sound: np.ndarray, start: float = 0.0, end: float = DURATION_SECONDS,
          offset_beats: float = 0.0) -> np.ndarray:
    """Place `sound` at every beat between start and end."""
    out = np.zeros(len(_time_axis()))
    interval = 60.0 / bpm
    for beat_time in np.arange(start + offset_beats * interval, end, interval):
        first = int(beat_time * SAMPLE_RATE)
        last = min(first + len(sound), len(out))
        if first < len(out):
            out[first:last] += sound[: last - first]
    return out


def _kick(freq: float = 55.0, length: float = 0.18) -> np.ndarray:
    t = np.arange(int(SAMPLE_RATE * length)) / SAMPLE_RATE
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.05)


def _noise_burst(rng: np.random.Generator, length: float = 0.06, decay: float = 0.015) -> np.ndarray:
    t = np.arange(int(SAMPLE_RATE * length)) / SAMPLE_RATE
    # differencing the noise pushes its energy toward high frequencies (bright)
    return np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t / decay)


def _pad(freqs: list[float], harmonics: np.ndarray | None = None) -> np.ndarray:
    """Sum of sine tones; `harmonics` (0-1 over time) fades in a brighter 3rd/5th partial."""
    t = _time_axis()
    tone = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    if harmonics is not None:
        bright = sum(np.sin(2 * np.pi * f * 3 * t) + 0.6 * np.sin(2 * np.pi * f * 5 * t) for f in freqs)
        tone = tone + harmonics * bright / len(freqs)
    return tone


def _normalize(signal: np.ndarray, peak: float = 0.8) -> np.ndarray:
    return signal * (peak / np.max(np.abs(signal)))


def dev_pulse(rng: np.random.Generator) -> np.ndarray:
    """Steady 120 BPM kick with off-beat hats: flat energy, mid-bright, clear beats."""
    kick = _hits(120, _kick())
    hats = _hits(120, _noise_burst(rng, 0.04, 0.008), offset_beats=0.5) * 0.35
    return _normalize(kick + hats + 0.08 * _pad([110.0, 165.0]))


def dev_slow_build(rng: np.random.Generator) -> np.ndarray:
    """Soft pad that swells and brightens over 30s; a gentle pulse enters late."""
    grow = _envelope([(0, 0.08), (30, 1.0)])
    brighten = _envelope([(0, 0.0), (30, 0.7)])
    pad = _pad([220.0, 277.2, 329.6], harmonics=brighten) * grow
    pulse = _hits(72, _kick(50.0, 0.25), start=14.0) * _envelope([(14, 0.0), (30, 0.6)])
    return _normalize(pad + pulse)


def dev_fade_out(rng: np.random.Generator) -> np.ndarray:
    """Loud, bright 140 BPM hits with a low riff, decaying to near-silence."""
    hits = _hits(140, _noise_burst(rng, 0.09, 0.03)) * 0.8
    bass = _hits(140, _kick(82.4, 0.2), offset_beats=0.5)
    return _normalize((hits + bass) * _envelope([(0, 1.0), (10, 0.75), (30, 0.06)]))


def dev_sections(rng: np.random.Generator) -> np.ndarray:
    """Quiet pad / loud full-band groove / quiet pad - three unmistakable sections."""
    gain = _envelope([(0, 0.12), (9.5, 0.12), (10.5, 1.0), (19.5, 1.0), (20.5, 0.12), (30, 0.12)])
    pad = _pad([196.0, 246.9, 293.7]) * 0.5
    groove = _hits(100, _kick(58.0), start=10.0, end=20.0)
    groove += _hits(100, _noise_burst(rng, 0.05, 0.012), start=10.0, end=20.0, offset_beats=0.5) * 0.5
    return _normalize(pad * gain + groove)


def dev_sweep(rng: np.random.Generator) -> np.ndarray:
    """Repeating low-to-high chirps with a slow loudness swell: wide dynamic range."""
    t = _time_axis()
    cycle = 7.5  # seconds per sweep
    phase_in_cycle = (t % cycle) / cycle
    freq = 100.0 * (40.0 ** phase_in_cycle)  # 100 Hz -> 4 kHz, exponential
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 15.0 - np.pi / 2)
    clicks = _hits(90, _noise_burst(rng, 0.02, 0.005)) * 0.3
    return _normalize(np.sin(phase) * swell + clicks)


TRACKS = {
    "dev-pulse": dev_pulse,
    "dev-slow-build": dev_slow_build,
    "dev-fade-out": dev_fade_out,
    "dev-sections": dev_sections,
    "dev-sweep": dev_sweep,
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--library-dir",
        type=Path,
        default=REPO_ROOT / "frontend" / "public" / "library",
    )
    args = parser.parse_args()

    audio_dir = args.library_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    for index, (track_id, synthesize) in enumerate(TRACKS.items()):
        rng = np.random.default_rng(1000 + index)  # fixed seed per track
        path = audio_dir / f"{track_id}.mp3"
        sf.write(path, synthesize(rng), SAMPLE_RATE, format="MP3")
        print(f"wrote {path} ({path.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
