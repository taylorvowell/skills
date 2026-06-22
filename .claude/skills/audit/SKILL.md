---
name: audit
description: Performs a post-hoc architectural audit of Next.js code against 13 axes — Next.js best practices, performance, structure, modularity, scalability, location, reuse-vs-duplication, debt-from-solve, project conventions (CVA / Tailwind v4 / shadcn / env-module / naming consistency), AI-readable docs, important tests, latest-tech leverage, and open suggestions. Operates in two modes. **Full-audit mode** (`/audit <target>`) — deep review of an existing target (component, domain folder, subsystem, or whole library); writes a phased remediation plan to `.claude/audits/<slug>-<date>/` designed to be executed by an AI coder in a separate session. **Task-audit mode** (`/audit-task`) — lightweight in-session review of work just done in the current thread (uncommitted changes by default); chat-only output, fresh-eyes review via subagent, focused on "did I actually use the existing primitives / follow conventions / avoid duplicating registered components." Use this skill whenever the user types `/audit`, `/audit <target>`, `/audit-task`, `/commit-and-audit`, says "audit the X", "review the X for best practices", "do an architectural review of X", "is the X built right", "audit what I just did", "review the work I just made", "did I follow conventions just now", "self-review my recent edits", or asks for a structural/scalability/conventions review of any existing code or in-session work. Trigger preemptively when the user asks "is this the best way?" about something already built, or wants a quick sanity check after creating a new component / modal / Server Action / route. This skill DOES NOT make code changes during the audit phase — it produces findings and a plan and only executes if the user explicitly opts in at the end. Do NOT use this skill for runtime perf measurement (use a Lighthouse/speed-audit tool), for pre-design review (talk it out conversationally instead), for security-only reviews (use a dedicated security review instead), or for trivial single-file lint-style nitpicks.
---

# Audit

You are about to perform a serious, architectural audit of something the user has already built. Your job is to find the things that will hurt scale, performance, maintainability, or developer velocity — not to nitpick. Then you write up a phased remediation plan that another Claude (or you in a fresh session) can execute deterministically.

## Why this skill exists

The user invokes `/audit` *after* work is built. Early audits will be very broad ("audit the whole product component library"); later audits will be narrow ("audit the modal I just shipped"). In both cases the goal is the same:

> Catch architectural mistakes before they compound. Surface duplication, dead conventions, missed Next.js primitives, and tech debt the original implementation didn't notice. Then write a plan precise enough that an AI coder reading it later — with no prior context — can execute it correctly.

Three failure modes to avoid:

1. **Nitpicking.** Surface-level lint findings are noise; the user has type-check and lint gates already. Only report things that affect architecture, performance, scalability, reuse, or conventions.
2. **Writing for yourself.** The audit document must be self-contained. A future Claude reading just the `.md` files must be able to execute the plan. No "as I mentioned above" references to chat history.
3. **Bypassing the gate.** Even when running in auto/bypass mode, you MUST stop and ask the user which of the four options to take at the end. Never auto-execute fixes.

## The Workflow

This is the canonical sequence for one `/audit` invocation. Do not reorder. Do not skip the verification check at the end.

### 1. Parse the target

The slash argument is the target. Examples (paths are illustrative — resolve them against your Next.js app directory, whether that's the repo root for a single app or a workspace like `apps/web` in a monorepo):
- `/audit product component library` → broad: `components/{product,cart,checkout,account}/**`
- `/audit ProductCard` → narrow: `components/product/ProductCard.tsx` (+ siblings)
- `/audit modal system` → medium: `components/<domain>/**`
- `/audit recently changed files` → derive from `git diff --name-only main...HEAD`
- `/audit` (no arg) → ask the user what to audit

If the target is ambiguous (e.g. "audit the search"), play it back: "Auditing `components/search/` and `app/api/search/`. Anything else?" Wait for confirmation. Don't guess on broad targets — guessing wastes a lot of investigation tokens.

### 2. Detect scope size and plan investigation

Heuristics for scope:

- **Small** — 1–5 files, one component or one tight feature. Read directly with `Read` / `Grep`. No subagents (briefing one costs more than reading inline).
- **Medium** — one domain folder, 5–30 files. Read inline. Optionally fire **one pre-scan subagent** for convention violations across the audit scope (see "Subagent patterns" below) — this parallelizes the mechanical grep work with your structural investigation.
- **Large** — multi-domain or whole subsystem (>30 files, or "the whole component library"). **Fan out parallel `Explore` subagents** — one per subdomain, plus the pre-scan and latest-leverage sweeps. The main agent stays in the architectural seat; subagents return short bulleted findings so you don't drown in code excerpts.

State your plan back to the user in one or two sentences before going deep: *"I'm going to audit `components/cart/**` — about 12 files. I'll consult the component-system and styling conventions, plus any relevant architecture decision records. Going to do this inline (medium scope), with one pre-scan subagent for convention violations. Sound right?"* Wait briefly — if the user pushes back, adjust. If they don't respond, proceed.

### 3. Load relevant ground truth

Only load skills that are actually relevant to the target. Don't preload everything — that's how you waste your context budget before you've even read the code.

**Always-relevant ground truth:**
- Your component registry (e.g. `components/REGISTRY.md`) — for any component audit
- `CLAUDE.md` (project + per-app) — conventions
- Architecture decision records in `docs/decisions/` — but only the ones the target actually touches

**Domain-match skills (load 1–3 maximum), matched to whatever's installed:**
- Component-system / primitives / variants → a component-system skill
- Styling, theme tokens, CVA → a Tailwind v4 skill
- Cart, checkout, products, orders → a skill for your backend / data source
- Auth, env, webhooks, PII, secrets → a security skill
- RSC vs client, App Router patterns, async APIs → `next-best-practices`
- PPR, `use cache`, cacheLife, cacheTag → `next-cache-components`
- React composition, hooks, performance patterns → `vercel-react-best-practices`, `vercel-composition-patterns`
- Cost/perf on already-deployed routes → `vercel-optimize`

**Web research:** Only go to `WebSearch` / `WebFetch` for things the local skills don't cover. Examples: "is there a new React 19 API that obsoletes this hook?", "what's the current best practice for streaming in Next.js?" Always cite the URL in the audit doc.

### 4. Investigate

Read the target. Look at structure, not just lines. Things worth checking on every audit (this is the working set — the formal axes are in `references/coverage-axes.md`):

- **Existence check:** does something similar already exist in the component registry or elsewhere? If yes, the audit's recommendation is almost always "merge into the existing thing with a CVA variant, don't fork."
- **RSC vs client:** is `'use client'` at the leaf or wrapping a tree? Could this be a Server Component?
- **Data fetching:** is data fetched in `useEffect` when it should be RSC? Is `unstable_cache` used where `use cache` would work?
- **Variant logic:** are there inline ternaries on `className`? CVA is required.
- **Primitives:** is anything hand-built (Button, Input, Dialog, Card, Badge, Select, Sheet, Tabs, Separator, Skeleton) that should be from `components/ui/`?
- **Theme tokens:** any hardcoded hex colors? Any `tailwind.config.{js,ts}` file (emergency — Tailwind v4 is CSS-first)?
- **Env access:** any raw `process.env` outside the env module (e.g. `lib/env.ts`)?
- **Boundary correctness:** any server-only client (admin keys, service-role keys, privileged API clients) reachable from client code? Any `'use client'` file importing a server-only module?
- **Location:** components in `app/` route dirs (should be `components/[domain]/`)? Default exports outside `page.tsx`/`layout.tsx`?
- **Naming:** does the file/component/hook/Server Action name match the local pattern (`Product*` in `product/`, PascalCase for `.tsx`, kebab-case for non-component `.ts`, `density`/`layout`/`size` over invented variant vocabulary), AND does the name accurately describe what the thing does to a new reader? Misnames mislead grep searches and AI agents. See coverage-axes.md axis 9 "Naming consistency & clarity" for the full checklist.
- **Latest Next.js:** Cache Components migration opportunity? View Transitions? Routing Middleware? `vercel.ts` instead of `vercel.json`? (If the project has formally deferred a migration like Cache Components, flag opportunities but don't recommend immediate migration unless the user is already planning it.)
- **Tests:** are there critical user paths with no unit/E2E coverage? Only flag the truly load-bearing gaps; don't recommend exhaustive coverage.

Use `references/coverage-axes.md` for the full 13-axis checklist. Treat it as a "did you remember to look here?" pass before drafting findings.

### 5. Synthesize findings

Each finding has six fields. Be strict — if you can't fill all six, it's not a finding worth reporting.

```
Finding ID: C1 / H2 / M3 / L4   (severity + sequence)
Axis: one of the 13 axes
Source of truth: which architecture decision record / skill / registry entry / doc URL justifies this finding
Evidence: file:line citations
Why it matters: one sentence on the consequence if unfixed
Recommendation: what to do, at a level a Claude could execute
```

**Severity rubric:**
- **Critical (C):** breaks a hard rule from `CLAUDE.md` (e.g., `tailwind.config.js` exists, a secret/service-role key reachable from client code, default export of a component, a forbidden cross-layer call). Or causes a perf regression that violates LCP/INP/CLS budgets. Or duplicates a primitive.
- **High (H):** violates a recorded architecture decision, recreates something already in the component registry, ships needless JS to the client, or uses a deprecated Next.js pattern that has a current replacement.
- **Medium (M):** suboptimal location, missing CVA variant where a ternary exists, missing a small but valuable Next.js leverage, missing a load-bearing test.
- **Low (L):** worth noting but won't hurt anything immediately — documentation gap, naming inconsistency, opportunity to consolidate a small bit of duplication.

**Effort tag** (separately): `Quick` (<30 min), `Moderate` (half-day), `Large` (multi-day).

If the audit produces fewer than 3 findings, that's fine — say so plainly and don't pad. A clean audit is a valid result.

### 6. Group findings into phases

This is the critical design decision for AI-executability. Group findings so each phase:
- Is **independently executable** — a Claude can finish phase 1 without needing phase 2 done.
- Has **clear preconditions and verification** — what state must be true before starting, and what commands prove it's done.
- Has a **reasonable scope** — ideally 30 minutes to half a day of execution. If a single phase would touch 20+ files, split it.
- Ordered by **dependency, not severity** — sometimes a Critical finding can't be fixed until a Medium finding's refactor lands first. Make that explicit.

If the audit only has 2–3 findings, you can use a single phase. Don't manufacture phases.

**E2E-test awareness (auditor-decided per phase).** For each phase, ask: does this phase change code that's exercised by an existing end-to-end (e.g. Playwright) spec, or that's load-bearing for a critical user flow (cart, checkout, auth)? Heuristic for "yes":

- The phase renames, removes, or restructures a component used in your E2E spec folder (e.g. `tests/e2e/**`). Grep the E2E folder for the changed component/file names.
- The phase changes the public signature of a Server Action used by a critical user flow.
- The phase renames or restructures DOM elements/selectors that E2E tests target (`data-testid`, role-based queries, accessible names).
- The phase modifies route-level files (`app/.../page.tsx`, `app/.../layout.tsx`) that an E2E spec exercises.

If yes, include both of these in that phase doc:

1. **Tasks** — add an explicit task to update the affected E2E tests (selectors, fixtures, assertions). Name the spec files in the task. Don't leave this to the executor to discover.
2. **Verification** — add an E2E run scoped to the affected spec(s) (e.g. `<your package manager> exec playwright test <spec-file>`) against the local dev server or a preview deploy per your project's testing conventions.

If no — most phases — typecheck + lint + unit tests in Verification is sufficient. Don't add E2E runs to mechanical-rename phases that don't touch user-facing flows, to phases that only touch internal utilities, or to phases whose scope is registry / docs / config changes. E2E runs cost 3–10 minutes apiece; only spend that when the phase's risk actually warrants it.

### 7. Confidence check

Before writing, ask yourself: do I actually understand this code well enough to recommend changes? If there's anything load-bearing where you're guessing — a backend integration you only half-read, a Cache Components pattern you're unsure about — surface it as an `Open Question` in the doc rather than recommending something you might be wrong about.

Confidence levels for the front-matter:
- **High** — I read the relevant files, cross-checked against skills/ADRs, and I'd stake my reputation on these findings.
- **Medium** — solid on most findings; one or two have open questions documented.
- **Low** — investigated but several uncertainties; user should review before executing. (If you're at Low across the board, consider asking the user clarifying questions before writing the doc.)

### 8. Write the audit folder

Create `.claude/audits/<slug>-<YYYY-MM-DD>/` where `<slug>` is a kebab-case derivative of the target. Examples:
- `product-component-library-2026-05-27/`
- `cart-drawer-2026-06-03/`
- `product-card-2026-06-10/`

If a folder for the same slug+date already exists, append `-2`, `-3`, etc. Never overwrite.

Files inside:

```
00-overview.md              # Entry doc — read this first
01-phase-1-<slug>.md        # First phase
02-phase-2-<slug>.md        # ...etc
_status.md                  # Phase tracking — updated as phases complete
```

Use the templates in `references/`:
- `references/audit-template.md` — for `00-overview.md`
- `references/phase-template.md` — for each phase doc
- `references/status-template.md` — for `_status.md`

The templates are designed so the resulting `.md` can be pasted into a fresh Claude conversation with "execute this plan" and it just works. Don't strip the AI-coder execution instructions; they're load-bearing for that use case.

### 9. Present the four options

Once the docs are written, **always** ask the user which way to go. Use `AskUserQuestion` so this survives auto/bypass mode. The four options:

1. **Execute and fix according to plan** — enter execution mode (see § Execution Mode below).
2. **Resolve later** — save the audit and end this turn. Print the path to the overview file so the user can come back to it.
3. **Ask a question on the plan** — the user has a question. Answer it. Don't change the plan unless they then ask you to. After answering, re-present the four options.
4. **Other** — the user wants to change something about the plan. Take their input, update the relevant `.md` file(s), then re-present the four options.

Phrase the question something like: *"Audit complete. Plan saved to `.claude/audits/<slug>-<date>/00-overview.md` with N phases. How do you want to proceed?"*

## Subagent patterns (when to fan out, when to stay inline)

Subagents save tokens when **input is large and output summary is small.** Reading 25 files to return "found 3 hand-built buttons at file:line" is a clear win. Reading 25 files where the main agent needs the full content to write recommendations is overhead.

Use `Explore` subagent type — read-only, optimized for "find X / where is Y," and much cheaper than `general-purpose`. Spawn them in **parallel** by issuing all `Agent` tool calls in a single message; don't serialize them.

Four named patterns. Mix and match by scope size.

### Pattern A — Pre-scan: convention violations (medium and large scope)

One subagent runs the mechanical convention sweeps in parallel with your structural investigation. Cheap (one Explore subagent, ~2-3k tokens for the whole run) and parallelizable, so the cost is hidden behind your reading.

Brief it with: "Search `<audit scope paths>` for these convention violations and return a bulleted list with file:line citations and one-line evidence per finding. Stop at 50 findings. Patterns to look for:
1. Any `'use client'` files importing server-only modules (`server-only`, privileged/admin API clients, server-only DB clients, server-only fields of the env module)
2. Raw `process.env.*` access outside the env module (e.g. `lib/env.ts`)
3. `any` type annotations (not `: unknown`)
4. Default exports of components (anything not `page.tsx` / `layout.tsx`)
5. Hand-built primitives — `<button>`, `<input>`, `<dialog>`, custom `<div>` wrappers that recreate shadcn Button/Input/Dialog/Card/Badge/Select/Sheet/Tabs/Separator/Skeleton
6. Existence of any `tailwind.config.{js,ts}` file (emergency — should not exist in v4)
7. v3 Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`) in CSS files
8. Hardcoded hex colors in component files (`#[0-9a-f]{3,6}` outside of `globals.css`)
9. `localStorage` / `sessionStorage` usage (forbidden — use React state or server state)
10. Inline `className` ternaries longer than ~40 chars (candidate for CVA variant)
11. `../../../` relative imports (should be `@/`)
12. Files in `app/` route directories that look like components (export starts with capital, returns JSX, named neither `page` nor `layout` nor `loading` nor `error` nor `not-found` nor `template`)
13. `.tsx` component files not in PascalCase (e.g., `product-card.tsx` instead of `ProductCard.tsx`)
14. Non-component `.ts` modules in PascalCase (e.g., `FormatPrice.ts` instead of `format-price.ts`) — exclude type-only files where the convention is mixed
15. Component files in `components/<domain>/` whose component name does not start with the domain prefix (e.g., `CatalogCard.tsx` in `components/product/` — should typically be `ProductCatalogCard` or be folded into the existing `ProductCard`). Exclude files whose name matches an entry in the component registry (e.g. `components/REGISTRY.md`) — registered primitives are allowed without the prefix
16. Vestigial-qualifier file names — anything matching `New*.tsx`, `*V2.tsx`, `*Old.tsx`, `*Legacy.tsx`, `*Copy.tsx`, `*Temp.tsx`

Return format: `<rule #>` — `<file:line>` — `<one-line evidence>`. No prose."

### Pattern B — Subdomain investigation (large scope only)

Fan out one `Explore` subagent per subdomain. For a multi-domain component audit:
- Agent 1: `components/product/**`
- Agent 2: `components/cart/**`
- Agent 3: `components/checkout/**`
- Agent 4: `components/account/**`

Brief each one with: "Investigate `<paths>` against these architectural axes — report findings only, max 15 bullets, with file:line citations:
- Reuse vs. duplication: components that share >60% structure with another in the same or sibling folder
- Componentization: hand-built primitives that should be from `components/ui/`; inline className ternaries that should be CVA variants
- Logical placement: components in `app/` dirs; utilities in `components/` that belong in `lib/`
- Structural soundness: files >500 lines; circular imports; mixed concerns (data fetching + UI + business logic in one file)
- Boundary violations: client components importing server-only modules; client code reaching a privileged/admin backend API directly

Return format: bulleted list, grouped by axis. Cite component-registry entries when relevant. No prose. No recommendations — just findings."

### Pattern C — Latest-leverage sweep (axis 12 — medium and large scope)

One `Explore` subagent scoped to "is there a newer way?" findings. Cheap and naturally a search-pattern task.

Brief it with: "Search `<audit scope paths>` for opportunities to leverage newer Next.js / React 19 / Vercel features. Return bulleted findings with file:line citations:
1. `unstable_cache` usage that could become `'use cache'` (NOTE: if the project has formally deferred Cache Components migration — flag opportunity but don't push migration)
2. Manual route transition / scroll-restoration code that could use the React View Transitions API
3. Manual bot/captcha logic that could use Vercel BotID
4. Edge runtime usage on routes that should now be Fluid Compute (Node)
5. `vercel.json` files that could become `vercel.ts`
6. Provider-specific AI SDK imports (`@ai-sdk/anthropic`, `@ai-sdk/openai`) where Vercel AI Gateway with `'provider/model'` strings would be cleaner
7. Manual streaming/Suspense patterns that could use newer App Router primitives
8. `useEffect` data fetching that should be a Server Component or Server Action

Return format: `<finding type>` — `<file:line>` — `<one-line description>`. No prose."

### Pattern D — Decision-record digest (any scope that references 3+ architecture decision records)

One `Explore` subagent reads several decision records in parallel and returns one-line digests. Saves the main agent from loading 4+ full files.

Brief it with: "Read each of these architecture decision record files and return a one-line digest of what each one decides, plus a one-line note on what it forbids or constrains. Files to read: `docs/decisions/<a>.md`, `docs/decisions/<b>.md`, `docs/decisions/<c>.md`. Return format: `<record>` — decides: `<one line>`. Constraint: `<one line>`. No prose."

### Anti-patterns — when NOT to spawn

- **Small audit (<5 files).** Just read them. Briefing overhead exceeds the gain.
- **Synthesis.** Connecting findings across axes, deciding the phase plan, writing recommendations — must happen in the main agent. Subagents lack the integrated picture.
- **Execution mode** (option 1). Sequential by design — each phase verifies before the next. Fanning out defeats the verification loop.
- **"Just do the whole audit"** as one big subagent prompt. You lose the architectural lens — the main agent's job is to weigh findings against each other, not to receive a pre-written report. Subagents return findings; the main agent decides what they mean.

## Execution Mode (option 1)

If the user picks "Execute and fix according to plan," **execute the entire plan autonomously, end-to-end, with aggressive self-resolution.** The user has explicitly said: "I can always go back and revert things if I don't like it. But as it goes, if there is a better way or things missed, by all means, fix it too automatically."

That means: don't stop for plan defects, scope creep, missed findings, or fixable bugs — adapt and continue. Stop only for things that are genuinely irreversible or that require human input no Claude can supply.

### The autonomous loop

For each phase in `_status.md` order, until all reach `complete`:

1. Read `_status.md`. Find the first phase with status `pending`.
2. **Pre-flight checkpoint.** If the overview marks this phase as `Touches > 5 files`, as a structural refactor, or as touching shared/load-bearing code, invoke `/checkpoint` first. This is the user's revert path — they will use it if they don't like the result, so always create it for those categories.
3. Open the phase's `.md` file. Check preconditions.
   - If preconditions are unmet but **you can fix them yourself** (run a missing install, recreate a missing file the prior phase should have made, regenerate a missing checkpoint), do so and continue.
   - Only escalate if preconditions genuinely require something only the user can supply (a credential, an approval).
4. Update `_status.md`: phase → `in-progress`, set `startedAt`.
5. Execute the phase's tasks in order. **Use best judgment within the audit's general subject area:**
   - If you find a **better way** to accomplish the task's goal than what the phase doc literally says, take it. Log the deviation in the `_status.md` event log.
   - If you discover a **related finding** the audit missed (within the audit's subject area), fix it inline and log it. Don't ignore improvements just because they weren't pre-planned.
   - If you find a **fixable bug** while executing (actual broken behavior, not just convention), fix it and log it.
   - **Stay within the audit's subject area.** Auditing the cart? Cart, cross-sell, drawer, and their direct consumers are in scope. Touching admin routes or product detail pages the audit didn't cover is out of scope — note the observation in `_status.md` but don't fix it.
6. Run the phase's Verification commands. If any Verification step is a Manual check (e.g., "open localhost:3000 and confirm X"), pause and ask — that's an inherent escalation.
7. **If verification passes:** update `_status.md` (phase → `complete`, `completedAt` set, deviations and extra fixes noted in the event log), invoke `/commit` for this phase, move directly to the next phase. No user chatter.
8. **If verification fails — up to 3 self-heal attempts allowed:**
   - Attempt 1: read the failure output, apply the obvious fix, re-run.
   - Attempt 2: try a different angle (first attempt fixed an import; this attempt also updates the test fixture).
   - Attempt 3: broaden the fix to anything else clearly within the audit's subject area that the failure implicates.
   - If verification passes at any attempt, continue.
   - Only after 3 attempts AND when the remaining failure requires an architectural decision (a Plan A vs Plan B choice the audit didn't anticipate), escalate.
9. When all phases reach `complete`, append `audit closed — <YYYY-MM-DD HH:MM UTC>` to `_status.md`'s event log, update the `**Audit status:**` line, and give the user a **single end-of-execution summary** (format below).

### End-of-execution summary

Only this report, at the very end. Do not narrate per-phase during the run.

> **Audit executed — `<audit-slug>-<date>`**
>
> **Phases:** 3 of 3 complete.
> **Files changed:** 9 total (4 + 3 + 2 across phases).
> **Commits:** `<sha1>` Phase 1: collapse ProductCard variants; `<sha2>` Phase 2: backend total source-of-truth; `<sha3>` Phase 3: conventions + test.
> **Verification:** typecheck ✓, lint ✓, unit ✓, E2E (phase 2) ✓.
> **Checkpoints:** `checkpoint-audit-<slug>-phase1-<ts>` before phase 1's structural refactor.
> **In-flight deviations & extra fixes:**
> - Phase 1: also collapsed `CartItemSkeleton` (3 occurrences) into the new variant — wasn't in the plan but was clearly the same fix.
> - Phase 2: discovered a fourth manual-total call site in `CartCrossSell.tsx:34` not flagged in the audit; included it in this phase.
> - Phase 3: extended the unit-test coverage to include the discount-applied edge case beyond what the plan listed — matched the existing pattern.
> **Escalations during run:** none.
>
> Next steps: review diffs, push the branch, run `/commit-and-audit` if UI surface changed.

The **In-flight deviations & extra fixes** section is load-bearing. It's how the user evaluates your judgment calls — they asked for autonomy, so they need to see what you did beyond the formal plan. Be specific and concise. Empty section = "no deviations, ran the plan as written."

### Escalation triggers — the short list

Stop and ask the user **only** for these. Everything else, adapt and continue.

1. **A Manual check in the phase's Verification section.** Cannot be done autonomously by definition (visual confirmation, UX-feel judgment, anything that needs a person to open a browser).
2. **Anything touching shared / external / irreversible state without explicit pre-approval.** DB migration, force push, removing a public API surface, changing a webhook URL, modifying lockfiles, publishing a package, deleting files outside the audit scope, anything that touches production data. The user authorized changes within the audit; not changes to global infrastructure.
3. **Missing credential or external dependency.** Don't fabricate values, don't skip auth steps, don't generate fake API keys.
4. **After 3 self-heal attempts, verification still fails AND the remaining problem requires an architectural decision** — not just more code. If you've tried 3 angles and the fourth would require the user to pick between Option A and Option B, escalate.

That's it. Four triggers, all genuinely outside Claude's authority or capability.

**Things that USED to be escalations and are now self-resolve:**

- Scope creep (more files than planned) → expand and continue, log it.
- Critical finding discovered mid-flight (within the audit's subject area) → fix it, log it.
- Plan defect (the recommendation as written wouldn't work) → adapt the approach to achieve the recommendation's goal, log the deviation.
- Fixable bug discovered → fix it, log it.
- Test failure due to brittleness or due to a phase-anticipated rename → update the test, continue.
- Preconditions you can repair yourself → repair them, continue.
- "Better way" observation → take the better way, log it.

### When you escalate (the rare case)

1. Update `_status.md`: current phase stays `in-progress`, capture the escalation reason in the event log.
2. Give the user a focused report: what phase, what triggered the stop, what you tried, what decision you need.
3. **Do not unilaterally roll back.** Stopping is enough. The user decides whether to roll back via the checkpoint, fix the plan, or proceed differently.
4. After the user responds, resume autonomous execution from where you paused.

### Hard rules during autonomous execution

- **Use `/commit` per phase**, not at the end. Per-phase commits give clean rollback granularity if the user wants to revert just one phase.
- **Use `/checkpoint` before any phase the overview marks as `Touches > 5 files` or a structural refactor.** No exceptions — this is the user's revert path and they're relying on it.
- **Stay within the audit's subject area** when applying in-flight fixes. Cart audit can fix cart-adjacent things; it cannot start refactoring `app/admin/`.
- **Always log deviations and extra fixes in `_status.md`** event log. Vague entries aren't useful — say what was changed and why.
- **No per-phase chatter to the user.** Silence between phases is correct. The end-of-execution summary (with the deviations list) is the report.

## Task audit mode (`/audit-task`)

A lighter, in-session variant of the audit. Designed for the case where the user (or you) just finished a piece of work — a new component, a modal, a Server Action, a route — and wants a fast sanity check that **the work used the existing primitives, followed conventions, and didn't duplicate something already in the component registry**. Chat-only output. No `.claude/audits/` folder. No phase docs. This is the mode `/commit-and-audit` runs after staging a commit.

### When this mode triggers

- User types `/audit-task` (with or without arguments).
- User asks "audit what I just did" / "review the work I just made" / "did I follow conventions" / "self-review my recent edits."
- Trigger preemptively after you (or a sibling Claude in this thread) have shipped a non-trivial piece of new UI or backend work and the user signals they want a sanity check before committing.

If the user typed `/audit <target>` with an explicit target, that's full-audit mode — don't use this section.

### Scope derivation

Task audits don't take a typed target. The scope is derived from the current state of the working tree.

**Default scope:** uncommitted changes.

```bash
git status --porcelain                # what's modified / untracked / deleted
git diff HEAD --stat                  # line-level summary of changes in tracked files
git diff HEAD --name-only             # bare list of changed tracked files
```

Combine: changed tracked files + untracked new files (excluding `.gitignore`d patterns and the audit folder itself).

**Argument overrides:**
- `/audit-task last commit` — scope = `git diff HEAD~1 HEAD`
- `/audit-task last <N> commits` — scope = `git diff HEAD~<N> HEAD`
- `/audit-task <specific file or folder>` — scope = that path only, plus the uncommitted-changes filter
- `/audit-task --branch` — scope = `git diff main...HEAD` (everything on this branch)

**Empty scope is a valid result.** If `git status` is clean and no argument was passed, tell the user "no changes detected — nothing to audit" and stop. Don't invent things to audit.

**Self-audit folder must be excluded.** If the user's session created `.claude/audits/**` files, exclude those from the scope — auditing your own audit docs is noise.

### Fresh-eyes subagent review (mandatory in this mode)

When Claude has just made the changes itself, there's a cognitive risk: the auditing Claude has already rationalized its own choices and is unlikely to spot them as problems. To structurally avoid this, **always delegate the actual review to an `Explore` subagent** in task-audit mode — even for tiny scopes. The subagent reads the changed files fresh, with no memory of why each decision was made.

Spawn one `Explore` subagent (don't fan out unless the scope is unusually large — 8+ files). Brief it with:

> "Review the following changed files for adherence to project conventions and primitive reuse. Read each file fresh. Also read the component registry (e.g. `components/REGISTRY.md`) to know what primitives exist.
>
> Changed files: `<list>`
>
> For each file, check:
> 1. **Primitive reuse:** If the file introduces any UI primitive (Button, Input, Dialog, Card, Badge, Select, Sheet, Tabs, Separator, Skeleton, Label, Avatar, Tooltip, Dropdown), is it the shadcn primitive from `components/ui/` — or is it hand-built? Hand-built = violation.
> 2. **CVA + REGISTRY-vocabulary variants:** Any new variant logic uses `cva()` with named export and `cn()` merge; variant names use established vocabulary (`density`, `layout`, `size`, `tone`, `intent`) when they map; not inline className ternaries.
> 3. **Registry check:** If a new component was added, is the component registry updated? If something similar to the new component already exists in the registry, it's a duplication finding — flag it with the existing entry's path.
> 4. **Domain placement + naming:** Components in `components/[domain]/`, not in `app/` route dirs and not in `components/ui/`. Component name starts with the domain prefix unless it's a registered primitive. File name PascalCase for `.tsx`, kebab-case for non-component `.ts`.
> 5. **RSC discipline:** `'use client'` at the leaf, not wrapping. Server Components by default.
> 6. **Theme tokens:** Colors / spacing / fonts reference theme tokens (`var(--color-*)`, `var(--spacing-*)`, `var(--font-*)`) — no hardcoded hex.
> 7. **Env discipline:** All env access via the env module (e.g. `lib/env.ts`) — no raw `process.env`. No secret / service-role keys reachable from `'use client'`.
> 8. **Type safety:** No `any` — `unknown` and narrow. Zod validation at any external-data boundary (API routes, Server Actions accepting form input, webhook handlers).
> 9. **Export discipline:** Named exports (except `page.tsx` / `layout.tsx`). Props interface named `[ComponentName]Props` and defined above the component.
> 10. **Vestigial-qualifier names:** No `New*`, `*V2`, `*Old`, `*Legacy`, `*Copy`, `*Temp` in any new file name.
> 11. **No `localStorage` / `sessionStorage`.**
> 12. **For new API routes / Server Actions specifically:** Zod input validation present? Auth check present (if user-facing)? Webhook signature verified (if webhook)?
>
> Return format — three groups:
>
> ✅ Followed: `<one-line bullet per practice that was correctly used, with file:line citation where applicable>`
> ⚠️ Issue: `<one-line bullet per partial/concerning finding, with file:line + one-line fix suggestion>`
> ❌ Violation: `<one-line bullet per hard violation, with file:line + one-line fix suggestion>`
>
> Then a one-line verdict: clean / mostly clean / needs cleanup / needs rework.
>
> No prose. No recap of what the files do — assume the reader knows."

### Output format

Render the chat report in this six-section structure. **Much shorter than full-audit close-out** — no audit folder, no phase index.

**1. Header line.** One sentence — scope + verdict from the subagent.

> Audited my recent work: **4 files changed (+182 / −34)** → verdict: **needs cleanup** (1 violation, 3 issues, 6 practices followed).

**2. What changed.** Bulleted list, one line per changed file, with the line-delta from `git diff --stat` and a one-clause description of what the change was.

> Changes in scope:
> - [`components/cart/CartUpsellModal.tsx`](components/cart/CartUpsellModal.tsx) (new, +94) — new modal for cart upsell, triggered from CartCrossSell
> - [`components/cart/CartCrossSell.tsx`](components/cart/CartCrossSell.tsx) (+18 / −2) — added `onUpsell` callback and trigger button
> - [`components/cart/index.ts`](components/cart/index.ts) (+1) — re-export of CartUpsellModal
> - [`components/REGISTRY.md`](components/REGISTRY.md) (unchanged) — **flagged: not updated**

**3. What was checked (the "why").** 3-5 bullets naming the specific best practices the subagent verified against, each citing the source skill / decision record / registry entry. Same shape as full-audit section 3, but trimmed to what was actually relevant to this scope.

> Checked against:
> - **shadcn primitive reuse (per the component-system skill + component registry):** Any modal in this codebase uses `<Sheet>` or `<Dialog>` from `components/ui/`, not a hand-built fixed-position div.
> - **CVA variant discipline (per the component-system skill):** Visual variations go on existing primitives as `cva` axes, not as forks.
> - **RSC-leaf rule for `'use client'` (per `next-best-practices`):** Client boundary at the smallest interactive subtree.
> - **Registry currency:** Every new composed component must have a registry entry so the next AI/human discovers it before re-creating it.

**4. Findings (from the subagent).** Three short groups — followed / issues / violations. Use the subagent's own bullets. Cap at ~8 total findings; if there are more, summarize the long tail as "+N more — see full subagent output above."

> ✅ Followed:
> - Used `<Dialog>` from `components/ui/dialog` in CartUpsellModal (correct primitive)
> - Named export, props interface `CartUpsellModalProps` defined above component
> - `'use client'` only on the trigger leaf, not the modal content
>
> ⚠️ Issues:
> - [`CartUpsellModal.tsx:34`](components/cart/CartUpsellModal.tsx#L34) — inline ternary on `className` (`isPriority ? "border-accent" : "border"`); should be a CVA `tone` variant on the existing card primitive
> - [`CartUpsellModal.tsx:52`](components/cart/CartUpsellModal.tsx#L52) — hardcoded `#ff5500`; use `var(--color-accent)`
> - [`CartCrossSell.tsx:18`](components/cart/CartCrossSell.tsx#L18) — `onUpsell?: () => void` is fine but no JSDoc explaining when it fires — load-bearing for future users of this component
>
> ❌ Violations:
> - The component registry was not updated for the new CartUpsellModal — `CLAUDE.md` requires it. Future audits/AI coders will miss this component.

**5. Suggested fixes.** 3-5 bullets, each tagged `Quick` / `Moderate`. Tie each fix to the finding above. Skip phase numbers — task audits don't have phases.

> Suggested fixes:
> - Add a registry entry for `CartUpsellModal` under the `cart/` section [Quick]
> - Replace hardcoded `#ff5500` with `var(--color-accent)` in [`CartUpsellModal.tsx:52`](components/cart/CartUpsellModal.tsx#L52) [Quick]
> - Refactor the inline ternary at [`CartUpsellModal.tsx:34`](components/cart/CartUpsellModal.tsx#L34) into a `tone` CVA variant on the card primitive [Moderate]
> - Add a one-line JSDoc on `onUpsell` callback in CartCrossSell describing when it fires [Quick]

**6. Architectural note.** One sentence — either positive ("this work used the existing primitives correctly and is good to commit after the four nits") or negative ("this work duplicates `<existing thing>` — consider folding into that before committing"). If the audit is clean, say so plainly.

> Net: the modal is well-structured (correct primitive, correct location, correct export pattern); main concern is the missing registry entry, which silently makes this component invisible to future audits. Fix that plus the three nits and this is good to commit.

**7. Closing question.** Three options via `AskUserQuestion`:

1. **Apply these fixes now** — make the changes inline and report when done.
2. **Skip — I'll handle them later** — end the turn, no changes.
3. **Promote to a full `/audit`** — escalate to the heavyweight mode, writing the `.claude/audits/` folder with phased plan. Use when the findings are bigger than a quick cleanup.

### When to promote to full audit

If any of these are true, recommend option 3 (promote) in your phrasing of the question rather than steering toward option 1:

- 3 or more **violations** (❌), not just issues.
- Findings touch multiple domains (cart + product + checkout, etc.).
- A single finding requires changes in >5 files (e.g., "refactor this primitive and migrate all 8 callers").
- The work just done duplicates a major existing component or pattern — the right fix is a consolidation refactor, not a one-off cleanup.
- More than ~15 files in scope total.

In all of those, the task-audit chat report is still useful (the user sees the headline findings immediately), but the actual remediation needs the phased structure of a full audit.

### Hard rules in this mode

- **Chat-only.** Do not create `.claude/audits/<slug>-<date>/` in task-audit mode unless the user explicitly picks option 3.
- **Always fresh-eyes via subagent.** Never skip the subagent step, even on a one-file change. The cognitive separation is the whole reason this mode exists.
- **Don't manufacture findings.** A clean task audit ("all 8 checks followed, no issues, no violations") is a valid and useful result. Say "clean" and ask if the user wants to commit.
- **Don't suggest unrelated improvements.** Stay strictly within the scope of what changed. If you notice something concerning in an adjacent file that wasn't touched, note it as a one-line "scope-adjacent observation" at the bottom — don't expand the audit.
- **No naming the subagent's output verbatim if it's noisy.** Trim, group, and edit the subagent's findings into the six sections. The subagent gives you raw findings; you present a curated report.

## Important constraints

These are the things that, if violated, ruin the value of the skill:

- **The audit does not edit code.** It only writes `.md` files in `.claude/audits/`. Code edits happen only in execution mode, after the user explicitly opts in.
- **Citations are mandatory.** Every finding must point at a source of truth (an architecture decision record, a skill name, a component-registry entry, a Vercel/Next/React doc URL). "Best practice" with no source is not a finding.
- **Tech debt introduced by the solve is mandatory.** Every audit doc has a "Tech debt introduced by this plan" section. If the answer is "none," say "None — recommendations are pure removal/consolidation, no new abstractions." Don't skip the section.
- **Don't manufacture findings.** A clean audit ("0 critical, 0 high, 2 medium, 1 low") is a valid and useful result. Padding undermines trust.
- **Don't recommend changes outside the audited scope.** If during the cart audit you notice something broken in `account/`, note it as a "scope-adjacent observation" at the end of the overview, but don't draft phase work for it. Stay in scope.
- **Be honest about latest-Next.js leverage.** If a migration like Cache Components is formally deferred by a project decision record, recommend the *opportunities* but flag the deferral — don't tell the user to migrate now. The audit reports leverage opportunities; it doesn't override architectural decisions.

## Output style for the user's final message

When you finish writing the audit and present the four options, give the user a structured summary in chat — not just a pointer. The doc has the full detail; this summary tells them at a glance what just happened and whether the plan is worth their time to read. Use this exact six-section structure.

### Structure

**1. Header line.** One sentence with the target, finding counts, phase count, and confidence.

> Audited `cart drawer` → **2 critical / 4 high / 3 medium / 1 low** across **3 phases**. Confidence: **high**.

**2. Files created.** Bulleted list of every `.md` written to the audit folder, each with a one-line description of its role.

> Files written to [`.claude/audits/<slug>-<date>/`](.claude/audits/<slug>-<date>/):
> - [`00-overview.md`](...) — Entry doc: TL;DR, findings by severity, strategy, phase index, AI-coder execution instructions
> - [`01-phase-1-<slug>.md`](...) — Phase 1 (`<title>`): one-line summary of what this phase changes
> - [`02-phase-2-<slug>.md`](...) — Phase 2 (`<title>`): one-line summary
> - [`_status.md`](...) — Phase tracker, updated as you execute

**3. Best practices applied (the "why").** 3–5 bullets explaining the frames the audit checked against. **Name the technology / pattern by name** — not vague "best practices" language. Each bullet: practice → source of truth → what it meant for this specific audit. The user is technical; the specifics help.

> Frames applied:
> - **RSC-leaf rule for `'use client'` (per `next-best-practices`):** Next.js wants client boundaries at the smallest interactive subtree, not wrapping whole sections — used to find ~12kb of unnecessary client JS in the cart drawer mount.
> - **CVA variant discipline (per the component-system skill + the component-system decision record):** Visual variations belong as `cva` axes on existing primitives, not as forked components — used to spot `CartItem` / `MiniCartItem` duplication.
> - **The backend is the source of truth for data primitives (per the backend/data-source skill):** Cart totals, taxes, and discounts come from the backend's response shape — never re-derived client-side. Used to flag manual total math.
> - **Theme tokens over hex (per the Tailwind v4 skill):** All color references go through `var(--color-*)` tokens — used to spot two hardcoded brand colors in cart UI.

**4. Coverage table.** A markdown table — one row per axis. **This is the findings view AND the proposal view combined.** Don't write a parallel bullet list of findings or a separate "what I'm proposing" section — the table carries all of it. The `00-overview.md` doc has the long-form per-finding detail (evidence, citations, recommendations); the chat table is the curated view.

Columns: `#`, `Axis`, `Status`, `What it found`, `Fix`.

The Status column is an independent emoji that conveys severity/impact at a glance. The What it found column describes the finding (what's currently wrong or noteworthy). The Fix column describes what will be done about it (the action, not the finding).

### Status emoji legend

| Emoji | Status | When to use |
|-------|--------|-------------|
| ✅ | Perfect | Axis fully clean — code already follows the best practice. No changes needed. |
| ✨ | Polish | Small fix, low priority — cosmetic / nice-to-have. Safe to skip without architectural cost. |
| ⚡ | Quick win | Small fix with outsized impact — one-line or single-file change that pays off disproportionately (e.g., adding `priority` to LCP image). |
| 🔧 | Cleanup | Moderate fix, standard effort — real improvement but not transformative. The kind of fix you'd do in a normal refactor. |
| 🔥 | Big win | Major improvement / high impact — consolidations, deduplications, architectural simplifications. The wins that move the codebase forward. |
| 🚨 | Critical | Hard rule violation — must fix. Breaks a `CLAUDE.md` "Don't" rule, an architecture decision record, or a load-bearing constraint. |
| — | N/A | Axis not applicable to this audit's scope. |

Each axis row carries the **highest-severity status** among its findings. If axis 9 has both a localStorage violation (🚨) and a hex color (✨), the row shows 🚨.

### Passed-check rows ("colspan" treatment)

When a check passes (status `✅`), there's nothing to "fix" — both the What it found and Fix columns become noise if they say `—` twice. Instead, **merge the description into a single visual cell**: put the best-practice descriptor in the What it found column, naming the specific practice that's being followed, and use `—` in the Fix column to signal "no action needed." This reads as a praise row: the audit confirms what's right.

Same treatment for N/A rows (status `—`): put a one-line reason in the What it found column (`"Not applicable: <reason>"`), `—` in Fix.

### Example

> | # | Axis | Status | What it found | Fix |
> |---|------|--------|---------------|-----|
> | 1 | Next.js practices | ✅ | RSC discipline maintained at the leaf; named exports throughout; metadata defined per route; no `pages/` directory. Already follows `next-best-practices`. | — |
> | 2 | Performance | 🔥 | Cart drawer eagerly imports Framer Motion (~12kb gzip) from the shared header layout — ships on every page render, not just when the drawer opens. | Move the Framer Motion import behind `dynamic()` with `ssr: false`, gated by drawer-open state. Drops ~12kb from every-page client JS. |
> | 3 | Structural soundness | ✅ | Files cleanly scoped to single concerns; no mixed-concern modules; no circular imports detected. | — |
> | 4 | Componentization | 🔥 | `CartItem` (94 lines) and `MiniCartItem` (76 lines) duplicate ~70% of their markup — both render image, title, qty stepper, price; only layout density differs. | Collapse into one `CartItem` with `density: "default" \| "compact"` CVA variant on the existing primitive; migrate the 4 call sites. |
> | 5 | Scalability & reuse | — | Not applicable — cart drawer is single-instance infrastructure, not a parameterized/reusable surface. | — |
> | 6 | Logical placement | 🔧 | `drawer.tsx` lives in `app/(shop)/_components/` instead of `components/cart/`; leaks UI into a route directory which `CLAUDE.md` forbids. | Move file to `components/cart/CartDrawer.tsx`; update three import sites. |
> | 7 | Reuse vs duplication | 🔥 | Three call sites compute cart totals manually instead of consuming the `cart.total` the backend already returns — risks drift if the tax/discount calc changes. | Replace manual total math at the three sites with direct access to `cart.total` from the backend response. |
> | 8 | Tech debt invoked | ✅ | Plan introduces no new abstractions, no new dependencies, no transitional API states. Pure consolidation. | — |
> | 9 | Conventions + naming | 🚨 | `localStorage` used to persist drawer-open state — violates `CLAUDE.md` "Don't use localStorage" hard rule. Also one hardcoded `#ff5500` in `CartUpsellModal:52`. | Move drawer-open state into the existing cart React context (currently unused for UI state). Swap `#ff5500` for `var(--color-accent)`. |
> | 10 | AI-coder docs | 🔧 | No component-registry entry for `CartUpsellModal`, added two weeks ago — future audits and AI agents will miss the component. | Add a registry entry under the `cart/` section noting purpose and props interface. |
> | 11 | Test coverage | ✨ | `formatCartTotal` helper has no unit test despite being load-bearing for the cross-sell card's price display. | Add a unit test covering the four edge cases (zero, single item, tax-inclusive, discount-applied). |
> | 12 | Latest Next.js leverage | ✨ | Cart data is fetched per-render; could opt into `'use cache'` for static portions per Next.js Cache Components. A project decision record defers this migration. | Note as future opportunity in the registry; no action this audit (per the deferral). |
> | 13 | Additional suggestions | — | None outside the above. | — |

### Cell-writing rules

- **Be descriptive — 1–3 sentences per cell is fine.** Earlier versions were 6 words; that's too thin. The cells should give the user enough to triage without opening the doc.
- **"What it found" describes what's there** (the finding or, for ✅ rows, what's already correct). **"Fix" describes what will be done** (the action, in active voice, naming the file/component if relevant).
- **For ✅ rows:** "What it found" carries the best-practice descriptor, Fix is `—`. Together they read as a praise row.
- **For — (N/A) rows:** "What it found" carries the one-line reason, Fix is `—`.
- **One status per row** — the highest-severity finding for that axis sets the emoji.
- **If many findings under one axis** (4+ in axis 9, say): the cells consolidate. List the two or three most representative findings in "What it found," append `+N more — see overview`, and describe the unifying fix in "Fix."
- **Always show all 13 rows** even when many are ✅ or — . The empty rows ARE the message ("axes 5, 8 weren't applicable here").

**5. Plain-English summary (explain-like-I'm-5).** Right after the table, a short bulleted list that translates the action items into plain language — no jargon, or jargon explained in the same breath. One bullet per fix worth doing (skip the ✅ and — rows). Each bullet says **what's wrong and what we'll do about it, in one friendly sentence.** This is the "I don't want to read a table of technical terms to understand what's happening" view.

Rules for these bullets:
- **No unexplained jargon.** "ships ~12kb of JS" becomes "loads a big animation file." "CVA variant" becomes "one component that can be two sizes." If a technical term is unavoidable, explain it inline ("a CVA variant — basically one component that flexes between sizes").
- **Pair the problem and the fix.** "Right now X happens, which is bad because Y — so we'll do Z."
- **Keep it to one sentence per item.** If it needs two, the item is probably two items.
- **Order by impact** — the 🔥 big wins first, the ✨ polish last.
- **Skip the clean axes.** Nobody needs "and Next.js practices were already fine" in the ELI5 — the table already shows the ✅s.

> In plain English:
> - **The cart popup loads a big animation file on every single page** — even when you never open the cart. We'll make it load that file only when the cart actually opens, so every page gets faster.
> - **We accidentally built the cart row twice** — once for the full cart, once for the mini cart — and they're 70% identical. We'll merge them into one row that can be either size, so there's only one thing to maintain.
> - **Three different spots do their own math to figure out the cart total** instead of just using the total the backend already gives us. We'll have all three use the official number, so they can never disagree.
> - **The cart remembers if it's open using browser storage**, which the project rules say not to do. We'll switch it to the normal in-app way of remembering. Also fixing one color that was typed in by hand instead of using our color palette.
> - **A new popup (`CartUpsellModal`) isn't written down in our component list**, so future work might accidentally rebuild it. We'll add it to the list.
> - **A small price-formatting helper has no test**, so a future change could silently break it. We'll add a quick test.

**6. Phases at a glance.** A tiny table — one row per phase — so the user sees the shape of the work without opening any phase doc. Three columns: `Phase`, `Name`, `What it does`. The "What it does" cell is a **fragment, not a sentence** — the shortest possible plain-language gist (3–7 words). This is the "how is this broken up" view.

> | Phase | Name | What it does |
> |-------|------|--------------|
> | 1 | Collapse CartItem + lazy-load animation | merge duplicate rows, defer Framer Motion |
> | 2 | Backend total source-of-truth | use the backend's official total everywhere |
> | 3 | Conventions + test | fix storage & color, add docs + test |

If the audit produced a single phase, still show the table — one row. Don't skip it; the user uses this to gauge effort and sequencing at a glance.

**7. Architectural win.** One closing sentence on what the system gains when the plan lands. Be concrete — JS shed, files consolidated, decision-record violations removed, primitive becoming reusable elsewhere, etc. No fluff. The phase-number → finding mapping lives in the coverage table's Fix column (e.g. "Phase 1, resolves C1") inline where relevant.

> When done: cart code consolidates 6 files → 3, sheds ~12kb of client JS on every page, removes a `CLAUDE.md` violation that would have blocked the v4 audit gate, and `CartItem` becomes the canonical density-variant pattern other shared product UI can copy.

**8. Then immediately the four-option `AskUserQuestion`.** No extra prose between the architectural-win line and the question.

### Constraints on the summary

- **Don't recap each finding in detail.** The `00-overview.md` is the source of truth — bullets here are summaries, max one line each.
- **Cite tech by name in the best-practices section.** "RSC-leaf rule" beats "client boundary best practice." "the backend's `cart.total` field" beats "use the right field." Specificity is the value.
- **Always pair findings → fixes by phase number** in section 5. That's the link that makes the summary useful without opening files.
- **Don't celebrate.** No "Great audit!" / emojis / exclamation. The user wants facts, not enthusiasm.
- **If the audit is clean** (few findings, mostly low-severity), shrink the sections rather than padding. The architectural-win line shifts to something like "Audit confirms the cart pattern is solid; only stylistic nits remain." Never manufacture wins.
- **If a section is genuinely empty** (e.g., audit found no critical or high findings, so there's no big architectural win), say so plainly: "No structural wins from this plan — only convention cleanup."

## Reference files

Load these only when you need them. They're verbose by design — they exist so the SKILL.md stays short.

- `references/coverage-axes.md` — Full 13-axis checklist with what to look for under each axis. Load this before drafting findings, the first time per session.
- `references/audit-template.md` — Template for `00-overview.md`. Load when writing the doc.
- `references/phase-template.md` — Template for each phase doc. Load when writing phase docs.
- `references/status-template.md` — Template for `_status.md`. Load when initializing the status file.

If a future audit's domain isn't covered by an existing skill or architecture decision record, that's a signal to suggest creating one as a Low-severity recommendation — but only if the gap is real and recurring.
