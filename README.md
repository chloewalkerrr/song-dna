# Song DNA

Song DNA analyses an audio file's changing energy and frequency content over time and turns it into a visual "fingerprint" — a segmented, DNA-strand-style bar chart showing how loud (RMS energy) and how bright (spectral centroid) the song is at every moment. The app has three pages: a **Home** page that introduces the idea with one real library track drawn as an annotated figure, a **Library** of precomputed tracks you can browse, search, preview and select as Song A / Song B, and **Compare**, where the two selected library tracks (or two uploaded songs) are shown as fingerprints on a shared scale, with independent playback and rule-based findings.

This README describes what's actually built right now. For the longer-term concept and future milestones, see [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).

## What's implemented
- **App shell and routing** — a sidebar layout (React Router) with Home (`/`), Library and Compare pages; any other URL redirects to `/`.
- **Home page** — a short introduction built from real library data. One track is drawn large as "Fig. 1", with brief notes beside the energy, brightness and beat markings; it can be played, and moving across it (pointer, or arrow keys once focused) shows the averaged energy and brightness of that moment. A numbered index of the library switches which track is Fig. 1, and a small two-track preview opens the pair in Compare. Every strand on Home uses one shared scale across the whole library (the same rules as Compare: true RMS maximum, 95th-percentile centroid), so heights compare directly. Home loads all library feature files and needs no backend. Tempo is shown as an estimate, and the tracks are labelled as synthetic test tracks.
- **Library page** — browses a static, precomputed track library served from `frontend/public/library/` (no backend needed). Tracks can be searched and filtered by genre, previewed with audio playback, and selected as Song A / Song B. Each card shows the track's 52 px **Song Fingerprint** (below). `library.json` still carries the older 48-segment DNA `preview` for each track, but cards no longer display it. The current library audio is synthetic placeholder tracks (`scripts/generate_dev_tracks.py`); features are precomputed by `scripts/build_library.py`.
- **Upload and analyze one or two songs at once (Compare page)** — the Compare page shows two upload slots (Song A / Song B), each independent, each presented as its own card with a dropzone-style file picker.
- **Song Fingerprint (E1B1/1)** — a whole-track identity mark, separate from the Song DNA timeline: Song DNA shows how a track changes over time, the fingerprint shows where it spends its time overall. Every frame at or above −60 dBFS is placed by **chroma entropy** (x: 0 = energy in one pitch class, 1 = spread evenly over all 12) and **log2 spectral centroid** (y: 50 Hz to 11,025 Hz, brighter higher). Frames outside that domain are dropped, not clipped. The blurred histogram is divided by the track's total frame count, so silence reduces it rather than being ignored. It is drawn as ridge lines (the "B1" renderer) at two separate line spacings: a 220 px hero and a 52 px thumbnail, which is its own tracing rather than a scaled hero. The measurement and renderer (`src/song_dna/song_fingerprint/`) reproduce the validated research implementation exactly. It is not a unique identifier and makes no claims about genre, mood, quality or similarity. A track with no voiced frames (e.g. all silent) gets no fingerprint, and its card says so. For now only Library cards show it; Compare and uploads don't.
- **Library selection → Compare** — when Song A and Song B are both selected in the Library, Compare opens with those tracks already loaded from their precomputed features and library audio (no upload or re-analysis). Uploading a file into either slot replaces that track. Without two selected tracks, both slots start empty for uploads. The selection lives in memory only, so a page refresh returns Compare to the upload flow.
- **RMS energy** — computed frame-by-frame with a manual numpy implementation (`src/song_dna/rms.py`), not a library call. Measures loudness over time.
- **Spectral centroid** — computed via `librosa.feature.spectral_centroid`. Measures the "brightness" (weighted average frequency) of the sound at each moment, independent of loudness.
- **Beat detection** — computed via `librosa.beat.beat_track`. Extracts the timestamp of each detected beat, shown as small marker dots along the top of each song's fingerprint (positioned by time, so they stay accurate regardless of how many visual segments the fingerprint is drawn with).
- **Segmented dual-strand fingerprint visualization** — each song's RMS and spectral centroid are downsampled into 40 discrete bar segments (averaged, for display only — the underlying analysis data is untouched) and drawn as two mirrored strands around a center axis: energy bars extend upward, brightness bars extend downward. When two songs are loaded, both are scaled against a *shared* ceiling computed across both songs, so their relative loudness/brightness is visually comparable rather than each song being normalized against only its own peak. RMS uses the shared true maximum; spectral centroid uses the shared 95th percentile instead, since real audio has rare outlier frames (e.g. a single transient click) that would otherwise flatten the entire visual scale for both songs.
- **Playback** — each song has its own native `<audio>` element with play/pause and a playhead synced to actual playback position, fully independent between the two songs.
- **Unique filenames on upload** — uploads are saved under a generated UUID-based filename (extension preserved), so two files with the same original name never overwrite each other on disk.
- **Basic error handling** — uploading a non-audio or corrupt file returns a clear error message (both from the backend and shown in the UI as a destructive-styled alert) instead of a raw stack trace or a stuck "Analyzing..." state.
- **Rule-based findings** — once both Compare slots are analyzed, the frontend sends both songs' RMS and centroid arrays to `POST /compare`, which returns plain-language findings about average energy, dynamic range, energy trend and brightness (`src/song_dna/findings.py`). Each finding comes from measured numbers and fixed thresholds; small differences are reported as "similar". There is no ML and no overall similarity score.
- **Light/dark theme** — dark by default, with a light/dark toggle in the sidebar footer. The choice is saved in `localStorage` (`songdna-theme`); it does not follow the OS setting.
- **Component-based UI** — built with shadcn/ui components (e.g. Card, Badge, Alert, Button, Input, Sidebar, Skeleton) rather than raw HTML controls and inline styles.

## Tech stack

- **Backend:** Python, FastAPI, served with Uvicorn
- **Audio analysis:** numpy (manual RMS), librosa (spectral centroid, audio loading), scipy
- **Frontend:** React (Vite) with React Router, styled with Tailwind CSS and shadcn/ui
- **Testing:** pytest (backend), vitest (frontend)

## Running it locally

Two servers need to run at once: the FastAPI backend and the Vite frontend dev server.

### Backend

From the repository root, in PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn song_dna.api:app --app-dir src --reload
```

This serves the API at `http://127.0.0.1:8000`. Use `song_dna.api:app` with `--app-dir src`, not `src.song_dna.api:app`: the backend imports itself as `song_dna`, so the `src.` form fails to import. The backend is only needed for the Compare page (uploads and findings); the Library page works without it.

To run the backend tests:

```powershell
.\venv\Scripts\python.exe -m pytest -v
```

### Frontend

In a separate terminal, from the `frontend` folder:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173` in your browser. The frontend calls the backend at `http://127.0.0.1:8000` by default; set `VITE_API_URL` to override it.

To run the frontend tests, lint and production build:

```powershell
npm test
npm run lint
npm run build
```

### Library

The library's inputs are `frontend/public/library/metadata.json` and the audio in `frontend/public/library/audio/`. Don't edit the generated `library.json` or `features/*.json` by hand; rebuild them from the repository root:

```powershell
.\venv\Scripts\python.exe scripts\build_library.py
```

`scripts\generate_dev_tracks.py` regenerates the synthetic placeholder audio; rebuild the library afterwards.

The build also writes the Song Fingerprints: `fingerprints/thumbs.json` (all 52 px thumbnails) and `fingerprints/<id>.json` (each 220 px hero path with its audit metadata). `library.json` holds only a small `song_fingerprint` summary and, per track, a reference to its fingerprint file, or `null` with the reason there is none. The fingerprint rendering reference (`dref`) is 1.2 × the densest histogram cell across the current library. Every build recomputes it and redraws every fingerprint, so adding or changing a track can change the others. `corpus_id` (a hash of every track's id and audio) records which audio a build came from, and `params_hash` records the frozen parameters. This is the policy for the fixed demo library only, not yet for uploads or a growing library.

## AI tooling (optional)

Agent instructions live in `AGENTS.md` (shared by all coding agents); `CLAUDE.md` imports it
and adds Claude Code specifics. Project permissions for Claude Code are in
`.claude/settings.json`.

For Claude Code, `/feature <request>` runs the project's feature workflow
(`.claude/skills/feature/`, tracked in git): plan, implement, test, verify UI changes in a
browser with `playwright-cli`, self-review, and report. It never fetches, switches branches,
stages, commits, pushes or opens PRs; those stay manual.

Three agent skills are used: `impeccable`, `playwright-cli` and `gh-fix-ci`. The installed copies
(`.agents/skills/`, `.claude/skills/`) are git-ignored; `skills-lock.json` records where each
came from. To restore them after cloning:

```powershell
npx skills experimental_install
```

Limits to be aware of:

- `skills-lock.json` records each skill's source repository and a content hash, **not** an
  upstream revision. A restore fetches whatever the source currently contains, so it may differ
  from the locked copy; the hash only shows that it changed. `experimental_install` is marked
  experimental by the skills CLI.
- The `impeccable` skill downloads a helper binary the first time it runs. The lock hash does
  not cover that binary.
- The `playwright-cli` skill needs the CLI itself, installed globally and not pinned by this
  repo: `npm install -g @playwright/cli` (developed against 0.1.21).

## Planned / not yet built

This is an honest list of what's missing, not a roadmap promise:

- **No persistence for uploads.** Every upload is re-analyzed from scratch and its results live only in React state, lost on page refresh (the uploaded file itself stays in `data/audio/`). Only the static library has precomputed features. `PROJECT_CONTEXT.md` describes a planned SQLite + per-song feature-file architecture; that hasn't been built.
- **No overall similarity score.** Findings describe specific measured differences; there's no single similarity number and no section-level matching.
- **Compare supports exactly two songs**, and the Library selection isn't persisted across page refreshes.
- **Library audio is placeholder.** The current library tracks are synthetic, generated for development; no curated real tracks have been added yet.
- **No timeline alignment.** If two songs have different tempos or lengths, their fingerprints are not time-warped or aligned to each other.
- **Error handling is basic, not comprehensive.** Unsupported/corrupt files and network failures show a message instead of breaking the UI, but there's no retry mechanism, and uploaded files (including ones that fail to analyze) are never cleaned up from disk.
- **No automated frontend component tests.** The frontend test suite covers pure logic modules only (scaling, bucketing, fingerprint layout, beat thinning, selection, track filtering, formatting, Compare slot load state, library loading, Song Fingerprint parsing, theme, Home specimen statistics); there's no automated testing of the upload flow, rendering, or playback behavior in a browser.
- **The upload area looks like a dropzone but isn't one yet.** It's styled to look drag-and-drop-able, but only click-to-choose is actually wired up — there's no `drop`/`dragover` handling, so dragging a file onto it currently does nothing.
