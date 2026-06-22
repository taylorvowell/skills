Diagnose and heal a failing test, OR report a real bug if the failure isn't brittleness.

Usage: `/test-heal [test-path]` — defaults to the most recent failing test if no path is given.

Invoke the `test-orchestrator` skill, workflow D ("heal a failing test"). The orchestrator will:

1. Read the failing test file + the most recent failure output + (for Playwright) the trace zip in the project's Playwright report directory (e.g. `playwright-report/`)
2. Classify the failure:
   - **Brittleness** (selector drift, race, stale fixture) → delegate to Playwright's native `healer` Test Agent
   - **Real bug** (URL changed, console error, element that should exist per spec is genuinely missing) → STOP and report — do not heal
3. If healing succeeded, run the test once to confirm, then summarize the patch
4. If the failure was a real bug, surface what's wrong with the app code — do not modify the test to hide the bug

Hard rule: never auto-heal a real bug. Healing rewrites the test to match current behavior. If current behavior is wrong, healing buries the bug.

The `healer` Test Agent is installed via `npx playwright init-agents --loop=claude`. If it's not present, fall back to reporting the failure with diagnostic detail and ask the user how to proceed.
