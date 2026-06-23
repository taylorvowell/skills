Research this repository and fill out the project's root `CLAUDE.md` — replacing every **🔧 FILL IN** placeholder with real, verified facts, and reconciling the pre-written stack rules with what's actually installed.

This is a careful, mostly-autonomous task. Do NOT guess at facts you can read; do NOT invent things you genuinely can't determine — ask the user instead. Work in this order:

## 1. Research the repo (read, don't assume)

Gather ground truth before writing anything:

- **Package manager & workspaces** — detect from the lockfile (`pnpm-lock.yaml` → pnpm, `package-lock.json` → npm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun). Check root `package.json` for `workspaces` and `pnpm-workspace.yaml` to decide single-app vs monorepo. List the apps/packages.
- **Framework versions** — read `package.json` (every workspace's, in a monorepo) for `next`, `react`, `typescript`, `tailwindcss`, plus database/auth/search/analytics/payment/error-monitoring deps. Record exact versions for the Stack section.
- **Stack reality vs the template's defaults** — confirm or correct each pre-written rule:
  - Tailwind: is it really **v4**? Check for `@tailwindcss/postcss` + `@import "tailwindcss"` (v4) vs a `tailwind.config.*` + `@tailwind` directives (v3). If v3 or not Tailwind, REWRITE that section to match — don't leave v4 rules in place falsely.
  - shadcn/ui + CVA: is there a `components.json` and `class-variance-authority` dep? If not, soften or remove the shadcn/CVA component rules.
  - App Router vs `pages/`: confirm `app/` exists.
  - Env modules: do `lib/env.ts` / `lib/env-server.ts` (or similar) exist? If a different pattern is in use, describe the real one.
- **Directory layout** — map the top-level structure (apps, `app/`, `components/`, `lib/`, `tests/`). Note real component domains under `components/` for the Component File Location section. Note whether `components/REGISTRY.md` exists.
- **Tooling & config** — `tsconfig.json` (strict? path aliases?), `next.config.*`, `postcss.config.*`, ESLint config, `.env.example` (var names only — never values), CI workflows under `.github/workflows/`, `vercel.json` or other deploy config, and the git remote (`git remote -v`) for the deploy/host.
- **Existing docs** — read `README.md`, any `docs/decisions/` ADRs, and any existing `CLAUDE.md`/`AGENTS.md` for project intent already written down.

Use parallel reads / an `Explore` agent for breadth. Read `apps/<app>/AGENTS.md` if present.

## 2. Fill the placeholders

Rewrite each section of the root `CLAUDE.md`:

- **Stack** — pin the real versions you found; list the real dependencies.
- **Project Structure / Architecture Flow** — describe what you actually found (single app vs the real monorepo layout; the real data-flow boundaries). Delete Architecture Flow if there's nothing non-obvious.
- **Component File Location** — replace the example domains with the real ones.
- **Environments & Deploy Targets / MCP Servers / Testing CI** — fill from `vercel.json`, the git remote, CI workflows, and connected MCP servers; delete a section if it genuinely doesn't apply yet.
- **Reconcile the stack-rule sections** (TypeScript, Tailwind, Components, Next.js, Env) to the truth from step 1. Correct anything the template asserts that isn't true here.
- Keep the structure and tone (the `READ FIRST`, `STRICT RULES`, `SAFETY CRITICAL`, `Don't` framing). Don't pad — every line should be a real rule or fact for THIS repo.

## 3. Ask, don't invent — for the things code can't tell you

A few sections encode intent that isn't in the code. Use `AskUserQuestion` (batch the questions) for:

- **North Star & Operating Principles** — the quality bar (full pre-launch scope vs fast MVP), the HOW-vs-WHAT stance, and the **ranked priorities** (the 3–5 things that matter most, in order). Offer sensible options but let them steer.
- **Project** — confirm the one-paragraph description if the README didn't make it obvious.
- **Domain Rules** — ask which subsystems have hard invariants worth pinning now (or defer with a note).

If the user isn't available, write your best inference from the repo and clearly mark those lines as **(assumed — confirm)** so they're easy to find later.

## 4. Finish

- Remove the intro quote block and every remaining `🔧 FILL IN` marker (each is either filled or its section deleted).
- Show a short summary of what you set (stack + versions, structure, the priorities captured) and list anything left as **(assumed — confirm)**.
- Do NOT commit. Hand the result back for review.

If a root `CLAUDE.md` doesn't exist yet, copy the starter from this toolkit first, then run this process. If one already exists and is clearly project-specific (not the starter template), don't overwrite it — instead report what's missing vs. this structure and offer to merge.
