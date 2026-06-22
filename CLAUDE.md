# CLAUDE.md

> **Starter `CLAUDE.md` for a NEW Next.js project.** It bakes in an opinionated stack (Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui + CVA) and wires up the skills, hooks, and build system in `.claude/`. Adjust the stack rules to taste, then delete this quote block. Building onto an EXISTING project instead? Use `CLAUDE.add.md` and `INSTALL.md` — don't overwrite the project's own conventions with this file.

## Project

<One paragraph: what this project is, who it serves, the core idea. Replace this.>

## Stack

Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, shadcn/ui, CVA (class-variance-authority). Package manager: your choice (pnpm / npm / yarn / bun) — pick one and stay consistent. Deploy target: Vercel.

Add the rest of your stack here (database, auth, search, analytics, payments, etc.) as you adopt it. Keep this section current — it's the first thing Claude reads.

## TypeScript Rules

- strict mode always, no exceptions.
- Never use `any`. Use `unknown` and narrow.
- All API responses typed. Validate all external data at the boundary (e.g. with Zod).
- Named exports everywhere except `page.tsx` and `layout.tsx` (Next.js requires default there).
- One component per file; file name matches the component name.
- Props interfaces named `[ComponentName]Props`, defined above the component.
- Path aliases: `@/` maps to the app root. No `../../..` imports.

## Tailwind CSS v4 Rules — CRITICAL

This project uses Tailwind v4. These v3 patterns are WRONG and must never be used:

- NO `tailwind.config.js` / `tailwind.config.ts` — v4 is CSS-first config.
- NO `@tailwind base; @tailwind components; @tailwind utilities;` — use `@import "tailwindcss"`.
- NO `content` array — v4 auto-detects files.
- NO autoprefixer — removed in v4.
- Theme customization goes in CSS via the `@theme` directive, not JavaScript:
  ```css
  @import "tailwindcss";
  @theme {
    --color-primary: oklch(62% 0.19 264);
    --font-heading: "Inter", sans-serif;
  }
  ```
- Color variables use the `--color-*` prefix; spacing `--spacing-*`; fonts `--font-*`.
- Border default color is `currentColor` in v4 — always set explicit border colors.
- PostCSS config uses `@tailwindcss/postcss` only.

If you generate a `tailwind.config.js` or use v3 directives, that's an error — stop and fix. The `tailwind-v4` skill has the full guidance.

## Components — STRICT RULES

- BEFORE creating ANY component, read `components/REGISTRY.md` first (create it if missing — it's the index of what already exists).
- If a matching component or primitive exists: USE IT. Never recreate.
- Need a variant that doesn't exist? ADD a CVA variant to the existing component. Don't fork or duplicate.
- ALL UI primitives come from shadcn/ui. Never hand-build a button, input, dialog, card, badge, select, sheet, tabs, separator, or skeleton.
- `components/ui/` is shadcn ONLY — installed via the CLI, not hand-written.
- ALL variant logic uses CVA. No inline ternaries for `className` switching.
- New composed components are built FROM registered primitives, then registered in `REGISTRY.md`.
- Components NEVER live in `app/` route directories. Always in `components/[domain]/`.

The `component-system` and `shadcn` skills carry the full discipline.

## Next.js Rules

- App Router only. No `pages/` directory.
- React Server Components by default. Add `'use client'` only for browser APIs, hooks (useState/useEffect), event handlers, or animation libraries.
- Keep `'use client'` at leaf nodes. Never wrap large sections.
- Use `next/font` for all fonts. Never cause layout shift from font loading.
- Define image dimensions (or use `fill` with a sized container) for every image.
- Validate all API-route and Server Action input at the boundary (Zod).

The `next-best-practices` and `next-cache-components` skills read the installed Next version's docs — lean on them rather than coding Next APIs from memory.

## Environment Variables — SAFETY CRITICAL

- Route ALL env access through env modules, split by trust boundary:
  - **A client module** for `NEXT_PUBLIC_*` values (build-inlined; access by static member, e.g. `process.env.NEXT_PUBLIC_X`).
  - **A server module** (`server-only`) for secrets, validated once at boot.
- NEVER use raw `process.env` outside those modules. NEVER import the server env module from client code (`'use client'`).
- NEVER log, print, echo, or expose any environment variable value in output, errors, or comments.
- NEVER bulk-dump env vars (`printenv`, `env`, `Get-ChildItem env:`) or read `.env*` files (except `.env.example`). Enforced by the `.claude/hooks/guard-secret-exposure.mjs` hook.
- NEVER write secret values into committed files. Only `.env.local` (gitignored) and `.env.example` (empty values).

The `security` skill covers the trust boundary, validation, auth checks, webhook verification, and secret/PII scrubbing.

## File Safety Rules

- NEVER edit `.env.local`, `.env`, or any file containing secrets (the protected-paths hook blocks this).
- NEVER hand-edit the lockfile — go through your package manager (the hook blocks this too).
- BEFORE editing any config file (tsconfig, next.config, postcss), read the current contents first.
- BEFORE bulk-editing files, confirm the scope with me.

## Build System (tracks)

The build is organized as independent **tracks**, each a self-contained mini-build (`_STATUS.json` + `_PROGRESS.md` + numbered step files under `.claude/feature-tracks/<id>/`). The macro index is `.claude/ROADMAP.json`, rendered by `/roadmap`; status is **derived** from each track's `_STATUS.json` — never hand-write progress into the roadmap.

- `/roadmap` — macro picture across all tracks (read-only).
- `/build` — advance the **spine** track (the one marked `spine: true` in `.claude/ROADMAP.json`).
- `/feature <name>` — advance any track. `/status`, `/verify`, `/skip`, `/reset-step`, `/blocker` operate on the active track.
- `/future` (or `/icebox`) — capture a future idea into the backlog.

Never advance without Verification passing. Never edit a `_STATUS.json` / `_PROGRESS.md` directly — route through the `progress-tracker` skill. The step-file template and conventions live in `.claude/ai-instructions/00 - README.md`. A shipped `example-track` makes these commands work immediately — replace it with real tracks.

## Skills — reach for the right one

These live in `.claude/skills/`. Claude triggers them from their descriptions; this index is the fast map.

- **Build & progress:** `/build` (spine), `/feature <name>` (any track), `/roadmap`, `/status`, `/verify`, `/blocker`, `/checkpoint` + `/rollback`, `/future`.
- **Quality & security:** `/audit` (deep architectural review → remediation plan), `/audit-task` (review work just done), `security` (env safety, auth, validation, secrets), `web-design-guidelines` (UI/accessibility review), `/document` (ADRs & runbooks), `/improve` (route a "make this better" request).
- **Next.js, React & styling:** `next-best-practices`, `next-cache-components`, `component-system`, `tailwind-v4`, `shadcn`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`.
- **Testing:** `/test`, `/e2e <criteria>`, `/test-write`, `/test-heal`, `/heal`.
- **Performance & a11y:** `/speedtest` (Lighthouse + Core Web Vitals on a route), `web-perf`, `vercel-optimize`.
- **Deploy:** `/deploy`, `vercel-cli`, `vercel-cli-with-tokens`.
- **Architecture:** `/architect`, `/architect-deep` (strategic, cross-system decisions).
- **Debugging:** `/debug` (closed-loop runtime fix — blank page, 500, broken auth, data not loading).
- **Authoring skills:** `skill-creator` (create / improve / eval a skill).

## Don't

- Don't use `any` — use `unknown` and narrow.
- Don't create `tailwind.config.js` (Tailwind v4 is CSS-first).
- Don't use `localStorage` for app state (use React state or server state).
- Don't use CSS-in-JS, styled-components, or CSS modules.
- Don't create API routes without input validation.
- Don't use default exports except pages and layouts.
- Don't hand-build UI primitives — use shadcn/ui.
- Don't commit `.env` files with values.
