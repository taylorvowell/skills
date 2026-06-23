# CLAUDE.md structure — the proven skeleton

The section order and tone to produce when adopting. Keep the headers and the `READ FIRST` / `STRICT RULES` / `SAFETY CRITICAL` framing. Fill each from the project's reality (step 1 of the skill). The **default rule blocks** below are reusable verbatim ONLY where they match what the repo actually does — otherwise rewrite to the truth.

## Section order

1. `# CLAUDE.md — <Project Name>`
2. `## Project` — one paragraph: what it is, who it serves, the core idea.
3. `## North Star & Operating Principles — READ FIRST` — the quality bar + HOW-vs-WHAT stance + ranked priorities (ask the user; code can't reveal it). This is the tie-breaker when rules conflict.
4. `## Project Structure` — single app or monorepo; the apps/packages and key dirs.
5. `## Architecture Flow` — one-line data/request flow + hard boundaries. Delete if nothing non-obvious.
6. `## Stack` — pinned versions + real dependencies (from package.json).
7. `## Environments & Deploy Targets` — local/preview/prod URLs, deploy host, any trap. Delete if nothing non-obvious.
8. `## TypeScript Rules` — default block below if the project is TS-strict.
9. `## Tailwind Rules` — **match the project's version** (v4 block below only if it's really v4; otherwise write v3 or the real CSS approach).
10. `## Components` — match the project's pattern (the shadcn/CVA/REGISTRY block below only if they use it).
11. `## CVA Pattern` — only if they use CVA.
12. `## Component File Location` — the project's real component domains.
13. `## Next.js Rules` — default block below, reconciled to App Router vs pages/.
14. `## Environment Variables — SAFETY CRITICAL` — the project's real env pattern; the two-module block below is the recommended target if they want it.
15. `## File Safety Rules` — default block below.
16. `## Performance (non-negotiable)` — Core Web Vitals budgets.
17. `## Testing Discipline` — the project's test setup + CI gate + the `/test` `/e2e` commands.
18. `## Shell / Terminal` — the user's shell/OS conventions.
19. `## Don't` — the project's hard "never do this" list.
20. `## Documentation currency` — ground library APIs in current docs (next-devtools / context7).
21. `## Build System` — the track system (only if they opt in).
22. `## MCP Servers` — connected servers + routing. Delete if none.
23. `## Domain Rules` — one tight section per subsystem with hard invariants.
24. `## Skills — reach for the right one` — paste from `skills-index.md` (fitted to the stack).

## Default rule blocks (reuse only where true)

### TypeScript Rules
- strict mode always, no exceptions.
- Never use `any`. Use `unknown` and narrow.
- All API responses typed. Validate all external data at the boundary with Zod.
- Named exports everywhere except `page.tsx` / `layout.tsx`.
- One component per file; file name matches the component name.
- Props interfaces named `[ComponentName]Props`, defined above the component.
- Path aliases: `@/` maps to the app root. No `../../..` imports.

### Tailwind CSS v4 Rules — CRITICAL (only if the repo is v4)
- NO `tailwind.config.js`/`.ts` — v4 is CSS-first.
- Use `@import "tailwindcss"` (not the three `@tailwind` directives); no `content` array; no autoprefixer.
- Theme via the `@theme` directive in CSS; `--color-*` / `--spacing-*` / `--font-*` prefixes; oklch colors.
- Border default is `currentColor` — set explicit border colors. PostCSS uses `@tailwindcss/postcss` only.

### Components — STRICT RULES (only if shadcn/ui + CVA + a REGISTRY are in use)
- Read `components/REGISTRY.md` before creating any component; reuse what exists; add a CVA variant instead of forking.
- All primitives from shadcn/ui (`components/ui/` is CLI-managed, not hand-written); all variant logic via CVA.
- Register new composed components in `REGISTRY.md`; components live in `components/[domain]/`, never in `app/` route dirs.

### CVA Pattern
- `cva` + `VariantProps` from `class-variance-authority`; variants as a named export; merge with `cn()`; always set default variants.

### Next.js Rules
- App Router only. RSC by default; `'use client'` only for browser APIs/hooks/handlers/animation, kept at leaf nodes.
- ISR for cacheable content; dynamic for personalized routes. `next/font` for fonts; always size images.
- Validate API-route and Server Action input at the boundary.

### Environment Variables — SAFETY CRITICAL (recommended target pattern)
- Client `NEXT_PUBLIC_*` via a `lib/env.ts` module (build-inlined, static member access); secrets via a `server-only` `lib/env-server.ts`, validated once at boot.
- Never raw `process.env` outside those modules; never import the server module from client code.
- Never log/print/echo env values; never bulk-dump env or read `.env*` (except `.env.example`) — the hooks enforce this.
- Only `.env.local` (gitignored) and `.env.example` (empty values) — never commit secret values.

### File Safety Rules
- Never edit `.env*` or the lockfile (the hooks block this). Never delete/overwrite migrations. Read config files before editing. Confirm scope before bulk edits.

### Documentation currency
- Ground third-party library APIs in current docs before writing code against them: Next.js → the `next-devtools` MCP; everything else → the `context7` MCP (Tailwind v4 → `/tailwindlabs/tailwindcss.com`, query "v4").
