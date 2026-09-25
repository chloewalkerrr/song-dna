import { describe, it, expect } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formats seconds as m:ss with zero-padded seconds", () => {
    expect(formatDuration(30)).toBe("0:30");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(192)).toBe("3:12");
  });

  it("rounds to the nearest second, including rolling over to the next minute", () => {
    expect(formatDuration(350.4)).toBe("5:50");
    expect(formatDuration(59.6)).toBe("1:00");
  });

  it("handles zero and clamps negatives to zero", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-3)).toBe("0:00");
  });
});
