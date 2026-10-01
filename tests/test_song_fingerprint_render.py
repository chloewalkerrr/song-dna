import hashlib
import itertools
import json
import re

import numpy as np
import pytest

from song_dna.song_fingerprint.constants import (
    HERO_DSEP,
    HERO_POINT_STRIDE,
    HERO_SIZE,
    MIN_LEN,
    ORIENTATION_MIN_MAGNITUDE,
    SEED_OFFSET,
    STEP,
    THUMB_DSEP,
    THUMB_POINT_STRIDE,
    THUMB_SIZE,
    VIEW_SIZE,
    VIEW_START,
    frozen_parameters,
    params_hash,
)
from song_dna.song_fingerprint.measure import FrameFeatures, e1_density
from song_dna.song_fingerprint.render import (
    Field,
    build_field,
    production_dref,
    render_fingerprint,
    to_path,
    trace_lines,
)

NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def cluster_density(center_x, center_y, spread=0.05, count=800, seed=0):
    """E1 density of a synthetic track whose frames cluster around (x, y)."""
    rng = np.random.default_rng(seed)
    x = rng.normal(center_x, spread, count)
    y = rng.normal(center_y, spread, count)
    low, high = np.log2(50.0), np.log2(11025.0)
    return e1_density(
        FrameFeatures(
            loudness_db=np.full(count, -20.0),
            log2_centroid=low + y * (high - low),
            chroma_entropy=x,
        )
    ).density


@pytest.fixture(scope="module")
def density():
    return cluster_density(0.4, 0.6)


@pytest.fixture(scope="module")
def dref(density):
    return production_dref([density])


@pytest.fixture(scope="module")
def rendered(density, dref):
    return render_fingerprint(density, dref)


def uniform_field(c2=1.0, width=40, height=40, mask_width=None):
    """A hand-built field whose ridges all run horizontally (c2 = cos 0)."""
    mask = np.zeros((height, width), dtype=bool)
    mask[:, : mask_width or width] = True
    return Field(
        region=mask,
        silhouette=mask,
        mask=mask,
        c2=np.full((height, width), c2),
        s2=np.zeros((height, width)),
        seed=(2.5, 20.5),
    )


# --- dref -------------------------------------------------------------------------


def test_production_dref_is_1_2_times_the_largest_density_cell():
    a, b = np.zeros((4, 4)), np.zeros((4, 4))
    a[1, 1], b[2, 3] = 0.003, 0.005
    assert production_dref([a, b]) == 1.2 * 0.005


def test_production_dref_does_not_depend_on_track_order():
    densities = [cluster_density(x, 0.5, seed=i) for i, x in enumerate((0.2, 0.5, 0.8))]
    values = {production_dref(list(order)) for order in itertools.permutations(densities)}
    assert len(values) == 1


# --- field ------------------------------------------------------------------------


def test_field_is_cropped_to_the_view_and_seeded_at_the_densest_cell(density, dref):
    field = build_field(density, dref)

    assert field.mask.shape == field.c2.shape == field.region.shape == (VIEW_SIZE, VIEW_SIZE)
    view = density[VIEW_START : VIEW_START + VIEW_SIZE, VIEW_START : VIEW_START + VIEW_SIZE]
    row, col = np.unravel_index(view.argmax(), view.shape)
    assert field.seed == (col + SEED_OFFSET[0], row + SEED_OFFSET[1])
    # The drawn mask sits inside the silhouette, which contains the visited region.
    assert not (field.mask & ~field.silhouette).any()
    assert not (field.region & ~field.silhouette).any()


# --- tracing ----------------------------------------------------------------------


def test_uniform_orientation_traces_evenly_spaced_straight_lines():
    lines = trace_lines(uniform_field(), 5.0)

    rows = sorted({y for line in lines for _, y in line})
    assert rows == [0.5, 5.5, 10.5, 15.5, 20.5, 25.5, 30.5, 35.5]
    assert all(len({y for _, y in line}) == 1 for line in lines)


def test_tracing_stops_where_orientation_magnitude_is_below_the_singularity_threshold():
    assert ORIENTATION_MIN_MAGNITUDE == 0.15
    assert trace_lines(uniform_field(c2=0.16), 5.0)
    assert trace_lines(uniform_field(c2=0.14), 5.0) == []


def test_lines_shorter_than_min_len_are_discarded():
    # len(points) * STEP < MIN_LEN drops the line: fewer than 12 points.
    assert MIN_LEN / STEP == 12
    assert trace_lines(uniform_field(mask_width=6), 5.0) == []
    kept = trace_lines(uniform_field(mask_width=7), 5.0)
    assert kept and all(len(line) * STEP >= MIN_LEN for line in kept)


def test_tracing_is_deterministic(density, dref):
    field = build_field(density, dref)
    assert trace_lines(field, HERO_DSEP) == trace_lines(field, HERO_DSEP)


def test_hero_and_thumb_tracings_are_independent(density, dref):
    field = build_field(density, dref)
    thumb_alone = trace_lines(field, THUMB_DSEP)
    trace_lines(field, HERO_DSEP)

    # Tracing the hero first leaves no state behind that changes the thumbnail.
    assert trace_lines(field, THUMB_DSEP) == thumb_alone
    assert len(thumb_alone) < len(trace_lines(field, HERO_DSEP))


# --- serialization ----------------------------------------------------------------


def test_to_path_serializes_each_line_with_one_decimal_and_keeps_the_last_point():
    lines = [[(0, 0), (1, 1), (2, 2), (3, 3)], [(10, 0), (10, 1)]]
    assert to_path(lines, 0.5, 2) == "M0.0 0.0L1.0 1.0L1.5 1.5M5.0 0.0L5.0 0.5"


def test_rendered_paths_use_one_decimal_place_and_stay_in_their_viewbox(rendered):
    for path, size in ((rendered.hero, HERO_SIZE), (rendered.thumb, THUMB_SIZE)):
        assert path.startswith("M")
        assert re.fullmatch(r"(M-?\d+\.\d -?\d+\.\d(L-?\d+\.\d -?\d+\.\d)*)+", path)
        values = [float(v) for v in NUMBER.findall(path)]
        assert min(values) >= -0.1 and max(values) <= size + 0.1


def test_rendering_is_deterministic(density, dref, rendered):
    again = render_fingerprint(density, dref)
    assert again.hero == rendered.hero and again.thumb == rendered.thumb


def test_thumbnail_is_its_own_tracing_not_a_scaled_hero(density, dref, rendered):
    field = build_field(density, dref)
    hero_lines = trace_lines(field, HERO_DSEP)
    scaled_hero = to_path(hero_lines, THUMB_SIZE / VIEW_SIZE, THUMB_POINT_STRIDE)

    assert rendered.hero == to_path(hero_lines, HERO_SIZE / VIEW_SIZE, HERO_POINT_STRIDE)
    assert rendered.thumb != scaled_hero
    assert rendered.thumb == to_path(trace_lines(field, THUMB_DSEP), THUMB_SIZE / VIEW_SIZE, THUMB_POINT_STRIDE)
    assert rendered.thumb.count("M") < rendered.hero.count("M")


def test_different_songs_render_differently(dref, rendered):
    other = render_fingerprint(cluster_density(0.7, 0.3), dref)
    assert other.thumb != rendered.thumb


# --- parameters -------------------------------------------------------------------


def test_params_hash_is_sha256_of_canonical_frozen_parameters():
    canonical = json.dumps(frozen_parameters(), sort_keys=True, separators=(",", ":"))
    assert params_hash() == hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    assert frozen_parameters()["version"] == "E1B1/1"
    assert frozen_parameters()["orientation_min_magnitude"] == 0.15
