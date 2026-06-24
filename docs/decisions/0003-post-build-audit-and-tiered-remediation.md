# 0003 — Post-build audit mode + tiered remediation through the build tooling

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Taylor Vowell
- **Supersedes / Amends:** Amends 0002 (single self-aware `/audit` command)

## Context

The single `/audit` command (0002) was sound at the front door but carried three problems behind it:

1. **It reinvented an execution system that already existed.** A deep audit wrote its own remediation runtime to `.claude/audits/<slug>/` — a markdown `_status.md`, `NN-phase-N` docs, and a ~120-line "autonomous execution loop" duplicated across the skill *and* the templates. The build tooling already had a far more robust version of every piece: `_STATUS.json` with atomic writes (`progress-tracker`), the 8-section step template, `step-verifier` for verification, the `build`/`feature` orchestrator state machine, `/heal` for bounded self-heal, `blocker-protocol` for escalation, `/checkpoint` for rollback, and `/roadmap` for visibility. The audit's loop was, in effect, a third copy of the same logic — `heal` had already absorbed it as a reusable primitive, yet the audit still hand-rolled its own. The copies could only drift apart.
2. **Coverage gaps for a feature that just shipped.** Security was explicitly *excluded* ("not for security-only reviews"). Runtime perf and accessibility were deferred wholesale. Rendering-strategy was scattered across three axes. "Latest leverage" was judged from training data on a stack that runs ahead of it.
3. **No wired moment to run.** The orchestrators only *recommended* a deep audit at track completion; there was no first-class "audit the feature I just built" flow with the scope known precisely.

## Decision

We will make `/audit` the **post-build hardening pass** and route its fixes through the existing build tooling instead of a parallel system:

- **Post-build mode.** A new Step 0 branch: when `/build` or `/feature` finishes a track, the completion sweep *offers* the audit with scope pre-filled. Scope is derived *exactly* — the union of each step's "Files & Areas Touched" and the git diff across the track's commit range — and the audit runs in a fresh unbiased agent.
- **Hardening lenses (A–G).** On top of the 13 core axes: security (now first-class on *every* deep audit, not just post-build), rendering strategy, failure-path completeness, static accessibility, cache-invalidation correctness, config/env parity, and observability — all mandatory in post-build mode, applied as-relevant otherwise. SEO and new-dependency-justification are conditional lenses. Latest-leverage findings must be doc-grounded against installed-version docs (next-devtools MCP / context7), not memory.
- **Tiered remediation.** The audit no longer carries an executor. Small fix-ups (inline tier) go to `/heal`; substantial ones (track tier — the post-build default) are scaffolded as a `<slug>-remediation` build track, registered in `ROADMAP.json`, and run by `/feature`. The tier thresholds are `/heal`'s promote-to-audit thresholds in reverse, so the two meet cleanly at the boundary.
- **`.claude/audits/` becomes a findings archive.** One self-contained `00-overview.md` findings doc per audit. The homegrown `_status.md`, the `NN-phase-N` phase docs, and the in-skill execution loop are removed; the phase-template and status-template reference files are deleted.
- **Cleanup.** The abandoned `audit-workspace/` stub (a `trigger-eval.json` with no skill) is deleted.

## Options considered

1. **Tiered remediation through the build tooling (chosen)** — light audits heal inline, substantial ones become tracks. Keeps the light path light, routes the heavy path through one trusted code path, and deletes the duplicated loop. Slightly more moving parts at the audit/track seam.
2. **Full unification** — every deep audit becomes a remediation track. Maximum consistency, but two-nit cleanups would pollute `/roadmap` with tracks. Rejected.
3. **Keep `.claude/audits/` executor, just reuse `/heal`** — least churn, but leaves two parallel status systems (`_status.md` vs `_STATUS.json`) alive. Rejected — the duplication was the core problem.
4. **Auto-run the post-build audit on track completion** — considered for the trigger; rejected in favor of *offering* it, keeping a human gate before a token-heavy pass.

## Consequences

- **Positive:** one execution path the whole project trusts (drift-detection, verification, self-heal, blockers, checkpoints, per-step commits, `/roadmap` visibility) instead of an audit-only loop; the audit skill shrinks (the duplicated loop is gone); a freshly-shipped feature gets a real hardening pass (security + failure-paths + a11y + cache + config + observability); latest-leverage claims are doc-grounded; remediation is visible and resumable across sessions.
- **Negative / trade-offs:** the post-build path spans more skills (audit → remediation-track → feature), so a change to track file shapes must keep the audit's scaffolding in step with `/plan` (mitigated by pointing the new `references/remediation-track.md` at `/plan` + the README as the source of truth). The audit description is longer (it now carries post-build + tiering phrasing).
- **Follow-ups:** done this change — rewrote the `audit` skill (post-build Step 0, hardening lenses, Pattern F sweep, tiered remediation replacing Execution Mode), expanded `coverage-axes.md`, added `references/remediation-track.md`, slimmed `audit-template.md` to a findings report, deleted the phase/status templates and the `audit-workspace` stub, wired both orchestrators' completion sweeps to offer the post-build audit, synced `heal`'s cross-references, reframed the audits README, and updated the `/audit` command + the skills map in CLAUDE.md / CLAUDE.add.md / the adopt index. A worthwhile next step is a trigger-accuracy eval pass on the expanded description and a dry-run of a real post-build audit to confirm the scaffold → `/feature` hand-off.
