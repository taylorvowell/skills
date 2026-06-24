---
name: audit
description: Post-hoc architectural audit of an existing Next.js codebase through ONE self-aware entry point. On `/audit` it first works out WHAT you mean — a just-finished build track (post-build hardening pass), the work just done in this thread, the latest feature, or a target you name — and confirms with one quick question before investigating. It routes to the right depth: a quick in-session review (chat-only, fresh-eyes — did I reuse primitives, follow conventions, avoid duplicating registered components?) or a deep audit against 13 axes (Next.js practices, performance, architecture, scalability, conventions, tests, docs, tech debt, and more), plus security + hardening lenses in post-build mode. Deep audits write findings to `.claude/audits/<slug>-<date>/`, then route fixes through tiered remediation — `/heal` for small cleanups, a `<slug>-remediation` build track for substantial ones. In-thread work is audited in a SEPARATE fresh agent so it isn't graded by the code that wrote it; the audit makes NO code changes until you opt in. Use whenever the user types `/audit` or `/audit <target>`, says "audit the X", "review X for best practices", "is the X built right", "audit what I just did", or "harden the feature I just built". Do NOT use for runtime perf MEASUREMENT (use `/speedtest`), pre-design review, standalone security-only review (use `/security-review`), or trivial lint nitpicks.
---

# Audit

You are about to perform a serious, architectural audit of something the user has already built. Your job is to find the things that will hurt scale, performance, maintainability, security, or developer velocity — not to nitpick. Then you record the findings and route the fix-up through the project's existing tooling — a quick `/heal` for small cleanups, a `<slug>-remediation` build track for substantial ones — so the work executes deterministically through the same path the rest of the build trusts, not a loop the audit hand-rolls.

## Why this skill exists

The user invokes `/audit` *after* work is built — and `/audit` is the single door for every flavor of that. Sometimes it's broad ("audit the whole product component library"), sometimes narrow ("audit the modal I just shipped"), sometimes it's "just check the work I did in this thread." One command serves all of them by first figuring out what's meant and confirming, then routing to the right depth. The goal is always the same:

> Catch architectural mistakes before they compound. Surface duplication, dead conventions, missed Next.js primitives, security holes, broken failure paths, and tech debt the original implementation didn't notice. Then — for a deep audit — produce a findings doc precise enough that an AI coder reading it later, with no prior context, understands every finding, and a remediation that runs through the project's normal tooling.

There are two depths the front door routes to (with a post-build flavor of the deep audit):

- **Quick review** — chat-only, fresh-eyes sanity check of recent in-session work. "Did I reuse the existing primitives, follow conventions, avoid duplicating registered components?" No audit folder, no phases.
- **Deep audit** — the full review (13 core axes + the hardening lenses) of a target or whole feature, ending in a findings doc at `.claude/audits/<slug>-<date>/` and a **tiered remediation**: inline `/heal` for small fix-ups, or a `<slug>-remediation` track run by `/feature` for substantial ones. In **post-build mode** (a just-finished track) the hardening lenses are all mandatory and the scope is derived exactly from the track.

Three failure modes to avoid:

1. **Nitpicking.** Surface-level lint findings are noise; the user has type-check and lint gates already. Only report things that affect architecture, performance, scalability, security, reuse, or conventions.
2. **Writing for yourself.** The findings doc must be self-contained. A future Claude reading just the `.md` file must understand every finding without the chat. No "as I mentioned above" references to chat history.
3. **Bypassing the gate.** Even when running in auto/bypass mode, you MUST stop and ask the user which option to take at the end. Never auto-execute fixes.

## Step 0 — Decide what to audit, then confirm (always do this first)

Before any reading, `/audit` works out what the user most likely wants audited and **confirms it with a single question.** This is what lets one command serve every case — there's no separate command for "audit this target" vs. "audit what I just did." Never skip the confirm: guessing wrong on a broad target burns a lot of investigation tokens, and the user wants to approve the scope before you dig in.

**Post-build entry.** When `/build` or `/feature` finishes a track, its completion sweep *offers* a post-build audit of the just-finished track with the scope pre-filled. Arriving that way, the track is already the confirmed scope — skip the candidate menu, do a single yes/no confirm, and run the deep audit in **post-build mode**: the full 13 axes **plus** the hardening lenses (§ Hardening lenses), scope derived exactly from the track, and remediation routed through the tiered system (§ Remediation — tiering). See "Post-build mode" below.

### Build the candidate list (ranked by confidence)

Gather the plausible scopes and order them most-likely-first. Signals, strongest to weakest:

0. **A just-finished track handed off by an orchestrator** — if `/build` or `/feature` just completed a track and offered the post-build audit, that track is the scope. This is the strongest signal: it's explicit, recent, and the natural moment for the audit. → **post-build mode** (deep audit + hardening lenses + remediation track).
1. **Explicit target in the argument** — `/audit ProductCard`, `/audit the cart drawer`. If present, this is almost always what they mean → top option, routes to a **deep audit**.
2. **Recent work in this thread** — if this conversation just built or edited code, or the working tree is dirty. Check it cheaply:
   ```bash
   git status --porcelain
   git diff HEAD --stat
   ```
   In-session work or a dirty tree → strong candidate, routes to a **quick review**.
3. **The latest feature** — the most recently touched build track. Resolve it:
   ```bash
   ls -t .claude/feature-tracks/*/_STATUS.json 2>/dev/null | head -1   # most-recently-modified track
   ```
   Fall back to `.claude/ROADMAP.json` for the active/spine track. Name the feature in the option → routes to a **deep audit in post-build mode** if the track is complete (a whole shipped feature warrants the hardening lenses + a remediation track); a still-in-progress track routes to an ordinary deep audit of what exists.
4. **A specific target the user will name** — always offer this as a fallback so they can redirect.

Recommendation logic (which candidate is #1 / "Recommended"):
- Handed off from a just-completed track → that track is #1 (post-build mode), and the confirm collapses to a single yes/no.
- Explicit argument present → that target is #1.
- No argument, but the thread did real code work or the tree is dirty → "recent work in this thread" is #1.
- No argument, clean tree, but a recent feature track exists → "the latest feature: `<name>`" is #1.
- Nothing to infer → make "name a target" the #1 option.

### Confirm with one question

Present the candidates with `AskUserQuestion` (one question), **highest-confidence option first and labelled "(Recommended)".** Each option's description states *what* it audits and *how deep* (quick chat review vs. full phased plan), so the user picks scope and depth in one click. Offer the 2–4 strongest candidates; the built-in "Other" lets them type a target you didn't list.

Example (no argument, dirty tree, a feature track exists):

- **Recent work in this thread** *(Recommended)* — quick fresh-eyes review of the N uncommitted files; chat-only, no plan written.
- **The latest feature: `checkout-revamp`** — deep audit of that track against the 13 axes; writes a phased plan.
- **A specific target** — name a component, folder, or subsystem; deep audit.

Ask it plainly (*"What should I audit?"*) and wait. Don't investigate before they pick. Even when an explicit target was given, still confirm — it's just pre-selected as the recommendation, so a single click proceeds.

### Route on the answer

- **A just-finished track** (orchestrator handoff, or the user picks a completed feature) → **Deep audit in post-build mode** (see "Post-build mode" below — the deep-audit workflow with hardening lenses on, scope derived from the track, remediation tiered).
- **Recent work in this thread** (or arguments like `last commit`, `last N commits`, `--branch`, "what I just did") → **Quick-review mode** (see that section).
- **The latest feature** / **a specific target** / **explicit argument** → **Deep audit** (the workflow below). For a broad target, still play back the exact paths and confirm (Deep-audit step 1).

### Post-build mode (deep audit of a just-finished track)

This is the audit the build was waiting for: a feature track is complete and now gets hardened before it compounds. It's the **deep-audit workflow below**, with four differences — all wired so the orchestrator hand-off is a single click:

1. **Scope is derived exactly from the track — don't guess folders.** Union these two sources into the file set:
   - **The track's declared surface:** read each step file's **"Files & Areas Touched"** section in `<trackRoot>/` (the paths the plan said it would touch).
   - **What actually changed:** the git diff across the track's commit range. Find the range from `<trackRoot>/_PROGRESS.md` (first → last completion entry) or the track's commit messages (e.g. `feat(<id>): …`); then `git diff <firstCommit>^..<lastCommit> --name-only`. If the range can't be resolved cleanly, fall back to `git diff main...HEAD --name-only` filtered to the track's declared surface.

   The union is the audited scope. It's far tighter and more honest than "audit `components/<domain>/**`" — it's exactly the code this feature introduced or moved.
2. **Hardening lenses are mandatory** (§ Hardening lenses) — security, rendering strategy, failure-path completeness, accessibility, cache-invalidation, config/env parity, and observability — on top of the 13 core axes. A shipped feature is exactly where these bite.
3. **Run in a SEPARATE fresh agent.** The track was almost certainly built in this same session, so the unbiased rule applies (see below). Delegate the investigation to a fresh agent that reads the diff cold.
4. **Remediation defaults to the track tier** (§ Remediation — tiering). A shipped feature's cleanup is substantial enough to deserve its own `<id>-remediation` track that `/feature` executes — not an inline heal. (If the audit comes back nearly clean — only a nit or two — drop to the inline tier; don't scaffold a track for two fixes.)

Everything else — loading ground truth, the investigation passes, synthesis, the findings doc — is the deep-audit workflow unchanged.

### Run current-session audits in a SEPARATE agent (unbiased)

When the chosen scope is **work tied to this conversation** — the recent in-thread changes, or a feature you built or edited earlier in this same session — you are the wrong one to judge it. You've already rationalized every choice and will wave past the very things an audit exists to catch. So delegate the actual reading and judgment to a **fresh agent that sees the code cold:**

- **Quick review** of in-thread work → the mandatory fresh-eyes `Explore` subagent already does this (see that section). Keep it; never review your own session's changes inline.
- **Deep audit** of a feature you built this session → spawn one fresh agent (`Explore` for read-only fan-out, or a `general-purpose` agent when it must write the audit folder) to perform the investigation and produce the findings. The orchestrator's job shrinks to relaying the confirm question, the four-option gate, and the summary — it does not supply the judgments.

If the scope is code the current thread did **not** produce (an explicit target already on disk, an older feature, the whole library), no separation is needed — investigate with the normal inline/subagent split in the workflow below.

## Deep audit — the workflow

This is the canonical sequence for a deep audit (reached from Step 0). Do not reorder. Do not skip the verification check at the end.

### 1. Parse the target

The slash argument is the target. Examples (paths are illustrative — resolve them against your Next.js app directory, whether that's the repo root for a single app or a workspace like `apps/web` in a monorepo):
- `/audit product component library` → broad: `components/{product,cart,checkout,account}/**`
- `/audit ProductCard` → narrow: `components/product/ProductCard.tsx` (+ siblings)
- `/audit modal system` → medium: `components/<domain>/**`
- `/audit recently changed files` → derive from `git diff --name-only main...HEAD`
- `/audit` (no arg) → already resolved in Step 0; you arrive here with a confirmed deep-audit target

If the target is ambiguous (e.g. "audit the search"), play it back: "Auditing `components/search/` and `app/api/search/`. Anything else?" Wait for confirmation. Don't guess on broad targets — guessing wastes a lot of investigation tokens.

### 2. Detect scope size and plan investigation

Heuristics for scope:

- **Small** — 1–5 files, one component or one tight feature. Read directly with `Read` / `Grep`. No subagents (briefing one costs more than reading inline). Still trace the data paths yourself for code-efficiency findings — small scope is no excuse to skip axis 2.
- **Medium** — one domain folder, 5–30 files. Read inline. Fire **one pre-scan subagent** for convention violations and, when the user cares about efficiency or the code has a real data layer, **one code-optimization sweep** (Pattern E) in parallel — this parallelizes the mechanical/tracing work with your structural investigation.
- **Large** — multi-domain or whole subsystem (>30 files, or "the whole component library"). **Fan out parallel `Explore` subagents** — one per subdomain, plus the pre-scan, code-optimization, and latest-leverage sweeps. The main agent stays in the architectural seat; subagents return short bulleted findings so you don't drown in code excerpts.

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

**Doc-grounding (required before any "there's a newer way" finding).** This stack runs *ahead* of training data (Next 16, Tailwind v4, React 19), so a latest-leverage finding written from memory is a top source of silently-wrong recommendations. Before claiming an API is new, deprecated, or has a better replacement, verify against the **installed version's docs** — the `next-devtools` MCP (`nextjs_docs`) for Next.js, `context7` for everything else (Tailwind v4 → `/tailwindlabs/tailwindcss.com`, query "v4"). Most MCP tool schemas are lazy-loaded — `ToolSearch` for the tool by server name before concluding it's unavailable. Cite the doc (MCP source or URL) on the finding.

**Web research:** Only go to `WebSearch` / `WebFetch` for things the local skills and MCPs don't cover. Examples: "is there a new React 19 API that obsoletes this hook?", "what's the current best practice for streaming in Next.js?" Always cite the URL in the audit doc.

### 4. Investigate

Read the target. Look at structure, not just lines. Things worth checking on every audit (this is the working set — the formal axes are in `references/coverage-axes.md`):

- **Existence check:** does something similar already exist in the component registry or elsewhere? If yes, the audit's recommendation is almost always "merge into the existing thing with a CVA variant, don't fork."
- **RSC vs client:** is `'use client'` at the leaf or wrapping a tree? Could this be a Server Component?
- **Data fetching:** is data fetched in `useEffect` when it should be RSC? Is `unstable_cache` used where `use cache` would work?
- **Code efficiency (axis 2 — dig here, don't punt to `/speedtest`):** trace each significant piece of data from fetch → transform → render and count how many times it's walked. Hunt recomputation (same sort/filter/map repeated or per-render), O(n²) `.find()`/`.includes()` inside a loop, request waterfalls (sequential `await`s with no dependency → `Promise.all`), N+1 fetches, over-fetching, and re-render churn from unstable prop/dep identities. This is *static code optimization* — speedtest measures the symptom at runtime; you find the cause in the source.
- **Variant logic:** are there inline ternaries on `className`? CVA is required.
- **Primitives:** is anything hand-built (Button, Input, Dialog, Card, Badge, Select, Sheet, Tabs, Separator, Skeleton) that should be from `components/ui/`?
- **Theme tokens:** any hardcoded hex colors? Any `tailwind.config.{js,ts}` file (emergency — Tailwind v4 is CSS-first)?
- **Env access:** any raw `process.env` outside the env module (e.g. `lib/env.ts`)?
- **Boundary correctness:** any server-only client (admin keys, service-role keys, privileged API clients) reachable from client code? Any `'use client'` file importing a server-only module?
- **Architecture fit (axis 3):** read `CLAUDE.md`'s "Architecture Flow" first, then ask — does this honor the project's data-flow boundaries (e.g. "frontend never calls X directly"), or introduce a *second, parallel* pattern for something the codebase already does one way? The test: *would a new engineer following the existing patterns have built this?* Accidental drift is a finding; a deliberate, justified deviation isn't.
- **Location:** components in `app/` route dirs (should be `components/[domain]/`)? Default exports outside `page.tsx`/`layout.tsx`?
- **Naming:** does the file/component/hook/Server Action name match the local pattern (`Product*` in `product/`, PascalCase for `.tsx`, kebab-case for non-component `.ts`, `density`/`layout`/`size` over invented variant vocabulary), AND does the name accurately describe what the thing does to a new reader? Misnames mislead grep searches and AI agents. See coverage-axes.md axis 9 "Naming consistency & clarity" for the full checklist.
- **Latest Next.js:** Cache Components migration opportunity? View Transitions? Routing Middleware? `vercel.ts` instead of `vercel.json`? (If the project has formally deferred a migration like Cache Components, flag opportunities but don't recommend immediate migration unless the user is already planning it.)
- **Tests:** are there critical user paths with no unit/E2E coverage? Only flag the truly load-bearing gaps; don't recommend exhaustive coverage.
- **Tech debt carried (axis 8):** grep the scope for deferral markers (`TODO`/`FIXME`/`HACK`/`XXX`, `@ts-ignore`/`@ts-expect-error`, `eslint-disable`, empty `catch {}`), dead code (unused exports, commented-out blocks, props no caller passes), half-done migrations (`V2`/`legacy`/`new` beside the original), and speculative abstractions (factory-for-one, config for values that never change). Run the project's dead-code tool (e.g. `knip`) over the scope if it has one. This is debt the code *already carries* — separate from debt your fix would add.

Use `references/coverage-axes.md` for the full 13-axis checklist. Treat it as a "did you remember to look here?" pass before drafting findings.

**In post-build mode, also run every Hardening lens** (next section). In an ordinary target-scoped deep audit, run the Hardening lenses that the scope warrants — security always; the rest when the scope includes routes, data fetching/mutation, or user-facing UI.

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

**Where these phases execute.** The phase grouping is the remediation plan, but the audit doesn't carry its own executor. In the **track tier**, each phase becomes a numbered **step** in the `<slug>-remediation` track — its Tasks become the step's `## Steps`, its verification (including any E2E run) becomes the step's `## Verification` that `step-verifier` runs. In the **inline tier**, the phases are just the order `/heal` works the fixes. Either way, write the phase grouping into `00-overview.md`'s remediation outline; the tier decides what becomes of it (§ Remediation — tiering and execution).

### 7. Confidence check

Before writing, ask yourself: do I actually understand this code well enough to recommend changes? If there's anything load-bearing where you're guessing — a backend integration you only half-read, a Cache Components pattern you're unsure about — surface it as an `Open Question` in the doc rather than recommending something you might be wrong about.

Confidence levels for the front-matter:
- **High** — I read the relevant files, cross-checked against skills/ADRs, and I'd stake my reputation on these findings.
- **Medium** — solid on most findings; one or two have open questions documented.
- **Low** — investigated but several uncertainties; user should review before executing. (If you're at Low across the board, consider asking the user clarifying questions before writing the doc.)

### 8. Write the findings doc

Create `.claude/audits/<slug>-<YYYY-MM-DD>/00-overview.md` — a single, self-contained **findings report** (`<slug>` is a kebab-case derivative of the target). Examples of folder names:
- `product-component-library-2026-05-27/`
- `cart-drawer-2026-06-03/`
- `checkout-revamp-remediation-2026-06-24/` (post-build)

If a folder for the same slug+date already exists, append `-2`, `-3`, etc. Never overwrite.

`.claude/audits/` is the **findings archive** — the durable evidence record (what was found, where, why, against which source of truth). It no longer carries an execution loop or a status file. Remediation is *executed* through the tiered system (§ Remediation — tiering and execution), so the folder holds just the one doc.

Use `references/audit-template.md` for `00-overview.md`. It carries: the metadata table, TL;DR, scope (the exact file set), the coverage matrix (13 axes + any hardening lenses run), findings by severity with citations, the two-way tech-debt section, the **remediation outline** (the phase grouping from step 6), and the chosen tier — with a pointer to the `<slug>-remediation` track once one is scaffolded.

### 9. Decide the tier, then present the options

First, **decide the remediation tier** (the rule is in § Remediation — tiering). Then ask the user which way to go — always via `AskUserQuestion` so it survives auto/bypass mode.

**If the audit lands in the TRACK tier** (substantial — the post-build default):

1. **Scaffold the remediation track and run it** — create the `<slug>-remediation` track, register it in `ROADMAP.json`, then hand off to `/feature <slug>-remediation`, which executes it autonomously (drift-detection, verification, `/heal` on failures, per-step commits). This is the recommended option.
2. **Scaffold the track, don't run it yet** — create the track so it shows in `/roadmap`; the user runs `/feature <slug>-remediation` when ready. Print the path.
3. **Ask a question on the findings** — answer it; don't change anything unless they then ask. Re-present.
4. **Other** — take their input, update `00-overview.md`, re-present.

Phrase it: *"Audit complete. Findings saved to `.claude/audits/<slug>-<date>/00-overview.md` — N findings across M remediation steps. Scaffold a `<slug>-remediation` track and run it?"*

**If the audit lands in the INLINE tier** (small — a nit or two, single-domain, no >5-file fix):

1. **Fix inline now** — hand the findings to `/heal` scoped to the audit's files; it applies the fixes under its guardrail and commits. Recommended for small audits.
2. **Resolve later** — save the findings doc and end. Print the path.
3. **Ask a question** — answer, re-present.
4. **Other** — edit the doc, re-present.

Never auto-execute either tier — the gate is mandatory even in bypass mode.

## Hardening lenses (post-build-mandatory, otherwise as-relevant)

These extend the 13 core axes. They're the things that pass in dev and bite in prod — exactly what a freshly-shipped feature carries. **All seven (A–G) are mandatory in post-build mode.** In an ordinary deep audit, run security always and the rest when the scope warrants. The full "what to look for" lives in `references/coverage-axes.md` (§ Hardening lenses); this is the working summary. Findings from these lenses use the same six-field shape and the same severity rubric as the core axes — they're not a separate report, just more coverage.

**A. Security** *(always — not just post-build)*. Auth/authorization checks on every user-facing route, Server Action, and API handler; Zod (or equivalent) validation at every external-data boundary; no secret/service-role key reachable from client code; webhook signature verification; no PII/secrets in logs, errors, or analytics; rate-limiting on abusable endpoints; prompt-injection defense on any LLM feature. The audit's security pass is first-class; a *standalone* security-only deep-dive is still `/security-review`'s job. **Source of truth:** the `security` skill, `CLAUDE.md` (env/security rules).

**B. Rendering strategy.** Is each route's render mode the right one — static vs dynamic vs ISR vs PPR/streaming? RSC by default with `'use client'` pushed to the leaf? Data fetched server-side (RSC / Server Action) rather than in `useEffect`? Heavy/below-the-fold client chunks behind `dynamic()`? Suspense boundaries placed so the shell paints while data streams? **Source of truth:** `next-best-practices`, `next-cache-components`, installed-version Next docs (doc-ground via the `next-devtools` MCP).

**C. Failure-path completeness.** The happy path shipped; do the failure paths exist? Check: App Router `error.tsx` / `loading.tsx` / `not-found.tsx` (and `global-error.tsx`) present where the feature's routes need them; the **three states** — loading, empty, AND error — handled on every data-driven surface, not just the populated one; Server Actions return *typed* error results instead of throwing into the void, and the UI handles rejection / rolls back optimistic updates; no empty `catch {}` that swallows a failure silently (axis 8 finds the marker — this lens asks "what *should* happen when this fails?"). **Source of truth:** `next-best-practices`, `CLAUDE.md`.

**D. Accessibility (static).** Readable-from-source a11y, distinct from the runtime Lighthouse pass: semantic HTML over `div` soup, `alt` on images, labels associated with form controls, focus management in modals/menus (trap on open, restore on close), keyboard operability of custom interactive elements, sane heading hierarchy. shadcn primitives are accessible by default — custom *compositions* are where it breaks, which is exactly what a new feature adds. **Source of truth:** `web-design-guidelines`, WCAG; hand the runtime/contrast checks to `/speedtest`.

**E. Cache-invalidation correctness.** For every mutation (Server Action / route that writes), does it invalidate the right read? `revalidatePath` / `revalidateTag` / `updateTag` (or `cacheTag` wiring) after the write, so the UI doesn't show stale data; cache keys/tags that actually match what the readers cache under. This is a top class of RSC-era bug — the read side looks correct in isolation but never refreshes. **Source of truth:** `next-cache-components`, installed-version Next docs.

**F. Config / environment parity.** Every new env var: present in `.env.example` (empty value), validated in the env module (`lib/env.ts` / `lib/env-server.ts`), and on the right side of the client/server trust boundary; no raw `process.env` outside those modules; nothing that works locally but is unset in preview/prod. **Source of truth:** the `security` skill, `CLAUDE.md` (env rules).

**G. Observability.** Can you tell in prod whether this feature works? Analytics events fired where the product needs them (the project's analytics — e.g. PostHog); error monitoring wrapping the risky paths (e.g. Sentry); logging at the right altitude (not noisy, not silent), with secrets/PII scrubbed. Matches the project's "observable" North Star. **Source of truth:** `CLAUDE.md` (North Star, MCP/observability), the connected analytics/error-monitoring services.

**Conditional lenses** (apply only when the scope calls for it — don't force them):

- **SEO / metadata depth** — for user-facing/public routes: `metadata` / `generateMetadata`, OG images, canonical URLs, structured data, sitemap/robots. Underweighted by core axis 1; surface it when the feature ships public pages. **Source:** `next-best-practices`, Next docs.
- **New-dependency justification** — did the feature pull in a redundant or heavy dependency (a second date/state library, a whole-library import where named imports would do)? Fits axis 2 (bundle) + axis 8 (debt); call it out explicitly. **Not** CVE/supply-chain scanning — that's a different tool, deliberately out of scope.

## Subagent patterns (when to fan out, when to stay inline)

Subagents save tokens when **input is large and output summary is small.** Reading 25 files to return "found 3 hand-built buttons at file:line" is a clear win. Reading 25 files where the main agent needs the full content to write recommendations is overhead.

Use `Explore` subagent type — read-only, optimized for "find X / where is Y," and much cheaper than `general-purpose`. Spawn them in **parallel** by issuing all `Agent` tool calls in a single message; don't serialize them.

Five named patterns. Mix and match by scope size.

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

Brief each one with: "Investigate `<paths>` against these architectural axes — report findings only, max 18 bullets, with file:line citations:
- Reuse vs. duplication: components that share >60% structure with another in the same or sibling folder
- Componentization: hand-built primitives that should be from `components/ui/`; inline className ternaries that should be CVA variants
- Logical placement: components in `app/` dirs; utilities in `components/` that belong in `lib/`
- Structural soundness: files >500 lines; circular imports; mixed concerns (data fetching + UI + business logic in one file)
- Architecture fit: code that bypasses the project's declared data-flow boundaries (read `CLAUDE.md` 'Architecture Flow'); or a second, parallel pattern for something the codebase already solves one way (a different fetch approach, a hand-rolled version of an existing utility/primitive)
- Code efficiency: recomputation (same sort/filter/map repeated or per-render); O(n²) `.find()`/`.includes()` inside a loop; sequential `await`s with no dependency that should be `Promise.all`; N+1 fetches; over-fetching; re-render churn from unstable prop/dep identities
- Tech debt carried: `TODO`/`FIXME`/`HACK`/`@ts-ignore`/`eslint-disable`/empty `catch {}` markers; dead code (unused exports, commented-out blocks); half-done migrations (`V2`/`legacy` beside the original); speculative abstractions (factory-for-one)
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

### Pattern E — Code-optimization sweep (axis 2 — medium and large scope)

The audit's weak spot is finding *code-level* optimization opportunities — they hide in the data layer and hot paths, not the component shells, so a structural read walks right past them. Dedicate one `Explore` subagent to *tracing data* and nothing else. This is the pattern to reach for whenever the user cares about efficiency or "is this optimized."

Brief it with: "Read `<audit scope paths>` with a single question: where does this code do more work than it needs to? Trace each significant piece of data from where it's fetched → transformed → rendered, and report inefficiencies with file:line citations:
1. Recomputation — the same sort/filter/map/derivation done more than once, or on every render, when it could be computed once and reused.
2. Algorithmic — `.find()`/`.includes()`/`.filter()` inside a `.map()` or loop over the same collection (O(n²) — a `Map`/`Set` makes it O(n)); repeated linear scans that could share one pass.
3. Request waterfalls — sequential `await`s with no data dependency between them that should be one `Promise.all`.
4. N+1 / over-fetching — a fetch per item in a loop; selecting or returning fields the caller never uses; fetching a full list just to show a count.
5. Missing dedup/caching — the same fetch issued from several places in one render tree that React `cache()` (server) or a shared loader would collapse into one.
6. Render churn — new object/array/function identities passed as props or hook deps (busts memoization); genuinely expensive derivations not memoized; state placed too high, re-rendering a large tree on every keystroke; long lists that want windowing.
7. Bundle — heavy client imports that should be `dynamic()`; whole-library/barrel imports instead of named imports.

For each finding: `<type>` — `<file:line>` — `<the waste, one line>` — `<the cheaper approach, one line>`. No prose. Do NOT report runtime metrics (LCP/INP/CLS) — that's `/speedtest`'s job; report only what's visible in the source. Be judgment-led on memoization: do not flag cheap work, only genuinely expensive or churn-causing cases."

### Pattern F — Hardening-lens sweep (post-build mode, or when the hardening lenses apply)

The hardening lenses (§ Hardening lenses) trace concerns that hide in routes, the data layer, and failure branches — a structural read walks past them, same as code-efficiency. In post-build mode, dedicate one `Explore` subagent to them (split into two — one for security+config, one for failure-path+a11y+cache+observability — only if the scope is large). This is naturally a search-pattern task, so it parallelizes cheaply behind the main agent's structural read.

Brief it with: "Read `<audit scope paths>` and report findings against these production-hardening checks, with `file:line` citations. Findings only, grouped by lens, no recommendations:
- **Security:** user-facing route / Server Action / API handler with no auth or authorization check; external input (form, params, webhook body, third-party response) used without Zod/schema validation; a secret / service-role / privileged client reachable from a `'use client'` file; webhook handler with no signature verification; secret or PII written to a log / error / analytics call; abusable endpoint with no rate limit.
- **Rendering:** `useEffect` data fetching that should be server-side; `'use client'` above the leaf; a route that should be static/ISR but is dynamic (or vice-versa); heavy client import not behind `dynamic()`; a slow `await` blocking the whole page where Suspense would stream.
- **Failure paths:** route tree missing `error.tsx` / `loading.tsx` / `not-found.tsx` where it needs them; a data surface that renders the populated state but not loading/empty/error; a Server Action that throws instead of returning a typed error; empty `catch {}`.
- **Accessibility:** non-semantic interactive elements (`onClick` on a `div`); image with no `alt`; form control with no associated label; modal/menu with no focus management; broken heading hierarchy.
- **Cache-invalidation:** a mutation (write) with no `revalidatePath`/`revalidateTag`/`updateTag` after it; a cache tag/key that doesn't match what readers cache under.
- **Config parity:** a `process.env.*` read whose var isn't in `.env.example`; raw `process.env` outside the env module; an env var used on the wrong side of the client/server boundary.
- **Observability:** a key user action with no analytics event; a risky path (payment, external call, mutation) with no error monitoring; a `console.log` that leaks a secret/PII.

Return format: `<lens>` — `<file:line>` — `<one-line evidence>`. No prose. Doc-ground any 'newer API' claim before reporting it."

### Anti-patterns — when NOT to spawn

- **Small audit (<5 files).** Just read them. Briefing overhead exceeds the gain.
- **Synthesis.** Connecting findings across axes, deciding the phase plan, writing recommendations — must happen in the main agent. Subagents lack the integrated picture.
- **Remediation execution.** Don't fan out to fix findings — inline-tier fixes go through `/heal`, track-tier fixes through `/feature` (sequential, each step verified before the next). A subagent swarm defeats the verification loop those own.
- **"Just do the whole audit"** as one big subagent prompt. You lose the architectural lens — the main agent's job is to weigh findings against each other, not to receive a pre-written report. Subagents return findings; the main agent decides what they mean.

## Remediation — tiering and execution

The audit produces findings and a phase grouping; it does **not** carry its own executor. Fixes run through the project's existing, battle-tested machinery — `/heal` for small cleanups, a build **track** + `/feature` for substantial ones. This is deliberate: the orchestrators and `/heal` already provide drift-detection, objective verification, a bounded self-heal loop, checkpoints, blocker classification, and atomic per-step state. A loop re-implemented inside the audit would be a third copy that drifts out of sync with those. Don't write one — delegate.

### Pick the tier (decide once, after synthesis)

Judge the remediation as a whole:

- **Inline tier** — the whole fix-up is small: roughly ≤2 phases' worth, single-domain, no single fix touching >5 files, and no consolidation/refactor that migrates many callers. (A nit or two on freshly-written code.) → **`/heal`**.
- **Track tier** — anything bigger: multi-phase, any fix touching >5 files, findings spanning multiple domains, or a consolidation refactor (collapse duplicates + migrate callers). This is the **post-build default** — a shipped feature's cleanup almost always lands here. → a **`<slug>-remediation` track** run by **`/feature`**.

These are the same thresholds `/heal` uses to *promote up* to `/audit`, read in reverse — so heal and audit meet cleanly at the boundary and never fight over who owns a fix.

### Inline tier → `/heal`

Hand the findings to `/heal` scoped to the audit's file set. Heal runs its fresh-eyes check + bounded 3-attempt loop under its 4-condition guardrail, never cheats to green, commits the healed unit, and logs to `.claude/heal-log.md`. The audit is done once heal converges — report what it fixed and what it surfaced-but-didn't-apply. Don't restate heal's loop or its escalation triggers here; `/heal` owns them.

### Track tier → scaffold a `<slug>-remediation` track, then `/feature`

Turn the remediation outline into a real build track, then let the orchestrator run it. Full mechanics are in `references/remediation-track.md`; the shape:

1. **Scaffold** `.claude/feature-tracks/<slug>-remediation/` — `_STATUS.json` + `_PROGRESS.md` + one numbered step file per phase, using the **same 8-section step template the whole build system uses** (`.claude/ai-instructions/00 - README.md`). Each phase's Tasks become the step's `## Steps`; each phase's verification (including any E2E run) becomes the step's `## Verification`; the findings it resolves go in the step's Overview.
2. **Register** the track in `.claude/ROADMAP.json` (`lifecycle: active`, `spine: false`, a real `phase` id, `notes` pointing back at the findings doc). Never touch `spine` — remediation is not the spine.
3. **Hand off** to **`/feature <slug>-remediation`**. The orchestrator executes it exactly like any track: drift-check, set in-progress, run the step, `step-verifier` runs `## Verification`, `/heal` on an autonomous-fix failure, `blocker-protocol` on a real blocker, `/checkpoint` before risky steps, atomic `_STATUS.json` + `_PROGRESS.md` via `progress-tracker`, one commit per run. The audit runs no steps itself.

Write the chosen tier (and, once scaffolded, the track path) into `00-overview.md` so the findings doc always points at where the work lives.

**Why a track beats the old in-audit loop:** the remediation shows up in `/roadmap`, carries real cross-session state, self-heals failures, classifies blockers, and is executed by the one code path the whole project already trusts — instead of a parallel `_status.md` and a hand-rolled loop only the audit understood. The escalation triggers, per-step commits, and checkpoint discipline that used to be spelled out here now live (once) in the orchestrator and `/heal`.

## Quick-review mode (recent in-session work)

A lighter, in-session variant of the audit, reached from Step 0 when the user picks **"recent work in this thread."** Designed for the case where the user (or you) just finished a piece of work — a new component, a modal, a Server Action, a route — and wants a fast sanity check that **the work used the existing primitives, followed conventions, and didn't duplicate something already in the component registry**. Chat-only output. No `.claude/audits/` folder. No phase docs.

### When you're in this mode

You routed here from Step 0 because the confirmed scope is recent in-session work. That happens when:

- The user picked "recent work in this thread" at the confirm question.
- The argument named recent work — `last commit`, `last N commits`, `--branch`, or phrasing like "audit what I just did" / "review the work I just made" / "did I follow conventions" / "self-review my recent edits."

If the confirmed scope is an explicit target or a feature, that's a deep audit — use the workflow above, not this section.

### Scope derivation

Quick reviews don't take a typed target. The scope is derived from the current state of the working tree.

**Default scope:** uncommitted changes.

```bash
git status --porcelain                # what's modified / untracked / deleted
git diff HEAD --stat                  # line-level summary of changes in tracked files
git diff HEAD --name-only             # bare list of changed tracked files
```

Combine: changed tracked files + untracked new files (excluding `.gitignore`d patterns and the audit folder itself).

**Argument overrides** (when the user named recent work at the front door):
- `last commit` — scope = `git diff HEAD~1 HEAD`
- `last <N> commits` — scope = `git diff HEAD~<N> HEAD`
- a `<specific file or folder>` they want reviewed as recent work — scope = that path only, plus the uncommitted-changes filter
- `--branch` — scope = `git diff main...HEAD` (everything on this branch)

**Empty scope is a valid result.** If `git status` is clean and no argument was passed, tell the user "no changes detected — nothing to audit" and stop. Don't invent things to audit.

**Self-audit folder must be excluded.** If the user's session created `.claude/audits/**` files, exclude those from the scope — auditing your own audit docs is noise.

### Fresh-eyes subagent review (mandatory in this mode)

When Claude has just made the changes itself, there's a cognitive risk: the auditing Claude has already rationalized its own choices and is unlikely to spot them as problems. To structurally avoid this, **always delegate the actual review to an `Explore` subagent** in quick-review mode — even for tiny scopes. The subagent reads the changed files fresh, with no memory of why each decision was made. (This is the "separate agent" guarantee from Step 0, made concrete.)

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

Render the chat report in this six-section structure. **Much shorter than a deep-audit close-out** — no audit folder, no phase index.

**1. Header line.** One sentence — scope + verdict from the subagent.

> Audited my recent work: **4 files changed (+182 / −34)** → verdict: **needs cleanup** (1 violation, 3 issues, 6 practices followed).

**2. What changed.** Bulleted list, one line per changed file, with the line-delta from `git diff --stat` and a one-clause description of what the change was.

> Changes in scope:
> - [`components/cart/CartUpsellModal.tsx`](components/cart/CartUpsellModal.tsx) (new, +94) — new modal for cart upsell, triggered from CartCrossSell
> - [`components/cart/CartCrossSell.tsx`](components/cart/CartCrossSell.tsx) (+18 / −2) — added `onUpsell` callback and trigger button
> - [`components/cart/index.ts`](components/cart/index.ts) (+1) — re-export of CartUpsellModal
> - [`components/REGISTRY.md`](components/REGISTRY.md) (unchanged) — **flagged: not updated**

**3. What was checked (the "why").** 3-5 bullets naming the specific best practices the subagent verified against, each citing the source skill / decision record / registry entry. Same shape as the deep-audit section 3, but trimmed to what was actually relevant to this scope.

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

**5. Suggested fixes.** 3-5 bullets, each tagged `Quick` / `Moderate`. Tie each fix to the finding above. Skip phase numbers — quick reviews don't have phases.

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
3. **Promote to a deep audit** — escalate to the heavyweight mode, writing the `.claude/audits/` folder with phased plan. Use when the findings are bigger than a quick cleanup.

### When to promote to a deep audit

If any of these are true, recommend option 3 (promote) in your phrasing of the question rather than steering toward option 1:

- 3 or more **violations** (❌), not just issues.
- Findings touch multiple domains (cart + product + checkout, etc.).
- A single finding requires changes in >5 files (e.g., "refactor this primitive and migrate all 8 callers").
- The work just done duplicates a major existing component or pattern — the right fix is a consolidation refactor, not a one-off cleanup.
- More than ~15 files in scope total.

In all of those, the quick-review chat report is still useful (the user sees the headline findings immediately), but the actual remediation needs the phased structure of a deep audit.

### Hard rules in this mode

- **Chat-only.** Do not create `.claude/audits/<slug>-<date>/` in quick-review mode unless the user explicitly picks option 3.
- **Always fresh-eyes via subagent.** Never skip the subagent step, even on a one-file change. The cognitive separation is the whole reason this mode exists.
- **Don't manufacture findings.** A clean quick review ("all 8 checks followed, no issues, no violations") is a valid and useful result. Say "clean" and ask if the user wants to commit.
- **Don't suggest unrelated improvements.** Stay strictly within the scope of what changed. If you notice something concerning in an adjacent file that wasn't touched, note it as a one-line "scope-adjacent observation" at the bottom — don't expand the audit.
- **No naming the subagent's output verbatim if it's noisy.** Trim, group, and edit the subagent's findings into the six sections. The subagent gives you raw findings; you present a curated report.

## Important constraints

These are the things that, if violated, ruin the value of the skill:

- **The audit does not edit code.** The audit phase only writes the findings doc in `.claude/audits/`. Code edits happen only during remediation — inline `/heal` or the `<slug>-remediation` track via `/feature` — after the user explicitly opts in at the gate.
- **Citations are mandatory.** Every finding must point at a source of truth (an architecture decision record, a skill name, a component-registry entry, a Vercel/Next/React doc URL). "Best practice" with no source is not a finding.
- **The tech-debt axis is mandatory in both directions.** Every audit doc has a "Tech debt — carried and introduced" section. Hunt the debt the code *already carries* (markers, dead code, speculative abstractions, half-done migrations) and own the debt your *fix* would add. If either is empty, say so plainly ("None — scope carried no markers or dead code"; "None — recommendations are pure removal/consolidation, no new abstractions"). Don't skip the section.
- **Don't manufacture findings.** A clean audit ("0 critical, 0 high, 2 medium, 1 low") is a valid and useful result. Padding undermines trust.
- **Don't recommend changes outside the audited scope.** If during the cart audit you notice something broken in `account/`, note it as a "scope-adjacent observation" at the end of the overview, but don't draft phase work for it. Stay in scope.
- **Be honest about latest-Next.js leverage.** If a migration like Cache Components is formally deferred by a project decision record, recommend the *opportunities* but flag the deferral — don't tell the user to migrate now. The audit reports leverage opportunities; it doesn't override architectural decisions.

## Output style for the user's final message

When you finish writing the audit and present the four options, give the user a structured summary in chat — not just a pointer. The doc has the full detail; this summary tells them at a glance what just happened and whether the plan is worth their time to read. Use this exact six-section structure.

### Structure

**1. Header line.** One sentence with the target, finding counts, phase count, and confidence.

> Audited `cart drawer` → **2 critical / 4 high / 3 medium / 1 low** across **3 phases**. Confidence: **high**.

**2. What was written, and where remediation will run.** The findings doc, plus — if the audit scaffolded a remediation track — the track location. One line each.

> Findings: [`.claude/audits/<slug>-<date>/00-overview.md`](.claude/audits/<slug>-<date>/00-overview.md) — TL;DR, scope, coverage matrix, findings by severity with citations, tech-debt, remediation outline.
>
> Remediation tier: **track** → [`.claude/feature-tracks/<slug>-remediation/`](.claude/feature-tracks/<slug>-remediation/) (M steps), registered in `/roadmap`. Run it with `/feature <slug>-remediation`.
>
> _(Inline tier instead: "Remediation tier: **inline** → `/heal` over the N files; no track.")_

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
> | 2 | Performance & code optimization | 🔥 | Cart drawer eagerly imports Framer Motion (~12kb gzip) from the shared header layout — ships on every page render, not just when the drawer opens. Cart totals are also re-summed client-side every render instead of using the backend `cart.total`. | Move the Framer Motion import behind `dynamic()` with `ssr: false`, gated by drawer-open state (−12kb every-page JS); use `cart.total` instead of the per-render reduce. |
> | 3 | Structural soundness & arch fit | ✅ | Files cleanly scoped to single concerns; no mixed-concern modules; no circular imports; data flows through the API layer per the project's Architecture Flow — no boundary bypass, no competing fetch pattern. | — |
> | 4 | Componentization | 🔥 | `CartItem` (94 lines) and `MiniCartItem` (76 lines) duplicate ~70% of their markup — both render image, title, qty stepper, price; only layout density differs. | Collapse into one `CartItem` with `density: "default" \| "compact"` CVA variant on the existing primitive; migrate the 4 call sites. |
> | 5 | Scalability & reuse | — | Not applicable — cart drawer is single-instance infrastructure, not a parameterized/reusable surface. | — |
> | 6 | Logical placement | 🔧 | `drawer.tsx` lives in `app/(shop)/_components/` instead of `components/cart/`; leaks UI into a route directory which `CLAUDE.md` forbids. | Move file to `components/cart/CartDrawer.tsx`; update three import sites. |
> | 7 | Reuse vs duplication | 🔥 | Three call sites compute cart totals manually instead of consuming the `cart.total` the backend already returns — risks drift if the tax/discount calc changes. | Replace manual total math at the three sites with direct access to `cart.total` from the backend response. |
> | 8 | Tech debt (carried + introduced) | ✅ | Scope carried no `TODO`/`HACK`/`@ts-ignore` markers, no dead exports, no half-done migrations; plan adds no new abstractions, dependencies, or transitional API states. Pure consolidation. | — |
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

- `references/coverage-axes.md` — Full checklist: the 13 core axes + the hardening lenses (A–G), with what to look for under each. Load before drafting findings, the first time per session.
- `references/audit-template.md` — Template for the findings doc `00-overview.md`. Load when writing the doc.
- `references/remediation-track.md` — How to scaffold a `<slug>-remediation` track (track tier). Load when the remediation lands in the track tier and the user opts to scaffold it.

If a future audit's domain isn't covered by an existing skill or architecture decision record, that's a signal to suggest creating one as a Low-severity recommendation — but only if the gap is real and recurring.
