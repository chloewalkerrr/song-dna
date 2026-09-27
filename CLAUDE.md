# SongDNA — Claude Code

@AGENTS.md

## Claude Code specifics

- AGENTS.md above is the single source of shared project instructions; change it there,
  not here. Keep this file for Claude-only notes.
- Project skills (`impeccable`, `playwright-cli`, `gh-fix-ci`) live in `.claude/skills/`,
  which is git-ignored. Restore them as described in README.md ("AI tooling").
- `.claude/settings.json` auto-allows tests, lint, build, the dev servers and routine
  `playwright-cli` browsing of `localhost:5173` / `localhost:8000`. Package installs, `npx`,
  `git commit`/`push`/`merge`, and other `playwright-cli` commands (eval, run-code, upload,
  attach, state/cookie access, external URLs) prompt for approval. Don't work around a
  prompt by rephrasing the command.
