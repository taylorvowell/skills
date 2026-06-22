---
name: roadmap
description: Renders the macro build roadmap by deriving a live status rollup from every track's _STATUS.json, running cross-track consistency checks, and regenerating .claude/ROADMAP.md. Use when the user types `/roadmap`, asks "what's the state of the build", "show the roadmap", "what tracks are active/blocked", "what's next across the whole build", or whenever you need the macro picture spanning multiple tracks (not a single track's progress — that's /status or /feature <name> status). Read-only: it NEVER writes progress into ROADMAP.json; ROADMAP.json holds declarations only and each track's own _STATUS.json is the sole authority for that track's progress.
---

# Roadmap

You produce the macro build picture. The build is organized as independent **tracks**, each a
self-contained mini-build (its own `_STATUS.json` + `_PROGRESS.md` + numbered step files, run via
`/feature <name>`). `.claude/ROADMAP.json` is the macro index that ties them together.

**The anti-drift invariant:** `ROADMAP.json` stores DECLARATIONS only (goal, spine, phase, statusFile,
dependsOn, owns, lifecycle, unblockTrigger). Progress is **derived** — you compute it fresh from each
track's `statusFile` every time. You NEVER write step status into `ROADMAP.json`, and you NEVER trust a
status value cached there (there are none). This is what stops the roadmap from drifting the way a single
monolithic `_STATUS.json` would.

## When this skill triggers

- User types `/roadmap`
- "show the roadmap", "what's the macro state", "which tracks are active/blocked/done", "what's next overall"
- Any question that spans multiple tracks rather than one. (Single track → `/feature <name> status`.)

## Procedure

**Derive it yourself — the steps below are the source of truth.** Read `.claude/ROADMAP.json` + every `statusFile`,
compute each rollup, run the four consistency checks (honoring `dependsOn.blocking`), regenerate `.claude/ROADMAP.md`,
and relay the table + checks + a one-line "recommended next" to the user.

> **Optional fast path:** if this project keeps a derivation script at `scripts/roadmap/derive.mjs`, run it instead —
> it does all of the above deterministically and prints the result. This starter does NOT ship that script (the
> manual derivation here is fully sufficient). If you add one, keep it in lockstep with these steps.

1. **Read `.claude/ROADMAP.json`.** It is the only declaration source.
2. **For each track**, read its `statusFile`:
   - If the file is **missing** → the track is not yet scaffolded. Report it with its `lifecycle` from the
     roadmap (usually `planned`/`blocked`) and `0/0 (—)` progress. Do not error.
   - If present → parse the `steps` map and compute the rollup (below).
3. **Compute each track's rollup** from its `steps` map. Be scheme-agnostic — DO NOT assume `currentStep + 1`
   numbering; just tally the `steps` object's values:
   - `total` = count of step entries.
   - `complete` / `inProgress` / `blocked` / `skipped` = counts by `status`.
   - `currentStep` = the `currentStep` field verbatim.
   - **Sentinel handling:** if `currentStep` is the literal string `"complete"` (some finished tracks use
     this), treat the track as 100% regardless of the steps tally.
   - **Mixed step-id schemes** are fine (e.g. one track uses `NN`/`NNa`, another uses `R1..R10`) because you
     read the map, not arithmetic. New tracks SHOULD use zero-padded `NN`.
   - `pct` = round(100 × complete / total), or `100` for the `"complete"` sentinel, or `—` when total is 0.
4. **Run the four consistency checks** (these are the whole point — no single track can do them):
   1. **Spine uniqueness** — exactly one track with `spine:true` AND `lifecycle:active`. Zero or >1 → **ERROR**
      (e.g. "no active spine — `/build` has no target; set spine:true on one track or use `/feature <name>`").
   2. **Dependency satisfaction** — for any track with started/complete steps, check each `dependsOn` entry.
      A `dependsOn` entry is `{ track, reason, blocking? }`. **`blocking` defaults to `true` (a hard
      prerequisite); `"blocking": false` marks a SOFT sequencing preference** (e.g. "instrument before you
      migrate" — the work *can* proceed in parallel, you just prefer the order). Only an unmet **hard** dep
      whose dependent has started work → **WARN-AND-ASK** ("track X has work started but depends on Y which is
      not complete — confirm this is intended"). An unmet **soft** dep renders as a sequencing note, not a
      warning. NEVER hard-block either way; the user legitimately works out of order. (This distinction exists
      because a forward-looking soft preference — e.g. "instrument before you migrate" — otherwise
      fires a false warning the moment the dependent has *any* completed step.)
   3. **Ownership collision** — for every pair of `lifecycle:active` tracks, flag intersecting `owns` globs.
      Suppress any intersection that falls under the top-level `shared[]` allowlist. Output as an advisory.
   4. **Lifecycle vs derived** — if a track's `lifecycle` is `complete` but its statusFile shows incomplete
      steps (or `lifecycle:active`/`planned` but statusFile shows 100%) → **WARN**. This is the check that
      catches drift between the macro index and reality.
5. **Regenerate `.claude/ROADMAP.md`** (template below). This is the ONLY file you write. Overwrite it whole.
6. **Report to the user**: the rendered table + any check failures, plus a one-line "recommended next" (the
   highest-priority unblocked track per phase order / sequencing).

## ROADMAP.md template (regenerate whole, never hand-edited)

```markdown
# Roadmap — generated <YYYY-MM-DD>

> Macro source of truth. Declarations live in `.claude/ROADMAP.json`; this rollup is DERIVED by `/roadmap`.
> Do not hand-edit the table — re-run `/roadmap`. Single-track detail: `/feature <name> status`.

## Arc
<phases in `order`, joined by " → ">

## Tracks
| Track | Phase | Goal | Progress | Current | Lifecycle | Blocked on |
|-------|-------|------|----------|---------|-----------|------------|
| <spine-track> (spine) | Foundations | … | 1/2 (50%) | 02 | active | — |
| … | | | | | | |

## Consistency
- ✅ spine: exactly one active (<resolved-spine-track>)
- ⚠ dependency: <any warnings, else "none">
- ⚠ ownership overlap: <any advisories, else "none">
- ⚠ lifecycle/derived mismatch: <any, else "none">

## Recommended next
<one line: the top unblocked track to advance, with why>
```

## Hard rules

- **Read-only on declarations.** Never write to `ROADMAP.json`. The only file you write is `ROADMAP.md`.
- **Derive, never duplicate.** Compute progress from each `statusFile` every run. Do not cache or copy it.
- **Missing statusFile is normal** for `planned`/`blocked` net-new tracks — report, don't error.
- **Checks warn, they don't block.** Only spine-uniqueness is an ERROR (because `/build` needs a target);
  the rest surface loudly and let the user decide.

## Relationship to the other skills

- `/build` → `build-orchestrator` advances the `spine:true` active track (resolved via this roadmap).
- `/feature <name>` → `feature-orchestrator` advances any track by id.
- `progress-tracker` / `step-verifier` / `checkpoint` / `blocker-protocol` operate on whichever track's files
  the orchestrator hands them. None of them own the macro picture — this skill does.
- To add a track: see `docs/runbooks/add-a-track.md`.
