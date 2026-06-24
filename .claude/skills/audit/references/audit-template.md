# Audit Findings Template

This template produces the `00-overview.md` file — the **single doc** in each audit folder. It is a self-contained **findings report**: the durable evidence record of what was found, where, why, and against which source of truth. It is NOT an execution plan — remediation runs through the tiered system (`/heal` for the inline tier, a `<slug>-remediation` track via `/feature` for the track tier; see the `audit` skill, § Remediation). The audit folder holds only this doc; the executable plan and its live state live in the remediation track when there is one.

Copy the structure below into `00-overview.md`, replacing `<bracketed>` placeholders. Keep section names exact.

---

```markdown
# Audit: <Target>

| Field             | Value                                          |
|-------------------|------------------------------------------------|
| Target            | <human-readable description>                   |
| Mode              | Deep audit / Post-build (track: <id>)          |
| Audit date        | <YYYY-MM-DD>                                    |
| Audit slug        | <slug>-<YYYY-MM-DD>                             |
| Scope size        | Small / Medium / Large                         |
| Confidence        | High / Medium / Low                            |
| Findings          | <C> critical / <H> high / <M> medium / <L> low |
| Remediation tier  | Inline (`/heal`) / Track (`<slug>-remediation`) |
| Remediation steps | <N> (track tier) / — (inline)                  |
| Status            | Findings written — awaiting decision           |

## TL;DR

<Two-to-four sentences. State the biggest finding plainly. If the audit is clean, say so directly — a clean audit is a valid result.>

## Scope

**Files audited (<count>):**
- `path/to/file.tsx`
- ...

*(Post-build mode: this is the exact set — the union of the track's step "Files & Areas Touched" and the git diff across the track's commit range — not a folder guess.)*

**Skills consulted:**
- `<component-system skill>`, `next-best-practices`, `security`, ...

**Architecture decision records referenced:**
- `<record>` — <title>

**Doc-grounding / research:** <which installed-version docs were checked (next-devtools MCP / context7) and any WebSearch/WebFetch URLs — required for every latest-leverage finding>

## Coverage matrix

Glance view of what was checked. Status: `✓` clean, `⚠` findings present, `–` not applicable / not run.

| #  | Axis / Lens                                   | Status | Findings |
|----|-----------------------------------------------|--------|----------|
| 1  | Next.js best practices                        |        |          |
| 2  | Performance & code optimization               |        |          |
| 3  | Structural soundness & architecture fit       |        |          |
| 4  | Componentization / modularization             |        |          |
| 5  | Scalability & reusability                     |        |          |
| 6  | Logical placement                             |        |          |
| 7  | Reuse vs. duplication                         |        |          |
| 8  | Tech debt — carried and introduced            |        |          |
| 9  | Project conventions & coding standards        |        |          |
| 10 | Documentation for AI coders                   |        |          |
| 11 | Test coverage (load-bearing only)             |        |          |
| 12 | Latest Next.js / React / Vercel leverage      |        |          |
| 13 | Additional architectural suggestions          |        |          |
| A  | Security *(always)*                           |        |          |
| B  | Rendering strategy                            |        |          |
| C  | Failure-path completeness                     |        |          |
| D  | Accessibility (static)                        |        |          |
| E  | Cache-invalidation correctness                |        |          |
| F  | Config / environment parity                   |        |          |
| G  | Observability                                 |        |          |

*(Hardening lenses A–G are mandatory in post-build mode. In a target-scoped audit, mark `–` (not run) the ones the scope didn't warrant — security A is always run. Drop the conditional lenses (SEO, dependency-justification) in as extra rows only when they applied.)*

## Findings

Listed by severity. Each finding has a stable ID (C1, H1, M1, L1, …) that the remediation outline / track steps reference.

### Critical

#### C1 — <short title>

- **Axis / Lens:** <#7 Reuse vs. duplication / Lens A Security>
- **Source of truth:** <architecture decision record / component registry / skill / doc URL or MCP source>
- **Evidence:**
  - [path/to/file.tsx:42-58](path/to/file.tsx#L42-L58) — <what is there>
- **Why it matters:** <one sentence on the consequence if unfixed>
- **Recommendation:** <what to do — at a level a Claude could execute>
- **Effort:** Quick / Moderate / Large

#### C2 — ...

### High

#### H1 — ...

### Medium

#### M1 — ...

### Low

#### L1 — ...

## Tech debt — carried and introduced

<Mandatory section, two parts (axis 8). Even if both are "None.">

**Debt the existing code already carries:**

- **<carried debt>** — `<file:line>`. What it is: <speculative abstraction / copy-paste fork / half-done migration / TODO-HACK marker / dead code / outlived workaround>. <If nothing: "None — scope carried no markers, dead code, or speculative abstractions.">

**Debt this remediation would introduce:**

- **<thing introduced>** — Why it's needed: <reason>. Cleanup plan: <when it's retired, or "accepted permanently">. <If nothing: "None — recommendations are pure removal/consolidation.">

Net debt direction: <reduces / neutral / adds> — <one line>.

## Remediation outline

The dependency-ordered phase grouping. Each phase resolves specific finding IDs.

| Phase | Title                          | Resolves   | Touches            | Effort   |
|-------|--------------------------------|------------|--------------------|----------|
| 1     | <title>                        | C1, M2     | <files / domain>   | Moderate |
| 2     | <title>                        | H1, H2     | <files / domain>   | Quick    |

Phases are ordered by **dependency**, not severity.

**Chosen tier:** <Inline / Track> — <one line on why (size, domains, files-touched, consolidation)>.

- **Inline tier:** the fixes go to `/heal` scoped to the audited files, in the phase order above. No track scaffolded.
- **Track tier:** scaffolded as the `<slug>-remediation` track at `.claude/feature-tracks/<slug>-remediation/` — each phase above is a numbered step. Run with `/feature <slug>-remediation`. *(Fill in once scaffolded.)*

## Open questions for the user

<Use only when a recommendation depends on a decision only the user can make. Don't manufacture questions; omit the section if none.>

1. **<question>?** — Context: <why>. Default if unanswered: <what the plan assumes>.

## Scope-adjacent observations

<Use only for something concerning OUTSIDE the audited scope. Don't draft remediation for these — note them for a future audit.>

- <observation> — Suggest auditing `<other-target>` later.

## References

- `<architecture decision record>` — <title> — <one-line relevance>
- `<skill>` — <one-line relevance>
- <installed-version doc via next-devtools MCP / context7, or a URL> — <one-line relevance>
```

---

## Notes on filling out the template

**This doc does not execute.** It carries no execution loop, no status table, no escalation triggers — those live (once) in the orchestrator and `/heal`. The doc records findings; the remediation tier records and runs the work. Don't paste an "AI coder execution instructions" block back in.

**Findings IDs are stable.** Once you assign C1, H1, etc., never renumber — the remediation outline and the track's steps reference them.

**Coverage matrix is honest.** Mark `–` for a lens you genuinely didn't run (out of scope), not to avoid looking. Security (A) is always run on a deep audit.

**The "Tech debt — carried and introduced" section is mandatory, both parts** — even if both are "None." The carried part forces a real hunt; the introduced part forces honesty about the cost of the fix.

**Tier line is load-bearing.** Whoever picks this doc up later needs to know whether the fix was healed inline or lives in a track — and, if a track, where. Keep it current.
