// Pure calculations behind the Home page's "Fig. 1" specimen. Everything here
// reads real feature data (library features/*.json); nothing is invented.
// Values are for display only and never feed back into analysis.
import { bucketAverage } from "./bucketing";
import { SEGMENT_COUNT } from "./fingerprintLayout";
import { CENTROID_SCALE_PERCENTILE, getSharedMax, getSharedScaleMax } from "./scaling";

// One scale for every track on the page, using the same rules as Compare
// (true max for RMS, a high percentile for centroid) but across all loaded
// tracks instead of a pair. Bar heights then stay comparable when the
// visitor switches specimen or looks down the library index.
export function getLibraryScale(featuresList) {
  return {
    rmsMax: getSharedMax(featuresList.map((features) => features.rms_energy)),
    centroidMax: getSharedScaleMax(
      featuresList.map((features) => features.spectral_centroid),
      CENTROID_SCALE_PERCENTILE
    ),
  };
}

// The time span one display slice covers. bucketAverage gives every slice an
// equal share of the frames, and the chart draws them at equal widths, so
// slice i spans the i-th equal share of the track's duration.
export function sliceSpan(index, durationSeconds, segmentCount = SEGMENT_COUNT) {
  const length = durationSeconds / segmentCount;
  return { start: index * length, end: (index + 1) * length };
}

// Which display slice a moment falls in, clamped to the track.
export function sliceIndexAt(time, durationSeconds, segmentCount = SEGMENT_COUNT) {
  if (durationSeconds <= 0) return 0;
  const index = Math.floor((time / durationSeconds) * segmentCount);
  return Math.min(Math.max(index, 0), segmentCount - 1);
}

// The values the figure draws for one slice: its average RMS energy and its
// average spectral centroid (Hz), exactly as the bars at that position show.
export function readSlice(features, index, segmentCount = SEGMENT_COUNT) {
  const energy = bucketAverage(features.rms_energy, segmentCount)[index];
  const brightnessHz = bucketAverage(features.spectral_centroid, segmentCount)[index];
  return {
    index,
    ...sliceSpan(index, features.duration_seconds, segmentCount),
    energy,
    brightnessHz,
  };
}

// How often the analysis took a measurement, derived from the data itself
// (frames across the track's duration) rather than restating pipeline
// constants that could change.
export function measurementInterval(features) {
  const frames = features.rms_energy.length;
  return { frames, intervalMs: (features.duration_seconds / frames) * 1000 };
}

// "1,240 Hz". Centroid values are averages, so whole hertz is already more
// precision than the figure can show.
export function formatHz(hz) {
  return `${Math.round(hz).toLocaleString("en-US")} Hz`;
}

// "0:12.5": the readout needs sub-second precision because a slice of a
// 30-second clip lasts 0.75 s, which formatDuration would round away.
// Rounds to tenths first so 59.96 s becomes "1:00.0", not "0:60.0".
export function formatClock(seconds) {
  const tenths = Math.round(Math.max(0, seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const secondTenths = tenths % 600;
  const whole = String(Math.floor(secondTenths / 10)).padStart(2, "0");
  return `${minutes}:${whole}.${secondTenths % 10}`;
}
