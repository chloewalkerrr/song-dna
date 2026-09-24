// Thins a list of beat timestamps for display only (the underlying
// beat_times data is never modified) so markers render as visually
// distinct dots instead of overlapping into a smear on long/fast songs.
//
// A fixed-width chart maps time to pixels linearly (x = time * pixelsPerSecond),
// so a minimum on-screen pixel gap between markers corresponds to a minimum
// time gap - converting once up front avoids recomputing an x position for
// every beat just to compare distances.
//
// This is a greedy "keep if far enough from the last *kept* beat" thin,
// not "keep every Nth beat": picking every Nth beat assumes beats are
// evenly spaced and can still under- or over-thin whenever the tempo
// (or the thinning ratio) doesn't divide evenly, or the track has any
// tempo variation. Comparing against the last kept beat instead adapts
// to locally uneven spacing and guarantees every kept marker really is
// at least minPixelSpacing from its visual neighbor.
export function thinBeatTimes(beatTimes, durationSeconds, width, minPixelSpacing) {
  if (beatTimes.length === 0 || durationSeconds <= 0) return [];

  const pixelsPerSecond = width / durationSeconds;
  const minTimeSpacing = minPixelSpacing / pixelsPerSecond;

  const thinned = [beatTimes[0]];
  for (let i = 1; i < beatTimes.length; i++) {
    if (beatTimes[i] - thinned[thinned.length - 1] >= minTimeSpacing) {
      thinned.push(beatTimes[i]);
    }
  }

  return thinned;
}
