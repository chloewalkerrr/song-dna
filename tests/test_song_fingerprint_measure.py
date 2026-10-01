import math

import numpy as np
import pytest

from song_dna.song_fingerprint.constants import GRID, GRID_SIZE, PAD, SAMPLE_RATE
from song_dna.song_fingerprint.measure import (
    BELOW_VISITED_THRESHOLD,
    NO_FRAMES_IN_DOMAIN,
    NO_VOICED_FRAMES,
    FrameFeatures,
    chroma_entropy,
    e1_cells,
    e1_density,
    frame_features,
    measure_waveform,
    normalized_brightness,
    unavailable_reason,
)

LOUD_DB = -20.0
MID_BRIGHTNESS = math.log2(math.sqrt(50 * 11025))  # halfway on the log axis: y = 0.5


def frames(entropy, log2_centroid, loudness_db=LOUD_DB) -> FrameFeatures:
    """Synthetic per-frame features; scalars are broadcast to the longest input."""
    n = max(np.size(entropy), np.size(log2_centroid), np.size(loudness_db))
    return FrameFeatures(
        loudness_db=np.broadcast_to(np.asarray(loudness_db, float), n).copy(),
        log2_centroid=np.broadcast_to(np.asarray(log2_centroid, float), n).copy(),
        chroma_entropy=np.broadcast_to(np.asarray(entropy, float), n).copy(),
    )


def tone(frequency, seconds=3.0, amplitude=0.5):
    t = np.arange(int(SAMPLE_RATE * seconds)) / SAMPLE_RATE
    return (amplitude * np.sin(2 * np.pi * frequency * t)).astype(np.float32)


# --- chroma entropy ---------------------------------------------------------------


def test_chroma_entropy_is_zero_for_one_pitch_class_and_one_for_all_equal():
    one_class = np.zeros((12, 1))
    one_class[3, 0] = 5.0
    flat = np.ones((12, 1))

    assert chroma_entropy(one_class)[0] == pytest.approx(0.0, abs=1e-9)
    assert chroma_entropy(flat)[0] == pytest.approx(1.0)


def test_chroma_entropy_of_two_equal_classes_is_one_bit_over_log2_12():
    two = np.zeros((12, 1))
    two[[0, 7], 0] = 1.0
    assert chroma_entropy(two)[0] == pytest.approx(1 / math.log2(12))


def test_chroma_entropy_of_an_all_zero_frame_is_finite():
    assert chroma_entropy(np.zeros((12, 2))).tolist() == [0.0, 0.0]


def test_a_pure_tone_is_more_concentrated_than_white_noise():
    noise = np.random.default_rng(0).normal(0, 0.1, SAMPLE_RATE * 3).astype(np.float32)
    tone_entropy = np.median(frame_features(tone(440)).chroma_entropy)
    noise_entropy = np.median(frame_features(noise).chroma_entropy)

    assert tone_entropy < 0.5
    assert noise_entropy > 0.95


# --- brightness mapping -----------------------------------------------------------


def test_brightness_domain_maps_50_hz_to_0_and_11025_hz_to_1():
    values = normalized_brightness(np.log2([50.0, 11025.0, math.sqrt(50 * 11025)]))
    assert values.tolist() == pytest.approx([0.0, 1.0, 0.5])


def test_brightness_outside_the_domain_is_not_clipped():
    values = normalized_brightness(np.log2([25.0, 22050.0]))
    assert values[0] < 0 and values[1] > 1


def test_a_440_hz_tone_has_a_440_hz_centroid():
    assert 2 ** np.median(frame_features(tone(440)).log2_centroid) == pytest.approx(440, rel=0.02)


# --- binning ----------------------------------------------------------------------


def test_binning_puts_domain_corners_in_the_corner_cells_and_flips_y():
    x = np.array([0.0, 1.0, 0.0, 1.0])
    y = np.array([1.0, 0.0, 0.0, 1.0])
    rows, cols, in_domain = e1_cells(x, y)

    assert in_domain.all()
    # Brightest (y = 1) is the top row; x = 1 and y = 0 fall in the last cell.
    assert rows.tolist() == [PAD, PAD + GRID - 1, PAD + GRID - 1, PAD]
    assert cols.tolist() == [PAD, PAD + GRID - 1, PAD, PAD + GRID - 1]


def test_binning_is_hard_integer_truncation():
    x = np.array([0.5, 1 / GRID - 1e-9, 1 / GRID])
    y = np.array([0.5, 0.5, 0.5])
    rows, cols, _ = e1_cells(x, y)

    assert cols.tolist() == [PAD + 128, PAD, PAD + 1]
    assert rows.tolist() == [PAD + 128] * 3


def test_binning_drops_out_of_domain_and_nan_points_instead_of_clipping():
    x = np.array([0.5, -0.01, 1.01, 0.5, 0.5, np.nan])
    y = np.array([0.5, 0.5, 0.5, -0.2, 1.3, 0.5])
    rows, cols, in_domain = e1_cells(x, y)

    assert in_domain.tolist() == [True, False, False, False, False, False]
    assert rows.tolist() == [PAD + 128] and cols.tolist() == [PAD + 128]


def test_binning_is_deterministic():
    rng = np.random.default_rng(1)
    x, y = rng.random(500), rng.random(500)
    first, second = e1_cells(x, y), e1_cells(x.copy(), y.copy())
    for a, b in zip(first, second):
        assert np.array_equal(a, b)


# --- density ----------------------------------------------------------------------


def test_density_is_a_blurred_fraction_of_time_on_the_padded_grid():
    # x = 0.502 -> column int(128.5) = 128; y = 0.502 -> row int(0.498 * 256) = 127.
    # (Values away from cell edges, so float rounding in log2 can't move them.)
    low, high = math.log2(50), math.log2(11025)
    measurement = e1_density(frames(np.full(10, 0.502), low + 0.502 * (high - low)))

    assert measurement.density.shape == (GRID_SIZE, GRID_SIZE)
    assert measurement.density.sum() == pytest.approx(1.0)
    assert np.unravel_index(measurement.density.argmax(), measurement.density.shape) == (
        PAD + 127,
        PAD + 128,
    )


def test_silence_gate_keeps_frames_at_exactly_minus_60_db():
    loudness = np.array([-60.0, -60.0001, -80.0, 0.0])
    measurement = e1_density(frames(0.5, MID_BRIGHTNESS, loudness))

    assert measurement.total_frames == 4
    assert measurement.voiced_frames == 2


def test_silent_frames_still_count_in_normalization():
    voiced_only = e1_density(frames(0.5, MID_BRIGHTNESS, np.full(5, LOUD_DB)))
    half_silent = e1_density(frames(0.5, MID_BRIGHTNESS, [LOUD_DB] * 5 + [-90.0] * 5))

    assert half_silent.total_frames == 10 and half_silent.voiced_frames == 5
    assert half_silent.density.sum() == pytest.approx(0.5)
    assert np.allclose(half_silent.density, voiced_only.density / 2)


def test_out_of_domain_frames_are_dropped_and_still_count_in_normalization():
    entropy = np.array([0.5, 0.5, 1.2, 0.5])
    centroid = np.array([MID_BRIGHTNESS, MID_BRIGHTNESS, MID_BRIGHTNESS, math.log2(20.0)])
    measurement = e1_density(frames(entropy, centroid))

    assert measurement.in_domain_frames == 2
    assert measurement.out_of_domain_frames == 2
    assert measurement.density.sum() == pytest.approx(0.5)
    # Clipping would have put mass at the right edge (x = 1) and bottom edge (y = 0).
    assert measurement.density[:, PAD + GRID - 1].max() < 1e-6
    assert measurement.density[PAD + GRID - 1, :].max() < 1e-6


def test_the_gate_does_not_change_frame_features():
    loudness = np.array([-90.0, LOUD_DB])
    features = frames(0.5, MID_BRIGHTNESS, loudness)
    before = features.loudness_db.copy()

    e1_density(features)

    assert np.array_equal(features.loudness_db, before)


# --- unavailable fingerprints ------------------------------------------------------


def test_digital_silence_has_no_fingerprint():
    measurement = measure_waveform(np.zeros(SAMPLE_RATE * 2, dtype=np.float32))

    assert measurement.total_frames > 0
    assert measurement.voiced_frames == 0
    assert not measurement.density.any()
    assert unavailable_reason(measurement) == NO_VOICED_FRAMES


def test_a_quiet_tone_below_the_gate_has_no_fingerprint():
    measurement = measure_waveform(tone(440, amplitude=10 ** (-80 / 20)))
    assert unavailable_reason(measurement) == NO_VOICED_FRAMES


def test_voiced_frames_all_out_of_domain_have_no_fingerprint():
    measurement = e1_density(frames(0.5, math.log2(20.0), np.full(20, LOUD_DB)))
    assert unavailable_reason(measurement) == NO_FRAMES_IN_DOMAIN


def test_too_little_voiced_time_to_visit_any_cell_has_no_fingerprint():
    # One voiced frame in 1000: its blurred peak (~1/(1000 * 2 pi * 25)) is below T_VISITED.
    loudness = np.array([LOUD_DB] + [-90.0] * 999)
    measurement = e1_density(frames(0.5, MID_BRIGHTNESS, loudness))
    assert unavailable_reason(measurement) == BELOW_VISITED_THRESHOLD


def test_an_audible_tone_has_a_fingerprint():
    assert unavailable_reason(measure_waveform(tone(440))) is None
