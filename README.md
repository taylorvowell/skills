# Claude Code toolkit for Next.js

A drop-in `.claude/` toolkit that makes Claude Code build Next.js projects the way a well-run team does: a structured `CLAUDE.md`, secret-safety hooks, a library of focused skills, and — the heart of it — a **track-based build system** that plans work, executes it one verified step at a time, and keeps a durable record of the plan and its progress.

Stack-light by design: it assumes Next.js (App Router) and leans toward Tailwind v4 + shadcn/ui + CVA, but every skill **adapts to whatever the host project actually uses** — single app or monorepo, any package manager. Nothing is tied to a specific company, database, or host.

---

## Quick start

### Add it to an EXISTING project

1. Copy `.claude/` (and `docs/` if you don't already have ADR/runbook templates) into your repo root.
2. Run **`/adopt`**.

`/adopt` researches your repo — package manager, framework versions, your existing conventions, configs, CI, deploy target — then writes a `CLAUDE.md` in the proven structure **populated with your project's real facts**, folding in any `CLAUDE.md`/`AGENTS.md` you already have. It wires in the skills and secret-safety hooks, and asks you about the things code can't reveal (your North Star, your ranked priorities) and any opt-in upgrades. **Your conventions stay authoritative — nothing is overwritten without confirmation.**

### Start a NEW project

1. Copy `.claude/`, `docs/`, and the root `CLAUDE.md` into your repo root.
2. Run **`/init-claude`**.

`/init-claude` adopts the opinionated stack (Next 16, TypeScript strict, Tailwind v4, shadcn/ui, CVA) and fills the `CLAUDE.md` template's blanks from the repo, asking you about intent where needed.

> Full install details, settings-merge notes, and lighter-touch options are in [`INSTALL.md`](INSTALL.md).

---

## What you get

- **A structured `CLAUDE.md`** — a `READ FIRST` North Star (your quality bar + ranked priorities that break ties), the stack, hard rules (TypeScript, Tailwind, components, env safety), a `Don't` list, and a skills index. It's the always-loaded contract Claude follows.
- **Secret-safety hooks** (active automatically) — block editing `.env*`/lockfiles, block dumping env vars or reading secret files, and lint each file you touch. All fail-open, so they never wedge your work.
- **A skill library** — focused capabilities Claude reaches for by intent: audit, security review, performance, testing, deploy, debugging, architecture, and more.
- **The build system** — the part that makes long projects manageable. ↓

---

## The build system — plan, track, execute

Work is organized into **tracks**. A track is a self-contained mini-build: a goal, a numbered list of steps, and its own status. The big picture lives in one roadmap; each track tracks its own progress; Claude advances a track **one verified step at a time** and never moves on until the step's checks pass.

```
.claude/
├── ROADMAP.json                      # the macro plan: every track, its goal, phase, dependencies
└── feature-tracks/
    └── <track-id>/
        ├── _STATUS.json              # machine-readable progress (which step, done/blocked)
        ├── _PROGRESS.md              # human-readable log, append-only
        └── 01 - Title.md, 02 - …     # numbered step files: scope + verification per step
```

**Why this matters:**

- **Plans are durable.** The roadmap and step files are real files in your repo, versioned in git — not a chat you lose. You can stop, come back next week, and `/roadmap` tells you exactly where you are.
- **Progress is derived, never faked.** `/roadmap` computes status from each track's `_STATUS.json` — it can't drift from reality.
- **Every step is verified.** A step isn't "done" until its verification command (typecheck, lint, tests) passes. Broken state can't silently compound across steps.
- **It documents as it goes.** Decisions become ADRs (`docs/decisions/`), procedures become runbooks (`docs/runbooks/`), and future ideas get parked in a backlog (`docs/icebox/`) instead of lost.

### The commands that drive it

| Command                                                        | What it does                                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plan <feature>`                                              | **Plan a new feature** — decompose it into verified steps and scaffold a track. (`/plan add-step <track> <what>` adds a step to an existing track.) |
| `/roadmap`                                                     | The macro picture across all tracks — what's done, active, blocked, next.                                                                           |
| `/build`                                                       | Advance the **spine** track (your current top priority) by one verified step.                                                                       |
| `/feature <name>`                                              | Advance any other track by one verified step.                                                                                                       |
| `/status`                                                      | Where the active track stands.                                                                                                                      |
| `/verify`                                                      | Run the current step's verification checks.                                                                                                         |
| `/future` (`/icebox`)                                          | Park a "someday" idea in the backlog without derailing now (`/future develop <id>` turns it into a planned track).                                  |
| `/blocker`, `/checkpoint`, `/rollback`, `/skip`, `/reset-step` | Handle blockers and safe recovery points.                                                                                                           |

A shipped `example-track` makes these work the moment you install — replace it with your own.

---

## A typical workflow

1. **Set up.** Run `/adopt` (existing) or `/init-claude` (new). You and Claude agree on the North Star and ranked priorities — the compass for everything after.
2. **Plan a feature.** Run **`/plan <what you want to build>`**. Claude clarifies scope with you, breaks the feature into numbered steps each with a concrete verification, scaffolds the track, and adds it to the roadmap. (Use `/architect` first for a big strategic decision; use `/future` to park ideas for later — `/future develop` turns one into a plan when you're ready.)
3. **Build.** Run `/build` (or `/feature <name>`). Claude executes the current step, runs its verification, updates the progress log, and stops — ready for the next `/build`. Repeat. `/roadmap` shows the arc; `/status` shows the detail. Need to add something mid-track? `/plan add-step <track> <what>`.
4. **Commit.** Run `/commit`. Claude will commit and push after performing safety checks and key leak prevention, including description of what was completed.
5. **Keep it healthy.** Reach for `/audit` (architecture & conventions review), `/speedtest` (performance), `/test` and `/e2e` (correctness), `/security` (when touching auth, secrets, or external input), and `/debug` when something breaks at runtime.
6. **Ship & record.** `/deploy` to a preview or production. Decisions and procedures get written down as ADRs and runbooks automatically (`/document`), so the _why_ survives.

The throughline: **the plan and its progress are written down, verified, and resumable** — so a multi-week build stays coherent across many sessions, and any session can be picked up cold.

---

## Repository layout

```
.claude/
├── skills/         # the skill library
├── commands/       # slash commands that route into the skills
├── hooks/          # 3 secret-safety / lint hooks
├── settings.json   # wires the hooks + secret-protection rules
├── ROADMAP.json    # build-system macro plan (ships with one example track)
├── feature-tracks/ # one folder per track
├── ai-instructions/# step-file template & build conventions
├── audits/         # output of /audit   ·   architecture/ → output of /architect   ·   improvements/ → /improve ledger
└── CLAUDE.md       # generic working-style conventions
docs/               # ADR + runbook templates (docs/decisions, docs/runbooks)
CLAUDE.md           # opinionated starter for a NEW project
CLAUDE.add.md       # additive bolt-on block for an EXISTING project (manual alternative to /adopt)
INSTALL.md          # full install guide
```

## Requirements

- **Claude Code** — the skills, commands, and hooks are Claude Code features.
- **Node.js** on PATH — the hooks are small `.mjs` scripts.
- Some skills use MCP servers (Playwright, Chrome DevTools, Context7, Vercel) — they degrade gracefully if a server isn't connected; nothing is required for the core build/audit/security skills.

---

Built to be cloned, copied, and made your own. Prune skills you won't use, edit the rules to match your stack, and add tracks as your project grows.
