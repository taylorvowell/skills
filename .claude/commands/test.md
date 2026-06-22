Run the tests in scope.

Invoke the `test-orchestrator` skill, workflow A ("run tests in scope"). The orchestrator will:

1. Determine scope from the optional arg, or auto-detect from `git diff main --name-only`
2. Map scope → the smallest matching test command for the project's layout — run the test script for the affected workspace/package with your package manager. If the change spans multiple packages or the scope is unclear, run the project's full test script across all packages.
3. Run the command, capture exit code + last 30 lines of output on failure
4. Report: passed test count + per-suite summary, or the failing test names + output excerpt

Scope this to **unit + integration tests only**. E2E is on-demand via `/e2e`. If a test is genuinely flaky (passes on retry), say so explicitly — flaky tests are bugs to fix, not features.

Do not run E2E here. Do not auto-fix failures unless the user says so.
