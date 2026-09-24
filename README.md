# Song DNA

Song DNA analyses an audio file's changing energy and frequency content over time and turns it into a visual "fingerprint" — a segmented, DNA-strand-style bar chart showing how loud (RMS energy) and how bright (spectral centroid) the song is at every moment. You can upload two songs side by side and compare their fingerprints on a shared scale, with independent playback for each.

This README describes what's actually built right now. For the longer-term concept and future milestones, see [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).

## What's implemented

- **Upload and analyze one or two songs at once** — the app shows two upload slots (Song A / Song B), each independent, each presented as its own card with a dropzone-style file picker.
- **RMS energy** — computed frame-by-frame with a manual numpy implementation (`src/song_dna/rms.py`), not a library call. Measures loudness over time.
- **Spectral centroid** — computed via `librosa.feature.spectral_centroid`. Measures the "brightness" (weighted average frequency) of the sound at each moment, independent of loudness.
- **Beat detection** — computed via `librosa.beat.beat_track`. Extracts the timestamp of each detected beat, shown as small marker dots along the top of each song's fingerprint (positioned by time, so they stay accurate regardless of how many visual segments the fingerprint is drawn with).
- **Segmented dual-strand fingerprint visualization** — each song's RMS and spectral centroid are downsampled into 40 discrete bar segments (averaged, for display only — the underlying analysis data is untouched) and drawn as two mirrored strands around a center axis: energy bars extend upward, brightness bars extend downward. When two songs are loaded, both are scaled against a *shared* ceiling computed across both songs, so their relative loudness/brightness is visually comparable rather than each song being normalized against only its own peak. RMS uses the shared true maximum; spectral centroid uses the shared 95th percentile instead, since real audio has rare outlier frames (e.g. a single transient click) that would otherwise flatten the entire visual scale for both songs.
- **Playback** — each song has its own native `<audio>` element with play/pause and a playhead synced to actual playback position, fully independent between the two songs.
- **Unique filenames on upload** — uploads are saved under a generated UUID-based filename (extension preserved), so two files with the same original name never overwrite each other on disk.
- **Basic error handling** — uploading a non-audio or corrupt file returns a clear error message (both from the backend and shown in the UI as a destructive-styled alert) instead of a raw stack trace or a stuck "Analyzing..." state.
- **Dark-themed, component-based UI** — the app uses a permanent dark theme (not a toggle, not OS-dependent) and shadcn/ui components (Card, Label, Badge, Alert, Button) throughout, rather than raw HTML controls and inline styles.

## Tech stack

- **Backend:** Python, FastAPI, served with Uvicorn
- **Audio analysis:** numpy (manual RMS), librosa (spectral centroid, audio loading), scipy
- **Frontend:** React (Vite), styled with Tailwind CSS and shadcn/ui (Card, Label, Badge, Alert, and Button components)
- **Testing:** pytest (backend), vitest (frontend)

## Running it locally

Two servers need to run at once: the FastAPI backend and the Vite frontend dev server.

### Backend

From the repository root, in PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.song_dna.api:app --reload
```

This serves the API at `http://127.0.0.1:8000`.

To run the backend tests:

```powershell
.\venv\Scripts\python.exe -m pytest -v
```

### Frontend

In a separate terminal, from the `frontend` folder:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

To run the frontend tests:

```powershell
npm test
```

## Planned / not yet built

This is an honest list of what's missing, not a roadmap promise:

- **No persistence.** Every upload is re-analyzed from scratch and results live only in React state — nothing is saved to disk or a database, and everything is lost on page refresh. `PROJECT_CONTEXT.md` describes a planned SQLite + per-song feature-file architecture; that hasn't been built.
- **No similarity scoring or automated findings.** The app shows two fingerprints side by side; it doesn't yet compute or describe similarities/differences between them.
- **Exactly two songs, hard-coded.** There's no support for more than two songs, and no way to swap or manage a library of previously analyzed songs.
- **No timeline alignment.** If two songs have different tempos or lengths, their fingerprints are not time-warped or aligned to each other.
- **Error handling is basic, not comprehensive.** Unsupported/corrupt files and network failures show a message instead of breaking the UI, but there's no retry mechanism, and uploaded files (including ones that fail to analyze) are never cleaned up from disk.
- **No automated frontend component tests.** The frontend test suite covers pure logic functions only (shared/percentile scaling, bucketing/downsampling, bar-height clamping); there's no automated testing of the upload flow, rendering, or playback behavior in a browser.
- **The upload area looks like a dropzone but isn't one yet.** It's styled to look drag-and-drop-able, but only click-to-choose is actually wired up — there's no `drop`/`dragover` handling, so dragging a file onto it currently does nothing.
