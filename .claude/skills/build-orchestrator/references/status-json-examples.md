# `_STATUS.json` and `_PROGRESS.md` — Worked Examples

Load this file the first time you need to mutate build state in a session. The patterns below cover the common cases: starting a step, completing a step, recording a blocker, recovering from drift.

All examples assume the working directory is the repo root and the build files live in a track directory under `.claude/feature-tracks/<id>/` (or `.claude/ai-instructions/` for a legacy single-track layout).

---

## 1. The Atomic Update Sequence

`_STATUS.json` is small and must never be left half-written. Use this exact sequence whenever you mutate it:

1. **Read** the whole file with the `Read` tool.
2. **Parse** the JSON in memory.
3. **Mutate** the in-memory object (set status, update timestamps, advance currentStep).
4. **Serialize** back to JSON (2-space indent matches the existing file).
5. **Write** the whole file with the `Write` tool — never `Edit`.

`Write` overwrites atomically, so if step 5 fails mid-write you have not corrupted the file. `Edit` against partial JSON is brittle and should be avoided here.

If you also need to append to `_PROGRESS.md`, do the `_STATUS.json` write first, then the `_PROGRESS.md` append. If the second write fails, you have an inconsistency to surface to the user, but the build's authoritative state (`_STATUS.json`) is correct.

---

## 2. Starting a Step (transition `not-started` → `in-progress`)

### Before

```json
{
  "schemaVersion": 1,
  "currentStep": "04",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T13:00:00Z",
  "steps": {
    "01": { "status": "complete", "completedAt": "2026-05-25T10:00:00Z" },
    "02": { "status": "complete", "completedAt": "2026-05-25T11:30:00Z" },
    "03": { "status": "complete", "completedAt": "2026-05-25T13:00:00Z" },
    "04": { "status": "not-started" },
    "05": { "status": "not-started" }
  },
  "blockers": [],
  "skipped": []
}
```

### After

```json
{
  "schemaVersion": 1,
  "currentStep": "04",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T14:00:00Z",
  "steps": {
    "01": { "status": "complete", "completedAt": "2026-05-25T10:00:00Z" },
    "02": { "status": "complete", "completedAt": "2026-05-25T11:30:00Z" },
    "03": { "status": "complete", "completedAt": "2026-05-25T13:00:00Z" },
    "04": { "status": "in-progress", "startedAt": "2026-05-25T14:00:00Z" },
    "05": { "status": "not-started" }
  },
  "blockers": [],
  "skipped": []
}
```

What changed: `steps."04".status` flipped to `in-progress`, `startedAt` was added, `lastUpdated` was bumped. Nothing else.

---

## 3. Completing a Step (transition `in-progress` → `complete`, advance `currentStep`)

### Before

```json
{
  "schemaVersion": 1,
  "currentStep": "04",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T14:00:00Z",
  "steps": {
    "04": { "status": "in-progress", "startedAt": "2026-05-25T14:00:00Z" },
    "05": { "status": "not-started" }
  }
}
```

### After

```json
{
  "schemaVersion": 1,
  "currentStep": "05",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T15:45:00Z",
  "steps": {
    "04": { "status": "complete", "completedAt": "2026-05-25T15:45:00Z" },
    "05": { "status": "not-started" }
  }
}
```

What changed:
- `steps."04".status` → `complete`
- `startedAt` removed (or you can leave it for history — pick one and stay consistent; the README's example shows `completedAt` only on complete steps, so remove `startedAt` to match)
- `completedAt` added
- `currentStep` advanced to `"05"`
- `phase` updated only if step 05's phase differs from step 04's
- `lastUpdated` bumped

### Then append to `_PROGRESS.md`

Read the current file, then write the new content with the new entry **at the top**, above any existing entries:

```markdown
# Build Progress

> Append-only log of completed steps. Newest at the top.

---

## 04 - Next.js App Scaffold
**Completed:** 2026-05-25 15:45 UTC
**Phase:** App Scaffolds
**Summary:** Scaffolded the Next.js app directory with the App Router, Tailwind v4 CSS-first config, and TypeScript strict mode. Lint and typecheck pass.
**Notes:** next/font wired with the default heading font.

---

_No entries yet. First step pending._
```

Notice the placeholder "_No entries yet._" stays at the bottom until a future step bumps it out — or you can delete it on the first real entry. Either is fine; delete it the first time you write a real entry to keep the file clean.

### Then run /commit

After the file writes succeed, invoke `/commit`. Don't run `git add` or `git commit` directly — `/commit` formats the message consistently for this project. If `/commit` fails (no skill installed, git state weird), fall back to constructing a `git commit -m "..."` with a conventional commit message like:

```
feat(scaffold): complete step 04 - Next.js app scaffold
```

But prefer `/commit` — that's the project's standard.

---

## 4. Recording a Blocker (transition `in-progress` → `blocked`)

### Before

```json
{
  "currentStep": "07",
  "steps": {
    "07": { "status": "in-progress", "startedAt": "2026-05-25T16:00:00Z" }
  },
  "blockers": []
}
```

### After

```json
{
  "currentStep": "07",
  "steps": {
    "07": { "status": "blocked", "startedAt": "2026-05-25T16:00:00Z", "blockedAt": "2026-05-25T16:20:00Z" }
  },
  "blockers": [
    {
      "step": "07",
      "classification": "USER-ACTION-NEEDED",
      "description": "A required service credential is not set in .env.local. Cannot run migrations without it.",
      "requiredAction": "Add the missing credential to .env.local from your database/auth provider's dashboard. Then re-run /build.",
      "loggedAt": "2026-05-25T16:20:00Z"
    }
  ]
}
```

`currentStep` does NOT advance when a step is blocked. The next `/build` invocation should see the step is blocked and surface the existing blocker rather than starting fresh work.

---

## 5. Drift Detection — Worked Example

Scenario: You're starting step 05. Step 04 was marked `complete` two days ago. As part of the workflow, you run step 04's Verification commands first and one of them fails.

### What you do

1. Read step 04's file (`<trackRoot>/04 - Next.js App Scaffold.md`), extract its Verification section.
2. Run each command. Suppose the typecheck command exits with code 2 — type errors in the app.
3. Stop. Do **not** flip step 05 to `in-progress`. Do **not** modify `_STATUS.json`.
4. Tell the user:

```
Drift detected before starting step 05.

Step 04 (Next.js App Scaffold) was marked complete on 2026-05-25 but its
verification is now failing:

Command: <typecheck command>
Exit code: 2
Output (last 30 lines):
app/layout.tsx:14:7 - error TS2322: ...
[...]

This means step 04's state has regressed. Something changed since it was marked
complete (a file deleted, a dep upgraded, a type signature changed).

How do you want to proceed?
  (a) Investigate — I'll diagnose the typecheck failure and propose a fix
  (b) Mark step 04 back to in-progress and re-run it
  (c) Acknowledge and proceed anyway — start step 05 with known drift (NOT recommended)
```

Wait for the user's choice. Do not pick.

---

## 6. Recovering from a Malformed `_STATUS.json`

Scenario: `JSON.parse` fails on `_STATUS.json`. The file is corrupt or partially written.

### What you do

1. Read `_PROGRESS.md`. The newest entry at the top is the last step that completed.
2. Suppose the newest entry is "## 06 - Content Source Scaffold". The previous entries are 01–05. So through step 06 is complete.
3. Reconstruct a minimal `_STATUS.json`:

```json
{
  "schemaVersion": 1,
  "currentStep": "07",
  "phase": "Cloud Infrastructure",
  "lastUpdated": "2026-05-25T17:00:00Z",
  "steps": {
    "01": { "status": "complete" },
    "02": { "status": "complete" },
    "03": { "status": "complete" },
    "04": { "status": "complete" },
    "05": { "status": "complete" },
    "06": { "status": "complete" },
    "07": { "status": "not-started" },
    "08": { "status": "not-started" }
  },
  "blockers": [],
  "skipped": []
}
```

(Include all of the track's steps in the actual reconstruction — abbreviated here for the example. Completion timestamps are lost; that's OK, the progress log preserves the history.)

4. Tell the user: "`_STATUS.json` was malformed; I reconstructed it from `_PROGRESS.md`. The last completed step was 06. Currentstep is now 07. Please spot-check before I proceed."
5. Wait for confirmation before starting step 07.

---

## 7. Files Missing That Previous Steps Should Have Created

Scenario: Step 04 is marked `complete`, but the app's `package.json` doesn't exist.

### What you do

1. Mark step 04 as `blocked` (NOT not-started — that loses the history that we *thought* it was done).
2. Add a blocker:

```json
{
  "step": "04",
  "classification": "USER-ACTION-NEEDED",
  "description": "Step 04 marked complete but the app's package.json is missing. Either the file was deleted or step 04 never actually finished.",
  "requiredAction": "Confirm whether the app directory was deleted intentionally. If yes, /reset-step 04. If no, restore from git history.",
  "loggedAt": "<current ISO timestamp>"
}
```

3. Do not advance. Surface to user. Wait.

---

## 8. Timestamp Format

Always use ISO-8601 UTC: `YYYY-MM-DDTHH:MM:SSZ`.

PowerShell: `(Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")`

Bash: `date -u +"%Y-%m-%dT%H:%M:%SZ"`

In a pinch you can use the date from the system prompt's `currentDate` field for the date portion, and reasonable wall-clock for the time, but prefer running the command for precision.

For `_PROGRESS.md` the format is more human: `YYYY-MM-DD HH:MM UTC`. Same instant, different formatting.

---

## 9. Quick Reference — Field Glossary

| Field | Where | Meaning |
|-------|-------|---------|
| `schemaVersion` | top-level | Version of the status file format. Currently `1`. |
| `currentStep` | top-level | Zero-padded step number string (e.g., `"04"`). The step the orchestrator should work on next. |
| `phase` | top-level | Human-readable phase name (e.g., `"App Scaffolds"`). Matches the `Phase:` field in step files. |
| `lastUpdated` | top-level | ISO-8601 UTC of the most recent mutation to this file. |
| `steps."NN".status` | per-step | One of: `not-started`, `in-progress`, `complete`, `skipped`, `blocked`. |
| `steps."NN".startedAt` | per-step (in-progress) | ISO-8601 UTC. Present when step is `in-progress` or was once in-progress. |
| `steps."NN".completedAt` | per-step (complete) | ISO-8601 UTC of completion. |
| `steps."NN".blockedAt` | per-step (blocked) | ISO-8601 UTC when blocker was logged. |
| `steps."NN".skippedAt` | per-step (skipped) | ISO-8601 UTC when step was skipped. |
| `steps."NN".skipReason` | per-step (skipped) | Free-text reason. |
| `blockers[]` | top-level | Array of active blocker objects. Cleared when resolved. |
| `skipped[]` | top-level | Array of step numbers that were skipped, with reasons. |

---

## 10. What NOT to Do

- **Don't `Edit` `_STATUS.json`.** Always read the whole thing, mutate in memory, write the whole thing back. Surgical edits to JSON are easy to get wrong.
- **Don't modify multiple steps in one execution.** One step transitions per `/build`. If you find yourself updating step 04's `completedAt` AND step 05's `status` in the same write, that's fine (they're part of one transition); but if you're updating step 04 AND step 06, stop — something's off.
- **Don't backfill `completedAt` timestamps.** If a step's `completedAt` is missing or wrong, leave it. The progress log has the real history.
- **Don't delete entries from `_PROGRESS.md`.** It's append-only-at-top. If an entry is wrong, add a correction entry below it; don't rewrite history.
- **Don't write `_STATUS.json` with trailing commas or comments.** It has to be valid JSON. Some editors will let you save invalid JSON without complaint.
