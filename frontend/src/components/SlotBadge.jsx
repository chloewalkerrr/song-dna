import { cn } from "@/lib/utils";

// Full class strings (not built dynamically) so Tailwind can see them.
const SLOT_CLASSES = {
  A: "bg-violet-500 text-white",
  B: "bg-blue-500 text-white",
};

// The small "A" / "B" marker that identifies a track's slot.
function SlotBadge({ slot, className }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
        SLOT_CLASSES[slot],
        className
      )}
    >
      {slot}
    </span>
  );
}

export default SlotBadge;
