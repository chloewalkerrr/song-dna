import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SlotBadge from "@/components/SlotBadge";
import { selectedCount } from "@/selection";

function SlotChip({ slot, track, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background py-1 pl-1.5 pr-1 text-sm">
      <SlotBadge slot={slot} />
      <span className="max-w-32 truncate">{track.title}</span>
      <button
        type="button"
        aria-label={`Remove ${track.title}`}
        onClick={onRemove}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

// Slim bar under the grid showing the current A/B picks. `hint` is shown when
// the user tries to pick a third track while both slots are full.
function SelectionBar({ selection, tracksById, hint, onRemove, onClear, onCompare }) {
  const count = selectedCount(selection);
  const trackA = selection.a && tracksById.get(selection.a);
  const trackB = selection.b && tracksById.get(selection.b);

  return (
    <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3">
      <span className="text-sm font-medium">{count} of 2 selected</span>

      {trackA && <SlotChip slot="A" track={trackA} onRemove={() => onRemove("A")} />}
      {trackB && <SlotChip slot="B" track={trackB} onRemove={() => onRemove("B")} />}

      {hint && (
        <span role="status" className="text-xs text-muted-foreground">
          Remove one first
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={count === 0} onClick={onClear}>
          Clear
        </Button>
        <Button type="button" size="sm" disabled={count < 2} onClick={onCompare}>
          Compare
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export default SelectionBar;
