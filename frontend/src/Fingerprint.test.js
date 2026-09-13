import { describe, it, expect } from "vitest";
import { computeBarHeight } from "./Fingerprint";

describe("computeBarHeight", () => {
  it("scales proportionally when value is within the max", () => {
    expect(computeBarHeight(50, 100, 100)).toBe(50);
  });

  it("reaches exactly full height when value equals max", () => {
    expect(computeBarHeight(100, 100, 100)).toBe(100);
  });

  it("clips to full height instead of overflowing when value exceeds max", () => {
    // this is the real scenario centroidMax creates: a percentile ceiling
    // that some bucketed values will legitimately exceed
    expect(computeBarHeight(150, 100, 100)).toBe(100);
    expect(computeBarHeight(1000, 100, 100)).toBe(100);
  });

  it("returns 0 for a zero value", () => {
    expect(computeBarHeight(0, 100, 100)).toBe(0);
  });
});
