import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MiniFingerprint from "@/components/MiniFingerprint";
import SlotBadge from "@/components/SlotBadge";
import { formatDuration } from "@/format";
import { cn } from "@/lib/utils";

// Full class strings (not built dynamically) so Tailwind can see them.
const SELECTED_OUTLINE = {
  A: "outline-violet-500/70",
  B: "outline-blue-500/70",
};

// `slot` is "A", "B" or null. `blocked` means both slots are taken by other
// tracks, so clicking this one does nothing (the page shows a hint instead).
function SongCard({ track, slot, blocked, playing, onSelect, onTogglePlay }) {
  return (
    <div
      className={cn(
        "relative rounded-xl outline-2 outline-transparent transition-colors",
        slot && SELECTED_OUTLINE[slot]
      )}
    >
      <Card className={cn("gap-3 transition-colors hover:bg-accent/40", blocked && "opacity-60")}>
        {/* Card-wide select control. The play button sits above it, so there are no nested buttons. */}
        <button
          type="button"
          aria-pressed={slot !== null}
          aria-disabled={blocked}
          aria-label={`${slot ? "Deselect" : "Select"} ${track.title}`}
          onClick={onSelect}
          className="absolute inset-0 z-0 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <CardContent className="pointer-events-none relative z-10 flex flex-col gap-3">
          <div className="relative">
            <MiniFingerprint preview={track.preview} tone={slot ?? "neutral"} />
            {slot && <SlotBadge slot={slot} className="absolute -top-1 right-0" />}
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{track.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {track.genre} · {formatDuration(track.duration_seconds)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="pointer-events-auto shrink-0 rounded-full"
              aria-label={`${playing ? "Pause" : "Play"} preview of ${track.title}`}
              onClick={onTogglePlay}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SongCard;
