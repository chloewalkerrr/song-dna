# Song DNA

SongDNA measures audio and draws what it measured. The app has three pages: a **Home** page that introduces the idea through one real library track, a **Library** of precomputed tracks you can browse, search, preview and select as Song A / Song B, and **Compare**, where the two selected library tracks (or two uploaded songs) are shown on a shared scale, with independent playback and rule-based findings.

It has three distinct layers:

- **Song Fingerprint** — a whole-track identity summary with no time axis, drawn from where the track sits in chroma entropy × spectral centroid space. It is an identity mark, not a unique identifier, and not a genre, mood, quality or similarity score.
- **Song DNA** — how the track changes over time: RMS energy and spectral centroid averaged into 40 display segments, with beat markers. On Home every track shares one library-wide scale.
- **Comparison** — two tracks on the same scale. Compare adds measured, rule-based findings. There is no overall similarity score and no machine learning.

This README describes what's actually built right now. For the longer-term concept and future milestones, see [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).

## What's implemented
- **App shell and routing** — a sidebar layout (React Router) with Home (`/`), Library and Compare pages; any other URL redirects to `/`.
- **Home page** — a short introduction built from real library data, in figures. The selected track (Dev Sweep by default) drives every figure; choosing a row in the numbered library index changes it.
  - **Intro** — what the Song Fingerprint and Song DNA each show, with links to the Library and to Compare for your own audio.
  - **Fig. 1 Song Fingerprint** beside the **library index** — the selected track's 220 px fingerprint, labelled only at its edges (bright/dark, tonal/spread), with its track, duration and voiced-frame count. Each index row shows the track's 52 px fingerprint, title, description and duration.
  - **Fig. 2 Song DNA** — the selected track's energy and brightness over time. It can be played, and moving across it (pointer, or arrow keys once focused) reads the averaged energy and brightness of that slice; clicking or pressing Enter moves playback there. The shared scale's ceilings are labelled beside the chart.
  - **Fig. 3 Comparison** — the selected track (A) against a second track (B, chosen from a list) on the same scale, each with its fingerprint and DNA strip. "Open in Compare" loads the pair there; Home itself shows no findings.
  - **How it's measured** — a short methodology for each figure.

  Every DNA strip on Home uses one shared scale across the whole library (the same rules as Compare: true RMS maximum, 95th-percentile centroid), so heights compare directly. Home and Compare share one neutral-ink style: energy as solid bars rising, brightness as open bars hanging, beats as ticks, with an ochre playhead (and, on Home, an ochre reading band). Home loads static library files only and needs no backend. Tempo is shown as an estimate, and the tracks are labelled as synthetic test tracks.
- **Library page** — browses a static, precomputed track library served from `frontend/public/library/` (no backend needed). Tracks can be searched and filtered by genre, previewed with audio playback, and selected as Song A / Song B. Each card shows the track's 52 px **Song Fingerprint** (below). `library.json` still carries the older 48-segment DNA `preview` for each track, but cards no longer display it. The current library audio is synthetic placeholder tracks (`scripts/generate_dev_tracks.py`); features are precomputed by `scripts/build_library.py`.
- **Compare page** — Song A stacked above Song B, each in a hairline-separated section, in the same neutral style as Home. One legend (energy, brightness, beats) and one line stating the pair's shared scale sit above both songs, with Findings below them.
  - **Each slot** — an empty slot shows a click-to-choose upload area (MP3, WAV, FLAC or OGG). A loaded slot shows its 52 px Song Fingerprint (library tracks only), an ink A/B badge, the title, duration, **Replace…** to upload a different file, and Play/Pause.
  - **Uploads** — each upload is analysed by the local backend (`POST /analyze`) and shown under the name of the file you chose; the backend's own saved copy and path are never shown as the title. Uploads have no Song Fingerprint, and the slot says fingerprints are available for library tracks only.
  - **Scale** — Compare's scale covers just the pair on screen, so the same two tracks can draw at different heights than on Home, whose scale spans the whole library.
- **Song Fingerprint (E1B1/1)** — a whole-track identity mark, separate from the Song DNA timeline: Song DNA shows how a track changes over time, the fingerprint shows where it spends its time overall. Every frame at or above −60 dBFS is placed by **chroma entropy** (x: 0 = energy in one pitch class, 1 = spread evenly over all 12) and **log2 spectral centroid** (y: 50 Hz to 11,025 Hz, brighter higher). Frames outside that domain are dropped, not clipped. The blurred histogram is divided by the track's total frame count, so silence reduces it rather than being ignored. It is drawn as ridge lines (the "B1" renderer) at two separate line spacings: a 220 px hero and a 52 px thumbnail, which is its own tracing rather than a scaled hero. The measurement and renderer (`src/song_dna/song_fingerprint/`) reproduce the validated research implementation exactly. It is not a unique identifier and makes no claims about genre, mood, quality or similarity. A track with no voiced frames (e.g. all silent) gets no fingerprint, and its card says so. Library cards, the Home index, Home's Fig. 3 and Compare's library tracks show the thumbnail, and Home's Fig. 1 loads the hero on demand. Fingerprints are generated only for the library: `/analyze` doesn't produce one, so uploads never show one.
- **Library selection → Compare** — when Song A and Song B are both selected in the Library, Compare opens with those tracks already loaded from their precomputed features and library audio (no upload or re-analysis). Uploading a file into either slot replaces that track. Without two selected tracks, both slots start empty for uploads. The selection lives in memory only, so a page refresh returns Compare to the upload flow.
- **RMS energy** — computed frame-by-frame with a manual numpy implementation (`src/song_dna/rms.py`), not a library call. Measures loudness over time.
- **Spectral centroid** — computed via `librosa.feature.spectral_centroid`. Measures the "brightness" (weighted average frequency) of the sound at each moment, independent of loudness.
- **Beat detection** — computed via `librosa.beat.beat_track`. Extracts the timestamp of each detected beat, shown as short ticks along the top of each song's DNA strip on Home and Compare (positioned by time, so they stay accurate regardless of how many visual segments the fingerprint is drawn with).
- **Segmented dual-strand fingerprint visualization** — each song's RMS and spectral centroid are downsampled into 40 discrete bar segments (averaged, for display only — the underlying analysis data is untouched) and drawn as two mirrored strands around a center axis: energy bars extend upward, brightness bars extend downward. When two songs are loaded, both are scaled against a *shared* ceiling computed across both songs, so their relative loudness/brightness is visually comparable rather than each song being normalized against only its own peak. RMS uses the shared true maximum; spectral centroid uses the shared 95th percentile instead, since real audio has rare outlier frames (e.g. a single transient click) that would otherwise flatten the entire visual scale for both songs.
- **Playback** — each Compare slot plays independently, with Play/Pause and a playhead synced to the actual playback position (the same playback hook as Home's Fig. 2). The button returns to Play when a track ends, and replacing a track resets playback for the new one.
- **Unique filenames on upload** — the backend saves each upload under a generated UUID-based filename (extension preserved), so two files with the same original name never overwrite each other on disk. The page still shows the original file name.
- **Error handling** — errors appear as plain-language alerts, never a raw stack trace or a stuck "Analysing..." state. A file the backend can't analyse ("Couldn't analyse this file…") is reported differently from a backend that can't be reached ("Couldn't reach the local analysis server…"), and the same distinction applies to findings.
- **Rule-based findings** — once both Compare slots have a song, the frontend sends both songs' RMS and centroid arrays to `POST /compare` on the local backend. It returns four plain-language findings, labelled Energy, Dynamic range, Energy trend and Brightness (`src/song_dna/findings.py`). Each comes from measured numbers and fixed thresholds; small differences are reported as "similar". There is no ML and no overall similarity score. Findings belong to the exact pair on screen, so replacing either song never leaves the previous pair's findings showing.
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
- **No Song Fingerprints for uploads.** Only library tracks have one; `/analyze` doesn't generate one.
- **Error recovery is limited.** There's no retry button: after starting the backend, you re-choose the file, or reopen or change the pair to get findings again. A failed replacement upload clears that slot rather than keeping the previous song.
- **Uploaded files are never cleaned up.** Every upload, including ones that fail to analyse, stays in `data/audio/` under its UUID name. Choosing one of those saved copies to upload again shows that UUID as its name, since the page can only show the chosen file's name.
- **Playback isn't coordinated between slots.** Song A and Song B can play at the same time; starting one doesn't pause the other.
- **No automated frontend component tests.** The frontend test suite covers pure logic modules only (scaling, bucketing, fingerprint layout, beat thinning, selection, track filtering, formatting, Compare slot load state, Compare result pairing, upload/compare requests and their error messages, library loading, Song Fingerprint parsing and hero load state, theme, Home specimen statistics); there's no automated testing of the upload flow, rendering, or playback behavior in a browser.
- **The empty upload area looks like a dropzone but isn't one yet.** It's styled to look drag-and-drop-able, but only click-to-choose is actually wired up — there's no `drop`/`dragover` handling, so dragging a file onto it currently does nothing.
