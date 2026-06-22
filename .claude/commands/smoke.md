Quick smoke check of the deployed app — health endpoint + browse path.

Usage: `/smoke` — runs against the latest Vercel preview by default. Append ` --local` for localhost.

Invoke the `test-orchestrator` skill. The orchestrator will:

1. Resolve the target URL (same logic as `/e2e`: Vercel preview by default, `--local` for localhost, refuses production)
2. GET the project's health endpoint (e.g. `/api/health`) and report per-service status for whatever backends it checks
3. Drive the browser through a minimal browse path (home loads, no console errors, one key page renders)
4. Report:
   - Services: ok / degraded / down / unconfigured per backend
   - Browse: pass / fail
   - Total time

This is the fastest "is the site up?" check. Use it before opening a PR, after a deploy, or when something feels off in the live app.

Smoke is the ONLY workflow that can run against production. If the user explicitly asks for `/smoke --prod`, allow it — but never write to production, never run E2E mutations there.
