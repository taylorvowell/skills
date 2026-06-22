---
name: improve
description: Routes a vague "make this better" request to the right specialized action, and turns session friction into a durable improvement to Claude's own knowledge so the same friction doesn't recur. Use whenever the user types `/improve`, says "improve this", "make this better", "clean this up", "improve X", "please improve claude", "learn from this session", "what slowed us down", "why didn't you know that", "capture the lesson from this", or "make sure you remember this next time". It reflects on the current thread, finds the root cause of the friction (the reason Claude didn't start in the right place), and routes the learning into the best EXISTING sink — auto-memory, a CLAUDE.md section, an ADR/runbook, or a hand-off to `update-config` (hooks) / `skill-creator` (new skills). Trigger it preemptively right after a session where Claude chased the wrong lead, reached for the wrong tool, re-derived a fact it could have known, thrashed between shells, or had to be corrected repeatedly — that friction is exactly what this skill exists to capture. It writes local/personal sinks (auto-memory + the improvements ledger) automatically and gates committed or automation changes (CLAUDE.md, docs, hooks, new skills) behind ONE confirmation; it never auto-commits. Do NOT use it for general architectural review of code just written (that's `audit`), or for deliberately documenting a decision you set out to make (that's the `docs` skill) — `improve` is specifically for diagnosing friction that already happened and fixing the knowledge gap that caused it.
---

# Improve

You are about to make Claude permanently better at working in *this* project by mining the session you're in for the friction that just happened. The user invokes `/improve` after a session went slower than it should have — Claude chased a wrong lead, picked the wrong tool, re-derived a known fact, or had to be corrected. Your job is to find **why Claude didn't start in the right place** and put that lesson somewhere it will actually fire next time.

## Why this skill exists

A hard-won lesson that lives only in a closed chat window is wasted. Your project already has places where lessons *do* persist and get recalled — the auto-memory system, the `CLAUDE.md` files, ADRs/runbooks, and hooks. The problem isn't a missing knowledge store; it's that, in the heat of a session, the lesson never gets written down, or gets written in a place where it won't surface at the right moment.

So this skill is **a diagnostic plus a router**, not a new knowledge base. You diagnose the root cause of the friction, then route the fix into the sink that already exists and that will actually surface it next time.

Three failure modes to avoid:

1. **Treating a symptom as the lesson.** "The service was down" is a symptom. The lesson is *why Claude looked in the wrong place first* — a missing-or-not-firing fact about how this project is wired. Always push past the symptom to the reason Claude didn't start in the right place.
2. **Duplicating knowledge that already exists.** Often the fact was already captured (memory, CLAUDE.md, a skill) but didn't surface. Writing it a second time makes the problem *worse* (now there are two copies to drift). When the knowledge already exists, the fix is **discoverability/placement**, not new content. Always run the dedupe check.
3. **Writing committed/automation changes without consent.** Auto-memory and the ledger live in the user's home dir and are cheap to revert — write those freely. `CLAUDE.md`, `docs/`, hooks, and new skills are team-visible or load-bearing — present them and apply only after one confirmation. Never auto-commit.

## The workflow

This is the canonical sequence for one `/improve` invocation. Don't reorder; don't skip the dedupe check.

### 1. Gather evidence from the current thread

Reflect on the conversation you're in. Look through two lenses:

- **Detour lens** — *one problem that took many wrong turns.* Identify: the original symptom, the dead-ends Claude tried, the move that *finally* resolved it, and the gap between the first action and the resolving one. The size of that gap is the cost you're trying to eliminate.
- **Repetition lens** — *the same class of mistake repeated.* A wrong tool reached for more than once, a command retried with tweaks, a fact re-derived after research that a note would have supplied, shell thrash, a dependency discovered only after digging, a correction the user had to give twice.

Primary source is the in-context conversation. If the session was compacted and detail is missing, you may read this session's transcript JSONL (read-only) under the user's Claude projects directory to recover the sequence — but don't over-engineer this; the in-context history is usually enough.

A session may yield zero, one, or several findings. Zero is a valid result — if nothing actually slowed things down, say so plainly and stop. Don't manufacture friction.

### 2. Root-cause each finding

For every friction point, ask the pivotal question: **why didn't Claude start there?** Classify the answer using the seven categories in `references/root-cause-taxonomy.md`. Read that file now if you haven't — the category drives the routing, and category 4 ("knowledge existed but didn't fire") is the one people miss.

### 3. Dedupe check (do this before proposing any write)

Before writing anything, search the existing sinks to see whether this lesson is already captured:

- `MEMORY.md` index + the memory files it points to
- the `CLAUDE.md` files (root + per-app) — section by section
- `docs/decisions/` and `docs/runbooks/`
- the `description` fields of existing skills (the lesson may belong to a skill that simply isn't triggering)
- `.claude/improvements/LOG.md` (a past `/improve` run may already cover it)

If the lesson already exists somewhere, **reclassify it as category 4 (discoverability)** and fix *placement* — sharpen a skill description, repair a `[[wikilink]]`, promote a buried memory line into always-loaded `CLAUDE.md`, or propose a hook — rather than writing a duplicate.

### 4. Route each finding to a sink

Use `references/routing-matrix.md` to pick the sink. It maps each root-cause category to a primary sink, gives the criteria for escalating to a heavier sink, and gives the **exact write format** for each sink (memory frontmatter, ADR/runbook template paths, which `CLAUDE.md` section, hook/skill hand-off). Read it before writing so the writes are correct on the first try.

### 5. Present the coverage table, then apply

Produce the output exactly as specified in `references/output-format.md`: a coverage table (the findings view — no loose prose recap), then a tight plan of writes split into auto-applied vs. awaiting-confirm, then a win line.

Then apply:

- **Auto (no confirmation):** write any auto-memory files (+ add the one-line `MEMORY.md` index entry) and append the ledger row. These are local and trivially reverted.
- **Gated (one confirmation for the batch):** `CLAUDE.md` edits, new ADRs/runbooks, and hand-offs to `update-config` (hooks) / `skill-creator` (new skills). Present them together and apply on a single "yes" — don't ask per-item; that's friction. Read any committed file before editing it (File Safety Rules in `CLAUDE.md`).

Never run `git commit`. Leave repo edits in the working tree for the user to review and `/commit` themselves.

### 6. Append the ledger entry and close

Append one entry to `.claude/improvements/LOG.md` (format in `references/output-format.md`) for **every** finding you acted on, regardless of which sink it went to — the ledger is the single cross-sink trail and the dedupe source for future runs. Close with the win line and the path to the ledger entry.

## Hand-off rules

`/improve` never hand-writes a hook or a new skill itself — those surfaces each have an owner, and routing through the owner keeps one source of truth per surface:

- **New/changed hook** (`settings.json` PreToolUse/PostToolUse/SessionStart) → describe the proposed hook and invoke the `update-config` skill to write it. Explain what the hook should fire on and why.
- **New skill** → write a one-paragraph brief (what it does, when it should trigger, the friction it prevents) and invoke `skill-creator`.
- **Superseding/correcting an ADR** → use the `docs` skill so the `0000-INDEX.md` status banner stays consistent.

## A worked example (the canonical case)

> **Friction:** Diagnosing a backing service that was "not running," Claude tried one data tool (looking for a table), then a hosting tool (assuming the service ran in the cloud), before the user pointed out the service runs locally in Docker — and even then Claude suggested the wrong fix.
>
> **Root cause:** Category 3 (wrong tool) compounded by Category 1 (missing env fact: this service runs locally, not in the cloud, in this state).
>
> **Dedupe check:** an existing memory note *already* captures "don't reach for the cloud-data tool on this service's issues." So that half is **not** net-new — reclassify it as Category 4 (it didn't fire). The "local Docker, and here's the right way to start/inspect it" half *is* net-new.
>
> **Routing:** (a) For the part that didn't fire → discoverability fix: confirm the existing memory's `How to apply` is sharp, and consider whether a `CLAUDE.md` tool-routing line would make it always-present. (b) For the net-new local-Docker fact → a new `project_*` auto-memory note, linked with a `[[wikilink]]` to the existing note; escalate to a short runbook only if "get this service running locally" is a recurring multi-step procedure.
>
> **Ledger:** one row pointing at both the memory note and the discoverability fix.

This is the shape of a good `/improve` run: it pushes to the real reason, it *checks what already exists* before writing, and it routes the net-new part to the lightest sink that will surface it.

## Reference files

- `references/root-cause-taxonomy.md` — the 7 root-cause categories and how to detect each in a thread. Read before step 2.
- `references/routing-matrix.md` — sink selection criteria, the category→sink table, escalation rules, and the exact write format for every sink. Read before step 4.
- `references/output-format.md` — the coverage-table columns, the auto-vs-gated plan, the win line, and the ledger-entry template. Read before step 5.
