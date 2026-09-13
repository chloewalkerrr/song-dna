// Computes one shared maximum across multiple songs' feature arrays, so
// two songs' fingerprint lines can be drawn on the same scale instead of
// each song normalizing against only its own loudest/brightest frame.
export function getSharedMax(valueArrays) {
  const combined = valueArrays.filter(Boolean).flat();
  if (combined.length === 0) return 1;
  return Math.max(...combined);
}
