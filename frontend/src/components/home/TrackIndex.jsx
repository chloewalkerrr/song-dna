import SongFingerprint from "@/components/SongFingerprint";
import { formatDuration } from "@/format";
import { cn } from "@/lib/utils";

// The library as a numbered index: choosing a row makes that track the page's
// current track (Fig. 1 and the figures below it). Each row shows the track's
// Song Fingerprint thumbnail at its native 52 px, neutral like the library
// cards. The current row is marked by more than colour: an ochre "now" rule
// and number, a heavier title, and full-strength ink where the other
// thumbnails are faded. The page never scrolls on its own.
function TrackIndex({ tracks, featuresById, currentId, onSelect }) {
  return (
    <ol className="border-t">
      {tracks.map((track, i) => {
        // A track without its analysis can't drive the figures below, so it can't be chosen.
        const available = featuresById.has(track.id);
        const current = track.id === currentId;
        return (
          <li key={track.id} className="border-b">
            <button
              type="button"
              aria-pressed={current}
              disabled={!available}
              onClick={() => onSelect(track.id)}
              className={cn(
                "relative grid w-full grid-cols-[1.5rem_3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-2.5 text-left outline-none transition-colors",
                "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                current && "bg-muted/60 hover:bg-muted/60"
              )}
            >
              {current && (
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-now" />
              )}
              <span
                className={cn(
                  "text-sm tabular-nums",
                  current ? "font-medium text-now" : "text-muted-foreground"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <SongFingerprint
                fingerprint={track.fingerprint}
                className={cn("size-13", current ? "text-foreground" : "text-foreground/45")}
              />
              <span className="min-w-0">
                <span className={cn("block truncate text-sm", current && "font-semibold")}>
                  {track.title}
                </span>
                {available ? (
                  track.description && (
                    <span className="block truncate text-xs text-muted-foreground" title={track.description}>
                      {track.description}
                    </span>
                  )
                ) : (
                  <span className="block text-xs text-muted-foreground">Analysis unavailable</span>
                )}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatDuration(track.duration_seconds)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default TrackIndex;
