import { LIBRARY_BASE } from "./config";

const REQUIRED_TRACK_FIELDS = ["id", "title", "genre", "audio", "features"];

// Manifest paths (e.g. "audio/dev-pulse.mp3") are relative to the library folder.
export function libraryUrl(relativePath) {
  return `${LIBRARY_BASE}${relativePath}`;
}

// Validates the shape of library.json and returns its track list. Throws a
// readable error rather than letting a malformed manifest break the UI later.
export function parseLibraryManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.tracks)) {
    throw new Error("The song library file isn't in the expected format.");
  }

  for (const track of manifest.tracks) {
    for (const field of REQUIRED_TRACK_FIELDS) {
      if (typeof track?.[field] !== "string" || !track[field]) {
        throw new Error(`A track in the song library is missing "${field}".`);
      }
    }
    if (typeof track.duration_seconds !== "number" || !track.preview) {
      throw new Error(`Track "${track.id}" is missing its duration or preview.`);
    }
  }

  return manifest.tracks;
}

// Fetches and validates the library. The dev server answers a *missing* file
// with the app's index.html and status 200, so `response.ok` alone can't be
// trusted - a body that isn't JSON is treated as "library not found".
export async function fetchLibrary() {
  let response;
  try {
    response = await fetch(libraryUrl("library.json"));
  } catch {
    throw new Error("Couldn't reach the song library. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error(`Couldn't load the song library (HTTP ${response.status}).`);
  }

  let manifest;
  try {
    manifest = await response.json();
  } catch {
    throw new Error("The song library file wasn't found or isn't valid JSON.");
  }

  return parseLibraryManifest(manifest);
}
