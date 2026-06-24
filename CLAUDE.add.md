# CLAUDE.add.md — bolt-on block for an EXISTING project

Use this when you want these skills, hooks, and the build system in a project that **already has its own stack and conventions**. It does NOT change how that project is built — it only adds tooling.

> **Prefer the automated path:** after copying `.claude/` in, run **`/adopt`** — it researches your repo and produces a full `CLAUDE.md` in the proven structure (folding in your existing one), wires the toolkit, and asks before changing anything. This file is the **manual / lighter-touch** alternative for when you'd rather just append a block and not restructure your `CLAUDE.md`.

**How to use (manual):** copy the block below into your existing `CLAUDE.md` (append it). Then follow `INSTALL.md` to copy the `.claude/` directory in. That's it — your project's own rules stay authoritative; this just tells Claude the tooling exists and when to reach for it.

If you'd rather not edit your `CLAUDE.md` at all, paste the same block into the chat once at the start of a session (see "Zero-edit adoption" at the bottom).

---

```markdown
## Claude tooling (skills, hooks, build system)

This repo includes a `.claude/` toolkit. It is **additive** — it does not override this
project's existing stack, structure, or conventions. When the toolkit and this project's
own rules disagree, **this project's rules win.** The skills adapt to whatever stack and
directory layout this repo already uses (single app or monorepo; any package manager).

**Secret & file safety (active via `.claude/hooks/`, enforced automatically):**
- Never print, log, or echo environment-variable values; never bulk-dump env (`printenv`,
  `env`, `Get-ChildItem env:`); never read `.env*` files except `.env.example`.
- Never hand-edit `.env*` or the lockfile — go through the package manager.

**Build system (optional, opt-in per task):** work can be tracked as **tracks** under
`.claude/feature-tracks/<id>/` (`_STATUS.json` + `_PROGRESS.md` + numbered step files),
indexed by `.claude/ROADMAP.json` and advanced one verified step at a time.
- `/build` advances the spine track; `/feature <name>` advances any track; `/roadmap`,
  `/status`, `/verify`, `/blocker`, `/checkpoint`, `/future` operate the system.
- Never hand-write progress — route through the `progress-tracker` skill. Ignore this
  entirely if you don't want a tracked build; the rest of the skills work standalone.

**Skills — reach for the right one** (in `.claude/skills/`, triggered by their descriptions):
- Quality & security: `/audit` (self-aware — recent work, a target, or a just-finished feature; post-build pass adds security + hardening lenses and routes fixes through `/heal` or a `<slug>-remediation` track), `security`, `web-design-guidelines`, `/document`, `/improve`.
- Next.js / React / styling: `next-best-practices`, `next-cache-components`, `component-system`,
  `tailwind-v4`, `shadcn`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`.
  (Use these only where they match this project — e.g. skip `tailwind-v4` if the project is on Tailwind v3 or another CSS approach.)
- Testing: `/test`, `/e2e <criteria>`, `/test-write`, `/test-heal`, `/heal`.
- Performance: `/speedtest`, `web-perf`, `vercel-optimize`.
- Deploy: `/deploy`, `vercel-cli`. Architecture: `/architect`, `/architect-deep`. Debugging: `/debug`.
- Authoring: `skill-creator`.
```

---

## Notes for the maintainer (not part of the paste block)

- **Stack mismatch is fine.** The skills are written to adapt ("your Next.js app directory", "your package manager"). If a skill assumes something your project doesn't use (e.g. Tailwind v4, shadcn, CVA), it simply won't apply — Claude will skip it. You can also delete skills you'll never use from `.claude/skills/`.
- **`.claude/CLAUDE.md`** (copied in with the toolkit) carries generic working-style conventions (documentation discipline, preview-after-visual-change, turn wrap-up format). Keep, trim, or delete it to taste — it's preference, not mechanism.
- **Hooks** are wired in `.claude/settings.json`. If your project already has a `settings.json`, merge the `hooks` and `permissions.deny` entries rather than overwriting. See `INSTALL.md`.
- **The build system is opt-in.** If you don't want tracked builds, you can delete `.claude/ROADMAP.json`, `.claude/feature-tracks/`, `.claude/ai-instructions/`, and the build/track skills (`build-orchestrator`, `feature-orchestrator`, `progress-tracker`, `roadmap`, `step-verifier`, `blocker-protocol`, `checkpoint`, `icebox`) and their commands.

## Zero-edit adoption (tell your Claude)

If you don't want to touch your `CLAUDE.md`, just say this to Claude once per session:

> This repo has a `.claude/` toolkit (skills, hooks, and an optional track-based build system) added on top of our existing setup. Use the skills in `.claude/skills/` when they fit — but our project's own conventions are authoritative; the toolkit is additive and adapts to our stack. The secret-safety hooks are already active.
