# 0001 — Two init on-ramps: `/start` (greenfield) and `/adopt` (existing)

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Taylor Vowell
- **Supersedes / Amends:** —

## Context

The toolkit had three setup-ish commands with overlapping, fuzzy roles: `/adopt` (adapt the toolkit to an existing repo), `/init-claude` (fill the `CLAUDE.md` template's placeholders from the repo), and the new greenfield need. Neither existing command actually *scaffolds* a new application — `/init-claude` assumed the app already existed and only authored `CLAUDE.md`. A user starting from an empty repo had no single command to stand up a complete, best-practice Next.js foundation, and the toolkit was deliberately neutral on repo layout, so a greenfield user got no opinionated structure at all.

We wanted exactly two clear on-ramps — one for brand-new repos, one for existing projects — and a greenfield command that produces a *running* shell, not just documentation.

## Decision

We will add a new **`/start`** command (skill + command) as the greenfield on-ramp, and keep **`/adopt`** as the existing-project on-ramp. `/start` scaffolds the whole project opinionatedly — a **Turborepo + pnpm monorepo** (`apps/web` + shared `packages/`), latest Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui + CVA, the `lib/env` split, `components/REGISTRY.md`, gitleaks, and the secret-safety hooks — grounds all versions in current docs, authors `CLAUDE.md` against the real result, rewrites the README, **verifies the shell boots**, records the stack as the first project ADR, and writes a living **`docs/PROJECT.md`** from the user's project description. It then offers to chain into `/brainstorm`.

`/init-claude` is **removed entirely** — its only job (author `CLAUDE.md` against a repo) is now covered by `/start` for greenfield repos and by `/adopt` for any repo that already has code, including one the user scaffolded themselves. The two init commands are therefore exactly `/start` and `/adopt`.

`docs/PROJECT.md` is established as the project's **living description** (documentation only — not a plan): `/plan` and `/build` keep its Planned → In progress → Shipped lists current via the documentation-discipline rule in `.claude/CLAUDE.md`.

## Options considered

1. **Two on-ramps, `/start` greenfield + `/adopt` existing (chosen)** — clear mental model; greenfield users get a complete, opinionated, booting foundation. Cost: a new skill to maintain and an opinionated stack that must be kept current.
2. **Keep `/init-claude` as a separate "author CLAUDE.md only" command** — but it overlaps `/adopt` (which already authors CLAUDE.md for existing repos), so it earned its removal rather than its keep; three setup commands is more surface than the job needs.
3. **Stay layout-neutral, document a recommended structure only** — least work, but leaves greenfield users to hand-scaffold; defeats the "ready to build on" goal.

Repo structure for `/start`: **Turborepo + pnpm** (chosen) over plain pnpm workspaces (lighter but less best-practice tooling) or single-app (rejected as the default; available as an escape hatch).

Living project doc: **dedicated `docs/PROJECT.md` + CLAUDE.md seed** (chosen) over a CLAUDE.md-only paragraph (too thin to be a living record).

## Consequences

- **Positive:** one obvious command per situation; greenfield users get a running, convention-correct shell in one step; the project's intent is captured in a living doc from day one; the whole toolkit chains (`/start` → `/brainstorm` → `/plan` → `/build`).
- **Negative / trade-offs:** the opinionated stack (Turborepo, latest Next, Tailwind v4, shadcn) must be kept current — mitigated by grounding versions in MCP docs + official scaffolders rather than hard-coding them; `docs/PROJECT.md` upkeep adds a small per-session documentation obligation.
- **Follow-ups:** `/plan` and `/build` honor the `docs/PROJECT.md` upkeep rule (added to `.claude/CLAUDE.md`); README/INSTALL now present `/start` as the new-project path.
