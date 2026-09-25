import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLibrary, libraryUrl, parseLibraryManifest } from "./library";

const goodTrack = {
  id: "dev-pulse",
  title: "Dev Pulse",
  genre: "Electronic",
  duration_seconds: 30,
  audio: "audio/dev-pulse.mp3",
  features: "features/dev-pulse.json",
  preview: { energy: [0.1], brightness: [0.2] },
};

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response) {
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

describe("libraryUrl", () => {
  it("resolves manifest-relative paths under the library folder", () => {
    expect(libraryUrl("audio/dev-pulse.mp3")).toBe("/library/audio/dev-pulse.mp3");
  });
});

describe("parseLibraryManifest", () => {
  it("returns the tracks of a valid manifest", () => {
    expect(parseLibraryManifest({ version: 1, tracks: [goodTrack] })).toEqual([goodTrack]);
  });

  it("rejects a manifest that isn't an object with a tracks array", () => {
    expect(() => parseLibraryManifest(null)).toThrow(/expected format/);
    expect(() => parseLibraryManifest({})).toThrow(/expected format/);
    expect(() => parseLibraryManifest({ tracks: "nope" })).toThrow(/expected format/);
  });

  it("rejects a track missing a required field, naming the field", () => {
    const noTitle = { ...goodTrack, title: undefined };
    expect(() => parseLibraryManifest({ tracks: [noTitle] })).toThrow(/"title"/);
  });

  it("rejects a track missing its duration or preview", () => {
    const noPreview = { ...goodTrack, preview: undefined };
    expect(() => parseLibraryManifest({ tracks: [noPreview] })).toThrow(/duration or preview/);
  });
});

describe("fetchLibrary", () => {
  it("returns the validated tracks on success", async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ tracks: [goodTrack] }) });
    await expect(fetchLibrary()).resolves.toEqual([goodTrack]);
  });

  it("treats an HTTP error as a failure", async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({}) });
    await expect(fetchLibrary()).rejects.toThrow(/HTTP 500/);
  });

  it("treats a 200 response with a non-JSON body as 'not found' (the dev server answers missing files with index.html)", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    });
    await expect(fetchLibrary()).rejects.toThrow(/wasn't found or isn't valid JSON/);
  });

  it("turns a network failure into a readable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    await expect(fetchLibrary()).rejects.toThrow(/Couldn't reach/);
  });
});
