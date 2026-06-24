# 0002 — One self-aware `/audit` command (retire `/audit-task`)

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Taylor Vowell
- **Supersedes / Amends:** —

## Context

The toolkit had two audit commands. `/audit <target>` ran a deep 13-axis review that wrote a phased remediation plan to `.claude/audits/`. `/audit-task` ran a lightweight, chat-only review of recent in-session work via a fresh-eyes subagent. Users had to remember which command matched their intent, and the split added surface area (two command files, duplicated trigger phrasing in the skill description, cross-references across CLAUDE.md, the adopt index, heal, and improve).

There was also a correctness concern unique to reviewing the current thread's work: the Claude that wrote the code has already rationalized its choices, so it is the worst judge of it. `/audit-task` handled this with a mandatory fresh-eyes subagent, but the deep audit had no such guarantee when the audited feature was built in the same session.

## Decision

We will collapse to a single `/audit` command that is self-aware about what it is auditing. On every invocation it runs a Step 0 that infers the most likely scope (explicit target → recent in-thread work → latest feature track), ranks the candidates by confidence, and **confirms with one `AskUserQuestion` whose highest-confidence guess is shown first and labelled "(Recommended)"** before any investigation. The answer routes to one of two depths the skill already had: a **quick review** (chat-only, fresh-eyes) for recent work, or a **deep audit** (phased plan) for a target or whole feature. When the confirmed scope is work tied to the current conversation, the audit runs in a **separate fresh agent** so the thread that produced the code does not grade its own work. `/audit-task` is removed.

## Options considered

1. **Keep two commands** — no churn, but keeps the "which command?" burden and the duplicated surface, and leaves the bias gap on same-session deep audits. Rejected.
2. **One command, no confirmation (pure inference)** — simplest UX, but a wrong guess on a broad target wastes significant investigation tokens and the user wanted to approve scope first. Rejected.
3. **One command with a confirm-first front door (chosen)** — single entry, inference does the work, one click approves scope and depth, and the separate-agent rule closes the bias gap. Slightly more interaction than pure inference, but the click is cheap and the recommendation is pre-selected.

## Consequences

- **Positive:** one command to remember; scope is always confirmed before token-heavy investigation; same-session audits are structurally unbiased; the two depth modes are preserved, just routed to instead of separately invoked; less duplicated trigger surface to keep in sync.
- **Negative / trade-offs:** every `/audit` now includes a confirmation step even when the target is explicit (mitigated by pre-selecting it as Recommended). The skill description carries both depths' trigger phrasing, making it longer.
- **Follow-ups:** updated the `audit` skill (new Step 0, renamed "task audit mode" → "quick-review mode", added the separate-agent rule), rewrote the `/audit` command, deleted `/audit-task`, and updated cross-references in CLAUDE.md, CLAUDE.add.md, the adopt skills index, the audits README, and the heal and improve skills. A worthwhile future step is a trigger-accuracy eval pass on the new merged description.
