// Pure layout math for the fingerprint chart. The chart is drawn at whatever
// pixel width its container has, so nothing here assumes a fixed width.

// Number of visual bars the fingerprint is drawn with, regardless of how
// many analysis frames the song actually has. Chosen empirically: a typical
// song has thousands of frames (~43/sec at the analysis hop length used),
// far too many to render as distinct bars. 40 keeps each bar wide enough to
// read as a discrete "DNA segment" rather than a blur, while still being
// enough bars to show the song's large-scale shape (intro build-up, a loud
// chorus, a quiet bridge) rather than collapsing it into a handful of blocks.
export const SEGMENT_COUNT = 40;

// Fraction of each segment's cell that the bar itself fills; the rest is the
// gap between bars.
const BAR_WIDTH_RATIO = 0.7;

// Converts a bucketed value into a bar height, scaled against `max`.
// Clamped to halfHeight because centroidMax is a percentile ceiling (not
// the true max) - a segment's value can legitimately exceed it, and should
// visually clip at full bar height rather than overflow past the chart.
export function computeBarHeight(value, max, halfHeight) {
  const rawHeight = (value / max) * halfHeight;
  return Math.min(rawHeight, halfHeight);
}

// Width of one segment's cell and of the bar drawn inside it. `barWidthRatio`
// lets a thinner style use the same cells; the default is the standard chart's.
export function getSegmentLayout(width, segmentCount, barWidthRatio = BAR_WIDTH_RATIO) {
  const cellWidth = width / segmentCount;
  return { cellWidth, barWidth: cellWidth * barWidthRatio };
}

// Maps a moment in the song to an x position. Used for both the playhead and
// the beat markers, so they always agree with each other regardless of how
// many bars the chart is bucketed into. Clamped to the chart so a time just
// past the end (e.g. a playhead reported slightly over duration) can't draw
// outside it.
export function timeToX(time, durationSeconds, width) {
  if (durationSeconds <= 0) return 0;
  const x = (time / durationSeconds) * width;
  return Math.min(Math.max(x, 0), width);
}
