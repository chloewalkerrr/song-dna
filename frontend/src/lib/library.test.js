import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLibrary,
  fetchTrackFeatures,
  libraryUrl,
  parseLibraryManifest,
  parseTrackFeatures,
} from "./library";

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

const goodFeatures = {
  id: "dev-pulse",
  duration_seconds: 30,
  rms_energy: [0.1, 0.2],
  spectral_centroid: [1000, 1200],
  beat_times: [0.5],
};

describe("parseTrackFeatures", () => {
  it("keeps the measured features and adds the library audio URL and title", () => {
    expect(parseTrackFeatures(goodTrack, goodFeatures)).toEqual({
      ...goodFeatures,
      audio_url: "/library/audio/dev-pulse.mp3",
      title: "Dev Pulse",
    });
  });

  it("accepts a track with no detected beats", () => {
    expect(parseTrackFeatures(goodTrack, { ...goodFeatures, beat_times: [] }).beat_times).toEqual([]);
  });

  it("rejects features missing a field the fingerprint needs", () => {
    expect(() => parseTrackFeatures(goodTrack, null)).toThrow(/expected format/);
    for (const field of ["rms_energy", "spectral_centroid", "beat_times", "duration_seconds"]) {
      const missing = { ...goodFeatures, [field]: undefined };
      expect(() => parseTrackFeatures(goodTrack, missing)).toThrow(/"Dev Pulse"/);
    }
  });

  it.each([
    ["empty RMS and centroid", { rms_energy: [], spectral_centroid: [] }],
    ["empty centroid", { spectral_centroid: [] }],
    ["RMS/centroid length mismatch", { spectral_centroid: [1000] }],
    ["non-numeric RMS value", { rms_energy: [0.1, "0.2"] }],
    ["null RMS value", { rms_energy: [0.1, null] }],
    ["NaN centroid value", { spectral_centroid: [1000, NaN] }],
    ["infinite centroid value", { spectral_centroid: [1000, Infinity] }],
    ["zero duration", { duration_seconds: 0 }],
    ["negative duration", { duration_seconds: -5 }],
    ["infinite duration", { duration_seconds: Infinity }],
    ["string duration", { duration_seconds: "30" }],
    ["non-numeric beat time", { beat_times: [0.5, "1.0"] }],
    ["NaN beat time", { beat_times: [NaN] }],
    ["beat_times not an array", { beat_times: 0.5 }],
  ])("rejects malformed feature data: %s", (_name, override) => {
    expect(() => parseTrackFeatures(goodTrack, { ...goodFeatures, ...override })).toThrow(
      /expected format/
    );
  });
});

describe("fetchTrackFeatures", () => {
  it("fetches the track's feature file from the library folder", async () => {
    stubFetch({ ok: true, status: 200, json: async () => goodFeatures });
    const features = await fetchTrackFeatures(goodTrack);
    expect(fetch).toHaveBeenCalledWith("/library/features/dev-pulse.json");
    expect(features.rms_energy).toEqual(goodFeatures.rms_energy);
  });

  it("turns HTTP errors, non-JSON bodies and network failures into a readable error", async () => {
    stubFetch({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchTrackFeatures(goodTrack)).rejects.toThrow(/Couldn't load the analysis/);

    stubFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    });
    await expect(fetchTrackFeatures(goodTrack)).rejects.toThrow(/Couldn't load the analysis/);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    await expect(fetchTrackFeatures(goodTrack)).rejects.toThrow(/Couldn't load the analysis/);
  });
});
