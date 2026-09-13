// Downsamples a frame-level feature array into a fixed number of segments
// for display only, by averaging the frames that fall in each segment.
// This never changes the underlying analysis data - it's purely how many
// discrete bars a fingerprint is drawn with.
export function bucketAverage(values, segmentCount) {
  if (values.length === 0 || segmentCount <= 0) return [];

  const bucketSize = values.length / segmentCount;
  const buckets = [];

  for (let i = 0; i < segmentCount; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.max(Math.floor((i + 1) * bucketSize), start + 1);
    const frames = values.slice(start, end);
    const average = frames.reduce((sum, v) => sum + v, 0) / frames.length;
    buckets.push(average);
  }

  return buckets;
}
