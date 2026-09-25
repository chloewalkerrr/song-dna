import { bucketAverage } from "./bucketing";
import { thinBeatTimes } from "./beatThinning";
import { computeBarHeight, getSegmentLayout, timeToX } from "./fingerprintLayout";
import { useElementWidth } from "@/hooks/use-element-width";

const HEIGHT = 200;
const CENTER_Y = HEIGHT / 2;
const HALF_HEIGHT = HEIGHT / 2;

// Minimum on-screen gap (in pixels) between beat markers. A real song can
// have hundreds of beats packed into this chart - close enough together to
// overlap into a smear rather than read as distinct dots.
// Verified visually (not just by the math): 8px - only slightly more than
// the marker's own diameter (r=3, see below) - still rendered as a
// near-continuous dashed line on a real 350s/802-beat song. 18px is what
// it actually took to see individual, separated dots on that same song.
const MIN_BEAT_MARKER_SPACING_PX = 18;

// Number of visual bars the fingerprint is drawn with, regardless of how
// many analysis frames the song actually has. Chosen empirically: a typical
// song has thousands of frames (~43/sec at the analysis hop length used),
// far too many to render as distinct bars. 40 keeps each bar wide enough to
// read as a discrete "DNA segment" rather than a blur, while still being
// enough bars to show the song's large-scale shape (intro build-up, a loud
// chorus, a quiet bridge) rather than collapsing it into a handful of blocks.
const SEGMENT_COUNT = 40;

function LegendItem({ className, label }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className={`inline-block h-2 w-3.5 rounded-sm ${className}`} />
      {label}
    </div>
  );
}

function LegendDot({ label }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span className="inline-block size-1.5 rounded-full bg-foreground/50" />
      {label}
    </div>
  );
}

// Draws at the width of its container (measured, not fixed), so it fits a
// half-width comparison card as well as a full-width one.
function Fingerprint({ features, currentTime, rmsMax, centroidMax }) {
  const [containerRef, width] = useElementWidth();

  const { cellWidth, barWidth } = getSegmentLayout(width, SEGMENT_COUNT);

  const energySegments = bucketAverage(features.rms_energy, SEGMENT_COUNT);
  const brightnessSegments = bucketAverage(features.spectral_centroid, SEGMENT_COUNT);

  const playheadX = timeToX(currentTime, features.duration_seconds, width);

  const displayedBeatTimes = thinBeatTimes(
    features.beat_times ?? [],
    features.duration_seconds,
    width,
    MIN_BEAT_MARKER_SPACING_PX
  );

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div ref={containerRef} className="w-full" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="block">
            <line x1="0" y1={CENTER_Y} x2={width} y2={CENTER_Y} className="stroke-border" strokeWidth="1" />

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
                  className="fill-violet-500"
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
                  className="fill-cyan-500"
                />
              );
            })}

            {displayedBeatTimes.map((beatTime, i) => (
              <circle
                key={`beat-${i}`}
                cx={timeToX(beatTime, features.duration_seconds, width)}
                cy={4}
                r={3}
                className="fill-foreground/50"
              />
            ))}

            <line x1={playheadX} y1={0} x2={playheadX} y2={HEIGHT} className="stroke-foreground" strokeWidth="1" />
          </svg>
        )}
      </div>

      <div className="mt-4 flex gap-5">
        <LegendItem className="bg-violet-500" label="Energy" />
        <LegendItem className="bg-cyan-500" label="Brightness" />
        <LegendDot label="Beats" />
      </div>
    </div>
  );
}

export default Fingerprint;
