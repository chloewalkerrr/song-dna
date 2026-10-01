import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLibrary,
  fetchTrackFeatures,
  libraryUrl,
  parseLibraryManifest,
  parseTrackFeatures,
  resolveFeatureLoad,
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
    await expect(fetchLibrary()).resolves.toEqual([
      { ...goodTrack, fingerprint: { status: "unavailable", reason: "missing" } },
    ]);
  });

  describe("with Song Fingerprints", () => {
    const identity = {
      version: "E1B1/1",
      params_hash: "9e2c3876c5ed81c46b7c97987dc2b3eb90c812da9eb031bcda3fbf0ebaa5366b",
      librosa_version: "0.11.0",
      dref: 0.005909040273794664,
      corpus_id: "2e1a85551d734edfe264112a554a062d322a724b45676073e5cf7fb01a7b2d12",
    };
    const summary = { ...identity, thumbs: "fingerprints/thumbs.json", thumb_view_box: "0 0 52 52" };
    const manifest = {
      tracks: [{ ...goodTrack, song_fingerprint: { artifact: "fingerprints/dev-pulse.json" } }],
      song_fingerprint: summary,
    };
    const thumbs = { ...identity, view_box: "0 0 52 52", thumbs: { "dev-pulse": "M1.0 2.0L3.0 4.0" } };

    // Serves library.json (optionally a different one), and `thumbsResponse` for thumbs.json.
    function stubLibrary(thumbsResponse, libraryManifest = manifest) {
      const fetchMock = vi.fn(async (url) =>
        url.endsWith("library.json")
          ? { ok: true, status: 200, json: async () => libraryManifest }
          : thumbsResponse()
      );
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    it("attaches each track's thumbnail path from thumbs.json", async () => {
      const fetchMock = stubLibrary(() => ({ ok: true, status: 200, json: async () => thumbs }));
      const [track] = await fetchLibrary();

      expect(fetchMock).toHaveBeenCalledWith("/library/fingerprints/thumbs.json");
      expect(track.fingerprint).toEqual({ status: "available", path: "M1.0 2.0L3.0 4.0", viewBox: "0 0 52 52" });
    });

    it("still returns the library when thumbs.json is missing, invalid or unreachable", async () => {
      const failures = [
        () => ({ ok: false, status: 404, json: async () => ({}) }),
        () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token '<'"); } }),
        () => { throw new TypeError("Failed to fetch"); },
      ];
      for (const failure of failures) {
        stubLibrary(failure);
        const [track] = await fetchLibrary();
        expect(track.fingerprint).toEqual({ status: "unavailable", reason: "malformed" });
      }
    });

    it("still returns the library when the fingerprint view box is malformed (even one that throws when coerced)", async () => {
      const throwsOnCoercion = JSON.parse('{"toString": 1}');
      for (const viewBox of [throwsOnCoercion, 52, "0 0 0 0"]) {
        const fetchMock = stubLibrary(
          () => ({ ok: true, status: 200, json: async () => thumbs }),
          { ...manifest, song_fingerprint: { ...summary, thumb_view_box: viewBox } }
        );
        const [track] = await fetchLibrary();
        expect(track.fingerprint).toEqual({ status: "unavailable", reason: "malformed" });
        expect(fetchMock).toHaveBeenCalledTimes(1); // thumbs.json isn't even requested
      }
    });

    it("doesn't show thumbnails from a different build than the manifest", async () => {
      stubLibrary(() => ({ ok: true, status: 200, json: async () => ({ ...thumbs, corpus_id: "f".repeat(64) }) }));
      const [track] = await fetchLibrary();
      expect(track.fingerprint).toEqual({ status: "unavailable", reason: "malformed" });
    });
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

describe("resolveFeatureLoad", () => {
  const trackA = { id: "a" };
  const trackB = { id: "b" };
  const noResult = { tracks: null, byId: new Map(), failedIds: [] };

  it("treats a valid empty manifest as ready, with nothing loaded or failed", () => {
    const tracks = parseLibraryManifest({ tracks: [] });
    expect(resolveFeatureLoad(tracks, noResult)).toEqual({
      status: "ready",
      byId: new Map(),
      failedIds: [],
    });
  });

  it("is loading while a populated library has no result yet", () => {
    expect(resolveFeatureLoad([trackA, trackB], noResult)).toEqual({
      status: "loading",
      byId: new Map(),
      failedIds: [],
    });
  });

  it("is ready with every track's features once they have all loaded", () => {
    const tracks = [trackA, trackB];
    const byId = new Map([["a", { x: 1 }], ["b", { x: 2 }]]);
    const state = resolveFeatureLoad(tracks, { tracks, byId, failedIds: [] });
    expect(state.status).toBe("ready");
    expect(state.byId).toBe(byId);
    expect(state.failedIds).toEqual([]);
  });

  it("keeps partial failures: loaded tracks in byId, failed ids listed", () => {
    const tracks = [trackA, trackB];
    const state = resolveFeatureLoad(tracks, {
      tracks,
      byId: new Map([["a", { x: 1 }]]),
      failedIds: ["b"],
    });
    expect(state.status).toBe("ready");
    expect([...state.byId.keys()]).toEqual(["a"]);
    expect(state.failedIds).toEqual(["b"]);
  });

  it("is ready with nothing loaded when every track failed", () => {
    const tracks = [trackA, trackB];
    const state = resolveFeatureLoad(tracks, { tracks, byId: new Map(), failedIds: ["a", "b"] });
    expect(state.status).toBe("ready");
    expect(state.byId.size).toBe(0);
    expect(state.failedIds).toEqual(["a", "b"]);
  });

  it("counts a result for an older track list as still loading", () => {
    const result = { tracks: [trackA], byId: new Map([["a", { x: 1 }]]), failedIds: [] };
    expect(resolveFeatureLoad([trackA, trackB], result).status).toBe("loading");
  });
});
