import { describe, it, expect } from "vitest";
import {
  formatClock,
  formatHz,
  getLibraryScale,
  measurementInterval,
  readSlice,
  sliceIndexAt,
  sliceSpan,
} from "./specimen";

// A synthetic 8-second track with 8 frames and 4 display slices, so each
// slice is 2 frames and 2 seconds long and every answer is easy to check.
const TRACK = {
  duration_seconds: 8,
  rms_energy: [0.1, 0.1, 0.2, 0.2, 0.8, 0.6, 0.3, 0.3],
  spectral_centroid: [100, 300, 1000, 1000, 2000, 2000, 500, 700],
};
const SLICES = 4;

describe("getLibraryScale", () => {
  it("uses the true RMS max and the 95th centroid percentile across all tracks", () => {
    const other = { rms_energy: [0.9, 0.05], spectral_centroid: [100, 100] };
    const { rmsMax, centroidMax } = getLibraryScale([TRACK, other]);
    expect(rmsMax).toBe(0.9);
    // 10 centroid values; the 95th percentile interpolates between the two largest.
    expect(centroidMax).toBe(2000);
  });
});

describe("slices", () => {
  it("gives each slice an equal share of the duration", () => {
    expect(sliceSpan(0, 8, SLICES)).toEqual({ start: 0, end: 2 });
    expect(sliceSpan(3, 8, SLICES)).toEqual({ start: 6, end: 8 });
  });

  it("finds the slice a moment falls in, clamped to the track", () => {
    expect(sliceIndexAt(0, 8, SLICES)).toBe(0);
    expect(sliceIndexAt(4.1, 8, SLICES)).toBe(2);
    expect(sliceIndexAt(8, 8, SLICES)).toBe(3);
    expect(sliceIndexAt(-1, 8, SLICES)).toBe(0);
    expect(sliceIndexAt(3, 0, SLICES)).toBe(0);
  });

  it("reads the averaged values the bars draw", () => {
    const slice = readSlice(TRACK, 2, SLICES);
    expect(slice.start).toBe(4);
    expect(slice.end).toBe(6);
    expect(slice.energy).toBeCloseTo(0.7);
    expect(slice.brightnessHz).toBe(2000);
  });
});

describe("measurementInterval", () => {
  it("derives the time between measurements from frames and duration", () => {
    expect(measurementInterval(TRACK)).toEqual({ frames: 8, intervalMs: 1000 });
  });
});

describe("formatting", () => {
  it("formats hertz as whole numbers with separators", () => {
    expect(formatHz(1239.6)).toBe("1,240 Hz");
    expect(formatHz(87.2)).toBe("87 Hz");
  });

  it("formats a clock time to tenths without rolling over to :60", () => {
    expect(formatClock(0)).toBe("0:00.0");
    expect(formatClock(12.46)).toBe("0:12.5");
    expect(formatClock(59.96)).toBe("1:00.0");
    expect(formatClock(-2)).toBe("0:00.0");
  });
});
