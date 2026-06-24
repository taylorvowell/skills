# Audits

This folder is the **findings archive** for the `/audit` slash command (driven by the `audit` skill). Each entry records what an audit found — the durable evidence. It does **not** hold the executable fix-up: remediation runs through the project's normal tooling (see "How remediation runs" below).

## Structure

Each audit is one self-contained doc in its own dated subfolder:

```
.claude/audits/
└── <slug>-<YYYY-MM-DD>/
    └── 00-overview.md          # The findings report — the only file here
```

There are no phase docs and no `_status.md` here anymore. A deep audit produces one findings doc; if its remediation is substantial, the executable plan lives as a separate build track (below), not in this folder.

## Reading an audit

Open `00-overview.md`. It contains:
- The TL;DR and the exact scope (file set)
- The findings, by severity, each with evidence (`file:line`) and a source-of-truth citation
- A coverage matrix (the 13 core axes + the hardening lenses A–G that were run)
- The two-way tech-debt section (carried + introduced)
- The remediation outline (dependency-ordered phases) and the **chosen tier** — with a pointer to the remediation track if one was scaffolded

## How remediation runs

The audit picks a tier at the end and routes the fix-up through existing tooling — it never executes from a doc in this folder:

- **Inline tier** (a small cleanup): the fixes go to `/heal`, scoped to the audited files. No track. The findings doc stays here as the record.
- **Track tier** (substantial — the post-build default): the audit scaffolds a `<slug>-remediation` track under `.claude/feature-tracks/`, registers it in `.claude/ROADMAP.json`, and `/feature <slug>-remediation` executes it with the same drift-detection, verification, self-heal, and per-step commits as any build track. The findings doc here points at that track.

So to act on an audit: open `00-overview.md`, read the chosen tier, then either let `/heal` run (inline) or run `/feature <slug>-remediation` (track). Progress lives in the track's `_STATUS.json` / `_PROGRESS.md`, visible in `/roadmap` — not here.

## When the audit runs

`/audit` is self-aware about scope (it confirms before investigating). It runs:
- **After a feature ships** — `/build` and `/feature` offer a **post-build audit** of a just-finished track, with scope derived exactly from the track. This is the primary moment.
- **On any target** — `/audit <target>` for a component, folder, or subsystem.
- **On recent in-session work** — `/audit` then "recent work in this thread" gives a chat-only **quick review** (fresh-eyes); that mode writes nothing here unless promoted to a deep audit.

## Re-auditing a target

Run `/audit <same target>` again. The skill always creates a new dated folder (never overwrites). Old findings stay as history.

## When NOT to look here

For lightweight in-session reviews of work just done in the current thread (uncommitted changes, "did I use the existing primitives?"), the **quick-review** mode is **chat-only** — it does not write here. The report lives in the conversation; if the findings warrant heavyweight treatment, the user promotes to a deep audit and a folder appears here.
