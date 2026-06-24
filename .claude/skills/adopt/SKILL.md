---
name: adopt
description: Adopt this Claude Code toolkit into an EXISTING project — research the repo, then author/restructure its root CLAUDE.md into a proven structure populated with the project's real facts, wire in the skills + secret-safety hooks, and surface the toolkit's stricter defaults as opt-in upgrades. The PROJECT's conventions stay authoritative; nothing is overwritten without confirmation. Use when the user types /adopt, says "adopt the toolkit into this project", "set this existing project up to work like my other one", "wire these skills into this repo", "restructure this project's CLAUDE.md", "onboard this project to the toolkit", or asks to make an existing codebase benefit from this toolkit without changing its stack. Self-contained: everything it needs (the CLAUDE.md structure, the skills index, the hooks block) is in this skill's references/. NOT for greenfield projects adopting the opinionated stack — that's /init-claude.
---

# Adopt the toolkit into an existing project

Make an existing project work like a well-run reference project, WITHOUT steamrolling the conventions it already has. The **project is the source of truth**; the toolkit wraps around it. Read first, ask about intent and trade-offs, change nothing destructive without confirmation. Do NOT commit.

This skill is self-contained — it carries everything it writes in `references/`:
- `references/claude-md-structure.md` — the proven section skeleton + the reusable default rule blocks.
- `references/skills-index.md` — the canonical "reach for the right skill" list.
- `references/settings-hooks.json` — the hooks + `permissions.deny` block to merge if a project somehow lacks it.

It assumes the rest of the toolkit (skills, hooks, build system) is **already present** in the target project — it adds the adopt capability and the structured `CLAUDE.md`, filling only the gaps.

## 1. Research the repo (read deeply, assume nothing)

- **Package manager & workspaces** — from the lockfile (`pnpm-lock.yaml`→pnpm, `package-lock.json`→npm, `yarn.lock`→yarn, `bun.lock(b)`→bun) and `workspaces` / `pnpm-workspace.yaml`. Single app or monorepo? List apps/packages.
- **Stack & versions** — read every `package.json` for `next`, `react`, `typescript`, `tailwindcss`, and the database/auth/search/analytics/payments/error-monitoring/caching deps. Record exact versions.
- **The project's ACTUAL conventions** (mirror these, not the toolkit's defaults):
  - Tailwind v3 vs v4 (`tailwind.config.*` + `@tailwind` directives = v3; `@tailwindcss/postcss` + `@import "tailwindcss"` = v4) — or no Tailwind.
  - Component approach: shadcn/ui? a `components.json`? `class-variance-authority`? a `components/REGISTRY.md`? Or a different established pattern — describe it as it is.
  - Env handling: existing `lib/env*` modules? a different validation pattern? raw `process.env`? Describe the real one.
  - Directory layout, naming, import-alias style (`@/`?), default-vs-named-export norms, App Router vs `pages/`.
  - State management, data-fetching, testing setup (Vitest/Jest/Playwright?), CI under `.github/workflows/`.
- **Tooling/config** — `tsconfig.json` (strict?), `next.config.*`, ESLint config (its real rules), `.env.example` (var NAMES only — never values), `vercel.json`/deploy config, `git remote -v`.
- **Existing intent docs** — read `README.md`, any existing `CLAUDE.md` / `AGENTS.md` / `.cursorrules`, and any `docs/decisions/` ADRs. Preserve everything useful.

Use parallel reads / an `Explore` agent for breadth.

## 2. Author the structured CLAUDE.md (project-reality first, merge — don't clobber)

Produce a root `CLAUDE.md` using the section skeleton in `references/claude-md-structure.md`. Reuse that file's default rule blocks ONLY where they match what you found; otherwise rewrite to the project's reality.

- **Every rule reflects THIS project.** Tailwind v3 → write v3 rules (or point at the project's CSS approach); no shadcn/CVA → describe the real component pattern; different env pattern → document the real one. Never paste a default that isn't true here.
- **Fold in the existing `CLAUDE.md`/AGENTS content** — never drop a rule the project already relies on; keep its wording where it overlaps the skeleton.
- **Fill the factual sections** (Stack/versions, Structure, Architecture, Environments, Component domains, Testing/CI, MCP) from step 1.
- **Keep the tone** (`READ FIRST`, `STRICT RULES`, `SAFETY CRITICAL`, `Don't`).

## 3. Wire in the toolkit (add only what's missing)

- **Skills index** — add the section from `references/skills-index.md`, listing only skills that fit this stack (omit `tailwind-v4` on v3, shadcn guidance if unused, etc.). Note that skills adapt to the repo.
- **Secret-safety hooks** — confirm `.claude/settings.json` wires the three hooks. If the project already has a `settings.json` WITHOUT them, merge the `hooks` + `permissions.deny` entries from `references/settings-hooks.json` (show the merge); never overwrite their settings. (In the normal case the toolkit is already installed and this is a no-op check.)
- **gitleaks (optional, recommended) — check & offer to install.** The `/commit` command's secret scan prefers `gitleaks` and **falls back to a built-in regex scan if it's absent**, so this is a strength upgrade, not a requirement. Run `gitleaks version` to check. If it's missing, tell the user `/commit` still scans via regex, then offer to install the stronger scanner with the right command for their OS — `winget install gitleaks` (Windows), `brew install gitleaks` (macOS), or `scoop install gitleaks` — only running it if they say yes. If it's already present, note that and move on.
- **Build system (ASK first)** — the track-based `/build` system is opt-in. Ask if they want it. If yes and it isn't scaffolded, scaffold a first real track from their current priorities; if no, note they can ignore/remove it.
- **docs/ templates** — if they lack `docs/decisions/` / `docs/runbooks/`, offer to add the toolkit's `_template.md` files.

## 4. Ask — intent and opt-in upgrades (use AskUserQuestion, batch it)

- **North Star & Operating Principles** — the quality bar (full pre-launch scope vs fast MVP), the HOW-vs-WHAT stance, and the **ranked priorities** (3–5, in order). Code can't tell you this.
- **Project description** — confirm if the README didn't make it obvious.
- **Opt-in upgrades** — where the toolkit's defaults are stricter than current practice (a component REGISTRY, the two-module env pattern, Zod-at-every-boundary, golden-path E2E), present each as OPTIONAL: "your project doesn't do X today; want me to add it as a rule and/or set it up, or leave your current approach?" Default to leaving their approach unless they opt in.
- **Build system** — the yes/no from step 3.

## 5. Finish

- Write the merged `CLAUDE.md`. Remove any leftover `🔧 FILL IN` markers and any template intro quote block.
- Summarize: detected stack + versions, what was merged from their existing config, which toolkit pieces were wired (skills kept/omitted, hooks status, build system on/off), and any opt-in upgrades accepted/declined. Flag inferences as **(assumed — confirm)**.
- Do NOT commit. Hand it back for review.

**Guardrail:** when the toolkit's defaults and the project's established conventions disagree, **the project wins** unless the user explicitly opts into the change. This skill makes an existing project *benefit from* the toolkit — it does not convert the project to a different stack.
