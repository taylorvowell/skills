# Chrome DevTools MCP — live diagnosis & visual preview recipes

The `chrome-devtools-mcp` server is the **primary** tool for *seeing* what the
Lighthouse numbers mean: it records real performance traces, returns structured
Core Web Vitals **insights**, exposes the live network waterfall and console, and
drives the visual preview. Lighthouse (the CLI runner) stays the source of truth
for **scores, budgets, and history**; DevTools MCP is the source of truth for
**why** a metric is bad and **what a fix would look like**.

Playwright MCP is the **fallback** only — use it when chrome-devtools is not
connected (a tool call returns "no browser" / the server isn't listed). The
Playwright equivalents are mapped at the bottom.

> All these tools act on the **currently selected page**. Always `navigate_page`
> to the exact URL you're auditing *first*, then trace. The page must be the
> production build server (local) or the deployed URL (remote) — never the dev
> server.

## Table of contents

1. Diagnosis: record a trace and read the CWV insights
2. The network waterfall
3. Console errors / best-practices signals
4. Device & throttle emulation (matching Lighthouse mobile)
5. Confirming the LCP element live
6. Visual preview ("Show, don't tell") via injected CSS
7. Playwright fallback mapping

---

## 1. Diagnosis: record a trace and read the CWV insights

This replaces the old "mine the JSON / hand-roll a PerformanceObserver" dance for
the *why*. The trace's **insight set** is a structured, prioritized list of CWV
problems — exactly the diagnosis you want.

```
navigate_page    { type: "url", url: "<full URL incl. route>" }
performance_start_trace  { reload: true, autoStop: true }
# (autoStop waits for the page to settle, then stops on its own)
```

`performance_start_trace` returns a summary that includes the measured **LCP,
CLS, TBT/INP**, one or more **insight sets** (each with an `insightSetId`), and a
list of **available insight names** for each set. For every insight that looks
relevant, pull the detail:

```
performance_analyze_insight { insightSetId: "<id>", insightName: "LCPBreakdown" }
```

Insight names you'll commonly want (the trace tells you which are present — don't
guess at ones it didn't list):

| Insight | What it tells you | Maps to fix class |
|---|---|---|
| `LCPBreakdown` | LCP split into TTFB → load delay → load time → render delay | The dominant phase names the fix: render-delay → render-blocking CSS/JS; load-delay → discovery/preload; TTFB → server/data |
| `LCPDiscovery` | Whether the LCP image was discoverable early / preloaded / not lazy | `priority` / `preload` / un-lazy the LCP image |
| `RenderBlocking` | Render-blocking requests delaying first paint | defer/inline critical CSS, move/defer JS |
| `DocumentLatency` | Server response time + redirects + compression | TTFB / caching / data fetching |
| `NetworkDependencyTree` | The critical request chain (waterfall depth) | break chains, preload, parallelize |
| `CLSCulprits` | The exact DOM nodes that shifted + their cause | reserve space / dimensions / font-swap |
| `ThirdParties` | Third-party script main-thread cost | `<Script strategy="lazyOnload">`, defer |
| `DuplicatedJavaScript` / `LegacyJavaScript` | Wasted bytes in the bundle | dedupe, drop polyfills, code-split |
| `ForcedReflow` | Layout thrash on the main thread (TBT/INP) | batch DOM reads/writes |

Quote the insight's numbers and the named element/URL **verbatim** into the plan —
that's what makes a finding trustworthy.

> **Cold vs warm cache — don't get fooled.** `performance_start_trace` reuses the
> browser's existing cache, so after you've already navigated to a page its trace
> runs *warm* and will report a much lower LCP than a cold Lighthouse run (e.g. a
> page Lighthouse measures at 5.2s can trace at ~1.2s warm). The phase split
> (render-delay vs load-delay) stays trustworthy, but the absolute number does
> not. For a cold comparison, reload with `navigate_page { type: "reload",
> ignoreCache: true }` before tracing — and treat the **Lighthouse cold run as the
> budget source of truth** for the absolute metric.

Optionally pass a `filePath` under the lighthouse history dir (e.g.
`<route>/<ts>-<target>/trace.json`) to `performance_start_trace`/`performance_stop_trace`
to keep the raw trace next to the Lighthouse reports.

## 2. The network waterfall

```
list_network_requests { pageSize: 50 }                 # all, paginated
list_network_requests { resourceTypes: ["image","font","script"] }   # focus
get_network_request   { url: "<one request URL>" }     # full timing/headers
```

Sort by start time to see what blocks first paint and what the LCP resource
waited on. Use `resourceTypes` to isolate fonts (CLS / preload), images (LCP), or
scripts (TBT). This is the live equivalent of Lighthouse's `network-requests`
audit but reflects the *current* page state, including third-party redirects.

## 3. Console errors / best-practices signals

```
list_console_messages
```

Surfaces hydration mismatches, 404s for assets, CSP violations, and deprecation
warnings that drag the Best-Practices score and sometimes mask a perf problem
(e.g. a failed preload). Note any errors as findings.

## 4. Device & throttle emulation (matching Lighthouse mobile)

Lighthouse mobile applies CPU + network throttling. To make a DevTools trace
comparable to the **mobile** Lighthouse run, emulate before tracing:

```
emulate {
  cpuThrottlingRate: 4,
  networkConditions: "Slow 4G",
  viewport: "412x915x2.625,mobile,touch"
}
performance_start_trace { reload: true, autoStop: true }
```

For the **desktop** comparison, reset throttling (`cpuThrottlingRate: 1`, omit
`networkConditions`) and use a desktop viewport. Reset with `colorScheme: "auto"`
and `cpuThrottlingRate: 1` when done. Use `colorScheme` to reproduce a
dark/light-only theme if the finding is theme-specific.

## 5. Confirming the LCP element live

When an insight is ambiguous, confirm against the real DOM:

```
evaluate_script {
  function: `() => {
    const out = {};
    const po = performance.getEntriesByType('largest-contentful-paint').pop();
    out.lcp = po ? { el: po.element?.outerHTML?.slice(0,200), url: po.url, time: po.startTime } : null;
    out.nav = performance.getEntriesByType('navigation')[0]?.toJSON?.();
    return out;
  }`
}
take_screenshot { uid: "<lcp element uid from a snapshot>" }   # prove it visually
```

## 6. Visual preview ("Show, don't tell") via injected CSS

For any **visual** fix in the approved set (a contrast/color/size change), render
it *before* writing the edit. Inject the change live as a CSS override on the
**same token/selector the real edit will change** (contrast fixes are almost always
a CSS custom property — e.g. a `--color-*` token, possibly scoped to a theme
selector — or a pinned contrast pair), so the preview equals the result. No rebuild
needed.

```
navigate_page  { type: "url", url: "<URL>" }
take_screenshot { uid: "<element uid>" }                 # BEFORE, desktop
emulate { viewport: "412x915x2.625,mobile,touch" }
take_screenshot { uid: "<element uid>" }                 # BEFORE, mobile

# inject the candidate change (variant A) on the token:
evaluate_script {
  function: `() => {
    const s = document.createElement('style');
    s.id = 'lh-preview';
    s.textContent = ':root{--color-accent-foreground:#1a1a1a;}';
    document.head.appendChild(s);
    return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-foreground');
  }`
}
take_screenshot { uid: "<element uid>" }                 # AFTER variant A
```

Then:

1. Offer **2–3 variants** where the choice is aesthetic (darken foreground /
   adjust background / use an existing accessible token); screenshot each (swap
   the `textContent`, re-screenshot).
2. **Show the blast radius** — a shared token is global; screenshot one or two
   *other* places it's used and name what else is affected.
3. Post the screenshots with each option's change + the metric delta
   (`#1a1a1a → 4.9:1, AA`) and ask via `AskUserQuestion`: *Apply A / Apply B /
   Tweak / Skip*. Batch all visual previews into one approval round.
4. On approval, write the real token change; the Step 5 confirming re-audit picks
   it up. Remove the injected `#lh-preview` style if you keep the page open.

## 7. Playwright fallback mapping

Only if chrome-devtools MCP is unavailable. It has no trace/insight engine, so
the diagnosis is shallower — you reconstruct from `PerformanceObserver` + the
network list.

| chrome-devtools | Playwright fallback |
|---|---|
| `navigate_page` | `browser_navigate` |
| `performance_start_trace` + `performance_analyze_insight` | `browser_evaluate` a `PerformanceObserver` for `largest-contentful-paint` + `paint`/`navigation`/`resource` entries (no structured insights — reason from raw entries) |
| `list_network_requests` | `browser_network_requests` |
| `list_console_messages` | `browser_console_messages` |
| `emulate` (viewport) | `browser_resize` (no CPU/network throttle — note the caveat) |
| `evaluate_script` (inject CSS) | `browser_evaluate` |
| `take_screenshot` | `browser_take_screenshot` |
