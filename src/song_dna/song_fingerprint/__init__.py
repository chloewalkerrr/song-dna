"""
Song Fingerprint: a whole-track identity summary, separate from Song DNA.

Song DNA shows how a track changes over time; the fingerprint shows where the
track spends its time overall, in (chroma entropy, brightness) space, drawn as
B1 ridge lines. It is not a unique identifier and says nothing about genre,
mood, quality or similarity.

    measure.py   audio -> E1 density (the canonical measurement)
    render.py    density + dref -> hero and thumbnail SVG paths (derived)
    constants.py the frozen E1B1/1 parameters and their hash
"""

from song_dna.song_fingerprint.constants import FINGERPRINT_VERSION, params_hash
from song_dna.song_fingerprint.measure import (
    E1Measurement,
    measure_file,
    measure_waveform,
    unavailable_reason,
)
from song_dna.song_fingerprint.render import (
    RenderedFingerprint,
    production_dref,
    render_fingerprint,
)

__all__ = [
    "FINGERPRINT_VERSION",
    "E1Measurement",
    "RenderedFingerprint",
    "measure_file",
    "measure_waveform",
    "params_hash",
    "production_dref",
    "render_fingerprint",
    "unavailable_reason",
]
