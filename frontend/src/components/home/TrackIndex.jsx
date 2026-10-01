import FingerprintStrands from "@/FingerprintStrands";
import { formatDuration } from "@/format";
import { useElementWidth } from "@/hooks/use-element-width";
import { cn } from "@/lib/utils";

const STRAND_HEIGHT = 40;

// A small copy of the track's fingerprint on the page's shared scale, so the
// rows can be compared by eye. Beats are left out: at this size they crowd
// the strands without helping the comparison.
function RowStrand({ features, scale, current }) {
  const [ref, width] = useElementWidth();
  return (
    <div ref={ref} className="w-full contain-inline-size" style={{ height: STRAND_HEIGHT }}>
      {width > 0 && (
        <FingerprintStrands
          features={features}
          width={width}
          height={STRAND_HEIGHT}
          rmsMax={scale.rmsMax}
          centroidMax={scale.centroidMax}
          showBeats={false}
          showPlayhead={false}
          tone={current ? "data" : "muted"}
        />
      )}
    </div>
  );
}

// The library as a numbered index: choosing a row makes that track Fig. 1.
// The current row stays marked in place; the page never scrolls on its own.
function TrackIndex({ tracks, featuresById, scale, currentId, onSelect }) {
  return (
    <ol className="border-t">
      {tracks.map((track, i) => {
        const features = featuresById.get(track.id);
        const current = track.id === currentId;
        return (
          <li key={track.id} className="border-b">
            <button
              type="button"
              aria-pressed={current}
              disabled={!features}
              onClick={() => onSelect(track.id)}
              className={cn(
                "grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-2 py-3 text-left outline-none transition-colors",
                "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
                "lg:grid-cols-[1.75rem_10rem_2.5rem_minmax(0,1fr)] lg:gap-x-4",
                current && "bg-muted hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "text-sm tabular-nums",
                  current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn("truncate text-sm", current && "font-semibold")}>
                {track.title}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatDuration(track.duration_seconds)}
              </span>
              <span className="col-span-2 col-start-2 lg:col-span-1 lg:col-start-auto">
                {features ? (
                  <RowStrand features={features} scale={scale} current={current} />
                ) : (
                  <span className="text-xs text-muted-foreground">Analysis unavailable</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default TrackIndex;
