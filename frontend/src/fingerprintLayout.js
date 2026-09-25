// Pure layout math for the fingerprint chart. The chart is drawn at whatever
// pixel width its container has, so nothing here assumes a fixed width.

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

// Width of one segment's cell and of the bar drawn inside it.
export function getSegmentLayout(width, segmentCount) {
  const cellWidth = width / segmentCount;
  return { cellWidth, barWidth: cellWidth * BAR_WIDTH_RATIO };
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
