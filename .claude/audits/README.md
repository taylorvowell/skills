# Audits

This folder holds outputs from the `/audit` slash command (driven by the `audit` skill).

## Structure

Each audit lives in its own subfolder:

```
.claude/audits/
└── <slug>-<YYYY-MM-DD>/
    ├── 00-overview.md           # Read this first — TL;DR, findings, phase index, execution instructions
    ├── 01-phase-1-<slug>.md     # First phase of remediation
    ├── 02-phase-2-<slug>.md     # ...etc
    └── _status.md               # Phase tracking, updated as execution progresses
```

## Reading an audit

Open `00-overview.md`. It contains:
- The findings (by severity, with citations)
- A coverage matrix of the 13 audit axes
- A strategy paragraph
- An index of phases
- A "Tech debt introduced by this plan" section
- An "AI Coder: Execution Instructions" section that's self-contained — you can hand this audit to a fresh Claude session and ask it to execute.

## Executing an audit later

In a fresh Claude session, paste:

> Execute the plan in `.claude/audits/<slug>-<YYYY-MM-DD>/00-overview.md`.

Claude will follow the AI Coder Execution Instructions in that document — one phase per signal, with verification between each phase. `_status.md` tracks progress and survives session restarts.

## Re-auditing a target

Run `/audit <same target>` again. The skill always creates a new dated folder (never overwrites). Old audits stay as history.

## When NOT to look here

For lightweight in-session reviews of work just done in the current thread (uncommitted changes, "did I use the existing primitives?"), use `/audit-task` instead. That mode is **chat-only** — it does not write anything to this folder. The task-audit report lives in the conversation; if the findings warrant heavyweight treatment, the user can promote to a full `/audit` and a folder will appear here.
