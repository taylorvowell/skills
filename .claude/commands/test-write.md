Author a new test from a description.

Usage: `/test-write <description>` — e.g. `/test-write the ProductCard renders price in the locale currency`

Invoke the `test-orchestrator` skill, workflow B ("author a new test"). The orchestrator will:

1. Classify the test type from the description:
   - Pure function / schema / formatter → **unit** (e.g. `tests/unit/`)
   - React component rendering + props → **component** (e.g. `tests/component/`)
   - API route / server action / server lib → **integration** (e.g. `tests/integration/`)
   - User flow across pages, browser-driven → **E2E** (e.g. `tests/e2e/`)
2. For E2E: delegate to Playwright's native `planner` + `generator` Test Agents (installed via `npx playwright init-agents --loop=claude`). Do not roll a custom template.
3. For unit/component/integration: read 1–2 sibling tests for style, write the new test, run only the new test to confirm it passes
4. If the new test fails, classify: is the test wrong, or is the code wrong? Surface the question; do not assume

Hard rule: never write tests for code that doesn't ship yet. Testing a stubbed or placeholder surface produces tests that always pass meaninglessly — worse than no tests.
