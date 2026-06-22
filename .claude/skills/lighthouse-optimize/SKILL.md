---
name: lighthouse-optimize
description: Audit-and-recommend tool for web performance + accessibility of a Next.js route. Runs Lighthouse on a route, deepens the diagnosis with Chrome DevTools MCP traces + Core Web Vitals insights, grounds every fix in the React/Next best-practices rules + current Next docs, and presents a findings + risk-rated fix plan in a coverage-table format — then ASKS what to do and changes nothing until you choose (proceed with all fixes / critical only / only non-visual fixes / a custom set). It does NOT auto-fix and does NOT loop. Triggers on the /speedtest command, "check the performance of <route>", "audit performance on <route>", "is <route> fast/accessible", "improve web vitals", "lighthouse <route>", "why is <route> slow", "make the homepage faster", and any request to measure, audit, or improve the speed or accessibility of a page. Defaults to auditing the staging/preview deploy; honors the target the user names (local, production, or a pasted URL). Use it whenever performance or runtime accessibility of a specific route comes up.
---

# Lighthouse Optimize — audit, recommend, then fix only what's approved

This is an **audit-and-recommend** tool, not an autonomous fixer. The shape of one run:

> **Run the audit → diagnose → develop a plan → present findings + a risk-rated fix table (like `/audit`) → ask what to do.** Change nothing until the user chooses. Then execute *only* the chosen subset, re-audit once to confirm, and report.

**No loops.** One audit, one plan, one decision point, one execution of the approved set, one confirming re-audit. Don't iterate passes on your own.

Two principles still govern any fixing that happens after approval:

- **"Good" is the target, not a perfect score** (the bar is in Step 4). Don't propose changes that only exist to chase a 100 — they're the destructive ones.
- **Never break the design to make a number go up.** Prefer additive, reversible fixes; preview visual changes before applying (see "Show, don't tell"). The risk column in the plan exists precisely so the user can see what each fix might break before saying yes.

If the project keeps a performance-conventions doc (e.g. a `PERFORMANCE.md`), read it once at the start for any stack-specific rules.

**Bundled references (read at the step that needs them):**

- `references/chrome-devtools-mcp.md` — the live-diagnosis + visual-preview recipes (trace → CWV insights, network waterfall, emulation, inject-CSS preview, Playwright fallback). Read before Step 3 tracing and the Step 5 preview.
- `references/grounding-fixes.md` — how to ground each fix: the `vercel-react-best-practices` finding→rule map, `next-devtools` for the current Next `next/dynamic`/SSR/streaming API, and `context7` for non-Next libs. Read while building the plan (Step 4).
- `references/bundle-and-waterfall-smells.md` — the concrete bundle + network-waterfall smell checklist (icon/animation/date/chart libs, barrel imports, client-importing-server, too many `'use client'`, heavy SDKs, image/font/third-party issues; and the waterfall smells: slow API, large JS, blocking CSS, duplicate images, uncached assets, font delays, slow TTFB). Each maps to a detection method + the rule + the fix. Read during Step 2 (pre-scan) and the Step 3 bundle/waterfall diagnosis.

## Step 1 — Resolve the target from the user's words

**The user usually names the target when they invoke** (a pasted URL, "local",
"production"). When they don't, **default to the project's staging/preview deploy**
(the URL that updates on every deploy and reflects the latest shipped code). If you
don't know that URL, ask for it or check the project's deploy config. Audit that
unless the user names something else.

**On Windows, run the lighthouse `<route>` command via PowerShell, not the
Bash tool.** Git Bash / MSYS rewrites a leading-slash route (`/` → a filesystem path
like `C:/Program Files/Git/`) and the runner aborts with a "looks like a Windows
path" error — a wasted run. (If you must use bash, escape the route as `//`.)

| User says (examples) | What to do | Runner invocation |
|---|---|---|
| nothing specific (default), "staging", "preview", "the preview deploy" | Audit the preview deploy remotely. | `--target=remote --base-url=<preview-url>` |
| "local", "local dev" | Build the app, then audit the **production build** (not the dev server). The runner auto-picks a **free port** for the start server so it never collides with a running dev server. **If the build fails, STOP and report it** — don't fall back to the dev server. | `--target=build` |
| "production", "the live site" | Audit production verbatim. | `--target=remote --base-url=<production-url>` |
| a pasted URL | Audit that URL verbatim. | `--target=remote --base-url=<url>` |

**Auth-protected previews:** a public preview URL needs no auth. But a deploy host can put a *protected* preview behind a login wall — an anonymous audit then silently measures the login page instead of your app. If the project's runner supports a bypass header (e.g. a protection-bypass secret read from a local env file and sent as a request header), let it handle that; otherwise audit a public URL.

**When auditing locally, always use the production build, never the dev server** — HMR, the error overlay, the devtools hook, and un-minified bundles distort the numbers, and the dev server usually owns the default port. (A `dev` target is a discouraged manual escape hatch only.)

**Remote is measurement only:** the preview URL reflects the *last deploy*, so **local edits won't show up there until pushed + redeployed** — this matters for the confirming re-audit in Step 5 (see the note there). Confirm the URL you audit actually tracks the branch you changed.

The runner writes its reports under the app's lighthouse history directory, keyed by `<route>/<ts>-<target>/{desktop,mobile}/`.

## Step 2 — Quick static pre-scan (read-only — gather, don't fix)

Grep the route's component tree for issues a full audit will confirm, so they're already in hand when you build the plan. **Do not fix anything here** — this is data collection. Note any of:

- `'use client'` on a component that only renders children / has no hooks/handlers.
- raw `<img>` instead of `next/image` (or your image CDN's `<Image>` wrapper); images missing `sizes`/dimensions.
- Google Fonts `<link>` instead of `next/font`.
- data fetching in `useEffect` that belongs server-side.
- env access patterns that violate the project's conventions (e.g. raw `process.env` outside a central env module, if the project enforces one).
- **`vercel-react-best-practices` smells:** barrel imports (`bundle-barrel-imports`), a heavy client lib (an animation library, charts, an editor) imported into a server shell that ships it everywhere (`bundle-dynamic-imports`), sequential `await`s that could be parallel (`async-parallel`, `server-parallel-fetching`), default-loaded third-party scripts (`bundle-defer-third-party`).

Work the full **`references/bundle-and-waterfall-smells.md`** checklist here — it's the structured version of the above (icon/animation/date/chart libs, client-importing-server, too many `'use client'`, heavy SDKs in the client bundle, image/font/third-party issues) with a detection method + rule + fix for each. Cross-reference `references/grounding-fixes.md` for the rule→finding map. Don't fix anything — these become rows in the plan.

## Step 3 — Run the audit & diagnose

Run the runner against the resolved target. From both `desktop/` and `mobile/` JSON reports extract, **as-measured** (no rounding):

- Category scores (performance, a11y, best-practices, SEO)
- Core Web Vitals: LCP, CLS, TBT, FCP, Speed Index, TTFB
- Top `opportunities` by `details.overallSavingsMs`; top `diagnostics` by `wastedMs`/`wastedBytes`
- LCP element selector (`largest-contentful-paint-element`) — quote it verbatim
- Accessibility failures (e.g. `color-contrast`, `target-size`, `label`, `image-alt`) with their elements

Diff against the most recent **same-target** baseline under the lighthouse history directory for that route (compare the saved run metadata; ignore other-target runs). Call out regressions.

**A non-zero exit from the runner is usually the budget gate, not a crash.** The runner exits 1 when any variant breaches a budget (e.g. mobile LCP > 2500) — the JSON/HTML reports are still written to `.lighthouse-history/...`. Read them and continue; never report the audit itself as "failed" on a non-zero exit.

**Know your throttling method.** The mobile config uses Lighthouse's default **`simulate`** (lantern) — it *models* a slow phone rather than applying real throttling, which can inflate JS-bound metrics (see the observed-vs-simulated check below). For a more realistic number on demand, re-run with `--throttling=devtools` (applies real CPU/network throttling via the DevTools protocol — slower, occasionally higher-variance); `--throttling=provided` disables LH throttling entirely. Default stays `simulate`.

### Diagnosing a stubborn metric — Chrome DevTools MCP is the primary lens

The Lighthouse JSON gives you the *scores and budgets*; **Chrome DevTools MCP
gives you the *why*** via real traces + structured Core Web Vitals insights.

**First, check whether the metric is even real — compare observed vs simulated.** `audits['metrics'].details.items[0]` carries the *observed* trace timings (`observedLargestContentfulPaint`, `observedFirstContentfulPaint`) next to the headline `audits['largest-contentful-paint'].numericValue`, which is Lighthouse's *simulated-throttling (lantern)* estimate. If observed LCP ≈ observed FCP but the reported LCP is far higher **and the LCP element is text** (not an image), the gap is the lantern model penalizing total **JS bytes + main-thread work** — not a slow image/font. The fix class is then "reduce/defer JS", and the report must say plainly that real-user paint is ≈ the observed value while the lab gate reflects the simulation — don't send the user chasing an image/font fix for a JS-bound number. (`--throttling=devtools` will give a less inflated number; the true arbiter is field data, not a single lab run.)

Then go deeper — the data is layered, work it in this order:

1. **Mine the Lighthouse JSON first (free, on disk).** It already names most culprits and is the budget/history source of truth.
   - `audits['largest-contentful-paint-element']` → the LCP node + phase breakdown (TTFB → load delay → load time → render delay). The dominant phase names the fix class: render-delay → render-blocking CSS/JS; load-delay → discovery/preload; TTFB → server/data.
   - `audits['network-requests']` → the request waterfall (`startTime`/`endTime`/`transferSize`/`resourceType`).
   - `audits['prioritize-lcp-image']`, `['lcp-lazy-loaded']`, `['uses-rel-preload']`, `['render-blocking-resources']`, `['server-response-time']`.
2. **Record a trace with Chrome DevTools MCP for any non-obvious metric — this is the default, not a fallback.** `navigate_page` to the exact URL, then `performance_start_trace { reload: true, autoStop: true }`, then `performance_analyze_insight` on the named insights (`LCPBreakdown`, `LCPDiscovery`, `RenderBlocking`, `DocumentLatency`, `NetworkDependencyTree`, `CLSCulprits`, `ThirdParties`, `ForcedReflow`, …). Use `list_network_requests` for the live waterfall and `list_console_messages` for hydration/asset errors. To make the trace comparable to **mobile** Lighthouse, `emulate` 4× CPU + Slow 4G + a mobile viewport first. **Full tool-by-tool recipes (incl. emulation, live LCP confirmation, and the Playwright fallback) are in `references/chrome-devtools-mcp.md` — read it before tracing.**
3. **Fallbacks when Chrome DevTools MCP is unavailable** (e.g. its browser profile is locked — this happens). Two options: (a) a **bundled Playwright waterfall capture** if the project has one (point it at a **production build or deployed URL**, never the dev server) that dumps every request's url/type/status/size/timing to a JSON file for the §B smells in `references/bundle-and-waterfall-smells.md`. (b) **Playwright MCP** for ad-hoc live inspection. Neither has the insight engine, so you reason from the raw requests + `PerformanceObserver` entries. The Lighthouse JSON's `network-requests` audit (already saved every run) covers the same waterfall if you just need the numbers.

Confirm the cause before writing a fix into the plan — a verified diagnosis makes the plan trustworthy. Quote the insight's numbers + named element/URL **verbatim**.

### Ground the fix before you write it into the plan

As soon as a finding implies a *fix*, line up its grounding (you'll cite it in the plan's "Proposed fix" cell):

- **`vercel-react-best-practices`** — name the rule that fixes it (`bundle-dynamic-imports`, `async-parallel`, `rerender-memo`, …). The finding→rule map and how to cite it live in `references/grounding-fixes.md`.
- **`next-devtools` (`nextjs_docs`)** — for any **Next.js API** in the fix (`next/dynamic`/lazy-loading, SSR/streaming, caching). It reads the *installed* Next docs, so it never serves a pattern that broke in a newer major.
- **`context7`** — to survey current Next.js optimization guidance and as the doc source for any **non-Next** library a fix touches (Tailwind, your image CDN, a data SDK, …).

## Step 4 — Build the plan, present it, and ask (no edits in this step)

**Measure against "good":** the page is "good" when, on **both desktop and mobile**, Core Web Vitals are green (LCP ≤ 2500ms, CLS ≤ 0.1, TBT ≤ 200ms) **and** Performance ≥ 90, a11y/best-practices/SEO ≥ 95. If the project defines its own budgets (e.g. a lighthouse-assertions file), treat those as the hard gate. The plan's job is to show the gap to "good" and exactly what would close it — not to chase a perfect 100.

**Synthesize each finding** into a row with: the issue (+ evidence `file:line`), the proposed fix (**cite the `vercel-react-best-practices` rule id when one applies**, e.g. *"code-split the reviews carousel (`bundle-dynamic-imports`)"* — it tells the user the fix is a canonical pattern, not improvised), an **impact** rating (how bad the problem is / how big the win), and — critically — a **risk** assessment of *applying the fix*: what could regress or break, and a level.

**Don't propose a fix the framework already handles or that can't move a Vital — verify effect before writing the row.** Recurring false positives in this stack that should be *skipped with a one-line rationale*, not turned into work:

- **`legacy-javascript` / browserslist** — modern Next already targets a modern baseline and serves the `nomodule` polyfill *only* to browsers that need it (confirm via `next-devtools` → "Supported Browsers"). Adding a `browserslist` usually changes nothing safe; a stricter one trades real browser support for bytes modern users never download.
- **`render-blocking-resources` (CSS)** — render-blocking CSS is *correct* by design (it prevents a flash of unstyled content). A large CSS chunk + a slow time on the network-dependency-tree is usually the slow-4G lantern, not a real delay. The one lever, Next's `experimental.inlineCss`, loses cross-page CSS caching, re-sends CSS in every HTML/RSC payload, and is "not recommended for production" — it's a measured 🟡 *experiment* (enable → build → audit → keep or revert), never a free win.
- **Favicon / non-render-path assets** — a large `icon.svg`/favicon is async + low-priority and gates no Core Web Vital, so "shrink it" is polish at best. A real shrink usually means re-exporting a brand asset (a design task), not a perf edit.

### Risk assessment (fill this honestly — it's the point of the table)

For every proposed fix, state the concrete risk of doing it and rate it. Consider:

- **Regression risk** — could it move another metric the wrong way, or shift layout?
- **Functionality risk** — could it break behavior? Specifically watch for: **animations** (deferring/lazy-loading a component that has an entrance/scroll animation, or an animation-library bundle), **tracking/analytics** (moving a script to `lazyOnload` or deferring it can delay or drop pageview/event beacons), **loading out of sequence** (deferring something another script or component depends on; hydration order), and **edge cases** (works on desktop but breaks a mobile breakpoint; empty/loading/error states; logged-in vs out).
- **Visual risk** — does it change what the user sees (a design-affecting change)? If yes it's at least Medium and must be previewed.

**Risk levels:**

| Level | Meaning |
|---|---|
| 🟢 Low | Additive, reversible, no visual or behavioral change (add `sizes`/`priority`/`preload`, reserve space, add a cache hint, push a `'use client'` leaf deeper, add `alt`/`aria`). |
| 🟡 Medium | Touches visuals or a shared theme token, or reorders loading; could affect appearance, animation timing, or analytics timing. Needs a preview and/or careful verify. |
| 🔴 High | Removes/replaces an asset (font weight, dependency, image), defers something above the fold, or changes execution order in a way that could break functionality (analytics not firing, animation not triggering, a load-order dependency, an edge case). Always requires approval + preview; never "just apply it." |

### Present it as a coverage table, then plain English

Write the plan to a self-contained `.lighthouse-plan.md` in the app directory and render this in chat:

**1. Header line** — target, scores, and the gap to "good".

> Audited `/` (build, desktop/mobile): **Perf 78 / 71**, LCP **3.1s / 4.2s** (over budget), CLS 0.02 / 0.04, a11y **88 / 88**. Gap to "good": LCP + a11y on both, Perf score on both.

**2. Findings & fix table.** One row per finding. Columns: `#`, `Finding`, `Impact`, `Proposed fix`, `Risk if applied`, `Risk`.

- **Impact** emoji (severity of the *problem*): 🚨 Critical (budget breach / a11y failure / a project-convention violation) · 🔥 Big win · ⚡ Quick win (small change, outsized gain) · 🔧 Cleanup · ✨ Polish · ✅ Already good.
- **Risk** emoji (risk of the *fix*): 🟢 / 🟡 / 🔴 per the table above.
- **Risk if applied** cell: the specific regression/functionality/sequence/edge risk in a clause or two (or "none — additive" for 🟢).

> | # | Finding | Impact | Proposed fix | Risk if applied | Risk |
> |---|---------|--------|--------------|-----------------|------|
> | 1 | Hero image has no `priority`; it's the LCP element and loads late (`Hero.tsx:42`) | 🔥 | Add `priority` + `sizes` to the hero image | None — additive hint, no visual change | 🟢 |
> | 2 | Analytics script loads with default strategy, ~180ms main-thread block (`layout.tsx:31`) | ⚡ | Wrap in `<Script strategy="lazyOnload">` | **Analytics:** lazy load can delay/drop early pageview events — verify the first pageview still fires | 🟡 |
> | 3 | Body font ships 5 weights; only 3 used | 🔧 | Drop weights 200 & 800 from `next/font` | **Visual/regression:** a weight could be used somewhere grep missed — must preview before applying | 🔴 |
> | 4 | `.hero-cta` contrast 3.8:1 (need 4.5:1) (`Hero.tsx:51`) | 🚨 | Darken text token to pass AA | **Visual:** changes the CTA color (and the token elsewhere) — preview + variants | 🔴 |

**3. Plain English (ELI5).** A short bullet per fix worth doing — what's wrong + what we'd do, no unexplained jargon, ordered by impact. Call out the risky ones in plain terms ("this could make analytics miss the first page view, so we'd check that").

**4. Then ask — via `AskUserQuestion` (so it survives auto/bypass mode). Change nothing until the answer.** Options:

1. **Proceed — apply all proposed fixes** (visual ones still get a preview before they land).
2. **Critical fixes only** — just the 🚨 rows (budget breaches + a11y failures).
3. **Only fixes that won't impact visuals** — the 🟢/non-visual rows; skip anything that changes what's on screen.
4. *(Other is offered automatically — the user can name exactly what to fix or what to leave alone.)*

## Step 5 — Execute only the chosen subset (then confirm once)

1. **Checkpoint first.** Before the first edit, snapshot the working tree non-destructively and tag it: run `git stash create` (empty if clean → use `HEAD`), then `git tag speedtest-checkpoint-<safeRoute>-<ts> <SHA-or-HEAD>`. (PowerShell: `$sha = git stash create; if (-not $sha) { $sha = "HEAD" }; git tag <tag> $sha`.) Tell the user the tag — *"say 'roll back the speedtest' to restore."* Rollback = `git checkout <tag> -- .` + remove any files the run created; their pre-existing uncommitted work is inside the snapshot, so it survives.
2. **Apply only the chosen fixes,** following the patterns + "Non-destructive by default". Apply non-visual fixes directly. For any **visual** fix in the chosen set, run the **Show, don't tell** preview-confirm before writing it (the table said *that* it's visual; the preview shows *what it looks like*).
3. **Re-audit once** to confirm. **Mind the target:** the edits are local, so a `remote` re-audit (incl. the default preview URL) **won't reflect them until redeployed** — confirm against `--target=build` locally instead, and say plainly that the preview/prod number won't move until the next deploy. For a `build` target, rebuild first. Report baseline → result for each Vital + score, and whether "good" is now met. **Don't diff local-build *absolute* numbers against a remote baseline:** locally any backing services (commerce/CMS/API) may be unreachable, so the page renders with empty/degraded content, and the lantern environment differs — local mobile LCP can read *worse* than the remote it actually improved. Compare local→local; treat the environment-independent results (a11y, contrast/structural deltas) as the trustworthy cross-target signal, and say which is which.
4. **If a metric regressed,** say so plainly and offer to roll back (via the checkpoint) or to revert just that change — **do not loop back to pick more fixes on your own.** The run ends after this confirming audit; the user starts a new `/speedtest` if they want another round.

Append the outcome to the `.lighthouse-plan.md`.

## Step 6 — Deploy-and-verify (opt-in: confirm on the preview when local can't audit the route)

This is the **same single confirming re-audit** as Step 5.3 — just relocated to the deploy, for the case where a local build *can't* render the route. A detail/product page that depends on live backend data is the canonical example: that data is unreachable in a local build, so `--target=build` `notFound()`s to a 404. Remote, meanwhile, won't reflect local edits until they're shipped. So the only way to confirm those fixes is to deploy and audit the preview.

**This mode commits + pushes. If the project's convention is "the user commits," it runs ONLY on explicit user opt-in** — treat that opt-in as the authorization; do not enter this mode on your own. The secret-scan gate below is never skipped, opt-in or not.

The flow (one pass, then stop — not a perpetual loop):

1. **Commit + push through a secret-scanned flow** (never a raw commit):
   - `git add -A`, then run the **BLOCKING** secret scan (`gitleaks protect --staged --redact --no-banner`, or a pattern scan if gitleaks is absent). **On any hit: STOP, do not commit, do not push** — report + remediate.
   - Commit with a concise conventional message describing the fixes; push. Never force-push; if the remote is ahead, report and stop. Capture the SHA: `git rev-parse HEAD`.
2. **Poll the deploy** for that SHA. On Vercel, the `vercel` MCP tools are deferred — `ToolSearch` the `vercel` server first. Read `projectId`/`orgId` from `.vercel/project.json`, then `list_deployments` to find the deployment whose `meta.githubCommitSha` == HEAD, and `get_deployment` to read its state. Poll until `READY` (or `ERROR`/`CANCELED`). **Bound the wait:** schedule a wakeup between polls (preview builds run minutes, so ~90–270s apart, cap ~10 min) — never busy-wait. On `ERROR`, pull the build logs, report the failure, and stop.
3. **Confirm the URL you're about to audit actually serves that build — don't just SHA-match the list.** An alias can lag behind the newest deployment, so resolve the deployment by the alias hostname and verify its `githubCommitSha` == HEAD **and** it's `READY` **and** the hostname is in its `alias` array. Only then is the audit measuring your fix. (Skipping this risks "confirming" against a stale build — quote the resolved deployment id + SHA in the report so it's auditable.)
4. **Audit the working URL remotely** once the alias is confirmed to serve HEAD — `--target=remote --base-url=<that alias>` on the route you were fixing. Report baseline → result for each Vital + score, the **deployment id + commit SHA you verified**, and whether budgets/"good" are now met.
5. **Stop.** One deploy, one confirming audit. If something still fails, report it — don't auto-open another fix pass.

## Non-destructive by default — never break the design to chase a score

When executing approved fixes, sort each into a bucket:

**Safe / additive (apply directly).** Adds info/hints without removing or visually changing anything: `sizes`, `priority`, `fetchPriority`, `loading`/`decoding` hints, `preload`, explicit `width`/`height`/`aspect-ratio`, `<Suspense>`, cache directives, `revalidateTag`, pushing a `'use client'` boundary deeper, code-splitting a genuinely below-the-fold/interaction-only widget, adding `alt`/`aria`/labels.

**Design-affecting / behavior-affecting (preview or confirm first).** Removes or changes something visible or depended-on: removing/subsetting a **font** weight or changing `font-display`; dropping/replacing a **dependency**; removing/replacing/resizing an **image**; lazy-loading/deferring something **above the fold** or that carries an **animation** or **analytics**; reordering script/load sequence; removing a component/effect. For these: **check usage first** (grep — a passing build is necessary but not sufficient; a font can silently fall back), prefer the non-destructive twin (preload the weight instead of removing it; dynamic-import a dep at its interaction; right-size the same image), and if it's visual, **preview it** (below). These should already carry a 🟡/🔴 risk in the plan, so the user approved them knowing the risk — but still preview visual ones before they land.

### Show, don't tell — preview every visual change before applying it

The user can't judge a color/size change from a diff. For any visible change in the approved set, render it first with the **Chrome DevTools MCP** (Playwright is the fallback). Against the running page (`navigate_page` to a build server, or the deployed URL if a protection-bypass token is already in place), the loop is: screenshot **before** at desktop + mobile (`emulate` the viewport), `evaluate_script` to inject the change **as a CSS override on the same token/selector the real edit will change** (no rebuild — contrast fixes are almost always a CSS custom property, e.g. a `--color-*` token), screenshot **after**.

The principles that make a preview useful:

- **Offer 2–3 variants** where the choice is aesthetic (darken foreground / adjust background / use an existing accessible token); screenshot each.
- **Show the blast radius** — a shared token is global; screenshot one or two *other* places it's used and name what else is affected.
- Post the screenshots with each option's change + metric delta ("#1a1a1a → 4.9:1, AA"), and ask via `AskUserQuestion`: *Apply A / Apply B / Tweak / Skip*.
- On approval, write the real token change (following the project's styling conventions); the Step 5 confirming re-audit picks it up.
- **Batch** multiple visual previews into one approval round; don't pester per fix.

The exact tool calls (inject-CSS snippet, viewport strings, blast-radius shots, Playwright fallback) are in `references/chrome-devtools-mcp.md` §6.

## Fix patterns by category

**Images** — use `next/image` (or your image CDN's `<Image>` wrapper for assets served by that CDN). `priority` on exactly one image (the LCP element). Always `sizes`. A `placeholder="blur"` (or the CDN's low-res blur transform) for above-fold heroes.

**JavaScript / bundle** — if the app builds with **Turbopack**, analyze with the **Turbopack** analyzer, not the webpack one (`@next/bundle-analyzer` is a webpack plugin and won't hook a Turbopack build): run the project's `analyze` script (interactive treemap with per-module **import-chain tracing** — click a module to see exactly who pulls it in) or its `analyze:output` variant (writes a diagnostics dir for before/after diffing — fits this skill's baseline→fix→re-audit model). It's `next experimental-analyze` under the hood — *experimental*, so the UI may shift between Next releases. For a webpack build, use `@next/bundle-analyzer` instead. `npx depcheck` for unused deps. Move client-only library code into `'use client'` leaves, not wrapping parents (`bundle-barrel-imports`, `bundle-analyzable-paths`).

**Read "unused JavaScript" honestly — two traps that waste a round.** (1) The audit counts bytes *downloaded but not executed during the load trace*. Code that's correctly **idle-deferred** (an analytics SDK, a database/auth client, anything behind `requestIdleCallback` or a `next/dynamic`/`await import()` that fires inside the trace window) reads as ~84–99% "unused" even though it's already off the critical path. "Unused" ≠ "dead" — don't propose deleting or re-splitting it; in the report, explain the bytes are deferred, not wasted. (2) Before writing "code-split X" into the plan, **confirm X is actually a *static* import on the critical path** — grep for `import X from` vs `await import("X")` / `next/dynamic`. The Turbopack analyzer lists everything *reachable* from the page, including already-deferred dynamic chunks; a module appearing in that graph is **not** proof it's in the initial bundle. Recommending a split that's already in place is the fastest way to lose the user's trust.

Three durable wins:

- **Move transform-to-UI work to the server.** Libraries that exist only to turn data into markup (syntax highlight, markdown, charts) bundled into a Client Component ship the whole lib for static output. If the work needs no browser API or interaction, do it in a Server Component and send only the rendered HTML — often the single biggest client-bundle win.
- **`optimizePackageImports` for export-heavy packages** (`bundle-barrel-imports`) — **but check first.** Next already auto-optimizes a built-in list (incl. `lucide-react`, `date-fns`, `recharts`, `@tabler/icons-react`, `react-icons/*`, `@heroicons/react/*`, `@mui/*` — confirm via the optimizePackageImports reference), so most icon/util libs need *nothing*. Only a heavy named-export lib **not** on that list is a candidate, and the option is **experimental / "not recommended for production"** per Next's docs — so it's a 🟡 row (note the caveat), never a silent 🟢 config edit.
- **`serverExternalPackages`** to opt a server-only dep out of bundling when it's bloating a Route Handler / RSC.

For deferring code:

- **`next/dynamic`** for genuinely interaction-only or below-the-fold widgets (modal, chart, editor, carousel) — `bundle-dynamic-imports`. **Verify the installed Next 16 signature via `next-devtools` `nextjs_docs` first** (query "next/dynamic" / "lazy loading"; ref <https://nextjs.org/docs/app/guides/lazy-loading#nextdynamic>). Key traps, detailed in `references/grounding-fixes.md`: `{ ssr: false }` makes it **client-only** — right for browser-only libs, **wrong** for anything that belongs in the initial HTML (it removes SSR and can hurt LCP/SEO); give `{ loading }` the **same dimensions** as the real component or you trade a JS win for CLS.
- **Don't defer with `next/dynamic` what should stream.** For *server* components slow to fetch, prefer `<Suspense>` + streaming (`async-suspense-boundaries`), not `next/dynamic`. The App Router has no `getServerSideProps`; confirm the streaming/dynamic-rendering mechanism via `nextjs_docs` rather than porting the Pages-Router SSR pattern (<https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering> is Pages Router — not this app).
- **Defer third-party / analytics** with `<Script strategy="lazyOnload">` (`bundle-defer-third-party`) — but flag the analytics-timing risk below.

**Fonts** — *High-risk; often the user's top concern.* Safe: migrate a Google `<link>` to `next/font`, `display: 'swap'`, `preload: true` on one face, `fallback` faces to cut CLS. **Never drop/subset a weight without proving it's unused** (grep `fontWeight`, `font-bold`/`font-semibold`/`font-medium`, weight numbers, theme vars) — a missing weight is a silent regression. If a font must change to hit budget, it's a 🔴 row → preview + approval.

**CSS / layout-shift** — Offender via `layout-shift-elements`. Skeleton dimensions must match the loaded element. Reserve space with `width`/`height` or `aspect-ratio`. Set explicit border colors (Tailwind v4's default border is `currentColor`).

**Third-party scripts** — `<Script strategy="lazyOnload">` for analytics/chat/review widgets — **but flag the analytics-timing risk** (a deferred analytics script can miss the first pageview; verify it still fires). Leave error-monitoring instrumentation alone.

**Caching / data fetching** — Reads via shared data-access helpers, not scattered `fetch`. Explicit per fetch: `revalidate`/`force-cache` for cacheable content, `no-store` for per-request/volatile data. Surgical `revalidateTag()`. Stream slow data in `<Suspense>`.

**React rendering / client-boundary** — Push `'use client'` deeper. Memoize only where profiling proves it. Avoid mount effects that synchronously `setState`.

## Escalation — when to stop and report mid-execution

Even after approval, stop and surface (don't push through) if applying an approved fix turns out to need: a **major dependency version bump**; an **architectural decision** (remove a feature, change a data source); a change that **won't compile** and you can't resolve it; or it would force **weakening a performance budget/assertion** the project enforces (never do that). Report what's blocked and why.

## Constraints

- **The audit/plan phase edits nothing.** Code changes happen only in Step 5, only for the approved subset.
- Never quote a score without JSON-backed numbers. Never call a dev-target score a production score.
- Never weaken or disable the project's performance budgets to "pass".
- Honor the project's safety rules: respect its env-access conventions, never print secrets in output, never edit `.env*` or lockfiles directly.

## Final report

End with: the **checkpoint tag** (+ "say 'roll back the speedtest' to restore"), the target, baseline → result numbers (desktop/mobile) for each Vital + Performance/a11y/BP/SEO, which fixes were applied vs skipped, whether "good" is now met, the files changed, and anything escalated or left for a redeploy — exactly what and why.
