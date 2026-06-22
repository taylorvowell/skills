---
name: heal
description: Bounded, autonomous self-healing loop that auto-fixes what you just broke. Reviews a changed-files diff with a FRESH-EYES subagent (so it isn't grading its own homework), then auto-fixes failures an OBJECTIVE oracle proves — typecheck + lint + scoped tests — in a bounded 3-attempt loop with escalating angles, plus a "safe-judgment-auto" tier gated by a 4-condition guardrail. Use whenever the user types /heal, /heal <path>, "heal the diff", "fix what I just broke", "self-heal this", "auto-fix the lint/type/test failures", or after a chunk of work to clean it up before committing. The build orchestrators (/build, /feature) also invoke this skill automatically when a step's Verification fails with an autonomous-fix-class error. The loop NEVER cheats to green (no editing tests/Verification, no @ts-ignore/eslint-disable, no rule-weakening, no deleting failing tests), NEVER touches shared/irreversible state without escalating, stops on oscillation, escalates on the 4 triggers, promotes to /audit when findings are too big to heal inline, and logs every run to .claude/heal-log.md. Do NOT use this skill to write new features, or to review without fixing (use /audit).
---

# Heal

You run a **bounded, autonomous self-healing loop** over a diff. The job: take code that was just written (usually by an agent), find what's objectively broken, and fix it — without grading your own homework, without thrashing, and without ever cheating to green. When you can't fix it safely, you stop and escalate rather than guess.

This skill is the generalization of `/audit`'s Execution Mode into a reusable primitive. The build orchestrators (`/build`, `/feature`) call it on a step-verification failure; you also run it ad-hoc on the current diff.

## The one principle

**Self-heal only against an objective oracle.** The loop is exactly as trustworthy as its pass/fail signal is un-fakeable:

- **Deterministic oracle (always auto-heal):** `typecheck` + `lint` + scoped `tests`. The agent cannot fake a green `tsc`. Fixing these in a bounded loop is safe and the core of this skill.
- **Judgment findings (safe-auto OR surface):** "wrong primitive, duplicated an existing component, missed a convention." No objective oracle → only auto-apply under the 4-condition guardrail below; otherwise surface.

And: **the checker is a fresh subagent, never the context that wrote the code.** Same-context self-review shares the author's blind spot. A clean-slate reviewer catches what the author can't.

## The objective oracle (what "green" means)

Run the project's own checks, scoped to the workspace(s) the diff touches — the typecheck, lint, and test commands defined in the project (use whatever package manager and script names the project uses, e.g. the `typecheck` / `lint` / `test` scripts in `package.json`):

```
<typecheck command>
<lint command>
<test command, scoped to changed test files / their nearest tests>
```

(If the diff spans multiple workspaces, run each.) A non-zero exit, a type error, an ESLint **error** (not warning), or a failing test = a fixable failure. **ESLint warnings are NOT oracle failures** — they're surfaced, never block the loop. A >60s hang on a check = treat as fail and escalate (don't loop on a hang).

## Workflow

### 1. Determine scope

Default scope = the current uncommitted changes:

```bash
git status --porcelain
git diff HEAD --name-only
```

Argument overrides: `<path>` → that path only; `last commit` → `git diff HEAD~1 HEAD`; `last <N> commits` → `git diff HEAD~<N> HEAD`; `--branch` → `git diff main...HEAD`. **Empty scope is valid** — "no changes to heal," stop. Exclude `.claude/heal-log.md` and `.claude/audits/**` from scope (don't heal your own logs).

### 2. Fresh-eyes review (mandatory)

Spawn ONE `Explore` subagent (fan out only if scope >8 files). It reads the changed files fresh and returns findings — it did NOT write them. Brief it to return three groups with `file:line` cites: **❌ oracle-breaking** (type/lint-error/test signals it can spot statically), **⚠️ convention/judgment** (hand-built primitive, duplicated existing component, wrong location, missing variant abstraction, raw env access outside the env module, missing input validation), **✅ followed**. It returns findings only — no fixes. (Mirror `/audit`'s task-audit fresh-eyes subagent brief; reuse its checklist.)

### 3. Run the oracle → classify

Run the oracle (above). Combine its failures with the subagent's findings, then classify each via `blocker-protocol`'s taxonomy:

- **AUTONOMOUS-FIX** — type error, lint error, failing test from an obvious bug, a clear convention fix. → heal (step 4).
- **USER-ACTION-NEEDED / ARCHITECTURAL-DECISION / EXTERNAL-DEPENDENCY** — → escalate (step 6), never guess.

If the oracle is already green AND the subagent found only ✅/minor ⚠️ findings: nothing to heal. Surface the ⚠️ notes and stop (clean result is valid).

### 4. The bounded heal loop

Before the first fix, if the diff is structural / touches >5 files / touches shared or load-bearing code, invoke `/checkpoint` first (it tags `checkpoint-<trackId>-step-NN-<ts>` and returns the tag) — that's the revert path.

For the deterministic failures, loop **at most 3 attempts**, escalating the angle each time:

1. **Attempt 1** — read the failure, apply the obvious fix, re-run the oracle.
2. **Attempt 2** — a different angle (attempt 1 fixed an import; this also updates the type/fixture it implicated).
3. **Attempt 3** — broaden the fix to anything else clearly within the diff's scope that the failure implicates.

After each attempt, re-run the oracle. **Converged (green) at any attempt → done.** Track each attempt's failure signature.

**Oscillation guard:** if an attempt reproduces a prior attempt's exact failure, or re-breaks something a prior attempt fixed, STOP immediately — that's a loop, not progress. Escalate (don't spend the remaining attempts).

For the **judgment findings**, apply the safe-judgment-auto rule:

> A judgment fix is auto-applied **only if ALL hold**: (1) the deterministic oracle still passes after it, (2) it's inside the changed-diff scope, (3) a checkpoint exists so it's reversible, (4) it doesn't touch shared/irreversible state. Otherwise → **surface, don't apply.** Genuine design tradeoffs (naming philosophy, "should this be split") always surface.

### 5. Converge → commit → log

When the oracle is green:

- Invoke `/commit` for the healed unit (conventional message, e.g. `fix(checkout): heal type + lint on the checkout form`).
- **Append a telemetry entry to `.claude/heal-log.md`** (format below). This is load-bearing — it's how recurring mistakes get spotted and promoted into lint rules.
- Report concisely (format below). No per-attempt chatter during the loop.

### 6. Escalate (the rare case)

Stop and ask the user **only** for these 4 triggers (everything else, fix and continue):

1. **A manual/visual check** — needs a person to open a browser / judge UX.
2. **Anything touching shared / external / irreversible state** — DB migration, force push, removing a public API surface, webhook URL, lockfile, production data, deleting files outside scope.
3. **A missing credential / external dependency** — never fabricate values or fake keys.
4. **After 3 attempts (or an oscillation), the remaining failure needs an architectural decision** — a Plan-A-vs-Plan-B choice the diff doesn't settle. Not "more code" — an actual decision.

When escalating: do NOT roll back unilaterally (stopping is enough — the user decides). Give a focused report: what failed, what you tried (the 3 attempts), the decision you need. If invoked by an orchestrator, hand the classification back so it can set the step `blocked` via `blocker-protocol`.

### 7. Promote to /audit (too big to heal inline)

If the findings exceed the inline threshold, **stop healing and hand off to `/audit`** (which writes a phased `.claude/audits/` remediation plan). Promote when any holds:

- ≥3 genuine convention **violations** (not just warnings).
- Findings span multiple domains (several unrelated areas of the app).
- A single fix would touch >5 files (e.g. "refactor this primitive + migrate all callers").
- The work duplicates a major existing component/pattern — the right fix is a consolidation refactor, not a one-off.

Below the threshold: heal inline. Above it: the diff still got its oracle fixes, but the architectural cleanup needs the phased structure — say so and point at the audit.

## Hard rules (never violate)

- **Never cheat to green.** Do NOT edit a test or a step's `## Verification`, add `@ts-ignore` / `// eslint-disable` / `@ts-nocheck`, weaken or disable an ESLint rule, change a rule's severity, or delete/skip a failing test to make the oracle pass. If green requires any of those, it's not a heal — it's an escalation.
- **Stay in scope.** Only touch files in the diff (and their direct, necessary dependencies). A heal in one area cannot start refactoring an unrelated part of the app. Out-of-scope observations go in the report as a one-line note, not a fix.
- **One checkpoint before risky fixes.** >5 files / structural / shared code → `/checkpoint` first. No exceptions — it's the revert path.
- **Bounded, always.** Max 3 attempts per deterministic failure; stop on oscillation. The loop never grinds forever.
- **Oracle = errors, not warnings.** Lint warnings are surfaced, never block or trigger fixes (they're the incremental-migration backlog).
- **Never weaken the env/security boundary** to pass (don't move a secret into client code to fix a type, don't drop an input-validation check).

## Telemetry — `.claude/heal-log.md`

Append (newest at top) one entry per run. This feeds the "recurring mistake → new lint rule" loop — if the log shows the same fixable mistake recurring, that's the signal to encode a rule so it stops at the source.

```
## <YYYY-MM-DD HH:MM UTC> — <scope: path or "uncommitted diff"> [invoked: ad-hoc | /build <track> step NN]
- Oracle on entry: typecheck <pass/fail>, lint <N errors>, tests <pass/fail>
- Failures healed: <one line each — what was broken, the fix, which attempt converged>
- Judgment fixes auto-applied: <one line each, or "none">
- Surfaced (not applied): <one line each, or "none">
- Escalated: <trigger + why, or "none">
- Converged: <yes/no> in <N> attempts. Commit: <sha or "n/a">

---
```

Stamp the timestamp from the environment's current date (the harness provides it) — don't fabricate one. When invoked by an orchestrator, also reference the heal in the track's `_PROGRESS.md` notes for that step.

## Two invocation modes

- **Ad-hoc (`/heal`)** — you run it on the current diff. Chat-only report + the log entry. Commits the healed unit.
- **Orchestrator-invoked** — `/build` or `/feature` calls this on a step-verification failure classified AUTONOMOUS-FIX. Heal the step's diff, re-run the step's `## Verification` as the oracle, and on convergence hand control back so the orchestrator runs its normal advance+commit. On escalation, hand back the `blocker-protocol` classification so the orchestrator sets the step `blocked`. **Never advance the step yourself** — that's the orchestrator's atomic job.

## Reuse (don't rebuild)

- **Fresh-eyes subagent brief + convention checklist** → `/audit` (task-audit mode is the mandatory fresh-eyes review).
- **Bounded 3-attempt loop + 4 escalation triggers + checkpoint/commit discipline** → `/audit` Execution Mode.
- **`/checkpoint`** → revert tag before risky fixes; **`/rollback`** is the user-confirmed counterpart.
- **`blocker-protocol`** → classification taxonomy + writing `blocked` to a track's `_STATUS.json`.
- **`/commit`** → per-converged-unit commit (it has its own secret scan).
- **Promote target** → `/audit` (phased `.claude/audits/` plan).

## Report format (ad-hoc)

Short. Header (scope + converged?), what was healed (bullets), what was surfaced-not-applied (bullets), escalations (if any), and the log path. No celebration, no per-attempt narration. If nothing needed healing: say "clean — oracle green, no fixes needed" and stop.
