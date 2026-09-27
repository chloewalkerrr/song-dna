# UI verification (for /feature)

Use the `playwright-cli` skill's commands. Verify the changed UI in a real browser; tests
and a clean build are not visual verification.

## Servers

- Frontend: `npm run dev` from `frontend/`, run in the background → http://localhost:5173.
- Backend: only if the changed flow calls the API (uploads, `/analyze`, `/compare`, findings):
  `.\venv\Scripts\python.exe -m uvicorn song_dna.api:app --app-dir src` in the background
  → http://127.0.0.1:8000. Library browsing and previews need no backend.
- If a server is already running on its port, reuse it. Stop only servers you started.

## Pass

1. `playwright-cli open http://localhost:5173/<route>` for each route the change affects.
2. Exercise the changed behaviour with `snapshot`, `click`, `fill`, `press`. Confirm the
   result in the snapshot (text, `aria-pressed`, alerts), not just that nothing crashed.
3. `playwright-cli console` and report any errors or warnings the change introduced.
4. Widths: `resize 1280 800`, `resize 768 1024`, `resize 375 812`. At each width, check
   there is no horizontal overflow, clipped text or overlapping controls.
5. Themes: dark is the default. The theme comes from `songdna-theme` in localStorage, so
   `set-color-scheme` does **not** change it. Switch by clicking the sidebar footer button
   ("Light mode" / "Dark mode") at desktop width; the choice persists across resizes and
   reloads. Check both themes, then switch back to dark.
6. Take a screenshot of each distinct state worth showing
   (`playwright-cli screenshot --filename=.playwright-cli/<route>-<width>-<theme>.png`)
   and read the images back to look at them. `.playwright-cli/` is git-ignored.
7. `playwright-cli close`.

Do one pass, fix what it shows, and re-check only what changed. If a step needs a
command that prompts for approval (e.g. `upload`, `eval`), ask rather than rephrasing it.
Never claim a check that did not run.
