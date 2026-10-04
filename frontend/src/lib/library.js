import { LIBRARY_BASE } from "./config";
import {
  attachFingerprints,
  isValidHeroArtifact,
  parseFingerprintSummary,
  parseHero,
  parseThumbs,
  UNAVAILABLE,
} from "./songFingerprint";

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

  const tracks = parseLibraryManifest(manifest);
  const summary = parseFingerprintSummary(manifest.song_fingerprint);
  const thumbs = summary.ok ? await fetchFingerprintThumbs(summary) : null;
  return attachFingerprints(tracks, summary, thumbs);
}

// Song Fingerprints are optional: if thumbs.json can't be loaded or parsed,
// the library still works and cards show "no fingerprint" instead.
async function fetchFingerprintThumbs(summary) {
  try {
    const response = await fetch(libraryUrl(summary.thumbsPath));
    if (!response.ok) return null;
    return parseThumbs(await response.json(), summary);
  } catch {
    return null;
  }
}

// Loads one track's large (hero) Song Fingerprint:
//   { status: "available", path, viewBox, frames }  or  { status: "unavailable", reason }
// Never throws. A track whose fingerprint is already unavailable keeps that
// reason and nothing is requested; a hero file that can't be loaded, or that
// doesn't match the track and its thumbnail's build, is "malformed". The
// library itself is never affected - this is loaded separately, on demand.
export async function fetchFingerprintHero(track) {
  const fingerprint = track?.fingerprint;
  if (fingerprint?.status !== "available") {
    return { status: "unavailable", reason: fingerprint?.reason || UNAVAILABLE.missing };
  }
  const malformed = { status: "unavailable", reason: UNAVAILABLE.malformed };
  if (!isValidHeroArtifact(fingerprint.heroArtifact, track)) return malformed;

  try {
    const response = await fetch(libraryUrl(fingerprint.heroArtifact));
    if (!response.ok) return malformed;
    const hero = parseHero(await response.json(), track, fingerprint.identity);
    return hero ? { status: "available", ...hero } : malformed;
  } catch {
    return malformed;
  }
}

function isFiniteNumberArray(value) {
  return Array.isArray(value) && value.every(Number.isFinite);
}

// True when a feature file has what the full Fingerprint and /compare read:
// frame-aligned, non-empty RMS and centroid arrays, a positive duration, and
// beat timestamps (a track with no detected beats has an empty list).
function hasValidFeatures(data) {
  return (
    isFiniteNumberArray(data?.rms_energy) &&
    isFiniteNumberArray(data.spectral_centroid) &&
    data.rms_energy.length > 0 &&
    data.rms_energy.length === data.spectral_centroid.length &&
    Number.isFinite(data.duration_seconds) &&
    data.duration_seconds > 0 &&
    isFiniteNumberArray(data.beat_times)
  );
}

// Validates a track's precomputed feature file and shapes it like an /analyze
// response, so SongPanel can treat library and uploaded songs the same way.
// `audio_url` points at the static library audio; `title` replaces the upload path.
// `fingerprint` is the track's Song Fingerprint (see attachFingerprints),
// always present on library features. /analyze responses never have one, so
// a slot's fingerprint belongs to whatever features it currently shows: an
// upload that replaces a library track replaces its fingerprint too.
export function parseTrackFeatures(track, data) {
  if (!hasValidFeatures(data)) {
    throw new Error(`The analysis for "${track.title}" isn't in the expected format.`);
  }

  return {
    ...data,
    audio_url: libraryUrl(track.audio),
    title: track.title,
    fingerprint: track.fingerprint ?? { status: "unavailable", reason: UNAVAILABLE.missing },
  };
}

// Fetches one library track's full features (the same dev-server caveat as
// fetchLibrary applies: a missing file comes back as index.html with status 200).
export async function fetchTrackFeatures(track) {
  const failure = `Couldn't load the analysis for "${track.title}".`;

  let response;
  try {
    response = await fetch(libraryUrl(track.features));
  } catch {
    throw new Error(failure);
  }
  if (!response.ok) throw new Error(failure);

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(failure);
  }

  return parseTrackFeatures(track, data);
}

// Where loading every library track's features stands, given the current track
// list and the last completed load (`result.tracks` is the list it was for).
// An empty list has nothing to load, so it is ready straight away rather than
// waiting for a load that never starts. A result for a different (older) list
// still counts as loading.
export function resolveFeatureLoad(tracks, result) {
  if (tracks.length === 0) return { status: "ready", byId: new Map(), failedIds: [] };
  if (result.tracks !== tracks) return { status: "loading", byId: new Map(), failedIds: [] };
  return { status: "ready", byId: result.byId, failedIds: result.failedIds };
}
