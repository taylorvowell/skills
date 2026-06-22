# Bundle + network-waterfall smell checklist

Read this during **Step 2 (static pre-scan)** and the **Step 3 bundle/waterfall diagnosis**. It turns "audit the perf" into a concrete sweep: each smell has a **how-to-detect**, a **why it matters**, and the **fix** (with the `vercel-react-best-practices` rule id to cite in the plan — see `grounding-fixes.md` for the rule→finding map). Don't turn every smell into a fix row — only the ones the evidence (analyzer / waterfall / Lighthouse JSON) actually confirms for *this* route.

Two cautions up front:

- **Much of the client-boundary list may already be enforced** by the Next compiler (`server-only` throws if imported client-side) and the project's ESLint (`@next/next` perf rules + `jsx-a11y`; rules like `no-restricted-imports` can block server-only modules from client code). So flag what *slips through*, don't re-litigate what lint already catches.
- **`experimental.optimizePackageImports` is NOT a default win** — Next already auto-optimizes `lucide-react`, `date-fns`, `recharts`, `@tabler/icons-react`, `react-icons/*`, etc. The option is experimental / "not recommended for production." Only propose it for a heavy, *non-auto-listed* named-export library, and mark it 🟡 with that caveat. Never a silent 🟢 config edit.

## A. Bundle / code smells (find via the bundle analyzer + grep)

Tooling: if the project builds with Turbopack, use its analyzer — the project's `analyze` script (interactive treemap + import-chain tracing) or `analyze:output` (writes a diagnostics dir — parse the chunk parts by compressed size, attribute to a source/package). **Not** `@next/bundle-analyzer` for a Turbopack build — it's a webpack plugin and won't hook it. For a webpack build, use `@next/bundle-analyzer`.

| Smell | How to detect | Why it matters | Fix (rule) |
|---|---|---|---|
| **Large icon library** | analyzer shows a big icon pkg in the client chunk; grep `import { X } from "lucide-react"` etc. | A full icon set in the bundle for a handful of glyphs. | Usually **nothing** — Next auto-optimizes `lucide-react`/`@tabler/icons-react`/`react-icons`. Only a non-listed icon lib needs `optimizePackageImports` (🟡 caveat). Per-icon imports if the lib isn't tree-shakeable. |
| **Barrel imports** | analyzer import-chain shows one `index.ts` pulling a whole module graph; grep wide barrel imports (a `from "@/components"`-style index re-export) | A barrel drags unrelated exports into the chunk. | Import from the leaf path, not the barrel (`bundle-barrel-imports`). |
| **Heavy animation library** | analyzer: an animation lib (e.g. `framer-motion`/`motion`) in a chunk loaded on first paint | ~tens of KB shipped on every route for an interaction-only flourish. | `next/dynamic` the animated leaf, or drop to CSS where possible (`bundle-dynamic-imports`). Verify it isn't pulled eagerly into a shared shell. |
| **Date library** (moment/luxon/date-fns) | analyzer; grep imports | Date libs are large; moment especially. | Prefer `Intl.DateTimeFormat`; `date-fns` is auto-optimized so per-fn imports already tree-shake. |
| **Charting library** (recharts/chart.js/d3) | analyzer; in a client chunk | Charts are huge and often above the data they render. | Render server-side to static SVG/HTML where non-interactive, or `next/dynamic` the chart (`bundle-dynamic-imports`). recharts is auto-optimized for named imports. |
| **Client component importing server utilities** | grep a `'use client'` file importing a server-only / DB / SDK util | Pulls server code (and its deps) into the browser bundle, or fails the build. | Move the call to an RSC parent and pass data down; or split the util. (Largely compiler/`server-only`-enforced — flag leaks.) |
| **Too many `'use client'` boundaries** | grep `'use client'`; check for it on components with no hooks/handlers/browser APIs | A client wrapper that only renders children ships + hydrates needlessly. | Push the boundary to the leaf that truly needs it (`bundle-analyzable-paths`); a pass-through wrapper should be an RSC. |
| **Large data/SDK package in client bundle** | analyzer: a heavy commerce/CMS/data SDK, or a full realtime DB client (e.g. `@supabase/supabase-js`), in a first-load chunk | These SDKs are heavy and rarely needed on the critical path. | Keep SDK calls server-side (shared data-access helpers); if a client genuinely needs auth/identity, `await import()` it at idle. `serverExternalPackages` for server-only deps bloating an RSC/route. |
| **Unoptimized images** | grep raw `<img>`; `next/image`/CDN `<Image>` missing `sizes`; oversized transforms | Oversized/undimensioned images blow LCP + CLS. | `next/image` (or the CDN wrapper) + `sizes` + one `priority` (the LCP image); `placeholder="blur"` for above-fold heroes. |
| **Fonts loaded incorrectly** | grep Google Fonts `<link>`; `next/font` faces all `preload:true`; unused weights | Preloading unused faces competes with the LCP request; a `<link>` font blocks. | `next/font` only; `display:'swap'`; `preload:true` on the *primary* face only, `preload:false` on rarely-used ones (e.g. a mono face on text pages). |
| **Third-party scripts loaded too early** | grep `<Script>` without `strategy`; a vendor tag in `<head>`/`beforeInteractive` | Sync/early third-party JS tanks TBT and can delay LCP. | `<Script strategy="lazyOnload">` or a dynamic import at idle — but **flag the analytics-timing risk** (a deferred analytics tag can miss the first pageview; verify it still fires). Leave error-monitoring instrumentation alone. |

## B. Network-waterfall smells (find via a captured waterfall JSON, Lighthouse `network-requests`, or DevTools `list_network_requests`)

Capture the waterfall with the project's Playwright waterfall script if it has one (the DevTools-MCP fallback), or read `audits['network-requests']` from the saved Lighthouse JSON, or `list_network_requests` live via Chrome DevTools MCP.

| Smell | How to spot it in the waterfall | Fix |
|---|---|---|
| **Slow API calls** | an `xhr`/`fetch` with a long `timingMs`, on the critical path | Move to an RSC server fetch with `revalidate`/cache; stream non-critical data in `<Suspense>`. |
| **Large JS chunks** | `script` rows with big `sizeBytes` | Code-split (`next/dynamic`) genuinely interaction-only/below-fold widgets; see §A. Cross-check that "unused JS" isn't just already-deferred code (see SKILL.md). |
| **Render-blocking CSS** | `stylesheet` finishing before first paint, flagged by `render-blocking-resources` | Render-blocking CSS is *correct* (prevents FOUC). Only `experimental.inlineCss` removes the request — a 🟡 tradeoff, not a free win. |
| **Third-party scripts** | requests to non-first-party hosts early in the timeline | Defer (§A, third-party). |
| **Duplicate image requests** | the same image URL fetched 2+ times (or the same asset at different transforms) | Dedupe; stabilize the image `src`/`sizes` so it isn't refetched per breakpoint/state. |
| **Uncached assets** | static asset with no/short cache header (`sizeBytes` re-downloaded across runs) | Long-`immutable` cache for hashed static assets; correct `Cache-Control`. |
| **Font-load delays** | `font` woff2 starting late or blocking text paint | `next/font` (self-hosted, preconnect-free); preload only the primary face; `display:'swap'`. |
| **Large server response time (TTFB)** | the document request's TTFB is high | Server/data work on the critical path — cache the read, move work off the request, or stream. If it spikes, suspect an un-cached upstream fetch. |
