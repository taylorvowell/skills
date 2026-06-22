---
name: test-orchestrator
description: Entry-point router for any testing task in a Next.js project. Decides between four workflows — (1) run tests in scope, (2) author a new test from a description, (3) drive a headless browser to satisfy a success criteria with bounded self-healing, (4) heal a failing test. Use this skill whenever the user types /test, /e2e, /test-write, /test-heal, /smoke, "run tests", "add a test for X", "verify Y works in a browser", "the test is broken — fix it", or any phrasing that implies test execution, authoring, browser automation against the live app, or test repair. Also use preemptively when the user describes a success criteria and asks to "make sure it works" — that is the e2e-autopilot pattern, not ad-hoc clicking. This skill MUST be the entry point for testing work so we get consistent scope detection (changed files only by default), consistent target selection (deployed preview by default, localhost on opt-in), and consistent escalation when a failure looks like a real bug instead of a flaky test. Never execute Playwright tests or drive the browser directly; route through this orchestrator so the right sub-skill is loaded with the right defaults.
---

# Test Orchestrator

You route testing work to one of four workflows. The user's words and the current state of the repo decide which.

The reason this skill exists: testing has a few non-obvious defaults (deployed preview as default agentic target, golden-path-only E2E, generated tests segregated from hand-authored). Bypassing the orchestrator means re-deciding those every time and drifting from policy.

## The test pyramid

This skill assumes a standard Next.js test pyramid:

- **Unit + component** — Vitest in a jsdom environment (pure functions, schemas, formatters; React component rendering + props).
- **Integration** — Vitest in a node environment, with network mocked (MSW or similar) for API routes and server-side libs.
- **E2E** — Playwright driving a real browser, **golden-path only** (5–8 critical flows, not exhaustive coverage).

Paths below are **examples**. Use your project's actual test directory — commonly `tests/` at the app root, or `apps/web/tests/` in a monorepo. Adapt to whatever the repo already does.

Commands are shown with `pnpm exec` / `pnpm -F`; use the npm, yarn, or bun equivalent for your project (`npm exec` / `npx`, `yarn`, `bunx`).

## The four workflows

### A — Run tests in scope

Trigger words: `/test`, "run the tests", "run unit tests", "make sure tests pass", "verify the build".

Steps:

1. Determine scope. If the user passed an arg (`/test components/Foo`), use it. Otherwise default to **changed files only**: run `git diff --name-only` (against the base branch, e.g. `git diff main --name-only`) and infer the smallest matching test target.
   - In a single-app repo, run the project's test script scoped to the changed area (e.g. `pnpm exec vitest run <dir>`).
   - In a monorepo, infer which package changed and run that package's test script (e.g. `pnpm -F <package> test`).
   - Mixed or unclear → run the whole suite (`pnpm -r --if-present test` from root, or the repo's top-level `test` script).
2. Run the command. Capture exit code + the last 30 lines of output on failure.
3. If failures are deterministic (same test fails twice in a row), report them — don't auto-fix unless the user says so. If a test is genuinely flaky (passes on retry), say so explicitly; flaky tests are bugs to fix, not features.

E2E is NOT in this workflow's scope. `/test` is unit + integration only. E2E is on demand via `/e2e` because it needs a target URL and a running app.

### B — Author a new test

Trigger words: `/test-write`, "add a test for X", "write a test that asserts Y".

Decide the test type from the description (locations are examples — match your repo's layout):

| Description hints at... | Type | Example location |
| --- | --- | --- |
| Pure function, schema, formatter, util | Unit | `tests/unit/<name>.test.ts` |
| React component rendering + props | Component | `tests/component/<Name>.test.tsx` |
| API route, server action, server-side lib | Integration | `tests/integration/<name>.test.ts` |
| User flow across pages, browser-driven | E2E | `tests/e2e/<flow>.spec.ts` |

For E2E specifically, prefer **Playwright's native `planner` + `generator` Test Agents** (installed via `playwright init-agents --loop=claude`). Hand off the description and the chosen flow file path. Do not roll a custom test-template renderer.

For unit/component/integration: read 1–2 existing tests in the same folder to mirror the style, then write the new one. For integration tests, reuse the project's network mocks (e.g. MSW handlers) and extend them per-test rather than mocking ad hoc.

After writing: run only the new test (`pnpm exec vitest run <path>`). If it passes, you're done. If it fails, classify: is the test wrong, or is the code wrong? Surface the question to the user; do not assume.

### C — Drive a browser to satisfy a success criteria (e2e-autopilot)

Trigger words: `/e2e`, "verify a user can …", "make sure the flow works", "test that the item actually adds to the list", "drive a browser and prove …".

**Delegate to the `e2e-autopilot` skill.** It owns the Playwright MCP loop, the bounded healing heuristic (3 inner heal attempts per step, 8 outer iterations, 10-minute cap), the URL resolution (deployed preview by default, `--local` flag forces localhost), and the post-success codify-to-spec-file flow.

Your job is just to recognize this is the right workflow and hand off cleanly with the success criteria intact.

### D — Heal a failing test

Trigger words: `/test-heal`, "the test is failing", "fix the brittle locator", "this E2E is flaky".

**Delegate to Playwright's native `healer` Test Agent.** It replays the failing steps, inspects the UI snapshot, and patches selectors, waits, or data when the failure is brittleness rather than a real bug.

Before delegating: read the failing test file, the most recent failure output, and (if Playwright) the trace zip in the Playwright report directory (e.g. `playwright-report/`). If the failure is clearly a real bug (URL changed, console error, missing element that *should* exist per the spec), say so and stop. Do not run the healer on a real-bug failure — that just rewrites the test to hide it.

## Hard rules

These are not style preferences. They preserve testing discipline.

- **Never run E2E tests against production.** Default to the latest deployed preview; allow `--local` for localhost. Production is for `/smoke` only.
- **Never auto-heal a test that exposed a real bug.** Healing rewrites the test to match current behavior. If current behavior is wrong, healing buries the bug. The `e2e-autopilot` rules cover what "real bug" looks like — surface, don't patch.
- **Keep agent-generated E2E specs segregated and reviewed.** Generated specs land in a dedicated `tests/e2e/generated/` directory. If your CI enforces a `// reviewed-by:` review marker, don't bypass it.
- **Never add tests for things that don't ship yet.** Don't write tests against placeholder or stub routes — they pass meaninglessly.
- **Never widen E2E scope beyond golden paths.** 5–8 critical flows only. If a new test feels like a "nice to have," it isn't worth the maintenance.

## CI gate (for awareness when reporting)

A typical setup:

- A unit/integration job (Vitest) runs on PRs — usually **blocking** on merge.
- An E2E job (Playwright) runs against a deployed preview — usually **non-blocking**, reports via PR comment/artifact.

When you finish a `/test` run with passing tests, you can tell the user the blocking unit/integration job should pass. When E2E fails on CI and it's non-blocking, it's a warning, not a hard block — report it as such.

## Token efficiency

- Don't pre-load test files speculatively. Read only the test you're running, writing, or healing.
- Don't read the network-mock setup unless writing or debugging an integration test.
- Don't read the Playwright config unless changing the target URL behavior.
- The `e2e-autopilot` skill is large; only load it on workflow C.

## What success looks like

Single `/test` invocation, happy path:

1. Detect scope from `git diff` (1 read).
2. Run the scoped test command.
3. All tests pass. Report: "23 tests across 4 files passed."

Single `/e2e` invocation, happy path:

1. Recognize the trigger, hand off to `e2e-autopilot`.
2. Autopilot drives the deployed preview, satisfies the criteria in ≤8 iterations.
3. Offer to codify the working flow into a spec file under `tests/e2e/generated/`.

That's the target shape. Lean, scoped, never speculative.
