Diagnose and fix a FUNCTIONAL / RUNTIME failure using the `debug` skill — in a closed loop (find → fix → verify → refine).

Invoke the `debug` skill immediately. Everything after `/debug` is the bug report. Do NOT start grepping, reading files, or opening MCPs before invoking the skill — it has its own frame → localize → diagnose sequence, and going in cold wastes context on the wrong layer.

This skill is for things that are **broken**: something not loading (blank / spinner / 500), something throwing an error, a section not returning content, broken login/auth, a backend down, data not syncing. It is **not** for performance (`/speedtest`), authoring tests (`/test-write`), or proving a known-good flow (`/e2e`).

For best results, include in the argument: **what's wrong, where (route/feature), and which env** (production / preview / local). If any of those is missing the skill asks once up front, then runs.

Examples:
- `/debug the homepage just spins on the preview` — page-load failure
- `/debug the dashboard shows an empty list in prod` — content not loading
- `/debug login bounces back to /login` — auth loop
- `/debug /api/search/suggest returns 500 locally` — API route error

How it behaves, by design:

- **Localizes first.** Maps the symptom to the faulting layer (the Next.js app, an API route, a backend service, the database, the cache, an external API) using the request path before opening any tool — and follows the error cascade *backward* to the earliest failing component, not the loudest symptom.
- **Runs full-auto.** Diagnoses, edits code in the working tree, runs local typecheck/tests, and iterates fix→verify→refine (up to 6 cycles) without asking for ordinary steps.
- **Pauses only at hard safety gates** — prod DB writes/migrations, redeploys, destructive ops, env/secret changes — surfacing the exact action for approval. Never executes those itself.
- **Verifies the real symptom is gone** — reproduces the original failure path and confirms user-facing behavior, not just "the error left the logs."
- **Knows common traps** — stale `next dev`, the dev-push-doesn't-move-prod false negative, generated-types drift, auth login loops, an empty local data store — and checks them before deep-diving.
- **Routes into whatever per-service skill or MCP the project has** for the faulting layer as sub-tools rather than reinventing them.
- **Asks per bug** whether to add a regression test once the fix is verified.
