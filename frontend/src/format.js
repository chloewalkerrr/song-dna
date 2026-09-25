// Formats a length in seconds as m:ss (e.g. 350.4 -> "5:50"). Rounds to the
// nearest second; minutes aren't capped since library tracks are a few minutes long.
export function formatDuration(totalSeconds) {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
