# SongDNA — guide for Claude Code

SongDNA analyses audio files and turns their energy and brightness over time into a visual
"fingerprint" (a segmented, DNA-strand-style bar chart), then compares two songs side by side
with plain-language findings. Single-user, localhost-only app.

- `README.md` describes what is built and how to run it.
- `PROJECT_CONTEXT.md` holds the longer-term product context: vision, milestones, scope
  boundaries and development principles. Read it before proposing new features.
- Where either document disagrees with the code, the code is authoritative.

---

## Project facts

### Architecture

Two separate processes, plus a static song library:

1. **Backend** — Python 3.11, FastAPI, served by uvicorn on `http://127.0.0.1:8000`.
   Package lives in `src/song_dna/`:
   - `rms.py` — manual numpy RMS energy (deliberately *not* `librosa.feature.rms`;
     framing matches librosa: frame 2048, hop 512, centered).
   - `features.py` — `AudioFeatures` dataclass + `extract_features(path)`: RMS, spectral
     centroid (librosa), beat times + tempo (librosa `beat_track` on an 11025 Hz copy for speed).
     Time-series arrays are frame-aligned; `beat_times` is sparse timestamps.
   - `findings.py` — rule-based, explainable A-vs-B findings (average energy, dynamic range,
     energy trend, brightness) using fixed thresholds (10% / 30% / 15%). No ML.
   - `api.py` — `POST /analyze` (upload → saved under `data/audio/<uuid>.<ext>` → features),
     `POST /compare` (two songs' feature arrays → findings), static `/audio` mount.
     CORS allows only `http://localhost:5173`.
   - `library.py` — builds the precomputed song library (see below).
2. **Frontend** — React 19 + Vite 8, plain JavaScript (no TypeScript), Tailwind CSS v4,
   shadcn/ui (radix-nova style, neutral base, lucide icons), react-router-dom 7. Dev server on
   `http://localhost:5173`. Backend URL comes from `src/lib/config.js` (`VITE_API_URL` override).
3. **Song library** — static files in `frontend/public/library/`:
   `metadata.json` (hand-authored) + `audio/*` → `scripts/build_library.py` →
   `features/<id>.json` + `library.json` (manifest with a 48-bar preview per track).
   The frontend reads these directly; no backend needed for the library.
   Current tracks are synthetic placeholders from `scripts/generate_dev_tracks.py`.

### Frontend layout (`frontend/src/`)

- `App.jsx` — providers (Theme → Library → Selection) wrap the router; routes `/library`,
  `/compare`, everything else redirects to `/library`.
- `pages/` — `LibraryPage` (grid, search, genre chips, A/B selection, previews) and
  `ComparePage` (currently two upload-based `SongPanel`s + `Findings`; not yet wired to the
  library selection).
- `components/` — app components; `components/ui/` is **shadcn-generated** (lint-ignored).
- Context pattern: context + `useX()` hook in `hooks/use-x.js`; provider in
  `components/x-provider.jsx`.
- Pure logic lives in top-level `.js` modules with colocated `*.test.js`:
  `scaling`, `bucketing`, `fingerprintLayout`, `beatThinning`, `selection`, `trackFilter`,
  `format`, `lib/library`, `lib/theme`.
- Top-level components `Fingerprint.jsx`, `SongPanel.jsx`, `Findings.jsx` sit in `src/`.
- Import alias: `@/` → `frontend/src/`.

### Invariants that span both sides

- `frontend/src/bucketing.js` `bucketAverage` and `src/song_dna/library.py` `bucket_average`
  must stay identical in behaviour.
- Library feature files use the same field names as the `/analyze` response
  (`rms_energy`, `spectral_centroid`, `beat_times`, `duration_seconds`) so `Fingerprint`
  consumes both unchanged.
- Two-song scaling is shared across both songs: RMS uses the true shared max; spectral
  centroid uses the shared 95th percentile (outlier frames). Bars are clamped.
- Downsampling/thinning (40 segments, beat-marker spacing) is display-only; analysis data is
  never modified.

### Commands (Windows / PowerShell; run from repo root unless noted)

```powershell
# Backend setup
python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt
# Run backend (same form CI boots)
.\venv\Scripts\python.exe -m uvicorn song_dna.api:app --app-dir src --reload
# Backend tests (pytest.ini puts . and src on the path)
.\venv\Scripts\python.exe -m pytest

# Frontend (from frontend/)
npm install
npm run dev      # http://localhost:5173
npm test         # vitest run
npm run lint     # eslint
npm run build    # vite build

# Song library
.\venv\Scripts\python.exe scripts\build_library.py        # rebuild features + manifest
.\venv\Scripts\python.exe scripts\generate_dev_tracks.py  # regenerate placeholder audio
```

### CI (`.github/workflows/test.yml`)

Runs on PRs and pushes to `dev` and `main`: pytest (Python 3.11), a uvicorn boot smoke test
(`--app-dir src`, polls `/docs`), vitest (Node 22) and `npm run build`. Lint is not part of
CI, so it must be run locally.

### Tests

- Backend `tests/`: rms, features (synthetic audio + a click track with known BPM, generated
  in fixtures — no dependency on local audio files), findings, api (functions called directly,
  not via TestClient), library (incl. a consistency check of the committed library).
- Frontend: pure-logic unit tests only; no component/render tests.

### Git

- Branches: `main` (stable), `dev` (integration, where work lands), and
  `feature/…`, `fix/…`, `chore/…` topic branches. Flow: topic → PR into `dev` → `main`.
- Commits use conventional prefixes, lowercase, imperative:
  `feat:`, `fix:`, `perf:`, `test:`, `ci:`, `docs:`, `chore:`, `style:`.
- `data/` (uploads, local audio) and `venv/` are git-ignored.

### UI / design

- Theme: dark by default, light/dark toggle in the sidebar footer, stored in localStorage
  key `songdna-theme`; `.dark` class on `<html>`. Neutral OKLCH shadcn tokens in
  `src/index.css`; Geist Variable font.
- Feature colours: **energy = violet-500** (bars above the axis), **brightness = cyan-500**
  (bars below), beats = `foreground/50` dots, playhead = `foreground` line.
  Selection slots: **A = violet-500, B = blue-500**.
- Page pattern: `mx-auto max-w-[920px]`, `h1` `text-3xl font-semibold tracking-tight`, muted
  subtitle; sidebar app shell.
- Tailwind class strings are written in full (lookup objects), never built dynamically.
- Errors are plain-language sentences shown in a destructive `Alert`; loading uses skeletons
  or muted mono text.
- Accessibility patterns in use: `aria-label`, `aria-pressed`, `role="status"`, no nested
  buttons (card-wide button overlay + raised play button).

---

## Working rules

### Product principles

- Every visual property must map to a real, documented audio measurement — no decorative
  animation pretending to be data.
- Findings/explanations must trace back to a computed number; say "similar" honestly when a
  difference is small; no claims about genre, emotion or quality.
- Stay within PROJECT_CONTEXT.md scope: no accounts, streaming APIs, cloud deployment, deep
  learning embeddings or generative AI unless explicitly approved.
- Library audio must be legally sourced (CC / royalty-free); never scrape or stream.

### How to work

- Small, independently testable steps; one unit of work per branch/PR. Finish the small
  version before expanding.
- Explain a new audio/DSP concept or architectural choice (and alternatives) before
  implementing it.
- Match the surrounding style: named constants for tuned numbers **with a comment explaining
  how the value was chosen**; docstrings/comments explain *why*; type hints on Python
  functions.
- Keep pure logic out of components (in a testable `.js` module) and out of FastAPI handlers.
- Don't hand-edit `components/ui/*`; add or update them with the shadcn CLI.
- Don't hand-edit `library.json` or `features/*.json`; change `metadata.json`/audio and
  rerun `scripts/build_library.py`.
- In backend code, import as `song_dna.x` (never `src.song_dna.x`) — the latter breaks
  uvicorn when booted with `--app-dir src`.
- When a change alters behaviour described in README.md, update README.md in the same PR.

### Verification before saying something is done

- Backend change: `pytest` passes; if imports or `api.py` changed, boot uvicorn with
  `--app-dir src` and hit `/docs`.
- Frontend change: `npm test`, `npm run lint` and `npm run build` pass.
- New or changed logic gets unit tests (pytest or colocated vitest). Numeric tests use
  synthetic signals with known answers, never untracked local audio.
- UI change: run the app and check it in **both light and dark themes** and at narrow
  width before reporting it done.
- If a check fails because of a pre-existing issue unrelated to the current change, report
  it clearly (command, failure, why it's unrelated) instead of modifying unrelated code to
  make the check pass.
- Report results as they are; don't claim something was verified (including visually) if
  it wasn't.

### Git rules

- Commit or push only when explicitly asked.
- Never merge, force-push, or commit directly to `dev` or `main` without explicit
  instruction.
- Branch from up-to-date `dev` as `feature/<kebab-name>`, `fix/…` or `chore/…`, and PR
  into `dev`.
- Never commit `data/`, `venv/`, `.env*`, or large/unlicensed audio.

### UI rules

- Keep the violet/cyan feature palette and the A = violet / B = blue slot colours
  consistent across full and mini fingerprints and the legend.
- Use shadcn components and semantic tokens (`bg-card`, `text-muted-foreground`,
  `border-border`) rather than raw colours, except the fixed feature/slot colours.
- Every new interactive element needs a keyboard focus state and an accessible label.
