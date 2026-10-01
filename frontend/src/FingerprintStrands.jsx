import { bucketAverage } from "./bucketing";
import { thinBeatTimes } from "./beatThinning";
import { SEGMENT_COUNT, computeBarHeight, getSegmentLayout, timeToX } from "./fingerprintLayout";

// Minimum on-screen gap (in pixels) between beat markers. A real song can
// have hundreds of beats packed into this chart - close enough together to
// overlap into a smear rather than read as distinct dots.
// Verified visually (not just by the math): 8px - only slightly more than
// the marker's own diameter (r=3, see below) - still rendered as a
// near-continuous dashed line on a real 350s/802-beat song. 18px is what
// it actually took to see individual, separated dots on that same song.
const MIN_BEAT_MARKER_SPACING_PX = 18;

// Full class strings (not built dynamically) so Tailwind can see them.
// "data" is the fingerprint's own palette (energy violet, brightness cyan);
// "muted" draws the same shape in neutral tones, for tracks that are shown
// for reference rather than being the one under discussion.
const TONES = {
  data: { energy: "fill-violet-500", brightness: "fill-cyan-500" },
  muted: { energy: "fill-foreground/40", brightness: "fill-foreground/20" },
};

// The "instrument" variant (Home): the same measurements drawn in neutral ink,
// with energy and brightness told apart by form, not colour - solid bars rise
// for energy, open (outlined) bars hang for brightness - so the two strands
// stay distinct in greyscale and for colour-blind readers. Bars fill 30% of
// each cell (chosen in the Home design mockup: thin enough that the outline of
// a brightness bar reads as open at the 40-segment widths Home uses).
// The playhead is the one warm accent: the ochre "now" token (index.css)
// marks where playback is.
// `tone` doesn't apply to this variant.
const INSTRUMENT_BAR_WIDTH_RATIO = 0.3;
const INSTRUMENT = {
  energy: "fill-foreground",
  brightness: "fill-none stroke-foreground/75",
  beat: "stroke-muted-foreground",
  playhead: "stroke-now",
};
// Beat ticks run from the top edge down this far, in pixels.
const BEAT_TICK_LENGTH = 6;

// The dual-strand fingerprint itself, drawn at an explicit pixel size:
// energy (RMS) bars rise above the centre line, brightness (spectral
// centroid) bars hang below it, both averaged into SEGMENT_COUNT slices and
// scaled against the shared maxima passed in. Beat markers and the playhead
// are positioned by time, so they don't depend on the slice count.
function FingerprintStrands({
  features,
  width,
  height,
  rmsMax,
  centroidMax,
  currentTime = 0,
  showPlayhead = true,
  showBeats = true,
  tone = "data",
  variant = "default",
}) {
  const centerY = height / 2;
  const halfHeight = height / 2;
  const classes = TONES[tone];
  const instrument = variant === "instrument";

  const { cellWidth, barWidth } = getSegmentLayout(
    width,
    SEGMENT_COUNT,
    instrument ? INSTRUMENT_BAR_WIDTH_RATIO : undefined
  );

  const energySegments = bucketAverage(features.rms_energy, SEGMENT_COUNT);
  const brightnessSegments = bucketAverage(features.spectral_centroid, SEGMENT_COUNT);

  const playheadX = timeToX(currentTime, features.duration_seconds, width);

  const displayedBeatTimes = showBeats
    ? thinBeatTimes(
        features.beat_times ?? [],
        features.duration_seconds,
        width,
        MIN_BEAT_MARKER_SPACING_PX
      )
    : [];

  return (
    <svg width={width} height={height} className="block">
      <line x1="0" y1={centerY} x2={width} y2={centerY} className="stroke-border" strokeWidth="1" />

      {energySegments.map((value, i) => {
        const barHeight = computeBarHeight(value, rmsMax, halfHeight);
        const x = i * cellWidth + (cellWidth - barWidth) / 2;
        if (instrument) {
          // Square ends, snapped to whole pixels (display only) so thin bars stay crisp.
          return (
            <rect
              key={`energy-${i}`}
              x={Math.round(x)}
              y={centerY - barHeight}
              width={barWidth}
              height={barHeight}
              className={INSTRUMENT.energy}
            />
          );
        }
        return (
          <rect
            key={`energy-${i}`}
            x={x}
            y={centerY - barHeight}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            className={classes.energy}
          />
        );
      })}

      {brightnessSegments.map((value, i) => {
        const barHeight = computeBarHeight(value, centroidMax, halfHeight);
        const x = i * cellWidth + (cellWidth - barWidth) / 2;
        if (instrument) {
          // A 1px outline drawn half a pixel inside the bar's box, so the open
          // bar has the same outer width and length as a solid one would.
          return (
            <rect
              key={`brightness-${i}`}
              x={Math.round(x) + 0.5}
              y={centerY + 0.5}
              width={Math.max(barWidth - 1, 0)}
              height={Math.max(barHeight - 1, 0)}
              strokeWidth="1"
              className={INSTRUMENT.brightness}
            />
          );
        }
        return (
          <rect
            key={`brightness-${i}`}
            x={x}
            y={centerY}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            className={classes.brightness}
          />
        );
      })}

      {displayedBeatTimes.map((beatTime, i) => {
        const beatX = timeToX(beatTime, features.duration_seconds, width);
        return instrument ? (
          <line
            key={`beat-${i}`}
            x1={beatX}
            y1={0}
            x2={beatX}
            y2={BEAT_TICK_LENGTH}
            strokeWidth="1"
            className={INSTRUMENT.beat}
          />
        ) : (
          <circle key={`beat-${i}`} cx={beatX} cy={4} r={3} className="fill-foreground/50" />
        );
      })}

      {showPlayhead &&
        (instrument ? (
          <line x1={playheadX} y1={0} x2={playheadX} y2={height} className={INSTRUMENT.playhead} strokeWidth="1.5" />
        ) : (
          <line x1={playheadX} y1={0} x2={playheadX} y2={height} className="stroke-foreground" strokeWidth="1" />
        ))}
    </svg>
  );
}

export default FingerprintStrands;
