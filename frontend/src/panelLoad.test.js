import { describe, expect, it } from "vitest";
import { LIBRARY_LOAD_ID, initialPanelState, panelLoadReducer } from "./panelLoad";

const libraryTrack = { id: "dev-pulse", title: "Dev Pulse" };
const libraryFeatures = { title: "Dev Pulse", rms_energy: [0.5] };
const uploadFeatures = { file_path: "song.wav", rms_energy: [0.9] };
const UPLOAD_ID = LIBRARY_LOAD_ID + 1;

// Applies actions in the order SongPanel would dispatch them.
function run(state, ...actions) {
  return actions.reduce(panelLoadReducer, state);
}

describe("initialPanelState", () => {
  it("starts an upload-only slot empty and idle", () => {
    expect(initialPanelState(null)).toEqual({ loadId: 0, loading: null, features: null, error: null });
  });

  it("starts a library slot already loading its track", () => {
    expect(initialPanelState(libraryTrack)).toMatchObject({
      loadId: LIBRARY_LOAD_ID,
      loading: "Loading...",
      features: null,
    });
  });
});

describe("panelLoadReducer", () => {
  it("shows a library track once it loads", () => {
    const state = run(initialPanelState(libraryTrack), {
      type: "succeed",
      id: LIBRARY_LOAD_ID,
      features: libraryFeatures,
    });
    expect(state).toMatchObject({ loading: null, features: libraryFeatures, error: null });
  });

  it("lets an upload replace a loaded library track, keeping it visible while analyzing", () => {
    const loaded = run(initialPanelState(libraryTrack), {
      type: "succeed",
      id: LIBRARY_LOAD_ID,
      features: libraryFeatures,
    });
    const analyzing = run(loaded, { type: "start", id: UPLOAD_ID, message: "Analyzing..." });
    expect(analyzing).toMatchObject({ loading: "Analyzing...", features: libraryFeatures });

    const replaced = run(analyzing, { type: "succeed", id: UPLOAD_ID, features: uploadFeatures });
    expect(replaced).toMatchObject({ loading: null, features: uploadFeatures, error: null });
  });

  it("ignores a pending library load that finishes after a newer upload has succeeded", () => {
    const state = run(
      initialPanelState(libraryTrack),
      { type: "start", id: UPLOAD_ID, message: "Analyzing..." },
      { type: "succeed", id: UPLOAD_ID, features: uploadFeatures },
      { type: "succeed", id: LIBRARY_LOAD_ID, features: libraryFeatures }
    );
    expect(state).toMatchObject({ loading: null, features: uploadFeatures, error: null });
  });

  it("ignores a pending library load that finishes while a newer upload is still analyzing", () => {
    const state = run(
      initialPanelState(libraryTrack),
      { type: "start", id: UPLOAD_ID, message: "Analyzing..." },
      { type: "succeed", id: LIBRARY_LOAD_ID, features: libraryFeatures }
    );
    expect(state).toMatchObject({ loading: "Analyzing...", features: null });

    // Nor can a late library failure clear the upload's result or show an error.
    const uploaded = run(
      state,
      { type: "succeed", id: UPLOAD_ID, features: uploadFeatures },
      { type: "fail", id: LIBRARY_LOAD_ID, error: "Couldn't load" }
    );
    expect(uploaded).toMatchObject({ features: uploadFeatures, error: null });
  });

  it("still accepts an upload after the library load failed", () => {
    const failed = run(initialPanelState(libraryTrack), {
      type: "fail",
      id: LIBRARY_LOAD_ID,
      error: "Couldn't load the analysis for \"Dev Pulse\".",
    });
    expect(failed).toMatchObject({ loading: null, features: null });
    expect(failed.error).toMatch(/Dev Pulse/);

    const analyzing = run(failed, { type: "start", id: UPLOAD_ID, message: "Analyzing..." });
    expect(analyzing).toMatchObject({ loading: "Analyzing...", error: null });

    const uploaded = run(analyzing, { type: "succeed", id: UPLOAD_ID, features: uploadFeatures });
    expect(uploaded).toMatchObject({ loading: null, features: uploadFeatures, error: null });
  });

  it("only lets the newest of several uploads win", () => {
    const state = run(
      initialPanelState(null),
      { type: "start", id: 1, message: "Analyzing..." },
      { type: "start", id: 2, message: "Analyzing..." },
      { type: "succeed", id: 2, features: uploadFeatures },
      { type: "fail", id: 1, error: "old failure" }
    );
    expect(state).toMatchObject({ features: uploadFeatures, error: null });
  });

  it("clears the slot and shows the error when the newest load fails", () => {
    const state = run(
      initialPanelState(null),
      { type: "start", id: 1, message: "Analyzing..." },
      { type: "fail", id: 1, error: "Couldn't analyze this file" }
    );
    expect(state).toMatchObject({ loading: null, features: null, error: "Couldn't analyze this file" });
  });
});
