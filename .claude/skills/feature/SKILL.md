---
name: feature
description: Implement one SongDNA feature request end to end (plan, build, test, verify, self-review, report) and stop before any git action.
argument-hint: <feature request>
disable-model-invocation: true
---

# /feature

Request: $ARGUMENTS

AGENTS.md holds the rules (scope, data invariants, UI, verification, git). This file is
only the order of work and where to stop. If they ever disagree, AGENTS.md wins.

## 1. Preflight (read-only)

Run `git status --short` and `git branch --show-current`. Do not fetch, create, switch
or reset branches.

Stop and report the recommended branch action if any of these hold:
- the working tree has changes unrelated to this request;
- the current branch is `dev` or `main`;
- the current branch is clearly for different work than this request.

Otherwise say which branch you are working on and continue.

## 2. Understand

Read the code the request touches; code beats docs. Ask questions only for genuine
product ambiguity (what the user should see or be able to do), batched into one message.
Decide technical details yourself.

## 3. Plan

Post a short plan: files to change, tests to add, checks to run, and what is explicitly
out of scope. Then continue, unless the plan needs any of these, in which case explain
and stop for approval:
- a new audio/DSP concept or an architectural choice with real alternatives;
- a new dependency or a new shadcn component (`npx`);
- a change to an API contract, a data invariant, or generated library data;
- anything PROJECT_CONTEXT.md lists as out of scope.

## 4. Implement

Smallest change that satisfies the request. No drive-by refactors or fixes to unrelated
code. Pure logic goes in `.js`/`.py` modules, not components or handlers. For UI, use
AGENTS.md's UI rules and existing shadcn components. Do not use the `impeccable` skill
unless the user explicitly asked for a design, polish or audit pass.

Update README.md in the same change if documented behaviour changes.

## 5. Test and verify

- Add or update unit tests for new or changed logic (synthetic signals for numeric code).
- Backend touched: pytest; if imports or `api.py` changed, also boot uvicorn with
  `--app-dir src` and confirm `/docs` responds.
- Frontend touched: `npm test`, `npm run lint`, `npm run build` (from `frontend/`).
- User-visible UI changed: always follow [ui-verification.md](ui-verification.md).

Fix failures your change caused. For pre-existing unrelated failures, record the
evidence and leave them.

## 6. Self-review

Read the whole `git diff` (and any new untracked files) once, checking for: anything
outside the request, broken data invariants, visuals without a documented measurement,
findings not traceable to numbers, missing accessible names or focus states, dynamic
Tailwind class names, debug leftovers, and README accuracy. Fix what you find.

## 7. Report and stop

Report, briefly:
- **Changed:** files and what each change does.
- **Checks:** each command run and its result; checks not run and why.
- **Visual verification:** what was inspected (routes, widths, themes) and screenshot
  paths, or why it did not apply.
- **Concerns:** anything uncertain, pre-existing failures, follow-ups.
- **Next steps:** suggested branch/commit message if relevant.

Then stop. Do not stage, commit, push, merge or open a PR unless the user explicitly
asks in a later message.
