// Spectral centroid has rare outlier frames (e.g. a single transient/click)
// that sit far above the vast majority of the song's real range - a true
// max lets one such frame flatten the entire visual scale. RMS energy
// doesn't show this problem (confirmed against real extracted audio: its
// 90th percentile sits at 64-100% of its true max, vs centroid's 33-87%),
// so only centroid uses percentile-based scaling; RMS keeps the true max.
export const CENTROID_SCALE_PERCENTILE = 95;

function combineArrays(valueArrays) {
  return valueArrays.filter(Boolean).flat();
}

// Computes one shared maximum across multiple songs' feature arrays, so
// two songs' fingerprint lines can be drawn on the same scale instead of
// each song normalizing against only its own loudest/brightest frame.
export function getSharedMax(valueArrays) {
  const combined = combineArrays(valueArrays);
  if (combined.length === 0) return 1;
  return Math.max(...combined);
}

// Standard linear-interpolation percentile (same method numpy's default
// uses): sorts the values, then interpolates between the two closest ranks
// when the requested percentile doesn't land exactly on one.
export function getPercentile(values, percentile) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const rank = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const weight = rank - lowerIndex;

  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

// Like getSharedMax, but caps the scale at a given percentile instead of the
// true max, so a handful of rare outlier frames (e.g. a single transient
// spike in spectral centroid) don't dominate the visual scale for both songs.
export function getSharedScaleMax(valueArrays, percentile) {
  const combined = combineArrays(valueArrays);
  if (combined.length === 0) return 1;
  return getPercentile(combined, percentile);
}
