Perform an architectural audit using the `audit` skill. This is the ONE audit command — it is self-aware about what to audit.

Invoke the `audit` skill immediately. Do not start grepping or reading files first — the skill's Step 0 figures out the scope and confirms it before any investigation. Going in cold wastes context.

How it decides what to audit (Step 0 of the skill):

1. It infers the most likely scope, ranked by confidence:
   - A **just-finished build track** handed off by `/build` or `/feature` (the post-build hardening pass) → deep audit in **post-build mode**, scope pre-filled.
   - An explicit target in the argument (`/audit ProductCard`, `/audit the cart drawer`) → deep audit of that target.
   - Recent work in this thread / a dirty working tree → quick in-session review.
   - The latest feature track → deep audit (post-build mode if it's complete).
2. It **confirms with a single question** (`AskUserQuestion`), highest-confidence guess shown first and labelled "(Recommended)". The user clicks; only then does the audit start. (A post-build hand-off collapses this to a single yes/no, since the track is already the scope.)

Three depths the answer routes to:
- **Quick review** — chat-only, fresh-eyes sanity check of recent in-session work ("did I reuse the existing primitives, follow conventions, avoid duplicating registered components?"). No audit folder.
- **Deep audit** — full review of a target against the 13 core axes (Next.js practices, performance & code optimization, structure & architecture fit, modularity, scalability, placement, reuse-vs-duplication, tech debt, conventions, AI-readable docs, tests, latest-tech leverage, suggestions), security always included. Writes a self-contained findings doc to `.claude/audits/<slug>-<YYYY-MM-DD>/00-overview.md`.
- **Post-build mode** — the deep audit run after a feature ships: the 13 axes **plus** the hardening lenses (security, rendering strategy, failure-path completeness, accessibility, cache-invalidation, config/env parity, observability), scoped exactly to the track (its step "Files & Areas Touched" + the run's commit range), in a fresh unbiased agent.

How it fixes what it finds (tiered remediation — the audit never carries its own executor):
- **Inline tier** (small: a nit or two, single-domain, no >5-file fix) → hands the findings to `/heal`.
- **Track tier** (substantial — the post-build default) → scaffolds a `<slug>-remediation` build track, registers it in `.claude/ROADMAP.json`, and `/feature <slug>-remediation` executes it with full drift-detection, verification, self-heal, and per-step commits. It shows up in `/roadmap`.

The audit phase makes NO code changes — it writes findings, then asks at a tier-aware gate (`AskUserQuestion`) before any remediation runs. Even in auto/bypass mode it stops to ask.

Examples of valid invocations:
- `/audit` — no argument; the skill infers and confirms (a just-finished track, recent work, latest feature, or a target)
- `/audit component library` — broad, multi-domain deep audit
- `/audit checkout form` — single-domain deep audit
- `/audit ProductCard` — single-component deep audit
- `/audit what I just did` / `/audit last commit` / `/audit --branch` — recent-work quick review

**Unbiased rule:** when the confirmed scope is work tied to the current conversation (recent in-thread changes, or a feature built/edited this session — including a post-build audit of a track just built), the skill runs the audit in a **separate fresh agent** so the thread that wrote the code isn't grading its own work.
