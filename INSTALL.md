# Claude Code Next.js toolkit — install guide

A reusable `.claude/` toolkit for building Next.js sites with Claude Code: a library of skills, three safety hooks, secret-protection settings, and a track-based build/progress system. Drop it into any repo.

It's deliberately stack-light: the skills assume Next.js (App Router) and lean toward Tailwind v4 + shadcn/ui + CVA, but they're written to **adapt to whatever the host project uses** (single app or monorepo, any package manager). Nothing here is tied to a specific company, database, host, or CMS.

## What's inside

```
.claude/
├── skills/            # the skill library (see categories below)
├── commands/          # slash commands that route into the skills
├── hooks/             # 3 Node hooks: secret-exposure guard, protected-paths guard, lint-on-touch
├── settings.json      # wires the hooks + secret-protection deny rules + MCP allows
├── ROADMAP.json       # build-system macro index (ships with one example track)
├── feature-tracks/    # one folder per build track (example-track included)
├── ai-instructions/   # step-file template & build conventions
├── audits/            # output location for /audit
├── architecture/      # output location for /architect
├── improvements/      # ledger for /improve
└── CLAUDE.md          # generic working-style conventions (preference, not mechanism)
docs/
├── decisions/_template.md   # ADR template (used by the docs / architect skills)
└── runbooks/_template.md    # runbook template (used by the docs skill)
CLAUDE.md              # opinionated starter for a NEW project (root)
CLAUDE.add.md          # additive bolt-on block for an EXISTING project
INSTALL.md             # this file
```

Copy `docs/` in alongside `.claude/` — the `docs` and `architect` skills copy from these templates. If your project already has a `docs/decisions/` or `docs/runbooks/`, keep yours and skip the templates.

**Skill categories** (each is a folder under `.claude/skills/` with a `SKILL.md`):

- **On-ramps & planning:** start, adopt, brainstorm, plan
- **Build & progress:** build-orchestrator, feature-orchestrator, progress-tracker, roadmap, step-verifier, blocker-protocol, checkpoint, icebox
- **Quality & security:** audit, security, docs, web-design-guidelines, improve
- **Next.js / React / styling:** next-best-practices, next-cache-components, component-system, tailwind-v4, shadcn, vercel-react-best-practices, vercel-composition-patterns, vercel-react-view-transitions
- **Testing:** test-orchestrator, e2e-autopilot, heal
- **Performance:** lighthouse-optimize, web-perf, vercel-optimize
- **Deploy:** deploy-to-vercel, vercel-cli, vercel-cli-with-tokens
- **Architecture / debugging / authoring:** architect, debug, skill-creator

## Requirements

- **Claude Code** (the skills, commands, and hooks are Claude Code features).
- **Node.js** on PATH — the three hooks are `.mjs` scripts run as `node .claude/hooks/...`.
- Some skills use MCP servers (Playwright, Chrome DevTools, Context7, Next devtools, Vercel) — they degrade gracefully if a server isn't connected. Connect the ones you want; nothing is required for the core build/audit/security skills.

## Install A — a NEW Next.js project

1. Copy `.claude/` and `docs/` into an **empty** repo. (You don't need the starter `CLAUDE.md` — `/start` authors one against the real result; copy it too only if you want the template on hand.)
2. **Run `/start`.** Claude scaffolds the whole project: a Turborepo + pnpm monorepo (`apps/web` + shared `packages/`), latest Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui + CVA, the `lib/env` split, `components/REGISTRY.md`, gitleaks, and the secret-safety hooks — all grounded in current docs. It then authors `CLAUDE.md` against what it built, rewrites the README to read like a fresh Next.js app, **verifies the shell boots** (`pnpm install` + typecheck + lint + build), records the stack as your first ADR (`docs/decisions/0001-…`), and writes a living `docs/PROJECT.md` from your project description.
3. **Describe your project** when asked — this seeds `docs/PROJECT.md` (the living overview, kept current by `/plan` and `/build`) and the CLAUDE.md `Project` / North Star sections.
4. `/start` offers to kick off `/brainstorm` for your first feature. From there: `/brainstorm` → `/plan` → `/build`.

> **Already scaffolded the app yourself?** Use **`/adopt`** instead (Install B) — it treats your repo as the source of truth and authors the `CLAUDE.md` around what's already there, without scaffolding anything.

> **The `CLAUDE.md` structure** mirrors a proven layout: a `Project` blurb, a **North Star & Operating Principles — READ FIRST** section (the quality bar + ranked priorities that break ties), `Stack` / `Structure` / `Architecture Flow`, then the hard rules (`TypeScript`, `Tailwind v4 — CRITICAL`, `Components — STRICT RULES`, `CVA`, `Next.js`, `Environment Variables — SAFETY CRITICAL`, `File Safety`, `Performance`, `Testing`, a `Don't` list), a documentation-currency rule, the build-system section, MCP routing, and per-subsystem `Domain Rules`. `/start` and `/adopt` keep that structure and fill it with your project's facts.

You can delete `CLAUDE.add.md` and `INSTALL.md` from the project — they're only needed for distribution.

## Install B — an EXISTING project

1. Copy `.claude/` (and `docs/` if you don't already have ADR/runbook templates) into your repo root.
   - **If you already have `.claude/settings.json`:** the next step merges it for you; or merge by hand (add this toolkit's `hooks` block and `permissions.deny` entries into yours — don't overwrite).
2. **Run `/adopt`.** This is the recommended path. Claude researches the repo (package manager, framework versions, **your existing conventions**, configs, CI, deploy target), then authors a `CLAUDE.md` in the proven structure **populated with your project's real facts** — folding in any existing `CLAUDE.md`/`AGENTS.md`, keeping your conventions authoritative, wiring in the skills + secret-safety hooks, and asking you about intent (North Star, ranked priorities) and any **opt-in upgrades** (e.g. a component REGISTRY, the env-module pattern) where the toolkit is stricter than your current practice. The build/track system is opt-in — it asks. Review and tweak the result.
3. (Optional) Don't want a tracked build? Tell `/adopt` no, or delete `.claude/ROADMAP.json`, `.claude/feature-tracks/`, `.claude/ai-instructions/`, and the build/track skills + commands. The rest of the skills work standalone.
4. (Optional) Prune skills you'll never use from `.claude/skills/` (and their `.claude/commands/*.md`).

**Lighter-touch alternatives** (if you don't want `/adopt` to restructure your `CLAUDE.md`):
- **Append the bolt-on block** — copy the fenced block from `CLAUDE.add.md` into your existing root `CLAUDE.md`. Your rules stay; this just makes Claude aware of the tooling.
- **Zero-edit** — paste the "Zero-edit adoption" paragraph at the bottom of `CLAUDE.add.md` to Claude once per session, no file changes at all.

### Which command for which situation?

| You have… | Run | What it does |
|-----------|-----|--------------|
| An **empty** repo (greenfield) | `/start` | Scaffolds the whole opinionated stack (Turborepo + pnpm monorepo, latest Next.js, Tailwind v4, shadcn/CVA, gitleaks), verifies it boots, and authors `CLAUDE.md` + a living `docs/PROJECT.md`. |
| An **existing** project (its own setup, or one you scaffolded yourself) | `/adopt` | Keeps your stack & conventions; wraps the toolkit around them and authors/restructures `CLAUDE.md` into the proven format. |

## The hooks (what they enforce)

All three fail **open** (a broken hook never blocks your work) and are scoped tight:

- **`guard-protected-paths.mjs`** (PreToolUse Edit/Write) — hard-blocks edits to `.env*` secret files and dependency lockfiles. `.env.example` / `.env.sample` are allowed.
- **`guard-secret-exposure.mjs`** (PreToolUse Bash) — blocks bulk env enumeration and reading `.env*` files (content patterns a static deny rule can't catch).
- **`lint-touched-file.mjs`** (PostToolUse Edit/Write) — runs ESLint on the file you just touched and reports errors back in-flow. Finds the nearest local ESLint by walking up from the file, so it works in single-app and monorepo layouts. No local ESLint → does nothing.

## Customizing

- **Add a skill:** use the `skill-creator` skill (`"create a skill that…"`).
- **Tune triggering:** each `SKILL.md`'s frontmatter `description` is what makes Claude pick it — `skill-creator` can optimize descriptions and run evals.
- **Add a build track:** declare it in `.claude/ROADMAP.json` and scaffold `.claude/feature-tracks/<id>/` (`_STATUS.json`, `_PROGRESS.md`, numbered steps). The template is in `.claude/ai-instructions/00 - README.md`.
- **Conventions used by some skills** (`docs/decisions/` for ADRs, `docs/runbooks/`, `docs/icebox/`) are created on first use — no setup needed.
