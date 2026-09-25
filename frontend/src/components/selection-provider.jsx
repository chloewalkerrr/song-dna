import { useMemo, useState } from "react";
import { SelectionContext } from "@/hooks/use-selection";
import { EMPTY_SELECTION, clearSelection, removeSlot, toggleSong } from "@/selection";

// Holds the A/B selection above the router, so it survives moving between
// the Library and Compare pages.
export function SelectionProvider({ children }) {
  const [selection, setSelection] = useState(EMPTY_SELECTION);

  const value = useMemo(
    () => ({
      selection,
      toggle: (id) => setSelection((current) => toggleSong(current, id)),
      remove: (slot) => setSelection((current) => removeSlot(current, slot)),
      clear: () => setSelection(clearSelection()),
    }),
    [selection]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}
