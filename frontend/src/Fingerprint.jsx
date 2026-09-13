import { bucketAverage } from "./bucketing";

const WIDTH = 900;
const HEIGHT = 200;
const CENTER_Y = HEIGHT / 2;
const HALF_HEIGHT = HEIGHT / 2;

// Number of visual bars the fingerprint is drawn with, regardless of how
// many analysis frames the song actually has. Chosen empirically: a typical
// song has thousands of frames (~43/sec at the analysis hop length used),
// far too many to render as distinct bars. 40 keeps each bar wide enough to
// read as a discrete "DNA segment" rather than a blur, while still being
// enough bars to show the song's large-scale shape (intro build-up, a loud
// chorus, a quiet bridge) rather than collapsing it into a handful of blocks.
const SEGMENT_COUNT = 40;

// Converts a bucketed value into a bar height, scaled against `max`.
// Clamped to halfHeight because centroidMax is a percentile ceiling (not
// the true max) - a segment's value can legitimately exceed it, and should
// visually clip at full bar height rather than overflow past the chart.
export function computeBarHeight(value, max, halfHeight) {
  const rawHeight = (value / max) * halfHeight;
  return Math.min(rawHeight, halfHeight);
}

function LegendItem({ className, label }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className={`inline-block h-2 w-3.5 rounded-sm ${className}`} />
      {label}
    </div>
  );
}

function Fingerprint({ features, currentTime, rmsMax, centroidMax }) {
  const cellWidth = WIDTH / SEGMENT_COUNT;
  const barWidth = cellWidth * 0.7;

  const energySegments = bucketAverage(features.rms_energy, SEGMENT_COUNT);
  const brightnessSegments = bucketAverage(features.spectral_centroid, SEGMENT_COUNT);

  const playheadX = (currentTime / features.duration_seconds) * WIDTH;

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <svg width={WIDTH} height={HEIGHT} style={{ display: "block" }}>
        <line x1="0" y1={CENTER_Y} x2={WIDTH} y2={CENTER_Y} className="stroke-border" strokeWidth="1" />

        {energySegments.map((value, i) => {
          const height = computeBarHeight(value, rmsMax, HALF_HEIGHT);
          const x = i * cellWidth + (cellWidth - barWidth) / 2;
          return (
            <rect
              key={`energy-${i}`}
              x={x}
              y={CENTER_Y - height}
              width={barWidth}
              height={height}
              rx={barWidth / 2}
              className="fill-blue-500"
            />
          );
        })}

        {brightnessSegments.map((value, i) => {
          const height = computeBarHeight(value, centroidMax, HALF_HEIGHT);
          const x = i * cellWidth + (cellWidth - barWidth) / 2;
          return (
            <rect
              key={`brightness-${i}`}
              x={x}
              y={CENTER_Y}
              width={barWidth}
              height={height}
              rx={barWidth / 2}
              className="fill-emerald-500"
            />
          );
        })}

        <line x1={playheadX} y1={0} x2={playheadX} y2={HEIGHT} className="stroke-foreground" strokeWidth="1" />
      </svg>

      <div className="mt-4 flex gap-5">
        <LegendItem className="bg-blue-500" label="Energy" />
        <LegendItem className="bg-emerald-500" label="Brightness" />
      </div>
    </div>
  );
}

export default Fingerprint;
