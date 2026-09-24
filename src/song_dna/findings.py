import numpy as np

from song_dna.features import AudioFeatures

# Below this relative difference, two values are treated as "about the
# same" rather than forcing a comparison that isn't really there. 10% is
# small enough that it's plausibly just natural variation between two
# performances/masters rather than a meaningful difference.
NEGLIGIBLE_DIFFERENCE = 0.10

# Above this relative difference, a comparison is called out as "notably"
# rather than just "somewhat" - chosen as 3x the negligible threshold, so
# the "somewhat" band (10%-30%) covers differences that are real but
# modest, and "notably" is reserved for a gap large enough to be
# unambiguous. These are heuristic buckets for calibrating language to
# the size of the gap, not a claim about what a listener would perceive.
NOTABLE_DIFFERENCE = 0.30

# Used only for the first-half-vs-second-half trend comparison. Set
# looser than the thresholds above (15% vs. 10%) because splitting a
# song in two and averaging each half is a noisier estimate than
# averaging the whole song - a smaller threshold here would flag minor
# fluctuation as a "trend" too often.
TREND_DIFFERENCE = 0.15


def _relative_difference(a: float, b: float) -> float:
    """
    Symmetric percentage difference between two non-negative values,
    expressed as a fraction of their average (e.g. 0.25 means the two
    values differ by 25% of their average magnitude).

    Dividing by the average of the two values (rather than by one of
    them) keeps the result symmetric - comparing A to B gives the same
    magnitude as comparing B to A, regardless of which happens to be
    larger.
    """
    average = (a + b) / 2
    if average == 0:
        return 0.0
    return abs(a - b) / average


def _classify_trend(values: np.ndarray) -> str:
    """
    Classify a feature array as "builds", "fades", or "flat" by comparing
    the mean of its first half to the mean of its second half, relative
    to the track's overall mean.
    """
    if len(values) < 2:
        return "flat"

    midpoint = len(values) // 2
    first_half_mean = float(np.mean(values[:midpoint]))
    second_half_mean = float(np.mean(values[midpoint:]))
    overall_mean = float(np.mean(values))

    if overall_mean == 0:
        return "flat"

    relative_delta = (second_half_mean - first_half_mean) / overall_mean

    if relative_delta > TREND_DIFFERENCE:
        return "builds"
    if relative_delta < -TREND_DIFFERENCE:
        return "fades"
    return "flat"


def _average_energy_finding(song_a, song_b, label_a, label_b) -> dict:
    mean_a = float(np.mean(song_a.rms_energy))
    mean_b = float(np.mean(song_b.rms_energy))
    diff = _relative_difference(mean_a, mean_b)
    louder, quieter = (label_a, label_b) if mean_a >= mean_b else (label_b, label_a)

    if diff < NEGLIGIBLE_DIFFERENCE:
        text = f"{label_a} and {label_b} have similar average energy."
    elif diff < NOTABLE_DIFFERENCE:
        text = f"{louder} is somewhat louder on average than {quieter}."
    else:
        text = f"{louder} is notably louder on average than {quieter}."

    return {"category": "average_energy", "text": text}


def _dynamic_range_finding(song_a, song_b, label_a, label_b) -> dict:
    std_a = float(np.std(song_a.rms_energy))
    std_b = float(np.std(song_b.rms_energy))
    diff = _relative_difference(std_a, std_b)
    more_varied, more_consistent = (label_a, label_b) if std_a >= std_b else (label_b, label_a)

    if diff < NEGLIGIBLE_DIFFERENCE:
        text = f"{label_a} and {label_b} have similar dynamic range."
    elif diff < NOTABLE_DIFFERENCE:
        text = f"{more_varied} has somewhat more dynamic range than {more_consistent}."
    else:
        text = (
            f"{more_varied} has more dynamic range, swinging between quiet and loud "
            f"sections, while {more_consistent} stays more consistently energetic."
        )

    return {"category": "dynamic_range", "text": text}


_TREND_PHRASES = {
    "builds": {
        "singular": "builds gradually toward a more energetic second half",
        "plural": "build gradually toward a more energetic second half",
    },
    "fades": {
        "singular": "starts stronger and eases off through the second half",
        "plural": "start stronger and ease off through the second half",
    },
    "flat": {
        "singular": "stays relatively flat throughout",
        "plural": "stay relatively flat throughout",
    },
}


def _energy_trend_finding(song_a, song_b, label_a, label_b) -> dict:
    trend_a = _classify_trend(song_a.rms_energy)
    trend_b = _classify_trend(song_b.rms_energy)

    if trend_a == trend_b:
        text = f"{label_a} and {label_b} both {_TREND_PHRASES[trend_a]['plural']}."
    else:
        text = (
            f"{label_a} {_TREND_PHRASES[trend_a]['singular']}; "
            f"{label_b} {_TREND_PHRASES[trend_b]['singular']}."
        )

    return {"category": "energy_trend", "text": text}


def _brightness_finding(song_a, song_b, label_a, label_b) -> dict:
    mean_a = float(np.mean(song_a.spectral_centroid))
    mean_b = float(np.mean(song_b.spectral_centroid))
    diff = _relative_difference(mean_a, mean_b)
    brighter, duller = (label_a, label_b) if mean_a >= mean_b else (label_b, label_a)

    if diff < NEGLIGIBLE_DIFFERENCE:
        text = f"{label_a} and {label_b} have similar average brightness."
    elif diff < NOTABLE_DIFFERENCE:
        text = f"{brighter} is somewhat brighter on average than {duller}."
    else:
        text = (
            f"{brighter} is spectrally brighter on average than {duller}, "
            f"suggesting more high-frequency content."
        )

    return {"category": "brightness", "text": text}


def generate_findings(
    song_a: AudioFeatures,
    song_b: AudioFeatures,
    label_a: str = "Song A",
    label_b: str = "Song B",
) -> list[dict]:
    """
    Compare two songs' already-extracted RMS energy and spectral centroid
    data and return a small list of plain-language findings.

    Each finding is a simple, rule-based, explainable comparison that
    traces back to an actual computed number (a mean, a standard
    deviation, or a first-half/second-half split) - no new audio
    features, no machine learning, no fuzzy scoring. When the difference
    between two songs is too small to be meaningful (see
    NEGLIGIBLE_DIFFERENCE), the finding says so honestly instead of
    forcing a comparison that isn't really there.

    Findings are strictly about the measured signal (loudness, dynamic
    range, energy trend, brightness) - they make no claims about genre,
    emotion, or quality.

    Returns
    -------
    list[dict], each with a "category" (str) and "text" (str) key, in a
    fixed order: average_energy, dynamic_range, energy_trend, brightness.
    """
    return [
        _average_energy_finding(song_a, song_b, label_a, label_b),
        _dynamic_range_finding(song_a, song_b, label_a, label_b),
        _energy_trend_finding(song_a, song_b, label_a, label_b),
        _brightness_finding(song_a, song_b, label_a, label_b),
    ]
