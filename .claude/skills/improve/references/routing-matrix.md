# Routing matrix

How to pick the right sink for a learning, and the exact format for writing to each. Read this before step 4 of the workflow.

## The four selection dimensions

Sink choice turns on four questions. Answer them for each finding before consulting the table:

1. **Scope — who needs it?** Auto-memory lives in the user's home Claude directory and is **personal, not committed**. `CLAUDE.md` and `docs/` are **committed and team-visible**. Personal/machine/workflow lessons → memory. Team doctrine and shared procedures → committed files.
2. **Shape — what is it?** A single fact → memory or one `CLAUDE.md` line. A multi-step procedure → runbook. An architectural decision/reversal → ADR. A mechanical guard → hook/script.
3. **Must it always fire?** If forgetting it is costly and it must be present *every* session regardless of relevance → `CLAUDE.md` (always-loaded) or a SessionStart hook. If "recall it when relevant" is enough → memory (surfaced by relevance).
4. **Is it automatable?** If a deterministic check could prevent the mistake without Claude remembering anything → hook or script beats any prose note.

## Category → sink table

| Root cause | Primary sink | Escalate to a heavier sink when… |
|------------|--------------|----------------------------------|
| 1 Missing env fact | auto-memory `project_*` | …every teammate needs it → add/append a `CLAUDE.md` section line; …it must be present every session → SessionStart hook (via `update-config`) |
| 2 Wrong default assumption | auto-memory `project_*` (phrase it as a correction to the default) | …it's project doctrine → `CLAUDE.md` `## Don't` or the most relevant section |
| 3 Wrong tool / shell | the relevant `CLAUDE.md` tool-routing or shell/terminal section | …it's mechanically detectable (e.g. "warn when editing X with tool Y") → PreToolUse hook (via `update-config`) |
| 4 Existed but didn't fire | **discoverability fix** — see below | (this *is* the fix; do not write new content) |
| 5 No procedure / flailing | runbook (`docs/runbooks/kebab.md`) | …it recurs and is trigger-worthy as a workflow → a new skill (via `skill-creator`) |
| 6 Stale / incorrect knowledge | correct or delete the offending memory/doc; supersede the ADR (via `docs`) | — |
| 7 Repeated manual toil | hook or script (via `update-config`) | …it's a whole multi-step workflow → a new skill (via `skill-creator`) |

### Category 4 (discoverability) — the options, cheapest first

The knowledge exists but didn't surface. Pick the lightest fix that makes it fire next time:

1. **Sharpen the existing note/section.** Tighten a memory's `description` or `How to apply`, or make a `CLAUDE.md` line more pointed, so it reads as actionable at the moment of need.
2. **Repair the link graph.** Add a `[[wikilink]]` from a note that *would* be recalled to the one that *should* have been.
3. **Promote into always-loaded context.** Move a buried memory line into the relevant `CLAUDE.md` section so it's present every session (use when must-always-fire is true).
4. **Fix a skill's trigger.** If the lesson lives in a skill that didn't activate, the real fix is the skill's `description` — hand to `skill-creator` to optimize triggering.
5. **Add a hook.** If no prose placement is reliable enough, a hook guarantees it fires (hand to `update-config`).

## Exact write formats

### Auto-memory file

Path: the user's home Claude memory directory for this project, `memory/<slug>.md`.
Slug convention: `project_<short_kebab>` for project env/codebase gotchas; `feedback_<short_kebab>` for how-Claude-should-work lessons. Check `MEMORY.md` first so the slug doesn't collide and so you update an existing file rather than duplicating.

```markdown
---
name: <slug>
description: "<one-line summary — used at recall time to decide relevance>"
metadata:
  node_type: memory
  type: project   # or: feedback
  originSessionId: <this session's id, or "unknown" if not determinable>
---

<The fact, stated plainly in 1–3 sentences.>

**Why:** <root cause — why this was non-obvious / why Claude didn't start here. Cite the source of truth if there is one, e.g. a CLAUDE.md section or context file.>

**How to apply:** <the imperative — what to do next time, concretely. Name the right tool/path/command.> Related: [[other-slug]].
```

Then add ONE line to `MEMORY.md` (keep the existing ordering/format):

```
- [Short Title](<slug>.md) — <hook: the one-glance reason to open it>
```

`type` guidance: `project` = a fact about this project's environment/codebase (default for category 1/2/6 env facts). `feedback` = guidance about how Claude should work (tool choice, process, defaults — often category 3). When unsure between them, look at whether the lesson is about *the project* or about *Claude's behavior*.

Determining `originSessionId`: if you read the session transcript during the compacted-session fallback, use that filename's id. Otherwise set `originSessionId: unknown` — a best-effort note is far better than no note.

### CLAUDE.md edit

Read the file first (File Safety Rules). Amend the **precise existing section** — don't append a stray line at the bottom. Common targets:
- A tool-routing section — wrong-tool lessons (add/clarify a row).
- A shell/terminal section — shell lessons.
- A `## Don't` section — a new anti-pattern (one bullet).
- A domain section — doctrine for that area.
Keep edits surgical and in the established voice. Root `CLAUDE.md` for project doctrine; `.claude/CLAUDE.md` for process/documentation discipline; per-app `CLAUDE.md` for app-scoped rules.

### ADR (category 6 reversals, or a genuine decision)

Copy `docs/decisions/_template.md` → `docs/decisions/NNNN-kebab-title.md` (NNNN = highest existing number + 1; list the dir to find it). Fill Context / Decision / Alternatives Considered / Consequences / References. Append a status row to `docs/decisions/0000-INDEX.md`. Prefer routing this through the `docs` skill so the index banner stays consistent. Use ADRs sparingly — only when an actual decision or reversal was made, not for every fact.

### Runbook (category 5 procedures)

Copy `docs/runbooks/_template.md` → `docs/runbooks/kebab-title.md`. Fill Symptoms / Likely Causes / Resolution Steps / Verification / Prevention / Escalation. This is the right sink when the resolving move was a *sequence of steps* worth replaying, not a single fact.

### Hook (categories 3 and 7, when mechanical)

Never hand-edit `settings.json`. Describe the hook to `update-config`:
- **event** — PreToolUse (warn/block before an action), PostToolUse (remind after), or SessionStart (inject a fact every session).
- **matcher** — which tools (e.g. `write|edit|create`).
- **behavior** — what it should echo to stderr (a non-blocking reminder) or whether it should exit non-zero to block.
- **why** — the friction it prevents, so the hook's intent is recorded.

### New skill (categories 5 and 7, when it's a whole workflow)

Write a one-paragraph brief — what the skill does, the trigger phrases, and the friction it prevents — and invoke `skill-creator`. Don't hand-write the skill from `/improve`.

## Guardrails

- **Never expose secret values** in any note, ledger entry, ADR, or hook. Describe *that* a secret was involved, never the value.
- **One fact per memory file.** If a finding contains two distinct lessons, write two notes and link them.
- **Update, don't duplicate.** If a sink already half-covers the lesson, extend the existing entry rather than creating a near-twin (this is the whole point of the dedupe check).
- **Prefer the lightest sink that will fire.** Memory before CLAUDE.md before a hook before a new skill. Escalate only when the lighter sink demonstrably wouldn't have surfaced in time.
