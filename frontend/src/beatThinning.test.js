import { describe, it, expect } from "vitest";
import { thinBeatTimes } from "./beatThinning";

// width=100, duration=10s -> 10 pixels/second, so minPixelSpacing=10
// corresponds to an exact, easy-to-reason-about minTimeSpacing of 1.0s.
const WIDTH = 100;
const DURATION_SECONDS = 10;
const MIN_PIXEL_SPACING = 10;

describe("thinBeatTimes", () => {
  it("thins densely packed beats, keeping only ones far enough from the last kept beat", () => {
    // Beats every 0.2s (11 of them) - far closer together than the 1.0s
    // minimum time spacing, so most should be dropped.
    const denseBeats = Array.from({ length: 11 }, (_, i) => i * 0.2); // 0, 0.2, ..., 2.0

    expect(thinBeatTimes(denseBeats, DURATION_SECONDS, WIDTH, MIN_PIXEL_SPACING)).toEqual([
      0, 1.0, 2.0,
    ]);
  });

  it("keeps every beat on a sparse track where spacing already exceeds the minimum", () => {
    const sparseBeats = [0, 2, 4, 6, 8]; // 2.0s apart, already >= 1.0s minimum

    expect(thinBeatTimes(sparseBeats, DURATION_SECONDS, WIDTH, MIN_PIXEL_SPACING)).toEqual(
      sparseBeats
    );
  });

  it("thins based on distance from the last *kept* beat, not the last seen beat", () => {
    // 0 is kept. 0.5 is too close to 0 (dropped). 0.9 is too close to 0
    // (dropped) - a naive "compare to the previous beat in the array"
    // approach would wrongly keep 0.9 because it's far from 0.5. 1.1 is
    // far enough from 0 (the last *kept* beat) to be kept.
    const beats = [0, 0.5, 0.9, 1.1];

    expect(thinBeatTimes(beats, DURATION_SECONDS, WIDTH, MIN_PIXEL_SPACING)).toEqual([0, 1.1]);
  });

  it("returns an empty array for an empty input", () => {
    expect(thinBeatTimes([], DURATION_SECONDS, WIDTH, MIN_PIXEL_SPACING)).toEqual([]);
  });

  it("always keeps a single beat", () => {
    expect(thinBeatTimes([5], DURATION_SECONDS, WIDTH, MIN_PIXEL_SPACING)).toEqual([5]);
  });

  it("returns an empty array when duration is zero or negative, to avoid dividing by zero", () => {
    expect(thinBeatTimes([0, 1, 2], 0, WIDTH, MIN_PIXEL_SPACING)).toEqual([]);
  });

  it("guarantees every consecutive pair of kept beats is at least minPixelSpacing apart on screen", () => {
    const manyBeats = Array.from({ length: 200 }, (_, i) => i * 0.05); // every 0.05s
    const thinned = thinBeatTimes(manyBeats, DURATION_SECONDS, WIDTH, MIN_PIXEL_SPACING);
    const pixelsPerSecond = WIDTH / DURATION_SECONDS;

    for (let i = 1; i < thinned.length; i++) {
      const pixelGap = (thinned[i] - thinned[i - 1]) * pixelsPerSecond;
      expect(pixelGap).toBeGreaterThanOrEqual(MIN_PIXEL_SPACING);
    }
  });

  it("reproduces the real-world density problem: ~802 beats across a 5:50 song thin to a small, legible count", () => {
    // Mirrors the actual reported case: JoshWoodward-NQC-11-RiverWentDry.mp3,
    // 350.4s long, 802 beats averaging ~0.396s apart - at the fingerprint's
    // fixed 900px width, that's ~1px between consecutive raw beats.
    const realWidth = 900;
    const realDuration = 350.4;
    const beatInterval = 0.396;
    const beats = [];
    for (let t = 0; t < realDuration; t += beatInterval) beats.push(t);

    const thinned = thinBeatTimes(beats, realDuration, realWidth, 8);

    expect(beats.length).toBe(885); // close to the real 802 (synthetic spacing is uniform, the real track's isn't)
    expect(thinned.length).toBeLessThan(150); // dramatically fewer than 885 raw beats
    expect(thinned.length).toBeGreaterThan(50); // but still enough to represent the song's rhythm, not just a couple of dots
  });
});
