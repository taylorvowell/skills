---
name: debug
description: Diagnoses and fixes FUNCTIONAL / RUNTIME failures in a Next.js app in a closed loop — something not loading (blank page, infinite spinner, 500), something throwing an error, a list or section rendering empty, data not showing or not syncing, broken login / auth / session, a backend or external service down, an API route 4xx/5xx. Runs the full cycle: frame → localize the faulting layer → gather diagnostics → form an evidence-backed root-cause hypothesis → apply a minimal fix → verify the original symptom is gone → if still broken, gather more and refine → repeat until green or genuinely stuck. Routes into whatever per-service skill or MCP the project has for the faulting layer rather than reinventing it. Use whenever the user types `/debug`, or says "X isn't loading", "X is throwing an error", "the site is broken", "the page just spins", "data isn't showing", "the list is empty", "login is broken", "auth is broken", "why is prod 500ing", "data isn't syncing", or reports any concrete malfunction they want found and fixed. Runs full-auto (fix→verify→refine) and pauses ONLY at hard safety gates (prod DB writes/migrations, redeploys, destructive ops, env/secret edits) or a real blocker. Do NOT use for performance / Core-Web-Vitals work (that's `/speedtest`) or for authoring new tests from a description. This is for things that are BROKEN.
---

# Debug

You are hunting a **functional failure** in a Next.js app and fixing it — end to end, in a loop, autonomously. The user reported something concrete that is broken: it won't load, it errors, a section renders empty, data isn't showing, login fails, a backend is down. Your job is to **localize the fault cheaply, prove the root cause, apply the smallest fix that resolves it, verify the original symptom is gone, and iterate** until it's green or you hit a genuine wall.

This skill is for things that are **broken**, not slow. Performance / Core Web Vitals → `/speedtest`. Authoring a test from scratch → a test-writing skill. If there's no reported malfunction, you're in the wrong skill.

## Why this skill exists

The failure mode it prevents: **reaching for a tool before you know which layer is broken.** The instinct is to open a database MCP, or drive a browser, or start grepping — before localizing. That burns context chasing the wrong layer. Errors also **cascade backward** through the stack, so the loudest symptom is usually several layers from the cause (a spinning page can be a wedged migration prompt several layers down). This skill forces: **localize first, prove the root, fix the root — not the first error you see.**

## Operating contract (locked by the user)

- **Full auto.** Run the whole loop — diagnose → fix → verify → refine — without asking permission for ordinary steps (reading logs, querying MCPs, editing code in the working tree, running typecheck/tests locally).
- **Pause ONLY at hard safety gates** (see [Safety gates](#safety-gates)) or when you hit a real blocker (missing access, an external dependency you can't reach, a decision genuinely the user's to make).
- **The user frames each run.** Expect them to say *what's wrong, where it is (route/feature), and which env*. If any of those three is missing, ask **once, up front**, in a single message — then run. Do not interrogate step by step.
- **Regression test: ask per bug.** After a fix is verified, ask whether to add a regression test (see [Step 7](#7-offer-a-regression-test-ask-per-bug)).

## 0. Frame the bug (do this first, before any tool)

Parse the user's report into three things:

| Field | What you need | If missing |
| --- | --- | --- |
| **Symptom** | Exact observable: blank page / spinner / 500 / wrong data / empty list / error text | Ask |
| **Location** | Route, feature, or surface (`/`, a specific page, `/account`, an admin surface, an API route) | Ask |
| **Environment** | `production` · `preview` · `local` | Ask |

Ask for any missing field in **one** up-front message, then proceed. Also capture, if offered: when it started, what changed recently, whether it's intermittent, and the exact error text / screenshot.

**Recency is the cheapest lead.** Before anything else, check what changed: `git log --oneline -15` and the last deploy. ~80% of "suddenly broke" traces to the most recent merge or deploy.

### Environment traps — internalize before you act

- **Pushing to a non-production branch never moves production.** The production URL only changes on a deploy from the production branch. "It didn't change after my push" is **expected**, not a bug — verify you're looking at the right URL (the preview alias for that branch, not the production domain).
- **Preview deploys may be auth-protected / noindex.** If a preview URL shows a login or access wall instead of the app, you're diagnosing the deploy platform's gate, not your bug — use the platform's bypass mechanism to reach the actual app.
- **Local has its own trap zoo** (stale dev server, wedged migration prompt) — see [Trap guardrails](#trap-guardrails). A local-only symptom is often a local-env artifact, not a real bug.

## 1. Localize the faulting layer

The request path **is** the decision tree:

`Browser → Next.js (RSC / client / route handler) → [ your database / ORM | external service / third-party API | auth provider | cache / queue ]`

Map the symptom to the most likely layer before opening a tool:

| Symptom | Likely layer | Where to look |
| --- | --- | --- |
| Whole page 500 / blank / build fail | Next.js route or build | Deploy runtime + build logs (e.g. Vercel) |
| A component renders wrong, empty, or errors only in the browser | Frontend render (RSC vs client component) | Server logs for the route + browser console |
| API route / route handler returns 4xx / 5xx | Next.js route handler / API route | The handler code + request/response + server logs |
| Data missing, wrong, or not saving | Server data layer (your database / ORM) | DB queries, ORM logs, the data-access code |
| A list or section renders empty | Frontend render **or** data layer | Trace the fetch: did the data arrive? then where it's consumed |
| Third-party data missing / stale / not syncing | External service / third-party API | The integration's logs + the upstream service's status |
| Login / session / signup broken | Auth / session (your auth provider) | Auth provider logs + the session/middleware code |
| Wrong build, stale assets, env-driven misbehavior | Build / deploy config | Build logs, env var configuration, deploy settings |

For the localized layer, **route into whatever per-service skill or MCP your project has for it** (a database MCP, a deploy-platform CLI/MCP, an error-tracking MCP, an auth-provider skill, etc.) rather than reinventing the diagnosis. If the project has none for that layer, fall back to its CLI and logs.

**Routing discipline:** don't open a tool for a layer you haven't implicated yet. A data MCP is the wrong move on a render-only bug; a deploy-log dive is the wrong move on a logic bug reproducible locally.

If the symptom spans layers or you're unsure, narrow by **eliminating** — if the project exposes a health endpoint that reports per-service status, hit it to see which backend is actually down before guessing.

## 2. Gather diagnostics — broad signal first (CLI), then structured (MCP)

Open the **cheap, broad** signal for the localized layer before the deep one. Lean on the CLI for routine reads/logs; reach for an MCP for structured output, gated queries, or triage the CLI can't do.

> **Deferred MCP tools:** in many setups MCP tool *schemas* are lazy-loaded — only the server name is present until you load it. If a tool you need isn't already available, **`ToolSearch` the server name first** to load its schema before calling it. Don't conclude "the tool isn't available" — search for it.

| Layer | Broad first | Then structured / deep |
| --- | --- | --- |
| Frontend render | Browser console + server logs for the route | The deploy platform's runtime + build logs (e.g. Vercel CLI/MCP) |
| Route handler / API route | Reproduce the request; read its logs | Add logging at the boundary, or step the handler locally |
| Server data layer | The data-access code + ORM/query logs | Your database's MCP/CLI: logs, advisors, run a read query, inspect schema |
| External service / API | The integration's logs | The upstream service's status page / dashboard / its MCP or skill |
| Errors (any layer) | The thrown error text + stack | An error-tracking MCP (e.g. Sentry) for real stack traces — often the fastest jump to cause |
| Auth / session | The session/middleware code + auth logs | Your auth provider's logs / dashboard / MCP |
| Cache / queue | The cache CLI | The cache/queue provider's MCP |

Pull **just enough** to localize and find the first error in the chain — not the loudest one. Read the actual error text / stack trace; don't infer.

## 3. Form an evidence-backed root-cause hypothesis

- State the hypothesis in one sentence, tied to **specific evidence** (a log line, a stack frame, a query result, a diff).
- **Follow the cascade backward.** If the visible symptom is downstream (a page spins because a fetch blocks because a service hung because a migration prompt is waiting), name the *earliest* failing component. Fixing a downstream symptom leaves the real bug live.
- If you have two plausible causes, design the cheapest test that distinguishes them and run it before touching code.
- Check the [Trap guardrails](#trap-guardrails) — this stack has a catalogue of known footguns whose symptom looks nothing like the cause.

State the root cause and the planned fix before editing, in a short line, so the reasoning is on the record.

## 4. Apply the minimal fix

- Smallest change that resolves the **root cause** — not a workaround for the symptom, not an opportunistic refactor.
- Match surrounding code conventions (the project's TypeScript, lint, env-access, and styling rules — see the project's CLAUDE.md / contributing docs).
- **Before a fix that touches many files or any migration/schema change, take a checkpoint / commit a clean restore point** so it's trivially reversible.
- If the fix requires a **safety-gated** action (below), STOP and surface it with the exact command/change for the user to approve — do not execute it.

## 5. Verify the original symptom is gone

A fix is not done until you've **reproduced the original failure path and seen it succeed.** Pick the verification matched to the bug class:

| Bug class | How to verify |
| --- | --- |
| Type / build error | Run the project's typecheck / build and confirm it passes |
| Page won't load / 500 | Load the route (locally, or the preview if it's a deployed-only bug) and confirm it renders without console errors |
| API route error | Hit the endpoint with a representative request; confirm 2xx + correct body |
| Data missing / not saving | Re-query the data layer / reload the surface; confirm the data now appears or persists |
| Login / auth | Walk the actual auth flow in a real browser — session persists, an authed-only check returns 200 |
| External service / sync | Re-trigger the integration; confirm the expected data flows through |
| Backend down | The health check returns ok for that service |

Don't declare victory on "the error disappeared from logs" alone — confirm the **user-facing behavior** works.

## 6. Loop or stop

```
for cycle in 1..6:
  fix → verify
  if verified green:           DONE → go to step 7
  if still broken:             gather MORE diagnostics (the fix taught you something) →
                               refine the hypothesis → next cycle
  if blocked / safety gate:    STOP → report state + the exact gated action / blocker, ask
after 6 cycles still red:      STOP → report everything tried, current best hypothesis, and
                               what you'd try next; ask how to proceed
```

Each cycle should *narrow* — if you're guessing the same thing twice, you're missing a diagnostic; go get it. Never loop silently past a safety gate. Never thrash on the same fix.

## 7. Offer a regression test (ask per bug)

Once green, **ask** whether to add a regression test capturing this bug. Only for **shipped flows that already have test infrastructure** — never against stubbed or unshipped surfaces (those pass meaninglessly). Frame it concretely: "Want a regression test for this? I'd add a [unit/integration/E2E] test asserting [the now-fixed behavior]." If yes, route through the project's test-authoring skill or write it directly.

## Safety gates

Full-auto stops and asks **only** for these. Surface the exact action; never execute without explicit approval:

- **Production DB writes or migrations** (any non-SELECT against prod data; any schema change applied to a live DB).
- **Redeploys** of any service (a production deploy, or any deploy/restart that interrupts a live service).
- **Destructive ops** — drop / delete / truncate / overwrite, deleting indexes, bulk writes.
- **Env var / secret changes** — and never log, echo, or write a secret value anywhere.

Everything else — reading logs/metrics anywhere, read-only MCP queries (incl. prod reads), editing code in the working tree, local typecheck/tests, local DB ops — is in-bounds without asking.

## Trap guardrails (known footguns — symptom ≠ cause)

Some failures mislead because the visible symptom is far from the cause. Common Next.js footguns to rule out before deep-diving:

- **Styling / layout broke after a merge, only locally** → a stale `next dev` serving the pre-merge build graph. Stop the dev server and clear the `.next` cache (and reinstall deps if the lockfile changed). **Never** start editing global CSS to chase a phantom that's just a stale cache.
- **Hydration mismatch / "Text content did not match" / component errors only in the browser** → a client/server boundary issue: a server component using browser-only APIs, non-deterministic render (`Date.now()`, `Math.random()`), or a missing `'use client'`. Find the component reading browser state on the server.
- **Data is `undefined` / a section renders empty only in production** → a fetch that works locally but is cached, blocked, or env-misconfigured in prod. Check the fetch's caching (`fetch` cache / `revalidate` / dynamic), and confirm the env var it depends on is actually set in the deploy environment.
- **A route 500s in production but works locally** → almost always an env var missing in the deploy environment, or a request-time API (cookies/headers/searchParams) used where the route was statically rendered. Read the production runtime log for the actual stack — don't guess.
- **An interactive CLI prompt wedges startup** (a migration tool asking "column renamed? (y/N)", a build asking to confirm) → the process hangs waiting on stdin, and everything downstream of it spins or times out. Answer it in its own terminal, or run that step non-interactively / with the right confirm flag.
- **Auth works via curl but not in the browser** (a session endpoint returns 200 yet the authed check 401s) → a cookie that isn't being sent: missing `credentials: 'include'` on the client fetch, a `SameSite`/domain mismatch, or middleware stripping it. Inspect the actual `Set-Cookie` and the request's cookie header.
- **A type / build error appears in generated or vendored code you didn't touch** → likely drift in a generated artifact, not your change. Regenerate it (run the project's codegen / type-generation step) before treating it as a real type error.

## Done report

When green (or stopped), close with a short, scannable report:

- **Symptom** (what was broken) → **Root cause** (the earliest failing thing, with the evidence) → **Fix** (what changed, which files).
- **Verified by** (the exact check you ran and its result).
- **Cycles** used; any traps hit.
- If stopped: current best hypothesis + the gated action or blocker + what you'd try next.
- The regression-test question.

Plain English, no internal identifiers. Never commit; the user commits.
