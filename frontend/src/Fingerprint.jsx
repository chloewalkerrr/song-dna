import FingerprintStrands from "./FingerprintStrands";
import { useElementWidth } from "@/hooks/use-element-width";

const HEIGHT = 200;

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
// half-width comparison card as well as a full-width one. The strands
// themselves are drawn by FingerprintStrands, which Home shares.
function Fingerprint({ features, currentTime, rmsMax, centroidMax }) {
  const [containerRef, width] = useElementWidth();

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div ref={containerRef} className="w-full" style={{ height: HEIGHT }}>
        {width > 0 && (
          <FingerprintStrands
            features={features}
            width={width}
            height={HEIGHT}
            rmsMax={rmsMax}
            centroidMax={centroidMax}
            currentTime={currentTime}
          />
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
