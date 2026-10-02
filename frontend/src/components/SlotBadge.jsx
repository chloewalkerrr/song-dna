import { cn } from "@/lib/utils";

// Full class strings (not built dynamically) so Tailwind can see them.
// "slot" is the app's A/B colours (violet / blue). "ink" tells A and B apart
// by form instead - A solid, B outlined - for pages drawn in neutral ink.
const SLOT_CLASSES = {
  slot: {
    A: "bg-violet-500 text-white",
    B: "bg-blue-500 text-white",
  },
  ink: {
    A: "border border-foreground bg-foreground text-background",
    B: "border border-foreground text-foreground",
  },
};

// The small "A" / "B" marker that identifies a track's slot.
function SlotBadge({ slot, tone = "slot", className }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
        SLOT_CLASSES[tone][slot],
        className
      )}
    >
      {slot}
    </span>
  );
}

export default SlotBadge;
