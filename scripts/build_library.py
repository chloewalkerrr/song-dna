"""
Rebuild the precomputed song library.

    python scripts/build_library.py [--library-dir frontend/public/library]

Reads <library-dir>/metadata.json and <library-dir>/audio/*, analyses each
track, and writes <library-dir>/features/*.json and <library-dir>/library.json.
See src/song_dna/library.py for the file formats.
"""

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "src"))

from song_dna.library import build_library  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--library-dir",
        type=Path,
        default=REPO_ROOT / "frontend" / "public" / "library",
    )
    args = parser.parse_args()

    tracks = build_library(args.library_dir)

    print(f"Built {len(tracks)} tracks in {args.library_dir}")
    for track in tracks:
        print(
            f"  {track['id']:<16} {track['duration_seconds']:>7.1f}s  "
            f"{track['tempo_bpm']:>6.1f} BPM  {track['genre']}"
        )


if __name__ == "__main__":
    main()
