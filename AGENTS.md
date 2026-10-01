# SongDNA — instructions for coding agents

Shared instructions for every coding agent working in this repository (Codex reads
this file directly; Claude Code imports it from CLAUDE.md).

SongDNA is a single-user, localhost-only audio analysis app: measured energy,
brightness and beats become visual fingerprints, with explainable two-song findings.

Read README.md for setup and PROJECT_CONTEXT.md before proposing features.
Some implementation descriptions are stale; code is authoritative for current
behaviour. Product boundaries and working rules still apply.

## Architecture

- Backend: Python 3.11, FastAPI, uvicorn; package in src/song_dna/.
  - rms.py: manual NumPy RMS, not librosa.feature.rms; centered frames,
    frame length 2048, hop 512.
  - features.py: AudioFeatures and extract_features(); librosa spectral centroid
    and beat tracking on an 11025 Hz copy. times/RMS/centroid are frame-aligned;
    beat_times contains sparse timestamps.
  - findings.py: rule-based energy, dynamic-range, trend and brightness findings;
    no ML. Thresholds and their rationale live here.
  - api.py: POST /analyze saves UUID-named uploads in data/audio/;
    POST /compare accepts feature arrays; /audio serves uploads.
    CORS allows http://localhost:5173.
  - library.py: precomputes the static library.
- Frontend: React 19, Vite 8, JavaScript, Tailwind v4, shadcn/ui
  (radix-nova, neutral, lucide), React Router 7. Source: frontend/src/.
  Alias @/ resolves to that directory. lib/config.js defines the API URL
  (default http://127.0.0.1:8000; VITE_API_URL override).
- App.jsx wraps routes with Theme → Library → Selection providers.
  /library browses/searches/previews tracks and selects A/B.
  /compare shows two SongPanels and Findings; when A and B are both selected
  they start with those library tracks' precomputed features, otherwise they
  start empty for uploads. Other routes redirect to /library.
- Contexts/useX hooks live in hooks/use-x.js; providers in
  components/x-provider.jsx. Pure logic belongs in .js modules with colocated
  *.test.js (currently scaling, bucketing, fingerprintLayout, beatThinning,
  selection, trackFilter, format, panelLoad, lib/library, lib/songFingerprint,
  lib/theme).
  Fingerprint.jsx, SongPanel.jsx and Findings.jsx live at src/ root.
  components/ui/ is shadcn-generated and lint-ignored.
- Static library: frontend/public/library/metadata.json + audio/* are inputs;
  scripts/build_library.py generates features/<id>.json, fingerprints/*.json
  and library.json.
  Browsing/previews need no backend. Current audio is synthetic placeholders.
  No SQLite persistence is implemented.

## Data invariants

- frontend/src/bucketing.js bucketAverage and backend library.py bucket_average
  must remain behaviourally identical.
- Library features and /analyze share the fields consumed by Fingerprint:
  rms_energy, spectral_centroid, beat_times and duration_seconds.
- Full comparison uses shared scales across both songs: true maximum for RMS,
  shared 95th percentile for centroid, with clamped bars.
- Library previews use 48 segments and per-track normalization; they do not
  represent cross-song magnitude comparisons. They are still generated but no
  longer shown on cards.
- Song Fingerprint (E1B1/1, src/song_dna/song_fingerprint/) is a separate
  whole-track identity layer, not a replacement for Song DNA. Its parameters
  are frozen and must reproduce the research reference exactly
  (tests/test_song_fingerprint_parity.py); changing any requires a new
  version. It never changes DNA RMS/centroid arrays. Library cards show the
  52 px thumbnail; it is not yet in Compare, /analyze or uploads.
- Full fingerprints use 40 segments. Bucketing and beat-marker thinning are
  display-only; never alter analysis data for presentation.

## Commands

PowerShell, from repository root unless stated. Use Python 3.11 and Node 22
(CI versions).

```powershell
# Backend setup
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# Backend server
.\venv\Scripts\python.exe -m uvicorn song_dna.api:app --app-dir src --reload

# Backend tests (pytest.ini puts . and src on the path)
.\venv\Scripts\python.exe -m pytest

# Frontend: run from frontend/
npm ci
npm run dev
npm test
npm run lint
npm run build

# Library: run from repository root
.\venv\Scripts\python.exe scripts\build_library.py
.\venv\Scripts\python.exe scripts\generate_dev_tracks.py
```

Use npm install when intentionally changing dependencies.
The track generator rewrites placeholder audio; rebuild the library afterward.
Frontend normally runs at http://localhost:5173; backend at http://127.0.0.1:8000.

## Working rules and scope

- Work in small, independently testable steps; one unit of work per branch/PR.
  Finish the small version before expanding.
- Explain new audio/DSP concepts and architectural choices, including alternatives,
  before implementing them.
- Every data-bearing visual property must map to a documented measurement; no
  decorative animation pretending to be data.
  Findings must trace to computed numbers; say "similar" for small differences.
  Do not infer genre, emotion or quality.
- Follow PROJECT_CONTEXT.md scope. Accounts/authentication, streaming APIs,
  cloud deployment, deep-learning embeddings, generative AI and other excluded
  features require explicit approval. Local SQLite is in scope but not built.
- Use legally sourced library audio; never scrape or stream it.
- Match surrounding style. Use Python type hints and named constants for tuned
  values, with comments explaining how values were chosen. Explain why in comments.
- Keep pure logic outside React components and FastAPI handlers.
- Import backend modules as song_dna.x, not src.song_dna.x: pytest and uvicorn
  resolve the package from different roots, so the src. form passes tests but
  breaks uvicorn --app-dir src. Verify compatibility with that boot command.
- Update shadcn-generated components/ui/* through the shadcn CLI, not hand edits.
- Do not hand-edit library.json or features/*.json. Change source metadata/audio
  or the generator, then rebuild.
- Update README.md in the same change when documented behaviour changes.
- Preserve existing user changes. Do not modify unrelated code unless explicitly
  instructed, including to fix unrelated check failures.
- Do not install, update or remove packages (npm install/ci/update, npx,
  pip install) or agent skills without the user's approval, unless the user
  asked for that action.

## Verification

- Backend changes: run pytest. If imports or api.py change, also boot uvicorn
  with --app-dir src and confirm http://127.0.0.1:8000/docs responds.
- Frontend changes: run npm test, npm run lint and npm run build.
- Add/update unit tests for new or changed logic. Numeric tests use synthetic
  signals with known answers, never untracked local audio.
- Backend tests are in tests/; API tests call functions directly.
  Frontend tests currently cover pure logic, not component rendering.
- UI changes: run the app and inspect both light and dark themes and narrow widths.
- CI runs pytest, a backend boot smoke test, frontend tests and a build on PRs
  and pushes targeting dev/main. Lint must be run locally.
- Report actual checks and results. Identify checks not run and why.
  For unrelated pre-existing failures, report the command, failure and evidence
  that it is unrelated; do not expand scope to fix it.
  Never claim visual or runtime verification that was not performed.

## Git rules

- Do not commit, push, merge or force-push unless explicitly instructed.
  A request to implement a change does not authorize these actions.
  This overrides PROJECT_CONTEXT.md's instruction to commit completed work.
- Never commit directly to dev or main without explicit instruction.
- For implementation work, branch from up-to-date dev using
  feature/<kebab-name>, fix/<kebab-name> or chore/<kebab-name>.
  PRs target dev; main is stable. Do not discard user work to change branches.
- When commits are authorized, use lowercase imperative conventional prefixes:
  feat:, fix:, perf:, test:, ci:, docs:, chore:, style:.
- Never commit data/, venv/, .env* or large/unlicensed audio.

## UI and design

- Dark by default; light/dark toggle in sidebar footer. Persist songdna-theme
  in localStorage and apply .dark to <html>.
- shadcn/ui is the default design system. Use an existing shadcn component or
  pattern when one fits; add missing ones with the shadcn CLI (npx needs
  approval) rather than recreating them by hand. Customise through variants,
  className and tokens instead of replacing the system.
- Don't force shadcn where a custom visualization or SongDNA-specific
  interaction fits better (fingerprints, playhead, A/B selection), and keep
  SongDNA's visual identity and feature/slot colours. Avoid generic
  "AI-generated" styling and decoration that carries no information.
- Use neutral OKLCH semantic tokens from frontend/src/index.css and Geist
  Variable. Prefer bg-card, text-muted-foreground and border-border over raw
  colours, except established feature/slot colours.
- Full fingerprint and legend: energy violet-500 above the axis, brightness
  cyan-500 below; beats foreground/50, playhead foreground.
- Selection: A violet-500, B blue-500. Library cards show the Song
  Fingerprint (SongFingerprint.jsx), which stays neutral/monochrome in every
  state; selection is shown by the card outline and slot badge only.
- Preserve the sidebar shell and page pattern: mx-auto max-w-[920px],
  text-3xl font-semibold tracking-tight headings, muted subtitles.
- Write complete Tailwind class strings, using lookup objects rather than
  dynamically constructing class names.
- Show plain-language errors in destructive Alerts; use skeletons or muted
  monospace text for loading.
- Give interactive elements accessible names and keyboard focus states.
  Use appropriate aria-pressed/status semantics; never nest buttons (library
  cards use a card-wide button overlay with a raised play button).
