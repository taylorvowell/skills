---
name: docs
description: Documentation-discipline skill for a project — decides when to write an ADR vs a runbook vs update CLAUDE.md, and provides the templates. Use when the user types `/document`, says "document this", after a non-trivial architectural decision has been made, when a new operational procedure has been created or learned, or when significant work has been done that warrants an ADR or runbook. Provides templates and guidance for the project's documentation system.
---

# Documentation Skill

## When to use

Load this skill when doing documentation work: writing ADRs, creating runbooks, or evaluating whether something needs to be documented at all.

## Pick the right artifact

- **Architectural decision** (a "we're doing X not Y" choice, new dependency, new pattern, new service) → write an **ADR**.
- **Operational procedure** (how to handle a failure, how to roll back, how to deploy or onboard something) → write a **runbook**.
- **A hard rule or stack boundary that should govern future work** → update the relevant **CLAUDE.md** (root or per-app) instead of, or in addition to, an ADR.

## What counts as "non-trivial" (worth documenting)

- New dependency added to the project's dependencies
- New service added (a hosted service, a third-party tool)
- A schema or data-model change
- A new environment variable
- A decision where two or more options were considered ("we're using X not Y because…")
- A new operational procedure (how to handle X failure, how to deploy Y)
- A learning from an incident (what failed, what fixed it, how to prevent it)

## What is NOT worth documenting

- Trivial bug fixes
- Typo / lint / format corrections
- Cosmetic UI tweaks
- Refactors that don't change behavior
- How third-party tools or frameworks work (read their docs)
- Step-by-step narration of what code does

## ADR Template

Always copy from `docs/decisions/_template.md`. File name pattern: `NNNN-kebab-case-title.md` where `NNNN` is the next sequential number. Find the next number by listing `docs/decisions/` and adding 1 to the highest. When a decision overturns an earlier one, note "Supersedes/Amends" the prior ADR in the new one, and add a superseded note to the old one.

## Runbook Template

Always copy from `docs/runbooks/_template.md`. File name pattern: `kebab-case-title.md`.

## Keep CLAUDE.md current

If a decision changes a hard rule, stack boundary, or convention that future work must follow, update the root `CLAUDE.md` or the relevant per-app `CLAUDE.md` so the rule is enforced going forward — don't let it live only in an ADR.

## Don't fight automation

Some docs in a project may be auto-generated (for example by a CI job or a scheduled workflow — schema snapshots, changelogs, journal entries). Don't hand-edit those; check for a header or a note saying a file is generated, and edit the source instead. Only create such files manually if explicitly asked.
