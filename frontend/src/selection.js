// The Library's A/B selection: which track is in slot A and which in slot B.
// Slots are stable - removing A leaves B as B, and the next pick fills
// whichever slot is empty (A first).
export const EMPTY_SELECTION = { a: null, b: null };

export function getSlot(selection, id) {
  if (selection.a === id) return "A";
  if (selection.b === id) return "B";
  return null;
}

export function selectedCount(selection) {
  return (selection.a ? 1 : 0) + (selection.b ? 1 : 0);
}

export function isFull(selection) {
  return selectedCount(selection) === 2;
}

// True when clicking `id` would do nothing because both slots are taken by
// other tracks (the UI shows a "Remove one first" hint instead).
export function isBlocked(selection, id) {
  return isFull(selection) && getSlot(selection, id) === null;
}

// Clicking a selected track deselects it; clicking an unselected track fills
// the first empty slot. When both slots are full, an unselected track is a no-op.
export function toggleSong(selection, id) {
  const slot = getSlot(selection, id);
  if (slot === "A") return { ...selection, a: null };
  if (slot === "B") return { ...selection, b: null };

  if (selection.a === null) return { ...selection, a: id };
  if (selection.b === null) return { ...selection, b: id };
  return selection;
}

export function removeSlot(selection, slot) {
  return slot === "A" ? { ...selection, a: null } : { ...selection, b: null };
}

export function clearSelection() {
  return EMPTY_SELECTION;
}

// The library tracks Compare's Song A / Song B slots start with. Both are
// filled only when both selected ids exist in the library; otherwise both are
// null and Compare starts with two empty upload slots.
export function getCompareTracks(selection, tracks) {
  const a = tracks.find((track) => track.id === selection.a);
  const b = tracks.find((track) => track.id === selection.b);
  return a && b ? { a, b } : { a: null, b: null };
}
