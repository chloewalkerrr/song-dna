import { describe, it, expect } from "vitest";
import { normalizeTheme, toggleTheme } from "./theme";

describe("normalizeTheme", () => {
  it("keeps an explicit light or dark choice", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
  });

  it("defaults to dark when nothing (or garbage) is stored", () => {
    expect(normalizeTheme(null)).toBe("dark");
    expect(normalizeTheme(undefined)).toBe("dark");
    expect(normalizeTheme("")).toBe("dark");
    expect(normalizeTheme("system")).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("flips between dark and light", () => {
    expect(toggleTheme("dark")).toBe("light");
    expect(toggleTheme("light")).toBe("dark");
  });
});
