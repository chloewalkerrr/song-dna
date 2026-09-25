import { describe, it, expect } from "vitest";
import { computeBarHeight, getSegmentLayout, timeToX } from "./fingerprintLayout";
import { thinBeatTimes } from "./beatThinning";

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

describe("getSegmentLayout", () => {
  it("divides the width evenly into cells and fills 70% of each with the bar", () => {
    const { cellWidth, barWidth } = getSegmentLayout(400, 40);
    expect(cellWidth).toBe(10);
    expect(barWidth).toBeCloseTo(7);
  });

  it("scales linearly with width, so the same 40 bars fit a narrow or wide chart", () => {
    const narrow = getSegmentLayout(400, 40);
    const wide = getSegmentLayout(800, 40);
    expect(wide.cellWidth).toBe(narrow.cellWidth * 2);
    expect(wide.barWidth).toBeCloseTo(narrow.barWidth * 2);
  });

  it("gives zero-size cells for a zero-width chart (not yet measured)", () => {
    expect(getSegmentLayout(0, 40)).toEqual({ cellWidth: 0, barWidth: 0 });
  });
});

describe("timeToX", () => {
  it("maps the start, middle and end of the song to the left edge, centre and right edge", () => {
    expect(timeToX(0, 200, 900)).toBe(0);
    expect(timeToX(100, 200, 900)).toBe(450);
    expect(timeToX(200, 200, 900)).toBe(900);
  });

  it("is proportional to the chart width", () => {
    expect(timeToX(50, 200, 400)).toBe(100);
    expect(timeToX(50, 200, 800)).toBe(200);
  });

  it("clamps times outside the song to the chart edges instead of drawing outside it", () => {
    expect(timeToX(210, 200, 900)).toBe(900);
    expect(timeToX(-5, 200, 900)).toBe(0);
  });

  it("returns 0 when the duration is zero or negative, to avoid dividing by zero", () => {
    expect(timeToX(5, 0, 900)).toBe(0);
    expect(timeToX(5, -1, 900)).toBe(0);
  });
});

describe("beat markers on a resizable chart", () => {
  // ~800 beats about 0.4s apart across a 350s song - the real-world density
  // that originally rendered as a smear.
  const beats = Array.from({ length: 800 }, (_, i) => i * 0.4);
  const duration = 350;
  const minSpacing = 18;

  function thinnedXs(width) {
    return thinBeatTimes(beats, duration, width, minSpacing).map((t) => timeToX(t, duration, width));
  }

  it("keeps every marker at least the minimum distance from its neighbour at any width", () => {
    for (const width of [300, 450, 900]) {
      const xs = thinnedXs(width);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(minSpacing - 1e-9);
      }
    }
  });

  it("shows fewer markers on a narrower chart, since the same song has less room", () => {
    expect(thinnedXs(450).length).toBeLessThan(thinnedXs(900).length);
    expect(thinnedXs(300).length).toBeLessThan(thinnedXs(450).length);
  });
});
