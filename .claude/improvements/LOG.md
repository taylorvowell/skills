# Improvements Ledger

Append-only trail of `/improve` runs. **Newest on top.** One block per finding acted on.

Each entry records *what slowed us down*, the *root cause*, and *where the fix was routed* — it points at the sink (a memory note, a `CLAUDE.md` section, a runbook/ADR, a hook, a new skill) rather than holding the knowledge itself. This file has two jobs: a single place to see every improvement across sessions, and the dedupe lookup the `/improve` skill reads at the start of each run so the same lesson isn't re-learned.

See `.claude/skills/improve/` (the `improve` skill) for how entries are produced. Entry format:

```markdown
## YYYY-MM-DD — short friction title
- **Symptom:** what slowed us down (1 line)
- **Root cause:** <category #> — why Claude didn't start there
- **Routed to:** <sink> → path or hand-off
- **Session:** originSessionId or "unknown"
```

<!-- entries below this line -->
