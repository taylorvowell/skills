---
name: checkpoint
description: Creates git checkpoint tags before risky build steps and rolls back to them when a step fails or the user requests it. Use when the user types /checkpoint or /rollback, before executing any build step that an orchestrator flags as touching more than 5 files, before any database migration or schema change, before any step with human-review-required, or whenever a destructive operation is imminent and a safe restore point would let the user recover without losing context. Tags follow the pattern `checkpoint-<trackId>-step-NN-<timestamp>` (the track id disambiguates checkpoints across tracks), are noted in the track's _PROGRESS.md so they remain findable, and only the most recent 10 are retained. NEVER auto-rollback — every rollback requires explicit user confirmation; NEVER fabricate a checkpoint without verifying the working tree state first.
---

# Checkpoint

You own the safety net for the build. Build tracks make many irreversible-looking changes (migrations, schema updates, sweeping refactors across the codebase). Without a checkpoint, a step that goes wrong can leave the working tree in a half-applied state that's painful to untangle. With a checkpoint, the user can always get back to a known-good moment with `git reset --hard <tag>`.

This skill creates those tags and drives the rollback flow. It does **not** make rollback decisions on its own — every restoration requires the user to confirm, because rollback discards work.

## Why this skill exists separately from build-orchestrator

The orchestrator advances forward through the build. Checkpointing is orthogonal — it's about being able to *undo* forward motion. Mixing the two means every orchestrator path has to think about restore points; isolating it here means the orchestrator just calls "make a checkpoint" or "list checkpoints" and the details stay here.

Additionally, the user can invoke `/checkpoint` or `/rollback` directly outside the orchestrator (e.g., before a manual experiment, after a failed migration). This skill is the consistent entry point for both flows.

## The Two Modes

### CREATE mode

**When:** `/checkpoint` is invoked, OR build-orchestrator signals "about to run a risky step", OR before any step with `human-review-required: true`, OR before steps that modify > 5 files, OR before any database/schema migration.

**Workflow:**

1. **Verify working tree state.** Run `git status --porcelain`.
   - If clean: proceed.
   - If dirty with intentional changes (caller knows): proceed, but the tag captures the dirty state — make sure the caller wanted that.
   - If dirty with unexplained changes: STOP and surface to the user. Do not silently tag over uncommitted work that may be in-flight.
2. **Determine the track + step number.** The caller is on a track; its root is `<trackRoot>` (a dir under `.claude/feature-tracks/<id>/` — the spine track resolves from the `spine: true` entry in `.claude/ROADMAP.json`). Read `<trackRoot>/_STATUS.json`, get `currentStep` and the track id (`featureName`). If unavailable, accept an explicit step number from the caller or use `pre`.
3. **Generate the tag name** in the format `checkpoint-<trackId>-step-NN-YYYYMMDD-HHMMSS` (UTC). Use ISO-style compact timestamp — no colons, no spaces, filename-safe. The `<trackId>` segment keeps two tracks sitting at the same step number from colliding.
4. **Create the tag** with `git tag <name>`. Use an annotated tag (`-a -m "..."`) when a description is worth keeping; otherwise lightweight is fine.
5. **Note the checkpoint in `_PROGRESS.md`** via the `progress-tracker` skill's APPEND TO PROGRESS operation. Entry should record: tag name, step number, timestamp, brief reason ("before step 12 migration", "user-requested", etc.).
6. **Return the tag name** to the caller so they can reference it later.
7. **Prune old checkpoints.** List all tags matching `checkpoint-*` (covers both the `checkpoint-<trackId>-step-*` form and any legacy `checkpoint-step-*`), sort by creation time, delete all but the most recent 10. Do this with `git tag -d <name>` — it only removes the local tag, not remote refs. Never prune `milestone-*` tags — they don't match the checkpoint glob by design.

### ROLLBACK mode

**When:** `/rollback` is invoked. Never automatic.

**Workflow:**

1. **List available checkpoints.** Run `git tag --list 'checkpoint-*' --sort=-creatordate` (covers `checkpoint-<trackId>-step-*` and legacy `checkpoint-step-*`). Show the user the top 10 with their dates and what track + step they preceded (parse from the tag name).
2. **Ask the user to select one** — by tag name or by number in the list. Accept "latest" as shorthand for the most recent.
3. **Surface what will be lost.** Run `git log --oneline <chosen-tag>..HEAD` and show the user every commit that rollback will discard. If there are uncommitted changes (`git status --porcelain` non-empty), show those too. State explicitly: "This will discard N commits and any uncommitted changes."
4. **Require explicit confirmation.** The user must type a clear yes (the AskUserQuestion tool with a confirm option is the right pattern). Do NOT accept implicit signals.
5. **Run the reset.** `git reset --hard <tag>`. This is the destructive step.
6. **Update `_STATUS.json`** via `progress-tracker`'s RESET STEP operation: every step that was completed *after* the checkpoint's step number must go back to `not-started`. The checkpoint's own step becomes `currentStep`.
7. **Append to `_PROGRESS.md`** a rollback entry: which tag was restored, which commits were discarded, which step the build is now at.
8. **Report to the user** the new HEAD, the new current step, and confirm they're ready to resume.

## Hard rules

- **NEVER auto-rollback.** Even if a step's verification fails catastrophically. The orchestrator can *recommend* rollback, but execution requires the user.
- **NEVER skip the "what will be lost" preview.** The user must see exactly what `git reset --hard` will destroy before confirming.
- **NEVER force-push or rewrite remote history** from this skill. Checkpoints are local-only safety nets. If the user wants to publish a rolled-back state, that's a separate decision they make after.
- **Tags must be unique.** The timestamp suffix makes collisions effectively impossible, but if one ever happens, append a `-2` rather than overwriting.
- **Document every checkpoint in `_PROGRESS.md`.** A tag that isn't recorded is invisible — the user won't find it when they need it. Always go through `progress-tracker` so the format stays consistent.

## When checkpoints are NOT needed

Don't tag for:

- Documentation-only changes (no code, no config, no schema)
- Single-file edits with no migration component
- Read-only operations (running `pnpm typecheck`, listing files, etc.)
- Steps that the orchestrator can trivially undo with a single `git revert`

Over-tagging dilutes the value of the checkpoint list. Tag only when restoration would be materially harder than `git revert HEAD`.

## Retention

Keep the most recent 10 `checkpoint-*` tags locally. Anything older gets pruned during the next CREATE operation. Ten is enough to span several days of build work; more clutters `git tag` output and slows tag lookups. If the user wants to preserve an older checkpoint long-term, they should rename it to something that doesn't match the `checkpoint-*` pattern (e.g., a `milestone-*` tag like `milestone-first-launch`) — the prune logic will leave it alone.

## Examples

**Creating a checkpoint before the example-feature track's step 02 (a deep conversion):**

```
git status --porcelain                              # → clean
git tag -a checkpoint-example-feature-step-02-20260530-143200 -m "before deep conversion"
# progress-tracker APPEND TO PROGRESS (in .claude/feature-tracks/example-feature/_PROGRESS.md):
#   "Checkpoint created: checkpoint-example-feature-step-02-20260530-143200 before step 02"
git tag --list 'checkpoint-*' --sort=-creatordate
# (if > 10 results, delete the oldest)
```

**Rolling back to the most recent checkpoint:**

```
git tag --list 'checkpoint-*' --sort=-creatordate    # show user
# user picks: checkpoint-example-feature-step-02-20260530-143200
git log --oneline checkpoint-example-feature-step-02-20260530-143200..HEAD
# show user: "This will discard 4 commits and 2 modified files. Confirm?"
# user confirms
git reset --hard checkpoint-example-feature-step-02-20260530-143200
# progress-tracker RESET STEP for the example-feature steps completed after the checkpoint
# progress-tracker APPEND TO PROGRESS: "Rolled back to checkpoint-example-feature-step-02-..."
```

## Coordination with other skills

- **build-orchestrator** calls CREATE before executing any step it flags as risky (>5 files, migration, human-review-required).
- **progress-tracker** is invoked for every `_STATUS.json` / `_PROGRESS.md` write — never write to those files directly from this skill.
- **blocker-protocol** may *recommend* rollback when a step is blocked beyond autonomous repair, but the recommendation flows through the user, who then invokes `/rollback`.
