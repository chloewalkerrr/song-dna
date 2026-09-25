const CELL_WIDTH = 4;
const BAR_WIDTH = 2.6;
const HEIGHT = 40;
const CENTER_Y = HEIGHT / 2;
const MAX_BAR = CENTER_Y - 1;

// Full class strings (not built dynamically) so Tailwind can see them.
const TONES = {
  neutral: { energy: "fill-foreground/60", brightness: "fill-foreground/30" },
  A: { energy: "fill-violet-500", brightness: "fill-violet-500/40" },
  B: { energy: "fill-blue-500", brightness: "fill-blue-500/40" },
};

// A small monochrome version of the fingerprint for library cards: energy
// bars rise above the centre line, brightness bars hang below it, using the
// track's precomputed 0-1 preview values. Neutral until the card is selected.
function MiniFingerprint({ preview, tone = "neutral" }) {
  const classes = TONES[tone];
  const width = preview.energy.length * CELL_WIDTH;

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-10 w-full"
      aria-hidden="true"
    >
      {preview.energy.map((energy, i) => {
        const x = i * CELL_WIDTH + (CELL_WIDTH - BAR_WIDTH) / 2;
        const up = Math.max(energy * MAX_BAR, 0.5);
        const down = Math.max(preview.brightness[i] * MAX_BAR, 0.5);
        return (
          <g key={i}>
            <rect x={x} y={CENTER_Y - up} width={BAR_WIDTH} height={up} className={classes.energy} />
            <rect x={x} y={CENTER_Y} width={BAR_WIDTH} height={down} className={classes.brightness} />
          </g>
        );
      })}
    </svg>
  );
}

export default MiniFingerprint;
