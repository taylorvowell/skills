Bootstrap a brand-new Next.js project from an empty repo into a running, best-practice shell — then capture a living project description.

Invoke the `start` skill immediately and follow it end-to-end. This is the greenfield on-ramp — use it in an empty (or near-empty) repo.

What it does:

1. **Guards** — refuses to run if the repo already has app code (use `/adopt` for an existing project).
2. **Scaffolds** the opinionated stack: Turborepo + pnpm monorepo (`apps/web` + shared `packages/`), latest Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui + CVA, the `lib/env` split, `components/REGISTRY.md`, gitleaks, the three Claude hooks — all grounded in current docs, not from memory.
3. **Authors** the root `CLAUDE.md` against the real result, with an explicit location map, and rewrites the `README.md` to read like a fresh Next.js app.
4. **Verifies** the shell boots (`pnpm install` + typecheck + lint + build/dev) — "ready to go" is proven, not promised.
5. **Records** the stack as the first ADR and writes a living `docs/PROJECT.md` from your project description (kept current by `/plan` and `/build`).
6. **Offers** to kick off `/brainstorm` for the first feature.

Two init commands, kept straight: **`/start`** = brand-new empty repo · **`/adopt`** = existing project with real code (including one you scaffolded yourself — `/adopt` authors its `CLAUDE.md`).

It does not commit. If anything is ambiguous (project name, optional add-ons), it asks once up front, then runs through.
