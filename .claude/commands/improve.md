---
description: Diagnose why this session's troubleshooting was slow and route the lesson into a durable improvement
---

Invoke the `improve` skill immediately. There is no argument — the skill operates on the current conversation thread.

The skill will:
1. Reflect on this session through two lenses — a long *detour* (one problem, many wrong turns) and *repetition* (the same class of mistake more than once).
2. Root-cause each friction point: **why didn't Claude start in the right place?** (7-category taxonomy).
3. Run a dedupe check against existing sinks — if the lesson already exists, fix *discoverability*, not content.
4. Route each finding to the best existing sink — auto-memory, a `CLAUDE.md` section, an ADR/runbook, or a hand-off to `update-config` (hooks) / `skill-creator` (new skills).
5. Present a coverage table, then **auto-apply** local/reversible writes (auto-memory + the `.claude/improvements/LOG.md` ledger) and apply committed/automation changes only after **one** confirmation. It never auto-commits.

Don't start grepping memory or `CLAUDE.md` before invoking the skill — it runs its own evidence-gathering and dedupe steps in order. Going in cold wastes context.

This is for capturing *friction that already happened* and fixing the knowledge gap that caused it. For an architectural review of code just written, use `/audit` (it will confirm it's reviewing your recent work). For deliberately documenting a decision you set out to make, use `/document` / the `docs` skill.
