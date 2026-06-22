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

- **Build & progress:** build-orchestrator, feature-orchestrator, progress-tracker, roadmap, step-verifier, blocker-protocol, checkpoint, icebox
- **Quality & security:** audit, security, docs, web-design-guidelines, improve
- **Next.js / React / styling:** next-best-practices, next-cache-components, component-system, tailwind-v4, shadcn, vercel-react-best-practices, vercel-composition-patterns, vercel-react-view-transitions, web-perf
- **Testing:** test-orchestrator, e2e-autopilot, heal
- **Performance:** lighthouse-optimize, vercel-optimize
- **Deploy:** deploy-to-vercel, vercel-cli, vercel-cli-with-tokens
- **Architecture / debugging / authoring:** architect, debug, skill-creator

## Requirements

- **Claude Code** (the skills, commands, and hooks are Claude Code features).
- **Node.js** on PATH — the three hooks are `.mjs` scripts run as `node .claude/hooks/...`.
- Some skills use MCP servers (Playwright, Chrome DevTools, Context7, Next devtools, Vercel) — they degrade gracefully if a server isn't connected. Connect the ones you want; nothing is required for the core build/audit/security skills.

## Install A — a NEW Next.js project

1. Copy `.claude/`, `docs/`, and the root `CLAUDE.md` into your repo root.
2. Open `CLAUDE.md`, fill in the **Project** section, confirm the **Stack** section matches your choices, and delete the intro quote block.
3. (Optional) Delete the shipped `example-track` once you add real tracks; replace `.claude/ROADMAP.json`'s example track with your own.
4. Start working. `/roadmap`, `/build`, `/audit`, `/speedtest`, etc. work immediately.

You can delete `CLAUDE.add.md` and `INSTALL.md` from the project — they're only needed for distribution.

## Install B — an EXISTING project

1. Copy `.claude/` (and `docs/` if you don't already have ADR/runbook templates) into your repo root.
   - **If you already have `.claude/settings.json`:** merge, don't overwrite. Add the `hooks` block and the `permissions.deny` entries from this toolkit's `settings.json` into yours.
   - **If you already have `.claude/CLAUDE.md`:** keep yours; this toolkit's `.claude/CLAUDE.md` is just working-style preference — copy over only the parts you want.
2. Open `CLAUDE.add.md`, copy the fenced block into your existing root `CLAUDE.md` (append it). Your project's own rules stay authoritative; this just makes Claude aware of the tooling.
3. (Optional) Don't want a tracked build? Delete `.claude/ROADMAP.json`, `.claude/feature-tracks/`, `.claude/ai-instructions/`, and the build/track skills + commands. The rest of the skills work standalone.
4. (Optional) Prune skills you'll never use from `.claude/skills/` (and their `.claude/commands/*.md`).

Prefer not to edit your `CLAUDE.md`? Use the "Zero-edit adoption" paragraph at the bottom of `CLAUDE.add.md` — paste it to Claude once per session.

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
