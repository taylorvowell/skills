Architect a solution using the `architect` skill (fast / inline mode).

Invoke the `architect` skill immediately. Everything after `/architect` is the question/decision to architect. If the argument is empty, ask the user what they want to architect (one line).

`/architect` is the **fast, high-level** mode: ground in the project's existing docs (CLAUDE.md, docs/decisions, README, and .claude/ROADMAP.json if present) + a few targeted external checks, then decide. For a build-vs-buy, multi-vendor selection, or a decision big enough to reshape the plan, use **`/architect-deep`** (multi-agent research + adversarial debate + synthesis).

Examples:
- `/architect who sends what emails, and how do we handle spam complaints and bounces`
- `/architect where should the data-sync job between two services actually live`
- `/architect how do we design the API so it stays backward-compatible as it grows`

Do not start grepping or reading files before invoking the skill — its own workflow grounds itself and decides research breadth. Going in cold wastes context.

The skill: uses its own best judgment (it decides, it doesn't interrogate), always stress-tests the current/committed plan even when it looks fine, lands ONE opinionated recommendation with the road not taken and a "gaps you didn't ask about" list, classifies the path forward (just-a-decision vs `/feature` track vs a bigger multiphase plan) and asks before handing off, records every call durably to `.claude/architecture/` so you can revisit and continue the thought, and offers an ADR once you accept. It does NOT write code or plan a build before you accept the recommendation.
