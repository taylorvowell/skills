# Remediation track — scaffolding a `<slug>-remediation` track

This is how a **track-tier** audit turns its findings into an executable build track. It deliberately reuses the project's existing track machinery instead of a parallel audit-only system — so remediation runs through the same orchestrator (`/feature`), the same atomic state (`progress-tracker`), the same verification (`step-verifier`), the same failure handling (`/heal` + `blocker-protocol`), and shows up in `/roadmap`.

You are doing the same thing `/plan` does (read its skill and `.claude/ai-instructions/00 - README.md` for the canonical file shapes) — just sourced from audit findings rather than a feature request. If `/plan`'s conventions and these notes ever disagree, `/plan` + the README win; they are the source of truth for file shapes.

> **When you're here:** the deep audit landed in the track tier (§ Remediation — tiering in SKILL.md) and the user picked "scaffold the track" (run now, or scaffold-only). The findings doc `00-overview.md` is already written. Now build the track from its remediation outline.

---

## 1. Name and create the folder

- **Track id:** `<slug>-remediation`, where `<slug>` matches the audit folder's slug (drop the date). E.g. audit `checkout-revamp-2026-06-24/` → track `checkout-revamp-remediation`. Keep it kebab-case.
- If a track of that id already exists (a prior audit of the same target), append `-2`, `-3`. Never reuse a track that still has incomplete steps.
- Create `.claude/feature-tracks/<slug>-remediation/`.

## 2. One step per remediation phase

The audit's phase grouping (SKILL.md step 6) is already dependency-ordered and independently verifiable — that's exactly a track's step sequence. Map each phase to one numbered step file, `NN - <Phase Title>.md`, using the **8-section step template** (`.claude/ai-instructions/00 - README.md`):

| Step section | Sourced from the audit phase |
|---|---|
| **Overview** | The phase goal + the finding IDs it resolves (restate the recommendation — the step must stand alone). |
| **Dependencies** | "Step NN complete" for any phase that must land first (the audit ordered by dependency, not severity). |
| **Files & Areas Touched** | The evidence `file:line`s from the findings this phase resolves. |
| **Steps** | The phase's Tasks, in order — concrete actions, file paths named. |
| **Quality Standards** | Prefer machine-checkable: the convention/type/test the fix must satisfy. |
| **Verification** | The phase's verification, as an **objective oracle** — the project's typecheck + lint + scoped tests, plus the E2E run if the audit flagged this phase as touching a user-facing flow. This is what `step-verifier` runs; it must be real commands, not prose. |
| **Definition of Done** | Runnable assertions where possible. |
| **Notes** | Anything non-obvious about ordering or migration. |

Add `human-review-required: true` to a step's frontmatter only when its verification genuinely needs a person (a visual/UX confirmation that can't be a command). The orchestrator stops before such a step. Use sparingly.

Keep each step at "30 minutes to half a day" — the same bound the audit used for phases. If a phase would touch 20+ files, it was too big as a phase; split it into two steps here.

## 3. Write `_STATUS.json`

Author it directly (the track doesn't exist yet — this is creation, not a progress mutation; once the track is live, only `progress-tracker` writes it). Shape:

```json
{
  "schemaVersion": 1,
  "featureName": "<slug>-remediation",
  "currentStep": "01",
  "phase": "<phase label>",
  "lastUpdated": "<ISO-8601 UTC>",
  "steps": {
    "01": { "status": "not-started" },
    "02": { "status": "not-started" },
    "03": { "status": "not-started" }
  },
  "blockers": [],
  "skipped": []
}
```

One key per step, all `not-started`. `currentStep` is `"01"`. Don't invent status fields — the orchestrator and `progress-tracker` own the rest of the lifecycle.

## 4. Write `_PROGRESS.md`

Header + the audit's scope summary + the empty entries marker. The orchestrator appends completion entries at the top as it runs.

```markdown
# <slug>-remediation — Progress Log

Remediation track scaffolded from the audit at
`.claude/audits/<slug>-<date>/00-overview.md` (N findings).
Append-only; newest entries at the top.

<!-- entries below this line -->
```

## 5. Register in `.claude/ROADMAP.json`

Append a track object (declarations only — never write step status here):

```json
{
  "id": "<slug>-remediation",
  "goal": "Remediate the <target> audit (<C>C/<H>H/<M>M/<L>L findings).",
  "spine": false,
  "phase": "<a real phase id from phases[]>",
  "statusFile": ".claude/feature-tracks/<slug>-remediation/_STATUS.json",
  "dir": ".claude/feature-tracks/<slug>-remediation/",
  "lifecycle": "active",
  "dependsOn": [],
  "owns": [],
  "unblockTrigger": null,
  "notes": "Scaffolded from .claude/audits/<slug>-<date>/00-overview.md"
}
```

- **Never set `spine: true`** — remediation is never the spine; it doesn't move the build's top priority. Leave whatever track holds the spine untouched.
- Pick a real `phase` id (often the same phase as the audited feature). If the remediation depends on another track, add it to `dependsOn` (warn-and-ask, not a hard block).
- After registering, run `/roadmap` to confirm the track appears and there's still exactly one spine.

## 6. Point the findings doc at the track

Update `00-overview.md`'s remediation/tier line: tier = track, and the track path `.claude/feature-tracks/<slug>-remediation/`. The findings doc and the track now cross-link — findings (the why/evidence) live in `.claude/audits/`, the executable plan + live state live in the track.

## 7. Hand off — do not execute here

- **Run-now:** invoke `/feature <slug>-remediation`. It runs the canonical per-step cycle (drift-check, in-progress, execute Steps, `step-verifier` runs Verification, `/heal` on an autonomous-fix failure, `blocker-protocol` on a real blocker, `/checkpoint` before risky steps, atomic state via `progress-tracker`, one commit per run). The audit never runs steps itself.
- **Scaffold-only:** tell the user it's queued and visible in `/roadmap`; `/feature <slug>-remediation` advances it when they're ready.

## Hard rules

- **Don't duplicate the executor.** The audit scaffolds and hands off; it does not contain a run loop. Drift-detection, verification, self-heal, escalation, commits, and checkpoints all belong to the orchestrator + `/heal` — referenced, never re-specified.
- **Don't mark progress directly.** Once the track exists, all `_STATUS.json` / `_PROGRESS.md` writes go through `progress-tracker` (via the orchestrator). The only direct write is the initial scaffold in steps 3–4.
- **Don't renumber later.** If a follow-up audit adds remediation, `/plan add-step <slug>-remediation <what>` appends; never renumber existing steps.
- **Objective Verification is mandatory per step.** A step whose Verification can't be an objective command is too vaguely scoped — tighten it until `step-verifier` can run it. Manual checks are the rare, explicit exception.
