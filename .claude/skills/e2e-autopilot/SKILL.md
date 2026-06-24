---
name: e2e-autopilot
description: Drives a headless browser via the Playwright MCP server to satisfy a user-specified success criteria, with bounded self-healing on transient failures. Use this skill whenever the user types /e2e <criteria>, "verify a user can <do X>", "drive a browser and prove <Y>", "make sure the checkout/flow actually works end-to-end", "confirm the form submits in a real browser", or describes a multi-step user flow they want executed live against the app. Also use it preemptively when a task can ONLY be confirmed by clicking through the UI (not by reading code) — that is the autopilot pattern. The skill enforces a hard budget (3 inner heal attempts per step, 8 outer iterations, 10-minute global timeout) so the loop never grinds forever, and it distinguishes "selector drift / wait race" failures (heal and retry) from "URL changed / console error / element genuinely missing" failures (STOP, report bug, do not retry). On success, the skill offers to codify the working flow into a Playwright spec file under a tests/e2e/generated/ directory via the native Playwright `generator` Test Agent. Never drive a live browser ad-hoc without going through this skill; the bounded healing and codify-after-success behavior are the whole point.
---

# E2E Autopilot

You are driving a real headless browser, via the Playwright MCP server, against the app. The user gave you a success criteria. Your job is to satisfy it, recover from brittleness, and stop the moment you hit a real bug.

The reason this skill exists: a naive "click around until it works" loop wastes context and creates wrong-shaped tests. Bounded healing + early-stop-on-real-bug + codify-after-success is the pattern that actually scales.

Commands below use `pnpm exec`; substitute your project's package manager (`npx` / `yarn` / `bunx`) as needed.

## 0. URL resolution (do this first)

Default target is the **latest deployed preview** (the per-PR/per-branch preview URL your host builds, e.g. Vercel/Netlify). Local dev is too slow and flaky for an iteration loop (cold compile + cold backends can be 15–30s per first hit).

| User prompt contains... | Target |
| --- | --- |
| `--local`, "localhost", "local dev", "before push" | `http://localhost:3000` (or the project's dev port) |
| `--prod`, "production" | **STOP** — refuse. Production is for `/smoke` only, never `/e2e`. |
| Anything else (default) | Latest deployed preview URL |

To resolve the latest preview, ask the host. If there's an open PR, the deploy check usually exposes the preview URL — for example:

```powershell
gh pr view --json statusCheckRollup --jq '.statusCheckRollup[] | select(.targetUrl != null) | .targetUrl' | Select-Object -First 1
```

If no PR is open or no preview check is found, fall back to the most recent successful deployment URL via your host's CLI (e.g. `vercel inspect` / `vercel ls`). If that also fails, ask the user for the URL. Do not silently fall back to localhost — that defeats the smart-switch default.

Once resolved, set `E2E_BASE_URL` in the environment for the MCP session.

## 1. The autopilot loop

A single outer iteration is one "attempt to satisfy the criteria." The skill caps outer iterations at **8**. Each outer iteration runs the sub-loop below.

```
parse criteria into an ordered list of intents (e.g.,
  ["land on home",
   "click an item link",
   "see detail page with item title",
   "click add to list",
   "see the list drawer with the item"])

for iteration in 1..8:
  for intent in intents:
    snapshot = browser_snapshot()      # accessibility tree
    action = decide_next_action(intent, snapshot)
    success = try_action(action, max_inner_attempts=3)
    if not success:
      classify_failure()
      if classification == REAL_BUG:
        STOP. Report. Do not retry.
      if classification == SELECTOR_DRIFT or WAIT_RACE:
        continue (already retried inside try_action)
      if classification == UNKNOWN:
        STOP. Report. Do not retry.
  if all intents satisfied:
    SUCCESS. Offer to codify.
```

## 2. Bounded healing — the inner loop (per step)

Three attempts. No more. The healing decision tree:

**Attempt 1 — semantic locator swap.**

- Re-snapshot. Diff against last-success snapshot for the same intent.
- If the target element is missing but a semantically equivalent one exists (same `role` + matching accessible name, or same `aria-label`), swap to that locator.
- Retry the action.

**Attempt 2 — wait for interactivity.**

- If the element exists but the snapshot shows `disabled`, `aria-busy="true"`, or it's outside the viewport, insert a `browser_wait_for` (max 5s) and retry.

**Attempt 3 — last chance re-snapshot + retry.**

- One fresh `browser_snapshot()` (sometimes the UI just needed a beat after a state change).
- Retry the action.

If all three attempts fail, classify the failure (next section). Do not extend the budget.

## 3. Failure classification — when to stop, when to heal

After three failed inner attempts, classify:

| Signal | Classification | Action |
| --- | --- | --- |
| URL changed unexpectedly (e.g., redirected to `/error`, `/sign-in`, or away from expected page) | REAL_BUG | STOP. Report URL drift and likely cause. |
| `browser_console_messages` shows a JS error logged after our action | REAL_BUG | STOP. Quote the console error. |
| The snapshot shows an error banner, "Something went wrong," 4xx/5xx text, or a stack trace | REAL_BUG | STOP. Quote what's on screen. |
| The expected element type exists multiple times and is ambiguous (no unique accessible name) | UI_AMBIGUITY | STOP. Ask the user which one was meant. Do not guess. |
| Element doesn't exist AND no semantically equivalent option exists | REAL_BUG | STOP. Report what was expected vs. what's on screen. |
| Action timed out but no error signal | UNKNOWN | STOP. Report the timeout and the snapshot. |
| Same selector worked before, now intermittently fails, no error signal | SELECTOR_DRIFT | (Already healed inside the inner loop; if outer iteration also fails, treat as REAL_BUG.) |

**Hard rule: never blindly retry past 3 inner + 8 outer iterations.** A loop that ran 50 actions burned tokens and probably hid a real bug under noise.

## 4. The action log

Maintain throughout the run:

```ts
type ActionLogEntry = {
  intent: string                 // human-readable, from the criteria parse
  locator_ref: string            // the `ref` from browser_snapshot
  generated_locator: string      // result of browser_generate_locator(ref)
  action: "click" | "type" | "fill_form" | "select_option" | "press_key" | "wait_for"
  args?: unknown
  assertion?: string             // e.g., "page contains text 'Added'"
  iteration: number              // outer iteration count when this succeeded
}
```

`browser_generate_locator(ref)` is the killer feature here — it converts a transient `ref` into a stable Playwright locator string (preferring role + accessible name) that survives codification. Call it **after every successful interaction**, not at the end.

## 5. Success → codify

On full criteria satisfaction, ask the user:

> All intents satisfied in {N} iterations. Codify into a Playwright spec at `tests/e2e/generated/<slug>.spec.ts`? (yes / no / edit slug)

(Use your project's actual test directory — `tests/e2e/generated/` at the app root, or `apps/web/tests/e2e/generated/` in a monorepo.)

If yes, **delegate to Playwright's native `generator` Test Agent** (installed via `playwright init-agents --loop=claude`) with the action log + the original success criteria. Do NOT roll a custom template renderer.

The generator writes the spec. Open the file and prepend:

```ts
// AGENT-GENERATED <YYYY-MM-DD> — review before merge. Brittle until human-validated.
// Criteria: <original user prompt verbatim>
// reviewed-by:
```

Keep the `// reviewed-by:` header empty on purpose — if your CI enforces a review-marker grep gate, it refuses the file until a human fills it in. Don't bypass that gate.

After writing the file, suggest the user run it locally once (`pnpm exec playwright test tests/e2e/generated/<slug>.spec.ts`) before opening a PR.

## 6. Failure → report (do not patch)

If you stopped because of a REAL_BUG / UI_AMBIGUITY / UNKNOWN:

- **Do not write a spec file.** A codified spec of a buggy flow is worse than no test.
- **Do not "fix" the app code unprompted.** This skill drives browsers; it doesn't ship fixes. Surface and stop.

Report shape:

```
e2e-autopilot STOPPED at iteration {N}, intent {M} ("…").

What happened:
- {action attempted, e.g., "click button with name 'Add to List'"}
- Inner heal attempts: 3 (all failed)
- Classification: {REAL_BUG / UI_AMBIGUITY / UNKNOWN}

Evidence:
- URL: {before → after}
- Console: {any errors}
- Snapshot excerpt: {the relevant subtree, ~10 lines}

Likely cause:
- {one or two sentences}

Recommended next step:
- {investigate code path X / open issue / ask user to clarify expected UI / try /e2e --local to rule out preview drift}
```

Quote the actual snapshot. Don't paraphrase. The user needs the real evidence to triage.

## 7. Hard budget

- **8 outer iterations** max.
- **3 inner heal attempts** per intent, max.
- **10-minute global timeout** for the whole run. If exceeded, stop with a TIMEOUT classification.

If you blow the budget on a simple-sounding criteria, that's a signal the app or the criteria is wrong. Don't extend the budget — surface and stop.

## 8. Tool reference (Playwright MCP)

These are the tools you actually use. If they're pre-allowlisted in your settings (`mcp__playwright__browser_*`), there are no per-call permission prompts.

| Tool | When |
| --- | --- |
| `browser_navigate` | First action of every run, then on any expected URL change |
| `browser_snapshot` | Before every action and on every healing attempt — this is the accessibility tree, not a screenshot. 2–5KB of structured data. |
| `browser_click` | After a snapshot identified a `ref` |
| `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_press_key` | Form interaction |
| `browser_wait_for` | Healing attempt 2 — element exists but not interactive yet |
| `browser_evaluate` | Last resort for an assertion the accessibility tree can't express |
| `browser_console_messages` | After every failed action — classifies REAL_BUG vs SELECTOR_DRIFT |
| `browser_network_requests` | When you suspect a failed API call (404 on a fetch the page depends on) |
| `browser_verify_text_visible`, `browser_verify_element_visible` | Assertions inside an intent |
| `browser_generate_locator` | After every successful interaction — for the codify step |
| `browser_take_screenshot` | Only on REAL_BUG report, never speculatively (screenshots are bigger than snapshots and not what the codified spec uses) |
| `browser_tabs` | Multi-tab flows (rare — a payment/redirect that opens a new tab is the main case) |

## 9. What success looks like

Typical happy path, "verify a user can navigate from home to an item detail page and see the item title":

1. Resolve URL → latest deployed preview.
2. `browser_navigate(<preview>)` → `browser_snapshot()`.
3. Intent 1: "land on home" — verify home loaded → 1 action, 0 heals.
4. Intent 2: "click into a category" — locator `link "Products"` → click → snapshot → 1 action, 0 heals.
5. Intent 3: "see item list" — wait for `heading "Products"` → 1 action, 0 heals.
6. Intent 4: "click first item" — first `link` under the item grid → click → snapshot → 1 action, 0 heals.
7. Intent 5: "see detail page with item title" — assert `heading` matches the link text → 1 assertion.
8. Done in 1 outer iteration, 5 actions, ~30 seconds.
9. Ask: codify? Yes → write `tests/e2e/generated/item-detail-navigation.spec.ts`.

Sub-30-second satisfaction is the target shape. Anything significantly longer is either a real bug or a sign the criteria is fuzzy and should be re-asked.
