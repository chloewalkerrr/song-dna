// Load state for one Compare slot (SongPanel). A slot is filled either from a
// library track or from an upload. Every load gets a larger id than the one
// before it, and a result that isn't from the newest load is ignored - so a
// slow library fetch can't overwrite a newer upload, and a failed library
// load doesn't block uploading a file afterwards.
//
// State: { loadId, loading: message | null, features, error: message | null }

// The id of a slot's library load. ComparePage keys each SongPanel by its
// library track, so a panel loads at most one library track, always first;
// uploads take ids after this one.
export const LIBRARY_LOAD_ID = 1;

export function initialPanelState(track) {
  return track
    ? { loadId: LIBRARY_LOAD_ID, loading: "Loading...", features: null, error: null }
    : { loadId: 0, loading: null, features: null, error: null };
}

// Actions:
//   { type: "start", id, message }   a newer load begins (keeps current features on screen)
//   { type: "succeed", id, features }
//   { type: "fail", id, error }
export function panelLoadReducer(state, action) {
  if (action.type === "start") {
    return { ...state, loadId: action.id, loading: action.message, error: null };
  }
  if (action.id !== state.loadId) return state;

  if (action.type === "succeed") {
    return { ...state, loading: null, features: action.features, error: null };
  }
  if (action.type === "fail") {
    return { ...state, loading: null, features: null, error: action.error };
  }
  return state;
}
