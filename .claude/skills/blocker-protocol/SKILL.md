---
name: blocker-protocol
description: Classifies and routes blockers encountered during the autonomous build. When a step can't complete on its own — verification fails repeatedly, a credential is missing, an external service is unauthorized, an architectural choice is ambiguous, or multiple attempts have failed — this skill picks one of four classifications (AUTONOMOUS-FIX, USER-ACTION-NEEDED, ARCHITECTURAL-DECISION, EXTERNAL-DEPENDENCY) and handles each appropriately. Use when the user types /blocker, when build-orchestrator hits something it can't resolve on the current step, after two consecutive verification failures on the same command, when a step file references a credential or service that isn't reachable, or when a step's Steps section says "decide whether to X or Y" with no obvious right answer. Never fabricate credentials to bypass missing-secret blockers; never invent architectural decisions to "keep going"; always preserve the original error context so the user can act on what's actually wrong.
---

# Blocker Protocol

You are the classifier. When the build can't move forward, the orchestrator hands the situation off to you. You pick one of four classifications, then either resolve the blocker autonomously (if it's safely fixable) or log it, surface it to the user, and stop.

The single most important thing this skill does is *refuse to guess*. Most of the value here is in not papering over real ambiguity. When a step says "configure tax rates" and the project plan doesn't specify how, you do not pick a tax rate. You escalate with options. When a required API key is missing, you do not generate a placeholder. You ask.

## Why this skill exists

Two failure modes the orchestrator falls into without this skill:

1. **Loop-forever on autonomous fixes.** The orchestrator hits a type error, fixes it, hits another, fixes it, hits the same one again. Without a classifier that escalates after repeated attempts, this never terminates. Blocker-protocol caps the attempts and escalates.
2. **Silent compromise.** The orchestrator hits a missing credential and "helpfully" generates a stub. Or it hits an ambiguous design choice and "helpfully" picks one. Both lead to a build that *looks* complete but is wrong in ways that surface much later. Blocker-protocol refuses, full stop.

The point of this skill is correct escalation, not heroic recovery.

## The Four Classifications

Pick exactly one per blocker. If two seem to apply, the lower-autonomy one wins (USER-ACTION over AUTONOMOUS, ARCHITECTURAL over USER-ACTION). When in doubt, escalate up — never down.

### AUTONOMOUS-FIX

The blocker is something you can resolve right now with code or shell commands, where the fix is unambiguous and contained.

**Includes:**
- Missing npm/pnpm package → `pnpm add <pkg>` in the right workspace.
- Type error from a renamed/missing import → fix the import path.
- Lint error from a known rule (unused var, missing semicolon if the project required them, etc.) → apply the fix.
- Obvious code bug (typo in variable name, wrong return type) → fix.
- Generated file out of date (e.g., a `tsc --build` output, a CMS/ORM schema regen) → re-run the generator.
- Missing directory the step expected to exist → `mkdir` it if the step explicitly intended to create it.

**Excludes:**
- Anything requiring a design choice (which package to add, where to put a file, which pattern to use).
- Anything touching credentials, env vars, or secrets.
- Anything that requires modifying a step file's Steps or Verification.
- Fixes that require changing CLAUDE.md, the project plan, or architectural docs.

**Attempt cap:** Two attempts. If the same command fails twice with the same root cause after AUTONOMOUS-FIX intervention, reclassify — usually to ARCHITECTURAL-DECISION (the "obvious" fix isn't, and there's a real ambiguity hiding) or USER-ACTION-NEEDED.

### USER-ACTION-NEEDED

The blocker requires something only the user can provide: a credential, a configuration value, access to an account, a file you can't generate.

**Includes:**
- Missing env var (a third-party API key, a database service-role key, a payment secret key, etc.). Surface the exact var, where the user can get it, and which file to put it in.
- Account access required (need to log into a provider's dashboard — e.g. Vercel or your database/auth provider — to retrieve a value or enable a feature).
- A file the user is supposed to provide (a CSV import, a brand asset, a seed file). Don't fabricate the file's contents.
- Permission required (need user to grant repo access, add a collaborator, enable an API).
- A `human-review-required: true` flag on a step where the artifact is ready but the user hasn't reviewed.

**Hard rule:** NEVER fabricate credentials. Never set a placeholder like `SOME_API_KEY=PLEASE_FILL_IN` and proceed. Never generate fake-looking values (a "test" payment key the user didn't authorize, a synthetic database URL). Stop, log, surface.

**Handling:** Log via `progress-tracker` LOG BLOCKER with classification `USER-ACTION-NEEDED`. Surface to user with the escalation message format below. Stop.

### ARCHITECTURAL-DECISION

The blocker is a choice the project plan doesn't cover, and picking wrong has lasting consequences.

**Includes:**
- A step says "implement tax calculation" but doesn't specify the strategy (region-based vs. line-item vs. shipping-address vs. handed off to a third-party service).
- A library/framework choice the plan didn't pin (which SDK, which email provider, which queue).
- A schema decision (column types, indexing strategy, partitioning) where multiple approaches are defensible.
- Naming conventions for a new domain (e.g., is the new entity called `category` or `categories` or `groups`?).
- Whether to break backward compatibility, whether to migrate vs. fork, whether to ship a feature flag.

**Hard rule:** Do NOT pick. Even if you have a strong opinion, even if "industry standard" suggests one answer, this is the user's call.

**Handling:** Present 2-3 options with tradeoffs. Use `AskUserQuestion` for clean disambiguation. Log the blocker as `ARCHITECTURAL-DECISION`. Stop.

The exception: if the project plan or a CLAUDE.md file *does* speak to this decision and you missed it, that's not architectural — it's just a documented requirement you need to follow. Reread the plan if relevant before escalating.

### EXTERNAL-DEPENDENCY

The blocker is something controlled by a person or service outside the build, and we're waiting on them.

**Includes:**
- Waiting on a person who owns an external system to enable webhooks, create a user, sync a record.
- Waiting on a deployment or provider (e.g. Vercel, your database/hosting provider) to finish provisioning.
- Waiting on a DNS change to propagate.
- Waiting on a third-party API to come back online.
- Waiting on a code review or sign-off from a stakeholder.

**Hard rule:** Don't retry in a tight loop. Don't poll an external service unless the step explicitly says to. Log, pause, and surface what you're waiting on so the user knows what to chase.

**Handling:** Log via LOG BLOCKER with `classification: EXTERNAL-DEPENDENCY`. Surface to user with the escalation message format. Stop. The user will trigger a retry when the dependency is resolved.

## Classification Decision Tree

Run through these in order. The first one that's `yes` wins.

```
1. Is the fix unambiguous code/shell action AND
   it doesn't touch credentials/env/secrets AND
   it doesn't require a design choice?
   → AUTONOMOUS-FIX

2. Is the missing piece something only the user can provide
   (credential, account access, file content, permission)?
   → USER-ACTION-NEEDED

3. Is the decision a design/architectural choice the project plan
   doesn't already cover?
   → ARCHITECTURAL-DECISION

4. Are we waiting on a person or external system outside our control?
   → EXTERNAL-DEPENDENCY

5. None of the above?
   → Reread the situation. You probably missed a classification. If still
     none fits, USER-ACTION-NEEDED is the safe default — surface to user.
```

## Examples — Quick Reference

| Situation | Classification | Action |
|-----------|---------------|--------|
| `Cannot find module 'next'` after fresh install | AUTONOMOUS-FIX | Run install in the app directory |
| `error TS2322` on a line you didn't touch | AUTONOMOUS-FIX (1st attempt) | Inspect, fix the narrow type issue |
| Same `error TS2322` on 2nd attempt | Reclassify → ARCHITECTURAL or USER-ACTION | Surface — the "obvious" fix isn't |
| `SOME_API_KEY is not defined` | USER-ACTION-NEEDED | Surface: get from the provider, add to .env.local |
| `Migration failed: permission denied` | USER-ACTION-NEEDED | Surface: need a privileged DB credential, not the public one |
| Step says "implement tax", project plan silent | ARCHITECTURAL-DECISION | Present 2-3 options, ask user |
| Step says "configure brand voice / persona" | ARCHITECTURAL-DECISION (often + human-review-required) | Draft 2 options, escalate |
| `Upstream owner hasn't pushed the schema yet` | EXTERNAL-DEPENDENCY | Log, pause, name what you're waiting on |
| `Vercel deployment status: BUILDING` | EXTERNAL-DEPENDENCY | Log with expected duration, recommend retry in N min |
| Verification fails 3 times with different errors each time | Reclassify → ARCHITECTURAL or USER-ACTION | The step isn't safely fixable in pieces |

## Hard Rules

- **Never make architectural decisions to "unblock."** Even if you have to stop the build for two days, that is correct. A wrong architectural choice costs more than a paused build.
- **Never credential-stuff.** Don't generate fake secrets, placeholder API keys, or "test" values the user didn't authorize. Don't put `<YOUR_KEY_HERE>` into a file and proceed as if it's real.
- **Never guess at design choices outside the project plan.** If the plan doesn't say, escalate. "I'll just pick what seems standard" is the failure mode this skill exists to prevent.
- **Always preserve the original error context.** When you log a blocker, include the actual error message, exit code, and last ~30 lines of output. The user needs raw evidence, not your summary of it.
- **Cap AUTONOMOUS-FIX at two attempts per root cause.** If the same root cause appears a third time, reclassify and escalate.
- **Never silently downgrade severity.** If you classify as USER-ACTION-NEEDED, don't quietly retry as AUTONOMOUS-FIX. Once classified non-autonomous, stop.

## Writing a Blocker Description

When you LOG BLOCKER (via `progress-tracker`), the `description` and `requiredAction` fields are what the user actually reads. Good ones tell the user exactly what's wrong and exactly what to do.

### Good vs. Bad

**Bad description:** "Step 07 failed."
**Good description:** "Step 07 (Database Setup & Schema) failed at the migration command: connection refused on the database host:5432. Likely the environment's network restrictions are blocking outbound, or the migration is targeting the wrong host."

**Bad requiredAction:** "Fix env vars."
**Good requiredAction:** "Add `DATABASE_URL` to `.env.local`. Get the value from your database provider's dashboard (connection string / URI). If the provider distinguishes a pooled vs direct connection for migrations, use the one it recommends for migrations. Then run `/build` to retry step 07."

The good version:
- Names the exact thing missing.
- Names the exact place to find it.
- Names the exact place to put it.
- Mentions any non-obvious gotcha (e.g. a pooled-vs-direct connection caveat).
- Tells the user what to do next.

## Escalation Message Format

When you stop and surface to the user, use this shape:

```
## Blocker on Step NN — {Step Title}

**Classification:** {USER-ACTION-NEEDED | ARCHITECTURAL-DECISION | EXTERNAL-DEPENDENCY}

**What happened:**
{1-3 sentences describing the situation in plain language.}

**Error context:**
\`\`\`
{Raw error output, exit code, command that failed — last ~30 lines.}
\`\`\`

**What I need from you:**
{Exact action the user must take. For ARCHITECTURAL-DECISION: 2-3 options below.}

**Options:** (only for ARCHITECTURAL-DECISION)
1. **{Option A name}** — {tradeoff: cost, complexity, lock-in, time}
2. **{Option B name}** — {tradeoff}
3. **{Option C name}** — {tradeoff}

**Step status:** marked `blocked` in `_STATUS.json`. Will not advance until resolved.
**To retry:** run `/build` after taking the action above.
```

For ARCHITECTURAL-DECISION, present the options via `AskUserQuestion` *in addition* to the prose escalation. The prose explains the context; the question is how the user picks.

## When To Recommend /skip

`/skip` is for steps that genuinely don't apply. It's not a "do this later" shortcut. Recommend it only when:

- The step's domain doesn't apply to this project's deployment (e.g., a step for a service the project doesn't use).
- The step's prerequisite was satisfied by a prior alternative path and the work is already done.
- The user has explicitly said this feature is out of scope for the current cycle.

Recommend it **with** an explanation, never silently:

> "Step 28 (Reviews System) appears to depend on a third-party review widget that's not in scope for the first launch per the project plan. Recommend `/skip --reason="reviews deferred to post-launch phase 2"`. Confirm to skip, or tell me what I'm missing."

Wait for confirmation. Never skip on the skill's own initiative.

## Interaction With Sibling Skills

- **`progress-tracker` LOG BLOCKER** — call this whenever you classify as USER-ACTION-NEEDED, ARCHITECTURAL-DECISION, or EXTERNAL-DEPENDENCY. Don't try to write `_STATUS.json` directly — let progress-tracker handle the atomic write and the status transition.
- **`step-verifier`** — if a blocker is "verification keeps failing," check that step-verifier's failure report is what you're classifying against. Don't classify based on partial output.
- **`build-orchestrator`** — the orchestrator hands off to you and waits for your classification + recommendation. Return control by either (a) completing the AUTONOMOUS-FIX and signaling "retry this step's current command" or (b) signaling "blocked, do not advance, surfaced to user."
- **`checkpoint`** — if you're about to attempt an AUTONOMOUS-FIX that might make things worse (a code edit before a verification fail repeated), recommend a checkpoint first. The user can roll back if the fix is wrong.

## Edge Cases

### Repeated AUTONOMOUS-FIX failures on different root causes

If a step fails three times with three different root causes (type error, then lint error, then missing dep), that's not a clean AUTONOMOUS-FIX situation — the step itself is fragile or the environment is unhealthy. Reclassify to ARCHITECTURAL-DECISION ("step NN as-written assumes X, but the actual environment shows Y; how do you want to proceed?") or recommend `/reset-step`.

### A blocker that's USER-ACTION-NEEDED but the user is unreachable

Log it. Don't loop. Don't proceed. The build can sit blocked indefinitely — that's a safe state. The user will come back to it.

### A blocker classified as EXTERNAL-DEPENDENCY but the dependency clears later

The orchestrator handles the retry. When the user runs `/build` again, the orchestrator sees step is `blocked`, asks you to re-evaluate. You re-run the failed command. If it passes, transition step back to `in-progress` (via progress-tracker), clear the blocker, continue. If it still fails, log a fresh blocker (with the *current* error context, not the stale one).

### Ambiguous between USER-ACTION-NEEDED and EXTERNAL-DEPENDENCY

Example: "DNS for the production domain isn't pointed to the host yet." This could be USER-ACTION (the user needs to update DNS records at their registrar) or EXTERNAL (DNS propagation is taking time). When ambiguous, pick the one that requires the user to act sooner — usually USER-ACTION. Better to ask the user "have you updated the records?" than to assume they have and wait for propagation that's never going to happen.

### A blocker that's also a security concern

If the blocker is "the step is trying to log a secret value" or "the step would commit `.env.local`" or "the step is about to expose a privileged service key in client code" — classify as USER-ACTION-NEEDED and stop immediately. Do not attempt an AUTONOMOUS-FIX on security-shaped blockers, even if the fix is mechanically simple. Make the user see and confirm.

## When NOT to Use This Skill

- **Routine verification failures the orchestrator can re-run.** A single typecheck failure on a step's Verification doesn't need this skill — the orchestrator reports the failure, the user reads it, fixes it, runs `/build` again. Blocker-protocol kicks in only after repeated failures or when the situation is structurally unrecoverable autonomously.
- **Normal step execution that has clear next steps.** If a step file's Steps section says "install package X, then configure Y, then run Z," that's just work — not a blocker.
- **General error handling in app code.** This skill is for build-orchestration blockers, not application-level errors that the build is about to fix.
