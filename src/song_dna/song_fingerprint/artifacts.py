"""
Song Fingerprint artifacts for the static library.

The E1 density is the canonical measurement; the SVG paths are derived from
it and one corpus-wide Dref, so every build re-renders every fingerprint.
Output layout (paths relative to the library folder):

    library.json            "song_fingerprint": small global metadata
                            tracks[].song_fingerprint: artifact path, or
                            null plus the reason no fingerprint exists
    fingerprints/thumbs.json    52 px thumbnail paths for all tracks
    fingerprints/<id>.json      220 px hero path + audit metadata

Hero paths are 100-200 KB each, so they stay out of library.json.

Phase A Dref policy: 1.2 x the largest density cell across the current demo
library, recomputed on every build. corpus_id records which set of audio
files that Dref (and so every path) came from. This is not the policy for
uploads or a growing library.
"""

import hashlib
import json
from dataclasses import dataclass

import librosa

from song_dna.song_fingerprint.constants import (
    FINGERPRINT_VERSION,
    HERO_SIZE,
    THUMB_SIZE,
    params_hash,
)
from song_dna.song_fingerprint.measure import E1Measurement, unavailable_reason
from song_dna.song_fingerprint.render import production_dref, render_fingerprint

FINGERPRINTS_DIR = "fingerprints"
THUMBS_FILE = "thumbs.json"
HERO_VIEW_BOX = f"0 0 {HERO_SIZE} {HERO_SIZE}"
THUMB_VIEW_BOX = f"0 0 {THUMB_SIZE} {THUMB_SIZE}"


@dataclass
class FingerprintArtifacts:
    summary: dict  # library.json "song_fingerprint"
    track_refs: dict[str, dict]  # library.json tracks[].song_fingerprint, by id
    heroes: dict[str, dict]  # fingerprints/<id>.json contents, available tracks only
    thumbs: dict  # fingerprints/thumbs.json contents


def corpus_id(audio_sha256: dict[str, str]) -> str:
    """SHA-256 over the sorted (track id, audio SHA-256) pairs: which audio built this library."""
    canonical = json.dumps(sorted(audio_sha256.items()), separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def hero_artifact_path(track_id: str) -> str:
    return f"{FINGERPRINTS_DIR}/{track_id}.json"


def build_fingerprint_artifacts(
    measurements: dict[str, E1Measurement], audio_sha256: dict[str, str]
) -> FingerprintArtifacts:
    """
    Render every drawable track from one shared Dref. Tracks with no
    fingerprint (e.g. all silent) get a null artifact and a reason; they don't
    contribute to Dref and no geometry is produced for them.
    """
    reasons = {track_id: unavailable_reason(m) for track_id, m in measurements.items()}
    drawable = [track_id for track_id, reason in reasons.items() if reason is None]
    dref = production_dref([measurements[t].density for t in drawable]) if drawable else None

    identity = {
        "version": FINGERPRINT_VERSION,
        "params_hash": params_hash(),
        "librosa_version": librosa.__version__,
        "dref": dref,
        "corpus_id": corpus_id(audio_sha256),
    }

    track_refs, heroes, thumb_paths = {}, {}, {}
    for track_id, measurement in measurements.items():
        counts = {
            "total_frames": measurement.total_frames,
            "voiced_frames": measurement.voiced_frames,
            "in_domain_frames": measurement.in_domain_frames,
        }
        if reasons[track_id] is not None:
            track_refs[track_id] = {"artifact": None, "unavailable_reason": reasons[track_id], **counts}
            continue

        rendered = render_fingerprint(measurement.density, dref)
        track_refs[track_id] = {"artifact": hero_artifact_path(track_id)}
        heroes[track_id] = {
            "id": track_id,
            **identity,
            "audio_sha256": audio_sha256[track_id],
            "frames": counts,
            "view_box": HERO_VIEW_BOX,
            "hero": rendered.hero,
        }
        thumb_paths[track_id] = rendered.thumb

    summary = {
        **identity,
        "thumbs": f"{FINGERPRINTS_DIR}/{THUMBS_FILE}",
        "thumb_view_box": THUMB_VIEW_BOX,
        "hero_view_box": HERO_VIEW_BOX,
    }
    thumbs = {**identity, "view_box": THUMB_VIEW_BOX, "thumbs": thumb_paths}
    return FingerprintArtifacts(summary=summary, track_refs=track_refs, heroes=heroes, thumbs=thumbs)
