"""
Builds the static song library the frontend browses and compares.

Source of truth is a library directory (default frontend/public/library):

    metadata.json        hand-authored: id, title, genre, file, optional description
    audio/<file>         the audio files metadata.json refers to

build_library() analyses each track once with extract_features() and writes:

    features/<id>.json   precomputed analysis (what /analyze would have returned)
    library.json         manifest: metadata + duration, tempo, a small fingerprint
                         preview for library cards, and relative paths to the above

so the frontend can show a track's fingerprint without running librosa.
"""

import json
import re
from pathlib import Path

import numpy as np

from song_dna.features import AudioFeatures, extract_features

# Number of bars in a library card's mini fingerprint. Cards are small, so this
# is deliberately fewer than the full fingerprint's 40 segments x 2 strands of
# detail per pixel - it only needs to convey the track's overall shape.
PREVIEW_SEGMENTS = 48

# Percentile used to normalize the brightness preview. Same idea as the full
# fingerprint's centroid scaling: a few outlier frames shouldn't flatten it.
PREVIEW_CENTROID_PERCENTILE = 95

REQUIRED_METADATA_KEYS = ("id", "title", "genre", "file")

# Ids become file names and URL segments, so keep them simple and safe.
_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def bucket_average(values: np.ndarray, segment_count: int) -> np.ndarray:
    """
    Downsample `values` into `segment_count` bars by averaging the frames
    that fall in each bar. Mirrors frontend/src/bucketing.js exactly, so a
    preview built here matches what the full fingerprint would show.
    """
    if len(values) == 0 or segment_count <= 0:
        return np.array([])

    bucket_size = len(values) / segment_count
    buckets = []
    for i in range(segment_count):
        start = int(np.floor(i * bucket_size))
        end = max(int(np.floor((i + 1) * bucket_size)), start + 1)
        buckets.append(float(np.mean(values[start:end])))
    return np.array(buckets)


def make_preview(features: AudioFeatures) -> dict:
    """
    A small, self-normalized fingerprint for a library card: bucketed energy
    (scaled so its loudest bar is 1) and bucketed brightness (scaled to its
    own 95th percentile and clipped to 1). Each song is normalized against
    itself - cards show a track's shape, not a cross-song comparison.
    """
    energy = bucket_average(features.rms_energy, PREVIEW_SEGMENTS)
    brightness = bucket_average(features.spectral_centroid, PREVIEW_SEGMENTS)

    energy_max = energy.max() if energy.size else 0.0
    centroid_ceiling = (
        np.percentile(features.spectral_centroid, PREVIEW_CENTROID_PERCENTILE)
        if len(features.spectral_centroid)
        else 0.0
    )

    energy_scaled = energy / energy_max if energy_max > 0 else np.zeros_like(energy)
    brightness_scaled = (
        np.clip(brightness / centroid_ceiling, 0, 1)
        if centroid_ceiling > 0
        else np.zeros_like(brightness)
    )

    return {
        "energy": np.round(energy_scaled, 3).tolist(),
        "brightness": np.round(brightness_scaled, 3).tolist(),
    }


def build_track_features(features: AudioFeatures, track_id: str) -> dict:
    """
    The per-track feature file. Field names match the /analyze response
    (rms_energy, spectral_centroid, beat_times, duration_seconds) so the
    frontend's Fingerprint can consume it unchanged. Floats are rounded to
    keep files small; `times` is omitted since it's derivable and unused.
    """
    return {
        "id": track_id,
        "sample_rate": int(features.sample_rate),
        "duration_seconds": round(float(features.duration_seconds), 3),
        "tempo_bpm": round(float(features.tempo_bpm), 2),
        "rms_energy": np.round(features.rms_energy, 5).tolist(),
        "spectral_centroid": np.round(features.spectral_centroid, 1).tolist(),
        "beat_times": np.round(features.beat_times, 3).tolist(),
    }


def load_metadata(metadata_path: Path) -> list[dict]:
    """Read and validate metadata.json (a JSON list of track objects)."""
    tracks = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
    if not isinstance(tracks, list) or not tracks:
        raise ValueError(f"{metadata_path} must contain a non-empty list of tracks")

    seen_ids = set()
    for index, track in enumerate(tracks):
        for key in REQUIRED_METADATA_KEYS:
            if not isinstance(track.get(key), str) or not track[key].strip():
                raise ValueError(f"track #{index} is missing required field '{key}'")

        track_id = track["id"]
        if not _ID_PATTERN.match(track_id):
            raise ValueError(
                f"track id '{track_id}' must be lowercase letters, digits and hyphens"
            )
        if track_id in seen_ids:
            raise ValueError(f"duplicate track id '{track_id}'")
        seen_ids.add(track_id)

    return tracks


def build_library(library_dir: Path) -> list[dict]:
    """
    Analyse every track in library_dir/metadata.json and (re)write
    library_dir/features/*.json and library_dir/library.json.
    Returns the manifest's track list.
    """
    library_dir = Path(library_dir)
    tracks = load_metadata(library_dir / "metadata.json")

    # Validate every audio file up front, so a typo doesn't leave the
    # library half-built after minutes of analysis.
    for track in tracks:
        audio_path = library_dir / "audio" / track["file"]
        if not audio_path.is_file():
            raise FileNotFoundError(
                f"audio file for track '{track['id']}' not found: {audio_path}"
            )

    features_dir = library_dir / "features"
    features_dir.mkdir(exist_ok=True)

    manifest_tracks = []
    for track in tracks:
        features = extract_features(str(library_dir / "audio" / track["file"]))
        feature_data = build_track_features(features, track["id"])

        (features_dir / f"{track['id']}.json").write_text(
            json.dumps(feature_data, separators=(",", ":")), encoding="utf-8"
        )

        entry = {
            "id": track["id"],
            "title": track["title"],
            "genre": track["genre"],
            "duration_seconds": feature_data["duration_seconds"],
            "tempo_bpm": feature_data["tempo_bpm"],
            "audio": f"audio/{track['file']}",
            "features": f"features/{track['id']}.json",
            "preview": make_preview(features),
        }
        if track.get("description"):
            entry["description"] = track["description"]
        manifest_tracks.append(entry)

    # Drop feature files for tracks no longer in metadata.json (e.g. when
    # placeholder tracks are swapped for real ones), so nothing stale is served.
    current_ids = {track["id"] for track in tracks}
    for stale in features_dir.glob("*.json"):
        if stale.stem not in current_ids:
            stale.unlink()

    manifest = {"version": 1, "tracks": manifest_tracks}
    (library_dir / "library.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest_tracks
