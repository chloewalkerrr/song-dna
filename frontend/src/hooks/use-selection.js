import { createContext, useContext } from "react";

// { selection: { a, b }, toggle(id), remove("A" | "B"), clear() }
export const SelectionContext = createContext(null);

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("useSelection must be used inside <SelectionProvider>");
  return context;
}
