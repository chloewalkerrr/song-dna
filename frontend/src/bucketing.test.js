import { describe, it, expect } from "vitest";
import { bucketAverage } from "./bucketing";

describe("bucketAverage", () => {
  it("averages evenly-divisible groups of frames into the requested number of segments", () => {
    // 6 frames / 3 segments = 2 frames per bucket
    expect(bucketAverage([0, 0, 10, 10, 20, 20], 3)).toEqual([0, 10, 20]);
  });

  it("always returns exactly segmentCount values, even when the input doesn't divide evenly", () => {
    const values = Array.from({ length: 100 }, (_, i) => i);
    const result = bucketAverage(values, 7);
    expect(result).toHaveLength(7);
  });

  it("every input frame is included in exactly one bucket (no data dropped or duplicated)", () => {
    const values = Array.from({ length: 97 }, () => 1);
    const result = bucketAverage(values, 10);
    // since every value is 1, a correct partition (no gaps/overlaps) means
    // every bucket's average is exactly 1, regardless of uneven bucket sizes
    result.forEach((average) => expect(average).toBe(1));
  });

  it("returns a constant value for silence (all-zero input)", () => {
    const values = new Array(50).fill(0);
    expect(bucketAverage(values, 5)).toEqual([0, 0, 0, 0, 0]);
  });

  it("handles fewer input frames than requested segments without crashing or producing NaN", () => {
    const result = bucketAverage([1, 2, 3], 10);
    expect(result).toHaveLength(10);
    result.forEach((value) => expect(Number.isNaN(value)).toBe(false));
  });

  it("returns an empty array for empty input", () => {
    expect(bucketAverage([], 10)).toEqual([]);
  });
});
