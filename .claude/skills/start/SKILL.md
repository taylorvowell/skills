---
name: start
description: Bootstrap a BRAND-NEW Next.js project from an empty repo into a running, well-structured, best-practice shell ready to build on — then capture a living project description. Use when the user types /start, or says "start a new project", "set up a new Next.js app", "scaffold a fresh repo", "spin up a new project", "create a new Next.js monorepo", "bootstrap from scratch", "kick off a blank repo", or is sitting in an empty/near-empty repository and wants a complete, opinionated Next.js foundation stood up. This is the greenfield on-ramp: it SCAFFOLDS the actual app (latest Next.js, Turborepo + pnpm monorepo, TypeScript strict, Tailwind v4, shadcn/ui, CVA, gitleaks, env-module split, folder structure, REGISTRY), authors the CLAUDE.md against the real result, verifies the shell boots, records the stack as the first ADR, writes a living docs/PROJECT.md from the user's description, and offers to /brainstorm the first feature. NOT for an existing project that already has app code — that's /adopt (adapt the toolkit to whatever's there, including a repo you scaffolded yourself).
---

# Start — scaffold a brand-new Next.js project

This is the **greenfield on-ramp**. The user is at an empty (or near-empty) repo and wants a complete, opinionated, *running* Next.js foundation — not a CLAUDE.md describing a project that doesn't exist yet, but the actual project. When `/start` finishes, they have a monorepo shell that boots, follows every convention this toolkit assumes, knows where everything lives, and is documented well enough that any later skill (`/brainstorm`, `/plan`, `/build`) lands work in the right place.

There are exactly two init commands; keep them straight:

- **`/start`** (this) — brand-new project, empty repo → scaffold the whole thing.
- **`/adopt`** — existing project with real code (including one you scaffolded yourself) → adapt the toolkit to it and author its `CLAUDE.md`, project stays authoritative.

## The opinionated defaults (this is the point — don't re-litigate them)

A greenfield project *should* be opinionated; that's the value. Scaffold with these unless the user overrides:

- **Turborepo + pnpm monorepo** — `apps/web` (the Next.js app) plus shared `packages/` (UI, config, types). pnpm workspaces; Turborepo task pipeline.
- **Latest Next.js**, App Router, React Server Components by default.
- **TypeScript strict**, `@/` path alias, named exports (except `page.tsx`/`layout.tsx`).
- **Tailwind v4** — CSS-first (`@import "tailwindcss"`, `@theme`, `@tailwindcss/postcss`); NO `tailwind.config.js`, NO v3 directives.
- **shadcn/ui** for primitives + **CVA** for variants; a `components/REGISTRY.md` index.
- **Env split** — `lib/env.ts` (client) / `lib/env-server.ts` (server, `server-only`, Zod-validated) + `.env.example`.
- **gitleaks** installed for the `/commit` secret scan; the three Claude hooks active.

## Ground every version in CURRENT docs — do not scaffold from memory

This stack runs ahead of training data (Next, Tailwind v4, React 19). Writing a scaffolding command or a library API from memory is the top source of silently-wrong setup. Before scaffolding, confirm the current shape of the tools you're about to run:

- **Next.js** → the `next-devtools` MCP (`nextjs_docs`) once Next is installed; for the create step, use the official scaffolder rather than hand-writing config.
- **Everything else** → the `context7` MCP (Tailwind v4: `/tailwindlabs/tailwindcss.com`, query with "v4"; Turborepo, shadcn — resolve and use latest).
- Prefer official scaffolders (`create-turbo`, `shadcn init`) at `@latest` over hand-rolled file trees — they track best practice. Layer the toolkit's conventions on top of what they produce.

---

## Phase 0 — Preflight (guard before you touch anything)

1. **Confirm it's a greenfield repo.** Acceptable to find: `.git/`, the toolkit's `.claude/`, `docs/` templates, a stub `README.md`, `LICENSE`, `.gitignore`. If you find **app code** (a `package.json` with `next`, an `app/`/`src/`, an existing lockfile) → **stop** and tell the user this looks like an existing project; `/adopt` is the right command. `/start` never clobbers existing work.
2. **Check prerequisites.** `node -v` (need a current LTS+), `git`, and pnpm. If pnpm is missing, enable it via Corepack (`corepack enable pnpm`) rather than a global install. Note anything the user must fix before proceeding.
3. **Confirm name + any extras (one tight question round).** Ask for the project / app name, and offer optional add-ons (database, auth, testing harness, error monitoring) — default to **none** so the shell stays lean; the user can add them later via `/plan`. Don't over-ask; the structural decisions are already made above.

## Phase 1 — Scaffold the monorepo

1. **Create the Turborepo + pnpm workspace** with the official scaffolder, then prune it to a clean base: `apps/web` (Next.js, App Router, TS) and shared `packages/` (e.g. `ui`, `config`/eslint+ts-config, `types`). Keep it lean — one app, the shared packages it actually needs.
2. **Pin TypeScript strict** and the `@/` path alias in the app's `tsconfig`. No `../../..` imports.
3. **Tailwind v4** in `apps/web` — `@import "tailwindcss"` in the app's global CSS, `@theme` for tokens, `@tailwindcss/postcss` in PostCSS. Do **not** create a `tailwind.config.*`. (Lean on the `tailwind-v4` skill.)
4. **shadcn/ui** — `shadcn init` in `apps/web` (or the shared `ui` package if you centralize primitives); add `class-variance-authority` and the `cn()` util. (Lean on the `shadcn` and `component-system` skills.)

## Phase 2 — Wire conventions, structure & safety

- **Env split** — create `lib/env.ts` (typed `clientEnv`, `NEXT_PUBLIC_*` only) and `lib/env-server.ts` (`server-only`, Zod-validated `serverEnv`). Add `.env.example` (names only, no values); ensure `.env.local` is gitignored. (Lean on the `security` skill.)
- **Component registry** — create `components/REGISTRY.md` (the index every component skill reads first) and the domain-folder convention (`components/[domain]/`, `components/ui/` = shadcn only).
- **Claude hooks** — confirm `.claude/settings.json` wires the three hooks (`guard-protected-paths`, `guard-secret-exposure`, `lint-touched-file`) and the secret-protection `permissions.deny`. They ship with the toolkit; verify they're present.
- **gitleaks** — install it for the `/commit` scan (`winget install gitleaks` / `brew install gitleaks` / `scoop install gitleaks`); confirm with `gitleaks version`. If the user declines, note `/commit` falls back to its regex scan.
- **Lint/format & gitignore** — ESLint + Prettier via Turbo's shared config; a complete `.gitignore` (node_modules, `.next`, `.env*` except `.env.example`, Turbo cache, etc.).

## Phase 3 — Author CLAUDE.md against the real result

Now that the project actually exists, author the root `CLAUDE.md`. Copy the toolkit's starter `CLAUDE.md` template (the one shipped at the repo root, with its `🔧 FILL IN` markers) as the structure, then fill every section with real, verified facts from what you just scaffolded — and remove the intro quote block and every remaining `🔧 FILL IN` marker (each is either filled or its section deleted). The repo's facts are real now, so this is grounded, not guesswork:

- **Stack** — pin the exact versions you installed (Next, React, TypeScript, Tailwind, etc.) and list the real dependencies.
- **Project Structure / Architecture Flow** — describe the actual monorepo layout (`apps/web`, the shared `packages/`) and any real data-flow boundaries.
- **Reconcile the stack-rule sections** (TypeScript, Tailwind v4, Components, Next.js, Env) to the truth of what you set up — never leave a default rule that isn't true here.
- **Keep the tone** (`READ FIRST`, `STRICT RULES`, `SAFETY CRITICAL`, `Don't`). Every line is a real rule or fact for THIS repo.

**Make the location map explicit.** The whole reason later skills work is that CLAUDE.md tells Claude where everything lives — the apps/packages, where components go (`components/[domain]/`, `ui/` = shadcn), where env access is allowed (the two modules only), where tests live, where the build tracks live. Document it precisely; this is what keeps every future change landing in the right place.

For the **North Star & ranked priorities** (intent code can't reveal), ask the user — but you can defer the deep version until Phase 6, since the project description there feeds it.

## Phase 4 — Update the README

Rewrite `README.md` so the repo reads like a fresh Next.js application: what it is (one line, refined in Phase 6), the stack, how to run it (`pnpm install`, `pnpm dev`, the dev URL), the monorepo layout, and where things live. Replace any toolkit-starter boilerplate; this README is now the project's, not the toolkit's.

## Phase 5 — Verify it boots (prove "ready to go")

"Ready to build on" must be demonstrated, not asserted:

1. `pnpm install` cleanly.
2. Typecheck + lint pass (the project's scripts).
3. `pnpm build` (or boot `pnpm dev` once) and confirm the shell renders without errors.

If anything fails, fix it before declaring done — a shell that doesn't boot isn't a foundation. Report the green result and the dev URL.

## Phase 6 — Capture the project description (the living doc)

Ask the user to **describe the project** — what it is, who it's for, the core idea, what makes it different. This is for **documentation**, so the project (and Claude) always know what's being built. Then:

1. **Write `docs/PROJECT.md`** — the living overview (format below). This is the canonical "what are we building" record.
2. **Seed CLAUDE.md** — fill the `## Project` paragraph and the `## North Star & Operating Principles` from the description (plus the quality bar / ranked priorities you ask for). CLAUDE.md is the always-loaded contract; `docs/PROJECT.md` is the fuller living narrative.

`docs/PROJECT.md` is a **living document** — it's kept current as the project grows. The doc-discipline (in `.claude/CLAUDE.md`) directs `/plan` and `/build` to move features between its **Planned → In progress → Shipped** lists as work flows, so the overview never goes stale.

### `docs/PROJECT.md` format

```markdown
---
title: <Project name>
status: active
created: <today's date, YYYY-MM-DD>
updated: <today's date, YYYY-MM-DD>
---

# <Project name>

**One-liner.** <what it is, in a sentence>

## What it is
<the core idea, fleshed out — for documentation>

## Who it's for
<the users / audience>

## What makes it different
<the angle / differentiator>

## Features
> Kept current by /plan and /build as work flows through the tracks.

### Shipped
- <built and verified features>

### In progress
- <features with an active track>

### Planned
- <features that are planned but not started>

## Stack
<one-line pointer to CLAUDE.md for the authoritative stack; note monorepo layout>

## Current focus
<what's being worked on right now>
```

## Phase 7 — Record the stack as the first ADR

Write the stack-and-structure ADR — `docs/decisions/NNNN-initial-stack-and-structure.md` (from `docs/decisions/_template.md`), where `NNNN` is the **next free number** after any ADRs already in `docs/decisions/` (use `0001` only if the directory has none). Don't hard-code `0001`: the toolkit ships its own design ADRs that may have been copied in alongside the templates, so a fixed number would collide — and those toolkit-internal ADRs aren't this project's; delete any that were copied into `docs/decisions/` before writing yours. Capture the decision to use the Turborepo + pnpm monorepo, latest Next.js, Tailwind v4, shadcn/CVA, the env split, gitleaks — with the options considered and trade-offs. The stack choice is exactly an architectural decision; capture the *why* from day one so it can be revisited later.

## Phase 8 — Hand off into the build

Don't dead-end at an empty shell. Offer the natural next step:

> Your project shell is up and boots (`pnpm dev` → <url>). Want to start shaping the first feature? Say **`GO`** and I'll kick off `/brainstorm`, or run `/plan <feature>` when you're ready.

On **GO** → invoke the `brainstorm` skill, seeded with the project description, to flesh out the first feature. This makes the whole arc one on-ramp: `/start` → describe → `/brainstorm` → `/plan` → `/build`.

---

## Hard rules

- **Never run in a non-empty project.** App code present → stop, route to `/adopt`. `/start` is greenfield-only and must not clobber.
- **Ground versions in current docs.** Use the MCP docs + official scaffolders; never write Next/Tailwind/Turbo config from memory.
- **Prove it boots** before declaring done (Phase 5). A non-booting shell is a failure, not a deliverable.
- **`docs/PROJECT.md` is documentation, not a plan.** It records what's being built; it doesn't decompose work into steps (that's `/plan`) and doesn't execute (that's `/build`).
- **Do NOT commit.** Hand the scaffolded, booting project back for review.
