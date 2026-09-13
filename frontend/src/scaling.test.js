import { describe, it, expect } from "vitest";
import { getSharedMax } from "./scaling";

describe("getSharedMax", () => {
  it("returns the maximum value across two arrays", () => {
    expect(getSharedMax([[1, 2, 3], [4, 0, 2]])).toBe(4);
  });

  it("returns the max of whichever array is present when the other is missing", () => {
    expect(getSharedMax([[1, 5, 2], null])).toBe(5);
    expect(getSharedMax([undefined, [7, 1]])).toBe(7);
  });

  it("is not fooled by one song being much louder/brighter than the other", () => {
    // this is the actual scenario the shared scale exists for: without it,
    // each song would be drawn against its own max and look equally tall.
    const quietSong = [0.05, 0.1, 0.08];
    const loudSong = [0.4, 0.9, 0.6];
    expect(getSharedMax([quietSong, loudSong])).toBe(0.9);
  });

  it("falls back to 1 when no arrays are provided, to avoid dividing by zero", () => {
    expect(getSharedMax([null, undefined])).toBe(1);
  });
});
