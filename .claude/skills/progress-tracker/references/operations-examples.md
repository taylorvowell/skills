# Progress Tracker — Worked Examples Per Operation

Load this when you need to mutate `_STATUS.json` or `_PROGRESS.md`. Each section below shows one of the five operations end-to-end, with before/after files and the exact transitions involved.

Working directory throughout: the repo root. Files live in the track directory under `.claude/feature-tracks/<id>/`.

---

## Operation 1: READ

No file mutation. You're answering a question.

### `_STATUS.json` on disk:

```json
{
  "schemaVersion": 1,
  "currentStep": "05",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T15:45:00Z",
  "steps": {
    "01": { "status": "complete", "completedAt": "2026-05-25T10:00:00Z" },
    "02": { "status": "complete", "completedAt": "2026-05-25T11:30:00Z" },
    "03": { "status": "complete", "completedAt": "2026-05-25T13:00:00Z" },
    "04": { "status": "complete", "completedAt": "2026-05-25T15:45:00Z" },
    "05": { "status": "not-started" }
  },
  "blockers": [],
  "skipped": []
}
```

### Computed answer:

```
Current step: 05
Phase: App Scaffolds
Completed: 4
In progress: 0
Blocked: 0
Skipped: 0
Last updated: 2026-05-25 15:45 UTC
```

If the caller asked for the next step's title, also read `<trackRoot>/05 - Backend Scaffold.md`, grab the first H1 (`# 05 - Backend Scaffold`), and include it.

You do not write `lastUpdated` back during a READ. Reads are pure.

---

## Operation 2: UPDATE STEP STATUS — start a step

Caller: build-orchestrator wants to flip step 05 from `not-started` to `in-progress`.

### Validate transition

`not-started → in-progress` is allowed. Proceed.

### Before

```json
{
  "schemaVersion": 1,
  "currentStep": "05",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T15:45:00Z",
  "steps": {
    "04": { "status": "complete", "completedAt": "2026-05-25T15:45:00Z" },
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
  "currentStep": "05",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T16:00:00Z",
  "steps": {
    "04": { "status": "complete", "completedAt": "2026-05-25T15:45:00Z" },
    "05": { "status": "in-progress", "startedAt": "2026-05-25T16:00:00Z" }
  },
  "blockers": [],
  "skipped": []
}
```

Changes: `steps."05".status` → `in-progress`, `startedAt` added, top-level `lastUpdated` bumped. Nothing else.

---

## Operation 2 (continued): UPDATE STEP STATUS — complete a step

Caller wants to flip step 05 from `in-progress` to `complete`.

### Validate transition

`in-progress → complete` is allowed. Proceed.

### Before

```json
{
  "currentStep": "05",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T16:00:00Z",
  "steps": {
    "05": { "status": "in-progress", "startedAt": "2026-05-25T16:00:00Z" },
    "06": { "status": "not-started" },
    "07": { "status": "not-started" }
  }
}
```

### After

```json
{
  "currentStep": "06",
  "phase": "App Scaffolds",
  "lastUpdated": "2026-05-25T17:30:00Z",
  "steps": {
    "05": { "status": "complete", "completedAt": "2026-05-25T17:30:00Z" },
    "06": { "status": "not-started" },
    "07": { "status": "not-started" }
  }
}
```

Changes:
- `steps."05".status` → `complete`
- `startedAt` removed, `completedAt` added (the README's example shape only carries `completedAt` on complete steps)
- `currentStep` advanced to `"06"`
- `phase` unchanged because step 06 is still in `App Scaffolds`. If step 06 were in a different phase, you'd also update `phase`.
- `lastUpdated` bumped

The caller is now expected to call APPEND TO PROGRESS to log this completion. Don't do it for them — they may be aggregating notes.

### Phase rollover

Step 06 is the last in `App Scaffolds`. When step 06 transitions to `complete`, you'll advance `currentStep` to `"07"`. Step 07 is in `Infrastructure`, so `phase` should change to `"Infrastructure"`. Read the step 07 file's `**Phase:**` line to get the canonical phase name.

---

## Operation 3: APPEND TO PROGRESS

Caller just completed step 05.

### `_PROGRESS.md` before

```markdown
# Build Progress

> Append-only log of completed steps. Newest at the top.

---

## 04 - Next.js App Scaffold
**Completed:** 2026-05-25 15:45 UTC
**Phase:** App Scaffolds
**Summary:** Scaffolded the Next.js app with the App Router, Tailwind v4 CSS-first config, TypeScript strict mode. Lint and typecheck pass.
**Notes:** None.

---

## 03 - Tooling, Standards & Environment
**Completed:** 2026-05-25 13:00 UTC
**Phase:** Foundation
**Summary:** Configured ESLint flat config, Prettier, .editorconfig, .nvmrc, root scripts.
**Notes:** None.

---
```

### `_PROGRESS.md` after

```markdown
# Build Progress

> Append-only log of completed steps. Newest at the top.

---

## 05 - Backend Scaffold
**Completed:** 2026-05-25 17:30 UTC
**Phase:** App Scaffolds
**Summary:** Scaffolded the backend service with its data store connection and default modules. Server boots on its configured port.
**Notes:** Payment provider configured but not yet keyed (deferred to a later deployment step).

---

## 04 - Next.js App Scaffold
**Completed:** 2026-05-25 15:45 UTC
**Phase:** App Scaffolds
**Summary:** Scaffolded the Next.js app with the App Router, Tailwind v4 CSS-first config, TypeScript strict mode. Lint and typecheck pass.
**Notes:** None.

---

## 03 - Tooling, Standards & Environment
**Completed:** 2026-05-25 13:00 UTC
**Phase:** Foundation
**Summary:** Configured ESLint flat config, Prettier, .editorconfig, .nvmrc, root scripts.
**Notes:** None.

---
```

The new entry is inserted between the file's header block (`# ... Build Progress` ... `---`) and the previous newest entry. Existing entries shift down. Nothing is removed.

### First-ever entry case

If `_PROGRESS.md` still contains the placeholder line `_No entries yet. First step pending._`, delete that line as part of writing the first real entry. The file's header block stays.

---

## Operation 4: LOG BLOCKER

Caller hit a blocker on step 07 — a required service credential is missing.

Classification: `USER-ACTION-NEEDED` (the user needs to fetch the credential from the provider's dashboard).

### Validate transition

The step is currently `in-progress`. `in-progress → blocked` is allowed. Proceed.

### Before

```json
{
  "currentStep": "07",
  "phase": "Infrastructure",
  "lastUpdated": "2026-05-25T18:00:00Z",
  "steps": {
    "07": { "status": "in-progress", "startedAt": "2026-05-25T17:45:00Z" }
  },
  "blockers": []
}
```

### After

```json
{
  "currentStep": "07",
  "phase": "Infrastructure",
  "lastUpdated": "2026-05-25T18:05:00Z",
  "steps": {
    "07": {
      "status": "blocked",
      "startedAt": "2026-05-25T17:45:00Z",
      "blockedAt": "2026-05-25T18:05:00Z"
    }
  },
  "blockers": [
    {
      "step": "07",
      "classification": "USER-ACTION-NEEDED",
      "description": "A required service credential is not set in .env.local. Cannot run migrations without it.",
      "requiredAction": "Get the credential from your database/auth provider's dashboard and add it to .env.local. Then run /build to retry step 07.",
      "loggedAt": "2026-05-25T18:05:00Z"
    }
  ]
}
```

Changes:
- `steps."07".status` → `blocked`
- `blockedAt` added (preserving `startedAt` for history)
- A blocker object appended to `blockers[]`
- `currentStep` does NOT change — the user comes back to step 07
- `lastUpdated` bumped

The two changes (status + blocker append) happen in a single write — they're one logical operation.

### Resolving a blocker

When the user has done the required action and triggers a retry:

1. Read `_STATUS.json` fresh.
2. Remove the matching blocker from `blockers[]` (match on `step` field).
3. Transition the step from `blocked` back to `in-progress` (this is a valid transition).
4. Keep `blockedAt` for history, or remove it — pick one and be consistent. Removing it is cleaner.
5. Write back.

---

## Operation 5: RESET STEP

User invoked `/reset-step 07`. The step was `complete` but they want to redo it from scratch.

### Validate transition

`complete → not-started` is a special case allowed only via RESET STEP. Proceed.

### Before

```json
{
  "currentStep": "08",
  "phase": "Infrastructure",
  "lastUpdated": "2026-05-26T10:00:00Z",
  "steps": {
    "07": { "status": "complete", "completedAt": "2026-05-25T20:00:00Z" },
    "08": { "status": "in-progress", "startedAt": "2026-05-26T10:00:00Z" }
  },
  "blockers": []
}
```

### After

```json
{
  "currentStep": "07",
  "phase": "Infrastructure",
  "lastUpdated": "2026-05-26T10:30:00Z",
  "steps": {
    "07": { "status": "not-started" },
    "08": { "status": "in-progress", "startedAt": "2026-05-26T10:00:00Z" }
  },
  "blockers": []
}
```

Changes:
- `steps."07".status` → `not-started`
- All step-07 timestamps (`completedAt`, `startedAt`, `blockedAt`, `skippedAt`) stripped
- `currentStep` → `"07"` (we're returning to this step)
- Step 08 stays as it is — the user can keep their in-progress work or reset it separately
- `lastUpdated` bumped

`_PROGRESS.md` is NOT modified. The historical entry for step 07's prior completion stays. If the user wants the log corrected, they add a corrective entry by hand — never delete history.

### Edge case: resetting a step that had a blocker

If step 07 was `blocked` and the user resets it, also strip any `blockers[]` entries with `step: "07"` in the same write.

---

## Edge Cases and Recovery

### Malformed `_STATUS.json`

`JSON.parse` fails. Do NOT try to "fix" the file inline — you'll guess wrong.

1. Read `_PROGRESS.md`. The newest top-of-file entry is the last step that completed.
2. Reconstruct a minimal valid `_STATUS.json` covering all of the track's steps:
   - Steps with progress entries → `{ "status": "complete" }` (timestamps lost, that's OK)
   - All others → `{ "status": "not-started" }`
   - `currentStep` = next not-started step after the most recent complete
3. Surface to user: "`_STATUS.json` was malformed; I reconstructed from `_PROGRESS.md`. Last completed: step NN. Current: step (NN+1). Please spot-check before proceeding."
4. Wait for confirmation before any further mutation.

### Unknown fields on `_STATUS.json` or a step

The schema might roll forward. If you see fields you don't recognize (e.g., `steps."04".reviewedBy`, or a top-level `experimentBuckets`), preserve them. Read into a generic object, mutate only what you're changing, write back.

Do NOT strip unknown keys. That destroys data added by some other process or a newer schema version.

### Concurrent writes

This skill assumes single-writer semantics — only Claude is mutating these files at a time. If the user is also editing `_STATUS.json` by hand in another window, conflicts are possible. Detection: between READ and WRITE, the file's `lastUpdated` field changed.

In practice, just always read fresh immediately before each write. If you read the file two minutes ago and now you're about to write, re-read first. Don't carry stale state across long stretches of conversation.

### Mid-write failure on `_PROGRESS.md` after successful `_STATUS.json` write

If you write `_STATUS.json` (step now marked complete) but the `_PROGRESS.md` append fails (disk full, permission, whatever):

1. The authoritative state is correct — the JSON says the step is complete.
2. Surface the inconsistency to the user: "Status updated, but progress log append failed: <error>. Status reflects step NN complete, but the progress log doesn't have an entry yet."
3. Do not retry silently. The user may want to investigate (filesystem issue?).
4. Do not roll back the JSON write. That introduces a different inconsistency and the user has even less information.

---

## Timestamp Formatting

ISO-8601 UTC for JSON: `2026-05-25T17:30:00Z`
Human-readable for markdown: `2026-05-25 17:30 UTC`

Both refer to the same instant. The JSON form is machine-parseable; the markdown form is reader-friendly. Don't mix them within a single file.

To generate the current timestamp:

PowerShell:
```powershell
(Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
```

Bash:
```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

For the markdown form, slice the JSON form: replace `T` with a space, drop the seconds and `Z`, append ` UTC`.
