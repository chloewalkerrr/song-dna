import { API_BASE } from "./config";

// Requests to the local analysis server (/analyze and /compare), with
// plain-language errors that say what actually went wrong: the server not
// answering is a different problem from it answering with an error, and
// neither should be blamed on the other.

export const SERVER_UNREACHABLE =
  "Couldn't reach the local analysis server. Make sure it's running and try again.";
export const ANALYSIS_FAILED = "Couldn't analyse this file. Try another supported audio file.";
export const COMPARE_FAILED = "Couldn't compare these two songs. Try again.";

// The upload formats offered in the file picker. Every one was checked end to
// end: the backend decodes it (librosa via soundfile/libsndfile 1.2; there is
// no ffmpeg fallback, so M4A/AAC fail) and the browser plays it back. AIFF
// decodes too but Chrome can't play it, so it isn't offered. `accept` is only
// a hint - a file chosen anyway gets ANALYSIS_FAILED if the backend rejects it.
export const UPLOAD_ACCEPT = ".mp3,.wav,.flac,.ogg";
export const UPLOAD_FORMATS = "MP3, WAV, FLAC or OGG";

// POSTs to the analysis server and returns the parsed JSON body. Throws an
// Error whose message is user-facing copy: SERVER_UNREACHABLE when no
// response arrived at all (server not running, wrong port, CORS), otherwise
// `failure` (an error status, or a body that isn't JSON). Server error
// details are never shown, so no server paths or tracebacks leak through.
export async function postToServer(path, init, failure) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: "POST", ...init });
  } catch {
    throw new Error(SERVER_UNREACHABLE);
  }
  if (!response.ok) throw new Error(failure);

  try {
    return await response.json();
  } catch {
    throw new Error(failure);
  }
}

// The message to show for a failed request: SERVER_UNREACHABLE if that is
// what went wrong, otherwise `failure`. Anything else that was thrown (a bug,
// or a response missing a field) gets `failure` too, so a raw JavaScript
// error message never reaches the page.
export function errorCopy(error, failure) {
  return error?.message === SERVER_UNREACHABLE ? SERVER_UNREACHABLE : failure;
}

// An /analyze response shown under the name the user chose. The server
// saves uploads under a random name (so repeated uploads never overwrite each
// other) and reports that path, which means nothing to the user. `file_path`
// is kept as the server returned it; only the displayed `title` is added.
export function withUploadTitle(features, fileName) {
  return { ...features, title: fileName };
}

export const UNTITLED_UPLOAD = "Uploaded audio";

// The name a Compare slot shows: the library track's title, or the name of
// the file the user chose (withUploadTitle). The server's saved path is never
// shown, even if a title is somehow missing.
export function displayTitle(features) {
  return typeof features?.title === "string" && features.title ? features.title : UNTITLED_UPLOAD;
}

// Uploads one audio file for analysis; resolves to its features, titled
// with the file's own name.
export async function analyzeFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const features = await postToServer("/analyze", { body: formData }, ANALYSIS_FAILED);
  return withUploadTitle(features, file.name);
}

// Asks the server for rule-based findings about two analysed songs.
export function compareSongs(songAFeatures, songBFeatures) {
  return postToServer(
    "/compare",
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        song_a: {
          rms_energy: songAFeatures.rms_energy,
          spectral_centroid: songAFeatures.spectral_centroid,
        },
        song_b: {
          rms_energy: songBFeatures.rms_energy,
          spectral_centroid: songBFeatures.spectral_centroid,
        },
      }),
    },
    COMPARE_FAILED
  );
}
