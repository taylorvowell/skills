# Build Instructions — README (step-file template & conventions)

This file is the **step-file template / scaffolding reference** for the build system. The build is a set of independent **tracks** indexed by `.claude/ROADMAP.json` (rendered by `/roadmap`). Every track shares the **Step File Structure**, **Status Tracking**, **Self-Healing**, and **Blocker** conventions below (`/build` for the spine track, `/feature <name>` for any track).

This documents the conventions the autonomous build system relies on. It is intentionally framework-agnostic — the project's own stack rules live in `CLAUDE.md`.

## How To Use

**Advance the spine track:**
```
/build
```
The `build-orchestrator` skill triggers, reads the spine track's `_STATUS.json`, opens the next numbered step file, executes its steps, verifies, and reports.

**Advance any track:**
```
/feature <track-id>
```

**Check status:**
```
/status            # the active/spine track
/roadmap           # macro picture across all tracks
```

**Skip a step (rare):**
```
/skip --reason="why"
```
Only when a step is genuinely not applicable.

**Reset the current step:**
```
/reset-step
```
Marks the current step back to not-started — useful when an intermediate verification fails and you want a clean redo.

## File Conventions

| File | Purpose |
|------|---------|
| `00 - README.md` | This file. System documentation. |
| `_STATUS.json` | Machine-readable progress state. Updated atomically. |
| `_PROGRESS.md` | Human-readable progress log. Append-only. |
| `NN - Title.md` | Step files. Numbered sequentially. |

## Step File Structure

Every numbered step file follows this template:

```markdown
# NN - Title

**Phase:** [phase name]
**Status:** not-started | in-progress | complete | skipped | blocked
**Estimated effort:** [hours or days]

## Overview
What this step accomplishes and why.

## Dependencies
- Step XX must be complete
- Step YY must be complete

## Files & Areas Touched
Specific paths that will be created or modified.

## Steps
Concrete actions, ordered. Not code, but specific enough for execution.

## Quality Standards
What "good" looks like. Prefer **machine-checkable** standards over prose — if a
standard can be a lint rule, a type, or a test assertion, state it as the command
that proves it (the `step-verifier` and `/heal` can then enforce it objectively).

## Verification
Commands and checks that prove completion. **Always include an objective oracle**
so `/heal` can self-heal a failure — e.g. the project's typecheck + lint scripts
(run with your package manager) plus any scoped tests. A non-zero exit / type
error / ESLint **error** / failing test is a fail; ESLint warnings are surfaced,
not blocking. Manual checks ("open the page and confirm…") are listed as prose and
confirmed with the user — they can't be auto-verified.

## Definition of Done
Checklist of completion criteria, each phrased as a **runnable assertion** where
possible (e.g. "`typecheck && lint && <test>` green") rather than a subjective
"looks right". The closer the DoD is to executable, the more the build self-heals.

## Notes
Anything else.
```

## Status Tracking

`_STATUS.json` shape:

```json
{
  "schemaVersion": 1,
  "currentStep": "04",
  "phase": "Core Features",
  "lastUpdated": "2025-01-15T14:30:00Z",
  "steps": {
    "01": { "status": "complete", "completedAt": "2025-01-15T10:00:00Z" },
    "02": { "status": "complete", "completedAt": "2025-01-15T11:30:00Z" },
    "03": { "status": "complete", "completedAt": "2025-01-15T13:00:00Z" },
    "04": { "status": "in-progress", "startedAt": "2025-01-15T14:00:00Z" },
    "05": { "status": "not-started" }
  },
  "blockers": [],
  "skipped": []
}
```

`_PROGRESS.md` is append-only — each completed step adds an entry with timestamp, summary, and any notes worth keeping. **`_STATUS.json` and `_PROGRESS.md` move together, atomically** — route all writes through the `progress-tracker` skill; never hand-edit them.

## Self-Healing Protocol

Before executing any step, the orchestrator:

1. **Checks status file integrity** — JSON valid, all keys present.
2. **Verifies prerequisites** — runs verification commands from previous steps (drift detection).
3. **Confirms files exist** — anything previous steps were supposed to create.
4. **Flags drift** — if anything is inconsistent, escalates to the user before proceeding.

After executing any step, the orchestrator:

1. **Runs the step's verification commands.**
2. **Confirms the Definition of Done** — every checkbox addressed.
3. **Updates status atomically** — `_STATUS.json` and `_PROGRESS.md` together.

If verification fails, the step stays `in-progress`. The orchestrator reports what failed and stops. It does NOT advance.

## Blocker Protocol

When the build hits a blocker it cannot resolve autonomously (see the `blocker-protocol` skill):

1. Marks the current step `blocked`.
2. Adds an entry to the `blockers` array in `_STATUS.json` with the description and what's needed.
3. Stops work and reports to the user.
4. Does not attempt workarounds that compromise architectural decisions.

Resolvable autonomously: missing packages → install; type errors → fix; lint errors → fix; obvious-bug test failures → fix.

Escalate to the user: missing credentials or environment variables; architectural decisions not yet made; external-service authentication; verification failures that suggest a design issue; conflicts with existing data.

## Modifying The Plan

1. **Edit the numbered file directly** — versioned in git, change tracked.
2. **Update `_STATUS.json`** (via `progress-tracker`) if the change affects dependencies.
3. **Add a note to `_PROGRESS.md`** explaining the change.
4. **Don't renumber** — inserting `15a - Subtask.md` is fine; renumbering breaks references.

## Human Review

Some steps should require human review before completion (production deploys, public-facing copy, anything irreversible). Give those a `human-review-required: true` line in the file. The orchestrator surfaces them, presents the artifacts, and waits for explicit approval before marking complete.

## Adding a track

Declare it in `.claude/ROADMAP.json` and scaffold its folder under `.claude/feature-tracks/<id>/` (`_STATUS.json`, `_PROGRESS.md`, numbered steps). If you keep a runbook for this, put it at `docs/runbooks/add-a-track.md`.
