---
name: plan
description: Plan a NEW feature as a build track — turn "I want to add X" into a scaffolded, executable track. Clarifies scope, decomposes the feature into numbered steps each with an objective verification, scaffolds .claude/feature-tracks/<id>/ (_STATUS.json + _PROGRESS.md + numbered step files), and registers the track in .claude/ROADMAP.json. Also adds a step to an EXISTING track. Use when the user types /plan, says "plan a feature", "plan out a new feature", "start a new feature", "add a new feature", "create a track", "break this into steps", "scaffold a track", "plan how to build X", or "/plan add-step <track> <what>" / "add a step to the build". This CREATES the plan; it does NOT execute it — after planning, /build (spine) or /feature <id> advances the track. NOT for strategic vendor/design decisions (that's /architect, which can feed a plan) and NOT for parking a someday idea (that's /future).
---

# Plan a feature into a track

Close the loop between an idea and the build system. This skill turns a feature request into a **track** — a scaffolded, step-by-step mini-build the orchestrators can execute. It CREATES structure; it never executes steps (that's `/build` / `/feature <id>`) and never marks progress (that's `progress-tracker`).

Read the conventions in `.claude/ai-instructions/00 - README.md` (the step-file template, `_STATUS.json` shape, verification rules) and `docs/runbooks/add-a-track.md` before scaffolding — those are the source of truth for file shapes.

## Two modes

- **`/plan <feature description>`** — plan a brand-new track.
- **`/plan add-step <track-id> <what>`** — insert a step into an existing track.

---

## Mode A — plan a new track

### 1. Clarify scope (don't guess the shape)

Restate the feature in one line, then resolve the unknowns that change the plan. Use `AskUserQuestion` (batch it) when genuinely ambiguous:
- **Outcome** — what "done" looks like, in user-visible terms.
- **Boundaries** — what's explicitly in vs out of this track (prevents scope creep).
- **Phase** — which phase in `.claude/ROADMAP.json` this belongs to (offer the existing phase ids).
- **Priority** — is this the new spine (your current top priority), or a parallel track?
- **Dependencies** — does it depend on another track finishing first?

If the feature is large or strategic (vendor choice, cross-system design), suggest `/architect` first and fold its decision into the plan.

### 2. Decompose into steps

Break the work into the **fewest steps that each leave the repo in a verifiable, coherent state**. A step is too big if its verification can't be a single objective check; too small if it has no independent oracle. For each step write the template from `ai-instructions/00 - README.md`:

- **Overview** — what this step accomplishes and why.
- **Dependencies** — earlier steps that must be complete.
- **Files & Areas Touched** — concrete paths (use the project's real layout).
- **Steps** — ordered, concrete actions (specific enough to execute, not code).
- **Quality Standards** — prefer machine-checkable.
- **Verification** — the **objective oracle**: the project's typecheck + lint (run with its package manager) plus any scoped tests. Non-zero exit / type error / lint error / failing test = fail. Manual checks are prose, confirmed with the user.
- **Definition of Done** — runnable assertions where possible.
- **Notes**.

### 3. Scaffold the track folder

Pick a kebab-case `<id>` (short, descriptive). Create `.claude/feature-tracks/<id>/`:

- **`_STATUS.json`** — `schemaVersion: 1`, `featureName: "<id>"` (matches the track dir), `currentStep: "01"`, `phase: "<phase label>"`, all steps listed as `not-started`, empty `blockers`/`skipped`. (You may author this directly — the track doesn't exist yet, so this is creation, not a progress mutation.)
- **`_PROGRESS.md`** — header + the planned scope summary + the empty `<!-- entries below this line -->` marker.
- **`NN - Title.md`** — one file per step, numbered `01`, `02`, … using the template above.

### 4. Register the track in ROADMAP.json

Append a track object (declarations only — never write step status here):

```json
{
  "id": "<id>",
  "goal": "<one-line goal>",
  "spine": false,
  "phase": "<phase id>",
  "statusFile": ".claude/feature-tracks/<id>/_STATUS.json",
  "dir": ".claude/feature-tracks/<id>/",
  "lifecycle": "active",
  "dependsOn": [],
  "owns": [],
  "unblockTrigger": null,
  "notes": ""
}
```

- Fill `dependsOn` / `owns` from step 1. A `dependsOn` entry is an object — `{ "track": "<other-id>", "reason": "<why>", "blocking": true }` (use `"blocking": false` for a soft ordering preference); leave `[]` if the track stands alone. Use a real `phase` id from the file's `phases[]`.
- **Spine handling:** if this track is the new spine, set its `spine: true` AND set `spine: false` on whatever track currently holds it (only one spine at a time) — tell the user you moved it. Otherwise leave `spine: false`; `/feature <id>` runs it.

### 5. Hand off

Run `/roadmap` to show the new track in the macro picture. Tell the user how to start it: `/build` if it's the spine, else `/feature <id>`. Do NOT execute steps and do NOT commit.

---

## Mode B — add a step to an existing track (`/plan add-step <track-id> <what>`)

1. Read the track's `_STATUS.json` and its step files.
2. **Don't renumber** (it breaks references). Append the step as the next number (e.g. `04`), or insert as a sub-step (`02a - Title.md`) if it logically belongs mid-sequence.
3. Write the new step file using the full template (objective Verification required).
4. Add the new step to `_STATUS.json`'s `steps` map as `not-started`. Leave `currentStep` alone unless the user wants to work it next.
5. Append a one-line note to `_PROGRESS.md` explaining what was added and why (the convention: never silently restructure a plan — record the change).
6. Tell the user it's queued; `/feature <track-id>` (or `/build` for the spine) will reach it in sequence.

Marking steps **complete** still goes only through the orchestrators + `progress-tracker` — this skill plans, it doesn't progress.
