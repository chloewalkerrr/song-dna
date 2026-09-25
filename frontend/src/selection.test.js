import { describe, it, expect } from "vitest";
import {
  EMPTY_SELECTION,
  clearSelection,
  getSlot,
  isBlocked,
  isFull,
  removeSlot,
  selectedCount,
  toggleSong,
} from "./selection";

describe("toggleSong", () => {
  it("puts the first pick in slot A and the second in slot B", () => {
    const one = toggleSong(EMPTY_SELECTION, "x");
    expect(one).toEqual({ a: "x", b: null });
    expect(toggleSong(one, "y")).toEqual({ a: "x", b: "y" });
  });

  it("deselects a selected track when clicked again", () => {
    expect(toggleSong({ a: "x", b: "y" }, "x")).toEqual({ a: null, b: "y" });
    expect(toggleSong({ a: "x", b: "y" }, "y")).toEqual({ a: "x", b: null });
  });

  it("keeps slots stable: removing A leaves B as B, and the next pick refills A", () => {
    const afterRemove = toggleSong({ a: "x", b: "y" }, "x");
    expect(afterRemove.b).toBe("y");
    expect(toggleSong(afterRemove, "z")).toEqual({ a: "z", b: "y" });
  });

  it("fills B when A is taken and B is empty", () => {
    expect(toggleSong({ a: "x", b: null }, "y")).toEqual({ a: "x", b: "y" });
  });

  it("does nothing when both slots are full and an unselected track is clicked", () => {
    const full = { a: "x", b: "y" };
    expect(toggleSong(full, "z")).toBe(full);
  });
});

describe("selection helpers", () => {
  it("reports which slot a track is in", () => {
    const selection = { a: "x", b: "y" };
    expect(getSlot(selection, "x")).toBe("A");
    expect(getSlot(selection, "y")).toBe("B");
    expect(getSlot(selection, "z")).toBeNull();
  });

  it("counts selected tracks and detects a full selection", () => {
    expect(selectedCount(EMPTY_SELECTION)).toBe(0);
    expect(selectedCount({ a: null, b: "y" })).toBe(1);
    expect(isFull({ a: "x", b: "y" })).toBe(true);
    expect(isFull({ a: "x", b: null })).toBe(false);
  });

  it("flags a click as blocked only when full and the track isn't already selected", () => {
    const full = { a: "x", b: "y" };
    expect(isBlocked(full, "z")).toBe(true);
    expect(isBlocked(full, "x")).toBe(false); // deselecting is always allowed
    expect(isBlocked({ a: "x", b: null }, "z")).toBe(false);
  });

  it("removes one slot without touching the other, and clears everything", () => {
    expect(removeSlot({ a: "x", b: "y" }, "A")).toEqual({ a: null, b: "y" });
    expect(removeSlot({ a: "x", b: "y" }, "B")).toEqual({ a: "x", b: null });
    expect(clearSelection()).toEqual({ a: null, b: null });
  });
});
