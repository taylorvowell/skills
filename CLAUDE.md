# CLAUDE.md — <Project Name>

> **Starter for a NEW Next.js project.** This mirrors a proven CLAUDE.md structure. Sections marked **🔧 FILL IN** are project-specific — run **`/init-claude`** (or paste the bootstrap prompt from `INSTALL.md`) and Claude will research the repo, fill every 🔧 placeholder, reconcile the stack rules with what's actually installed, and ask you about anything it can't infer. The unmarked sections are stack defaults (Next 16 + TypeScript strict + Tailwind v4 + shadcn/ui + CVA) — keep, edit, or delete to taste. Delete this quote block once initialized.

## Project

> 🔧 FILL IN — One paragraph: what this project is, who it serves, and the core idea. What makes it different. The single sentence you'd give a new engineer on day one.

## North Star & Operating Principles — READ FIRST

> 🔧 FILL IN — The quality bar and the philosophy that governs every decision. This is the most important section; it's the tie-breaker when rules conflict. Cover:
>
> - **The standard.** What are we building toward — a fast MVP, or a complete, production-grade product before launch? State it plainly (e.g. "build the full intended scope before launch — reliable, observable, fast, secure" vs. "ship the smallest thing that proves the idea").
> - **HOW vs WHAT.** Implement the full intended **scope** (no cut features, no skipped error-handling/security/observability) the **leanest way that completely does the job** (no speculative abstractions, no factory-for-one, no config for values that never change). When "lazy" would drop scope, scope wins.
> - **Ranked priorities** — the 3–5 things that matter most, in order. This is the sequencing tie-breaker when two pieces of work compete.
> - **(Optional) Agent-first engineering** — if it matters here: build nothing Claude can't operate via skills/commands/APIs; manual-only operations are debt.

## Project Structure

> 🔧 FILL IN — Single app or monorepo? List the top-level apps/packages and what each is (e.g. `apps/web — Next.js frontend`, `packages/shared — shared types`). For a single app, note the key top-level dirs (`app/`, `components/`, `lib/`). `/init-claude` detects this from the workspace config and directory tree.

## Architecture Flow

> 🔧 FILL IN — How data and requests move through the system, as a one-line flow (e.g. `CMS → API layer → Next.js frontend`). Note any hard boundaries ("the frontend NEVER calls X directly — always through Y"). Delete this section for a simple app with no notable data flow.

## Stack

> 🔧 FILL IN (defaults pre-seeded — confirm against `package.json`):
>
> Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, shadcn/ui, CVA. Package manager: **<detected from lockfile>**. Deploy target: Vercel.
>
> Add the rest as adopted: database, auth, search, analytics, payments, error monitoring, caching. `/init-claude` reads `package.json` and pins the real versions here.

## Environments & Deploy Targets

> 🔧 FILL IN — Where does this run? Local dev URL, preview/staging, production URL. Call out any trap (e.g. "the apex domain is a placeholder — test against the Vercel preview URL until cutover"). List the ops services you use and whether each has a CLI/MCP/skill path. Delete if there's nothing non-obvious yet.

## TypeScript Rules

- strict mode always, no exceptions.
- Never use `any`. Use `unknown` and narrow.
- All API responses typed. Validate all external data at the boundary with Zod schemas.
- Named exports everywhere except `page.tsx` and `layout.tsx` (Next.js requires default there).
- One component per file; file name matches the component name.
- Props interfaces named `[ComponentName]Props`, defined above the component.
- Path aliases: `@/` maps to the app root. No `../../..` imports.

## Tailwind CSS v4 Rules — CRITICAL

This project uses Tailwind v4. The following v3 patterns are WRONG and must never be used:

- NO `tailwind.config.js` / `tailwind.config.ts` — v4 is CSS-first config.
- NO `@tailwind base; @tailwind components; @tailwind utilities;` — use `@import "tailwindcss"`.
- NO `content` array — v4 auto-detects files.
- NO autoprefixer — removed in v4.
- Theme customization goes in CSS via the `@theme` directive, not JavaScript:
  ```css
  @import "tailwindcss";
  @theme {
    --color-primary: oklch(62% 0.19 264);
    --color-accent: oklch(65% 0.25 30);
    --font-heading: "Inter", sans-serif;
  }
  ```
- Color variables use the `--color-*` prefix (not `--primary`, not `--colors-primary`).
- Spacing variables use the `--spacing-*` prefix; font variables use `--font-*`.
- Border default color is `currentColor` in v4 (was `gray-200` in v3) — always set explicit border colors.
- PostCSS config uses `@tailwindcss/postcss` only (not `tailwindcss` + `autoprefixer`).

If you generate any `tailwind.config.js` or use v3 directives, you have made an error. Stop and fix. The `tailwind-v4` skill has the full guidance.

## Components — STRICT RULES

- BEFORE creating ANY component, read `components/REGISTRY.md` first (create it if missing — it's the index of what exists). Non-negotiable.
- If a matching component or primitive exists in the registry: USE IT. Never recreate.
- Need a variant that doesn't exist? ADD a CVA variant to the existing component. Do not fork or duplicate.
- ALL UI primitives come from shadcn/ui. Never hand-build a button, input, dialog, card, badge, select, sheet, tabs, separator, or skeleton.
- `components/ui/` is shadcn ONLY — installed via the CLI, not hand-written. Don't create files here manually.
- ALL variant logic uses CVA. No inline ternaries for `className` switching.
- New composed components are built FROM registered primitives, then registered in `REGISTRY.md`.
- After creating or modifying any component, update `components/REGISTRY.md`.
- Components NEVER live in `app/` route directories. Always in `components/[domain]/`.

The `component-system` and `shadcn` skills carry the full discipline.

## CVA Pattern (always follow)

- Import `cva` and `VariantProps` from `class-variance-authority`.
- Define variants as a named export: `export const xVariants = cva(...)`.
- Component accepts `VariantProps<typeof xVariants>` plus its own props.
- Merge classNames with `cn()` from `@/lib/utils` to allow consumer overrides.
- Always specify default variants.

## Component File Location

- `components/ui/` — shadcn primitives only (never hand-write these).
- `components/[domain]/` — composed components grouped by domain (e.g. `marketing/`, `dashboard/`, `forms/`, `content/`).
- Colocate component-specific types and hooks only if used nowhere else.

> 🔧 FILL IN — replace the example domains above with this project's real component domains once they exist.

## Next.js Rules

- App Router only. No `pages/` directory.
- React Server Components by default. Add `'use client'` only for: browser APIs, hooks (useState/useEffect), event handlers, animation libraries.
- Keep `'use client'` at leaf nodes. Never wrap large sections.
- ISR for cacheable content; dynamic for per-request/personalized routes (cart, account, dashboards).
- Edge runtime for middleware and light edge routes; Node runtime for heavy or secret-bearing operations.
- Use `next/font` for all fonts. Never cause layout shift from font loading.
- Always define image dimensions (or use `fill` with a sized container).

The `next-best-practices` and `next-cache-components` skills read the installed Next version's docs — lean on them rather than coding Next APIs from memory.

## Environment Variables — SAFETY CRITICAL

- Route ALL env access through env modules, split by trust boundary:
  - **`lib/env.ts` — client (`NEXT_PUBLIC_*`).** Exports a typed `clientEnv`. These values are build-inlined by Next — access by static member (`process.env.NEXT_PUBLIC_X`); dynamic lookups aren't inlined. (Keep this module dependency-light — it ships to the browser.)
  - **`lib/env-server.ts` — server (secrets), `server-only`, Zod-validated.** Exports `serverEnv`, validated once at boot. A bad var fails the deploy, not every visitor.
- NEVER use raw `process.env` outside these two modules. NEVER import the server env module from client code (`'use client'`).
- NEVER log, print, echo, or expose any environment variable value in output, errors, comments, or responses.
- NEVER bulk-enumerate env vars or dump secrets via tooling: no `printenv` / bare `env` / `Get-ChildItem env:`; no reading `.env*` (except `.env.example`). Enforced by `permissions.deny` + the `.claude/hooks/guard-secret-exposure.mjs` hook.
- NEVER write env values into committed files. Only `.env.local` (gitignored) and `.env.example` (empty values only).
- Server-only secrets (service-role keys, API keys) live in the server module — never in client code, never in the browser bundle.

The `security` skill covers the trust boundary, validation, auth checks, webhook verification, and secret/PII scrubbing.

## File Safety Rules

- NEVER edit `.env.local`, `.env`, or any file containing secrets (the protected-paths hook blocks this).
- NEVER hand-edit the lockfile — go through your package manager (the hook blocks this too).
- NEVER delete or overwrite migration files.
- BEFORE editing any config file (tsconfig, next.config, postcss), read the current contents first.
- BEFORE bulk-editing files, confirm the scope with me.

## Performance (non-negotiable)

LCP < 2.5s. INP < 200ms. CLS < 0.1. Check with `@next/bundle-analyzer` before adding large dependencies. The `/speedtest` (lighthouse-optimize) and `web-perf` skills audit specific routes.

## Testing Discipline

- **Test pyramid:** Vitest (unit + component, jsdom) + Vitest node (integration with MSW) + Playwright (E2E). Tests live next to the app (e.g. `tests/`).
- **Slash commands:** `/test` (run in scope), `/e2e <criteria>` (drive a headless browser with self-healing), `/test-write <description>` (author a spec), `/test-heal` (repair a failing test), `/smoke` (health + browse).
- **Agentic browser default:** the deployed preview, not localhost (append `--local` to override). Production is for `/smoke` only.
- **Golden path only for E2E** — 5–8 critical flows. Don't widen.
- **Don't test stubs.** Add tests reactively as flows ship, not against placeholders.

> 🔧 FILL IN — wire your CI gate (e.g. a `test-unit` job that blocks merges) and note it here once it exists.

## Shell / Terminal

> 🔧 FILL IN — your shell + OS conventions. Default (Taylor's setup): **PowerShell first** on Windows; fall back to Bash only when a task genuinely can't be done in PowerShell (say why). PowerShell reminders: `$env:VAR` not `$VAR`; `&&` is invalid — chain with `; if ($?) { ... }`; backtick `` ` `` is the escape/line-continuation char. On macOS/Linux, replace this with your shell.

## Don't

- Don't use `any` — use `unknown` and narrow.
- Don't use `localStorage` for app state (use React state or server state).
- Don't use CSS-in-JS, styled-components, or CSS modules.
- Don't create `tailwind.config.js` (Tailwind v4 is CSS-first).
- Don't create API routes without Zod input validation.
- Don't use default exports except pages and layouts.
- Don't hand-build UI primitives — use shadcn/ui.
- Don't commit `.env` files with values.

## Documentation currency — don't code library APIs from memory

This stack runs **ahead of model training data** (Next 16, Tailwind v4, React 19), so writing a library's API from memory is a top source of silently-wrong code. Before writing or changing code against a third-party library, **ground it in current docs**:

- **Next.js → the `next-devtools` MCP** (`nextjs_docs`) — reads the *installed* version's docs.
- **Everything else → the `context7` MCP.** For Tailwind v4 use `/tailwindlabs/tailwindcss.com` and always query with "v4". Resolve other library IDs once and pin them here.

> 🔧 FILL IN — pin the context7 IDs for this project's key libraries as you adopt them.

## Build System

The build is organized as independent **tracks**, each a self-contained mini-build (`_STATUS.json` + `_PROGRESS.md` + numbered step files under `.claude/feature-tracks/<id>/`). The macro source of truth is `.claude/ROADMAP.json`, rendered by `/roadmap`; its status rollup is **derived** from each track's `_STATUS.json` — never hand-write progress into the roadmap. The step-file template is at `.claude/ai-instructions/00 - README.md`.

- `/roadmap` — macro picture across all tracks (read-only, derived).
- `/build` — advance the **spine** track (the `spine: true` track in `ROADMAP.json`, resolved dynamically — run `/roadmap` to see which).
- `/feature <name>` — advance any track; `/status`, `/verify`, `/skip --reason="..."`, `/reset-step`, `/blocker` operate on the active track.
- `/future` (or `/icebox`) — capture a future / nice-to-have idea into the backlog.

Never advance without Verification passing. Never edit a `_STATUS.json` / `_PROGRESS.md` directly — route through the `progress-tracker` skill. Deep mechanics live in the orchestration skills (`build-orchestrator`, `feature-orchestrator`, `roadmap`, `progress-tracker`, `step-verifier`, `blocker-protocol`). A shipped `example-track` makes these commands work immediately — replace it with real tracks.

## MCP Servers

> 🔧 FILL IN — which MCP servers this project has connected (e.g. Playwright, Chrome DevTools, Context7, Next devtools, Vercel, a database, error monitoring) and the "when the task involves X → reach for MCP Y" routing. Reach for a connected MCP before hand-rolling a CLI/dashboard solution. Note: most MCP tool schemas are lazy-loaded — `ToolSearch` for a tool by server name before concluding it's unavailable. Delete this section if you use no MCP servers.

## Domain Rules

> 🔧 FILL IN — add a focused section per major subsystem as it ships (e.g. `## Commerce Rules`, `## Auth Rules`, `## The AI/Expert System`), stating the invariants that must never be violated and the primitives that must never be rebuilt. Keep each tight. Delete this placeholder once you have real ones.

## Skills — reach for the right one

These live in `.claude/skills/` and trigger from their descriptions; this is the fast map.

- **Build & progress:** `/build`, `/feature <name>`, `/roadmap`, `/status`, `/verify`, `/blocker`, `/checkpoint` + `/rollback`, `/future`.
- **Quality & security:** `/audit`, `/audit-task`, `security`, `web-design-guidelines`, `/document`, `/improve`.
- **Next.js, React & styling:** `next-best-practices`, `next-cache-components`, `component-system`, `tailwind-v4`, `shadcn`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`.
- **Testing:** `/test`, `/e2e <criteria>`, `/test-write`, `/test-heal`, `/heal`.
- **Performance & a11y:** `/speedtest`, `web-perf`, `vercel-optimize`.
- **Deploy:** `/deploy`, `vercel-cli`, `vercel-cli-with-tokens`.
- **Architecture / debugging / authoring:** `/architect`, `/architect-deep`, `/debug`, `skill-creator`.
