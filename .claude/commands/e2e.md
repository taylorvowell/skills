Drive a headless browser to satisfy a success criteria, with bounded self-healing.

Usage: `/e2e <success-criteria>` — e.g. `/e2e a user can navigate from home to a product detail page and see the product title`

Append ` --local` to drive `http://localhost:3000` instead of the latest Vercel preview.

Invoke the `test-orchestrator` skill, workflow C, which hands off to `e2e-autopilot`. The autopilot will:

1. Resolve the target URL (Vercel preview by default, `--local` for localhost; refuses production)
2. Parse the success criteria into an ordered list of intents
3. Drive Chromium via the Playwright MCP server (`mcp__playwright__browser_*` tools)
4. Self-heal brittleness with a bounded heuristic: 3 inner heal attempts per step, 8 outer iterations, 10-minute global cap
5. STOP immediately on real-bug signals: URL drift, JS console error, error banner, missing element with no semantic equivalent
6. On success: maintain an action log and offer to codify the working flow into the project's E2E test directory (e.g. `tests/e2e/generated/<slug>.spec.ts`) via Playwright's native `generator` Test Agent

Hard rules:

- Never run against production (`/smoke` is for that)
- Never blindly retry past the budget — surface and stop
- Never auto-fix app code if a real bug is found — report and stop
- Codified specs land in `tests/e2e/generated/` with a `// reviewed-by:` header that CI enforces before merge
