import { describe, it, expect } from "vitest";
import { getSharedMax, getPercentile, getSharedScaleMax } from "./scaling";

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

describe("getPercentile", () => {
  it("returns the same value for every percentile when all values are equal", () => {
    expect(getPercentile([5, 5, 5, 5], 50)).toBe(5);
    expect(getPercentile([5, 5, 5, 5], 95)).toBe(5);
  });

  it("returns that value for a single-element array, regardless of percentile", () => {
    expect(getPercentile([42], 0)).toBe(42);
    expect(getPercentile([42], 95)).toBe(42);
  });

  it("interpolates between the two closest ranks when the percentile doesn't land exactly on one", () => {
    // median of [1,2,3,4] is the standard linear-interpolation result: 2.5
    expect(getPercentile([1, 2, 3, 4], 50)).toBe(2.5);
  });

  it("returns the exact value when the percentile lands exactly on a rank", () => {
    // 4 values, indices 0-3: the 0th percentile is the minimum, 100th is the maximum
    expect(getPercentile([10, 20, 30, 40], 0)).toBe(10);
    expect(getPercentile([10, 20, 30, 40], 100)).toBe(40);
  });

  it("is not thrown off by a rare outlier, unlike a true max", () => {
    const mostlyNormal = [10, 11, 12, 10, 11, 12, 10, 11, 12, 1000];
    const p95 = getPercentile(mostlyNormal, 95);
    expect(p95).toBeLessThan(1000);
    expect(p95).toBeGreaterThan(12);
  });

  it("returns 0 for an empty array", () => {
    expect(getPercentile([], 95)).toBe(0);
  });
});

describe("getSharedScaleMax", () => {
  it("returns the percentile of the combined values across both songs", () => {
    expect(getSharedScaleMax([[1, 2, 3, 4], []], 50)).toBe(2.5);
  });

  it("is not dominated by one song's rare outlier the way a true shared max would be", () => {
    const normalSong = [100, 110, 105, 95, 100, 108, 102];
    const songWithOneOutlier = [90, 95, 100, 105, 7000];
    const trueMax = getSharedMax([normalSong, songWithOneOutlier]);
    const percentileMax = getSharedScaleMax([normalSong, songWithOneOutlier], 95);

    expect(trueMax).toBe(7000);
    expect(percentileMax).toBeLessThan(trueMax);
  });

  it("falls back to 1 when no arrays are provided, to avoid dividing by zero", () => {
    expect(getSharedScaleMax([null, undefined], 95)).toBe(1);
  });
});
