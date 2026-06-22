Architect a solution using the `architect` skill in DEEP mode (multi-agent research).

Invoke the `architect` skill immediately, in deep mode. Everything after `/architect-deep` is the question/decision to architect. If the argument is empty, ask the user what they want to architect (one line).

`/architect-deep` is for the heavy decisions — build-vs-buy, multi-vendor selection, a cross-system ownership redesign, or anything big enough to reshape the plan. It runs the full fan-out:

1. **Research** — parallel agents, each owning one vendor/topic, grounded in the project's existing docs (CLAUDE.md, docs/decisions, README, and .claude/ROADMAP.json if present), returning structured findings from current docs/web (not memory).
2. **Debate** — agents steelman opposing stances (e.g. build-our-own vs buy-a-platform), each conceding where the other is right.
3. **Synthesis** — one opinionated recommendation across every decision domain, with a now-vs-defer sequence.

This spends real tokens and runs as a background workflow. If the user has not opted into multi-agent orchestration (the word "workflow" or an explicit ask), run the same fan-out inline with the `Agent` tool instead, then synthesize.

Everything else matches `/architect`: always stress-test the committed plan, land ONE recommendation with the road not taken and a "gaps you didn't ask about" list, classify the path forward and gate any handoff on the user's acceptance, record the full result to `.claude/architecture/`, and offer an ADR once accepted.

Examples:
- `/architect-deep should we keep building our own email/SMS stack or adopt a managed provider`
- `/architect-deep design the data layer so it scales to many tenants on day one`
