import { describe, expect, it } from "vitest";
import { resultForPair } from "./compareResult";

const featuresA = { rms_energy: [0.1, 0.2], spectral_centroid: [1000, 2000] };
const featuresB = { rms_energy: [0.3, 0.4], spectral_centroid: [1500, 2500] };
const otherA = { rms_energy: [0.5], spectral_centroid: [900] };
const otherB = { rms_energy: [0.6], spectral_centroid: [800] };

const result = {
  a: featuresA,
  b: featuresB,
  findings: [{ category: "energy", text: "Song A is louder on average." }],
  error: null,
};

describe("resultForPair", () => {
  it("returns the result for the exact A/B pair it was computed for", () => {
    expect(resultForPair(result, featuresA, featuresB)).toBe(result);
  });

  it("returns null when only A differs", () => {
    expect(resultForPair(result, otherA, featuresB)).toBeNull();
  });

  it("returns null when only B differs", () => {
    expect(resultForPair(result, featuresA, otherB)).toBeNull();
  });

  it("returns null when both songs differ", () => {
    expect(resultForPair(result, otherA, otherB)).toBeNull();
  });

  it("returns null when there is no result yet", () => {
    expect(resultForPair(null, featuresA, featuresB)).toBeNull();
    expect(resultForPair(undefined, featuresA, featuresB)).toBeNull();
  });

  it("returns a matching error result", () => {
    const failed = { a: featuresA, b: featuresB, findings: null, error: "Couldn't generate findings." };
    expect(resultForPair(failed, featuresA, featuresB)).toBe(failed);
  });

  it("does not match structurally equal but different feature objects", () => {
    expect(resultForPair(result, { ...featuresA }, { ...featuresB })).toBeNull();
  });
});
