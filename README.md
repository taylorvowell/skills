# GO BUILD

**A fast, friendly way to build Next.js projects with Claude Code.** You bring the idea. GO BUILD turns it into a plan, builds it one checked step at a time, and keeps the whole thing moving with a single word: **GO**.

## The six stages

This is the shape of a GO BUILD project. You move through them as you go, and most of the time **GO** is what carries you from one to the next.

**1. Brainstorm** — `/brainstorm <your idea>`
Got a half-formed idea? Talk it out. Claude fleshes it into a clear concept — what it does, how someone uses it, how it fits what you've already built — and writes it down. Say **GO** to hand it straight to planning.

**2. Plan** — `/plan <what you want>`
Claude breaks the feature into small, numbered steps, each with a concrete way to know it's done. That becomes a _track_ — a little build plan that lives in your repo.

**3. Build** — `/build`
Claude does one step, proves it works (typecheck, lint, tests), writes down the progress, and stops. Then it recommends the next step and waits for **GO**. One checked step at a time, so broken work can't quietly pile up.

**4. Check** — `/audit` · `/test` · `/e2e` · `/speedtest` · `/debug`
Make sure it actually holds up. Review how it's built, run the tests, drive it in a real browser, check the speed, or chase down whatever's broken.

**5. Commit** — `/commit`
Save your work the safe way. Claude scans for leaked secrets and stray `.env` files first, writes a tidy message, and pushes.

**6. Ship** — `/deploy`
Push it live — a preview, or production when you're ready. Along the way, decisions and how-tos get written down for you, so future-you remembers _why_.

You don't have to touch all six every time. A tiny change might go build → commit → ship. A big feature walks the whole path. The stages are a rhythm, not a checklist.

---

## Get started

### Brand-new project

1. Copy the `.claude/` and `docs/` folders into an empty repo.
2. Run **`/start`**.

Claude sets up a real, modern Next.js project for you — App Router, TypeScript, Tailwind v4, shadcn/ui — gets it actually running, and writes the project's `CLAUDE.md` (the house rules Claude follows) based on what it built. Then it offers to brainstorm your first feature. From there it's just `/brainstorm` → `/plan` → `/build`.

### A project you already have

1. Copy `.claude/` (and `docs/`) into your repo.
2. Run **`/adopt`**.

Claude reads your project — your stack, your conventions, your setup — and wraps GO BUILD around _your_ way of doing things. Your rules stay in charge; it just adds the workflow and the safety nets.

> More detail, settings notes, and lighter-touch options are in [INSTALL.md](INSTALL.md).

---

## The commands

**The everyday loop**

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| `/brainstorm <idea>` | Turn a rough idea into a real concept |
| `/plan <feature>`    | Break a feature into checkable steps  |
| `/build`             | Do the next step and prove it works   |
| `/commit`            | Save and push, secrets-scanned        |
| `/deploy`            | Put it live                           |

**Keeping track**

| Command           | What it does                      |
| ----------------- | --------------------------------- |
| `/roadmap`        | The big picture across everything |
| `/status`         | Where the current work stands     |
| `/feature <name>` | Advance a specific piece of work  |
| `/future`         | Park a "someday" idea for later   |

**Keeping it healthy**

| Command          | What it does                        |
| ---------------- | ----------------------------------- |
| `/audit`         | Review what you built               |
| `/test` · `/e2e` | Run tests / drive a real browser    |
| `/speedtest`     | Check performance and accessibility |
| `/debug`         | Figure out why something's broken   |
| `/heal`          | Auto-fix what you just broke        |

Ah see
