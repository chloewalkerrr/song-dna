"""
Frozen parameters of Song Fingerprint E1B1/1.

Every value here was fixed by the fingerprint research (encoding E1, drawn
with the B1 streamline grammar) and validated there; none were tuned for
SongDNA's library. The authoritative reference is the research handoff's
scripts/encodings_study.py (measurement) and scripts/b1render.py (renderer),
and tests/test_song_fingerprint_parity.py checks this package reproduces its
output exactly. Changing any value here changes every fingerprint: bump
FINGERPRINT_VERSION and rebuild the library rather than editing in place.
"""

import hashlib
import json
import math

# Independent of the library manifest's own version. "E1B1" = encoding E1
# (chroma entropy x brightness) drawn with renderer B1; "/1" = first frozen
# parameter set.
FINGERPRINT_VERSION = "E1B1/1"

# --- measurement (E1) ---------------------------------------------------------

# Same framing as SongDNA's DNA features, so a fingerprint frame and a DNA
# frame describe the same ~23 ms of audio.
SAMPLE_RATE = 22050
N_FFT = 2048
HOP_LENGTH = 512

# A frame is voiced iff its STFT-magnitude RMS is at least -60 dBFS. Silence
# has no timbre or pitch content, and near-silent frames otherwise form a
# generic "satellite" blob unrelated to the music (seen in the B1 validation).
SILENCE_DB = -60.0
# Floor applied to RMS before converting to dB, so digital silence is finite.
RMS_FLOOR = 1e-10

# Brightness axis: log2 spectral centroid over a fixed 50-11025 Hz domain
# (11025 Hz is the Nyquist frequency at 22050 Hz). Fixed rather than fitted
# per song so positions are comparable across songs. The centroid is floored
# at 1 Hz before log2 so a zero centroid is finite (and then out of domain).
CENTROID_MIN_HZ = 50.0
CENTROID_MAX_HZ = 11025.0
CENTROID_FLOOR_HZ = 1.0

# Chroma entropy: per-frame chroma normalised to a distribution over the 12
# pitch classes; entropy / log2(12) is 0 for one pitch class, 1 for all equal.
CHROMA_BINS = 12
CHROMA_SUM_FLOOR = 1e-10
CHROMA_P_FLOOR = 1e-12

# --- density grid -------------------------------------------------------------

# 256 cells per axis for the [0, 1] domain, plus 150 empty cells each side so
# the blur and the outline offsets never touch the array edge: 556 x 556.
GRID = 256
PAD = 150
GRID_SIZE = GRID + 2 * PAD
# Gaussian blur of the per-frame histogram, in cells.
DENSITY_SIGMA = 5.0

# --- B1 field -----------------------------------------------------------------

# Density a cell needs to count as "visited" by the song.
T_VISITED = 2e-5
# Ridge spacing, in cells, used by the field and the hero tracing.
SPACING = 5.0
# Field step between neighbouring contour ridges.
S = SPACING / (DENSITY_SIGMA * math.sqrt(2))
# Distance (cells) per unit of field outside the visited region.
C = SPACING / S
# Blur of the field before cropping, rounding off sharp outline corners.
CORNER_SMOOTH = 1.5
# Number of offset ridges drawn around the visited region.
N_OUT = 10
# Negative-space rule: leave cells empty where ridges would be more than
# FLAT_FACTOR x SPACING apart (the field is nearly flat there).
FLAT_FACTOR = 2.0
# Cells of margin kept around the domain: the drawn view is [90, 466) = 376 cells.
VIEW = 60
VIEW_START = PAD - VIEW
VIEW_END = PAD + GRID + VIEW
VIEW_SIZE = VIEW_END - VIEW_START
# Blur of the doubled-angle orientation fields.
ORIENTATION_SIGMA = 1.0
# Gradients below this are treated as having no orientation before blurring.
GRADIENT_EPSILON = 1e-6

# --- B1 streamlines -----------------------------------------------------------

# Integration step (cells), minimum kept line length (len(points) * STEP,
# so fewer than 12 points is dropped) and cap on steps per trace direction.
STEP = 0.5
MIN_LEN = 6
MAX_STEPS = 4000
# Neighbour test distance as a fraction of the line spacing.
DTEST_FACTOR = 0.55
# A seed is rejected when this close (x dsep) to an existing line.
SEED_CLEARANCE_FACTOR = 0.95
# Perpendicular seeds are queued from every 3rd point of an accepted line.
SEED_EVERY = 3
# Loop closure: after more than 20 points, stop when back within 1.5 x STEP
# of the line's own start.
LOOP_MIN_POINTS = 20
LOOP_CLOSE_FACTOR = 1.5
# Singularity stop: when the blurred doubled-angle orientation (c2, s2) has
# magnitude below 0.15, nearby ridge directions disagree (a saddle, peak or
# flat patch) and tracing stops. Restored from the validated reference
# b1render.py (Streamlines.orient); it was missing from the written contract.
ORIENTATION_MIN_MAGNITUDE = 0.15
# The first seed sits at the densest cell of the view, offset by (+2.5, +0.5)
# cells in (x, y) = (column, row) so it starts between cell centres.
SEED_OFFSET = (2.5, 0.5)

# Hero and thumbnail are separate tracings of the same field: the thumbnail
# uses 3x the line spacing so its ridges stay legible at 52 px, rather than
# scaling down the hero's dense lines.
HERO_SIZE = 220
HERO_DSEP = SPACING
HERO_POINT_STRIDE = 2
THUMB_SIZE = 52
THUMB_DSEP = 3 * SPACING
THUMB_POINT_STRIDE = 3
# SVG coordinates are view cells x (output size / VIEW_SIZE), one decimal place.
COORDINATE_DECIMALS = 1

# --- production reference density ---------------------------------------------

# Dref sets how density maps to ridge position. Phase A: 1.2 x the largest
# density cell across the fixed demo library, recomputed on every build (the
# 20% headroom is the research's choice). Not a policy for a growing library.
DREF_HEADROOM = 1.2


def frozen_parameters() -> dict:
    """Every value that determines a fingerprint, keyed by name."""
    return {
        "version": FINGERPRINT_VERSION,
        "sample_rate": SAMPLE_RATE,
        "n_fft": N_FFT,
        "hop_length": HOP_LENGTH,
        "silence_db": SILENCE_DB,
        "rms_floor": RMS_FLOOR,
        "centroid_min_hz": CENTROID_MIN_HZ,
        "centroid_max_hz": CENTROID_MAX_HZ,
        "centroid_floor_hz": CENTROID_FLOOR_HZ,
        "chroma_bins": CHROMA_BINS,
        "chroma_sum_floor": CHROMA_SUM_FLOOR,
        "chroma_p_floor": CHROMA_P_FLOOR,
        "grid": GRID,
        "pad": PAD,
        "density_sigma": DENSITY_SIGMA,
        "t_visited": T_VISITED,
        "spacing": SPACING,
        "corner_smooth": CORNER_SMOOTH,
        "n_out": N_OUT,
        "flat_factor": FLAT_FACTOR,
        "view": VIEW,
        "orientation_sigma": ORIENTATION_SIGMA,
        "gradient_epsilon": GRADIENT_EPSILON,
        "step": STEP,
        "min_len": MIN_LEN,
        "max_steps": MAX_STEPS,
        "dtest_factor": DTEST_FACTOR,
        "seed_clearance_factor": SEED_CLEARANCE_FACTOR,
        "seed_every": SEED_EVERY,
        "loop_min_points": LOOP_MIN_POINTS,
        "loop_close_factor": LOOP_CLOSE_FACTOR,
        "orientation_min_magnitude": ORIENTATION_MIN_MAGNITUDE,
        "seed_offset": list(SEED_OFFSET),
        "hero": {"size": HERO_SIZE, "dsep": HERO_DSEP, "point_stride": HERO_POINT_STRIDE},
        "thumb": {"size": THUMB_SIZE, "dsep": THUMB_DSEP, "point_stride": THUMB_POINT_STRIDE},
        "coordinate_decimals": COORDINATE_DECIMALS,
        "dref_headroom": DREF_HEADROOM,
    }


def params_hash() -> str:
    """
    SHA-256 of the frozen parameters as canonical JSON (sorted keys, no
    whitespace), so a stored fingerprint records exactly which rules drew it.
    """
    canonical = json.dumps(frozen_parameters(), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
