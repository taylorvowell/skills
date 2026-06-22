Create a git checkpoint tag for the current build state.

Invoke the `checkpoint` skill in CREATE mode. It will:
1. Verify the working tree state (`git status --porcelain`) and surface unexpected changes before tagging
2. Read `_STATUS.json` to determine the current step number
3. Create a tag named `checkpoint-step-NN-YYYYMMDD-HHMMSS` (UTC)
4. Append a record of the checkpoint to `_PROGRESS.md` via `progress-tracker`
5. Prune older checkpoints, keeping only the 10 most recent
6. Report the tag name back to you

When to use:
- Manually, before any step you suspect could go wrong
- Before database migrations or schema changes (`apply_migration`)
- Before steps with `human-review-required: true`
- Before refactors that span many files
- Before any work where being able to restore the prior state would meaningfully reduce risk

When NOT to use:
- Documentation-only changes
- Single-file trivial edits
- Read-only operations

To restore a checkpoint, use `/rollback`. This command only creates them.
