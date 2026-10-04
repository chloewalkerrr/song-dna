import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYSIS_FAILED,
  COMPARE_FAILED,
  SERVER_UNREACHABLE,
  UNTITLED_UPLOAD,
  analyzeFile,
  compareSongs,
  displayTitle,
  errorCopy,
  postToServer,
  withUploadTitle,
} from "./analysis";
import { API_BASE } from "./config";
import { LIBRARY_LOAD_ID, initialPanelState, panelLoadReducer } from "../panelLoad";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response) {
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

function stubUnreachable() {
  // What fetch does when nothing answers (server stopped, wrong port, CORS).
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    })
  );
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

// The shape /analyze returns: the server's own path for the saved upload.
const analyzed = {
  file_path: "data\\audio\\3f2a9c.wav",
  audio_url: "http://127.0.0.1:8000/audio/3f2a9c.wav",
  duration_seconds: 8,
  rms_energy: [0.1, 0.2],
  spectral_centroid: [900, 1100],
  beat_times: [0.5],
};

describe("postToServer", () => {
  it("POSTs to the analysis server and returns the JSON body", async () => {
    stubFetch(ok({ findings: [] }));
    await expect(postToServer("/compare", { body: "{}" }, COMPARE_FAILED)).resolves.toEqual({
      findings: [],
    });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/compare`, { method: "POST", body: "{}" });
  });

  it("says the server can't be reached when no response arrives", async () => {
    stubUnreachable();
    await expect(postToServer("/analyze", {}, ANALYSIS_FAILED)).rejects.toThrow(SERVER_UNREACHABLE);
  });

  it("uses the request's own failure for an error status, never the server's detail", async () => {
    stubFetch({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Traceback ... C:\\server\\data\\audio\\3f2a9c.wav" }),
    });
    await expect(postToServer("/analyze", {}, ANALYSIS_FAILED)).rejects.toThrow(ANALYSIS_FAILED);
  });

  it("treats a body that isn't JSON as a failed request, not an unreachable server", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    });
    await expect(postToServer("/compare", {}, COMPARE_FAILED)).rejects.toThrow(COMPARE_FAILED);
  });
});

describe("errorCopy", () => {
  it("keeps the unreachable-server message", () => {
    expect(errorCopy(new Error(SERVER_UNREACHABLE), ANALYSIS_FAILED)).toBe(SERVER_UNREACHABLE);
  });

  it("shows the request's failure for anything else, including raw JavaScript errors", () => {
    expect(errorCopy(new Error(COMPARE_FAILED), COMPARE_FAILED)).toBe(COMPARE_FAILED);
    expect(errorCopy(new TypeError("Cannot read properties of null"), COMPARE_FAILED)).toBe(
      COMPARE_FAILED
    );
    expect(errorCopy(undefined, ANALYSIS_FAILED)).toBe(ANALYSIS_FAILED);
  });
});

describe("displayTitle", () => {
  it("shows a library or upload title", () => {
    expect(displayTitle({ title: "Dev Pulse" })).toBe("Dev Pulse");
    expect(displayTitle(withUploadTitle(analyzed, "My Song.wav"))).toBe("My Song.wav");
  });

  it("never falls back to the server's saved path", () => {
    expect(displayTitle(analyzed)).toBe(UNTITLED_UPLOAD);
    expect(displayTitle({ ...analyzed, title: "" })).toBe(UNTITLED_UPLOAD);
    expect(displayTitle({ ...analyzed, title: null })).toBe(UNTITLED_UPLOAD);
  });
});

describe("withUploadTitle", () => {
  it("titles an upload with the chosen file's name and keeps the server's path", () => {
    expect(withUploadTitle(analyzed, "My Song.wav")).toEqual({ ...analyzed, title: "My Song.wav" });
  });
});

describe("analyzeFile", () => {
  it("uploads the file and titles the result with its original name", async () => {
    stubFetch(ok(analyzed));
    const file = new File(["RIFF"], "Field recording.wav", { type: "audio/wav" });

    const features = await analyzeFile(file);

    expect(features.title).toBe("Field recording.wav");
    expect(features.file_path).toBe(analyzed.file_path);
    // Uploads never carry a Song Fingerprint (see parseTrackFeatures).
    expect(features).not.toHaveProperty("fingerprint");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/analyze`);
    expect(init.method).toBe("POST");
    expect(init.body.get("file").name).toBe("Field recording.wav");
  });

  it("rejects with plain-language copy for each kind of failure", async () => {
    stubUnreachable();
    const file = new File(["x"], "a.mp3");
    await expect(analyzeFile(file)).rejects.toThrow(SERVER_UNREACHABLE);

    stubFetch({ ok: false, status: 400, json: async () => ({ detail: "Couldn't read..." }) });
    await expect(analyzeFile(file)).rejects.toThrow(ANALYSIS_FAILED);
  });

  it("shows each upload's own file name in the slot, never the server's saved name", async () => {
    // The real path SongPanel takes: a library track, replaced by an upload,
    // replaced by another upload. The server answers each upload with a
    // random saved name, as /analyze does.
    const libraryFeatures = { ...analyzed, title: "Dev Sweep", fingerprint: { status: "available" } };
    let slot = initialPanelState({ id: "dev-sweep" });
    slot = panelLoadReducer(slot, { type: "succeed", id: LIBRARY_LOAD_ID, features: libraryFeatures });
    expect(displayTitle(slot.features)).toBe("Dev Sweep");

    const uploads = [
      [2, "Field Take 1.wav", "data\\audio\\0b114594dd324841bfdfa6647d838151.wav"],
      [3, "Second take (final).mp3", "data\\audio\\8e8b64d5904c426dbe4ae1a83cd65963.mp3"],
    ];
    for (const [id, name, savedPath] of uploads) {
      stubFetch(ok({ ...analyzed, file_path: savedPath }));
      slot = panelLoadReducer(slot, { type: "start", id, message: "Analysing..." });
      slot = panelLoadReducer(slot, {
        type: "succeed",
        id,
        features: await analyzeFile(new File(["x"], name)),
      });
      expect(displayTitle(slot.features)).toBe(name);
      expect(slot.features.file_path).toBe(savedPath);
      expect(slot.features).not.toHaveProperty("fingerprint");
    }
  });
});

describe("compareSongs", () => {
  it("sends only the RMS and centroid arrays of both songs", async () => {
    stubFetch(ok({ findings: [] }));
    await compareSongs({ ...analyzed, title: "A" }, { ...analyzed, rms_energy: [0.3, 0.4] });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/compare`);
    expect(JSON.parse(init.body)).toEqual({
      song_a: { rms_energy: [0.1, 0.2], spectral_centroid: [900, 1100] },
      song_b: { rms_energy: [0.3, 0.4], spectral_centroid: [900, 1100] },
    });
  });

  it("separates an unreachable server from a failed comparison", async () => {
    stubUnreachable();
    await expect(compareSongs(analyzed, analyzed)).rejects.toThrow(SERVER_UNREACHABLE);

    stubFetch({ ok: false, status: 422, json: async () => ({}) });
    await expect(compareSongs(analyzed, analyzed)).rejects.toThrow(COMPARE_FAILED);
  });
});
