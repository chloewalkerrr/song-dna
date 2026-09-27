# SongDNA — Claude Code

@AGENTS.md

## Claude Code specifics

- AGENTS.md above is the single source of shared project instructions; change it there,
  not here. Keep this file for Claude-only notes.
- Installed skills (`impeccable`, `playwright-cli`, `gh-fix-ci`) live in `.claude/skills/`
  and are git-ignored. Restore them as described in README.md ("AI tooling").
- Feature work: `/feature <request>` (`.claude/skills/feature/`, tracked). It stops before
  any branch or git action. Use `impeccable` only when a design/polish/audit pass is
  explicitly requested.
- `.claude/settings.json` auto-allows tests, lint, build, the dev servers and routine
  `playwright-cli` browsing of `localhost:5173` / `localhost:8000`. Package installs, `npx`,
  git commands that stage, commit, push, merge, fetch, switch branches or discard work,
  `gh pr` create/merge/close/comment/review, edits to shadcn `components/ui/*` or generated
  library JSON, and other `playwright-cli` commands (eval, run-code, upload,
  attach, state/cookie access, external URLs) prompt for approval. Don't work around a
  prompt by rephrasing the command.
