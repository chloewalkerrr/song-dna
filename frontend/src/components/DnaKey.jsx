// Legend keys for Song DNA, drawn like the figure's own marks (FingerprintStrands
// "instrument") against the same centre line: energy rises from it as a solid
// bar, brightness hangs below it as an open bar, and a beat is a short tick at
// the top edge. They read in greyscale too. Shared by Home and Compare.
function DnaKey({ kind }) {
  return (
    <svg aria-hidden="true" width="14" height="20" viewBox="0 0 14 20" className="shrink-0">
      <line x1="0" y1="10" x2="14" y2="10" strokeWidth="1" className="stroke-foreground/30" />
      {kind === "energy" && <rect x="4" y="1" width="6" height="9" className="fill-foreground" />}
      {kind === "brightness" && (
        <rect x="4.5" y="10.5" width="5" height="8" strokeWidth="1" className="fill-none stroke-foreground/75" />
      )}
      {kind === "beats" && (
        <line x1="7" y1="0" x2="7" y2="6" strokeWidth="1.5" className="stroke-muted-foreground" />
      )}
    </svg>
  );
}

export default DnaKey;
