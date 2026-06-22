# Grounding fixes — best-practice rules + current docs

Every fix you propose or apply must be grounded in a maintained rule or in
**current** docs — not memory. Modern stacks (recent Next, Tailwind v4, your image
CDN's React bindings) often run ahead of model training data, so a remembered API
is a top source of silently-wrong code. Three sources, in priority order for any
given fix:

1. **`vercel-react-best-practices`** — the maintained React/Next perf rulebook. Cite the rule id in the plan.
2. **`next-devtools` (`nextjs_docs`)** — the *installed* Next API truth (`next/dynamic`, SSR/streaming, caching).
3. **`context7`** — broader optimization docs (incl. surveying Next.js optimization guidance) and all non-Next libraries.

---

## 1. vercel-react-best-practices — cite the rule

Lives at `.claude/skills/vercel-react-best-practices/` (SKILL.md = index; one file
per rule under `rules/`; `AGENTS.md` = everything compiled). 70 rules in 8
priority-ordered categories. **When a proposed fix matches a rule, name the rule
id in the "Proposed fix" cell** (e.g. *"code-split the reviews widget
(`bundle-dynamic-imports`)"*) and read that rule file before applying so the
implementation matches the canonical pattern.

Map the common Lighthouse/insight findings to the rule that fixes them:

| Lighthouse / insight finding | Rule category | Specific rules to read |
|---|---|---|
| LCP render-delay, render-blocking resources | Rendering / Bundle | `rendering-resource-hints`, `bundle-preload`, `rendering-script-defer-async` |
| Large JS bundle, high TBT, unused JS | Bundle (CRITICAL) | `bundle-dynamic-imports`, `bundle-barrel-imports`, `bundle-analyzable-paths`, `bundle-conditional` |
| Third-party / analytics main-thread cost | Bundle | `bundle-defer-third-party` |
| Slow TTFB, sequential server fetches, request chains | Waterfalls (CRITICAL) + Server | `async-parallel`, `async-dependencies`, `server-parallel-fetching`, `server-parallel-nested-fetching`, `async-suspense-boundaries` |
| Repeated server work / duplicate serialization | Server (HIGH) | `server-cache-react`, `server-cache-lru`, `server-serialization`, `server-dedup-props`, `server-after-nonblocking` |
| Janky interaction, high INP, excess re-renders | Re-render / Rendering | `rerender-memo`, `rerender-transitions`, `rerender-use-deferred-value`, `rendering-content-visibility`, `js-request-idle-callback` |
| Client data fetching waterfalls | Client | `client-swr-dedup` |

Priorities (CRITICAL → LOW): Waterfalls, Bundle, Server, Client, Re-render,
Rendering, JS, Advanced. Reach for the higher-impact category first when several
apply.

## 2. next-devtools — the installed Next API truth

For anything that touches a **Next.js API**, query `nextjs_docs` (it reads the
docs for the Next version actually in `node_modules`, so it can't be stale or
serve an older-major pattern that broke in a newer one). This is the automated form
of the "read `node_modules/next/dist/docs/` first" rule.

Query it for the two areas the optimize loop leans on most:

### `next/dynamic` / lazy loading

Reference: the Next.js *Lazy Loading* guide (`next/dynamic`) —
<https://nextjs.org/docs/app/guides/lazy-loading#nextdynamic>. Confirm the
installed-version signature via `nextjs_docs` ("next/dynamic", "lazy loading")
before writing. Load-bearing facts to verify, not assume:

- `next/dynamic` is a composite of `React.lazy` + `Suspense`; it defers a
  component's JS until it renders. Use it for **genuinely interaction-only or
  below-the-fold** widgets (a modal, a heavy editor, a chart, a carousel) — never
  the LCP element or above-the-fold SSR content.
- `{ ssr: false }` makes the component **client-only** (skipped during server
  render). Correct for browser-only libs; **wrong** for anything that should be in
  the initial HTML — it *removes* it from SSR and can hurt LCP/SEO. Default to
  leaving SSR on and deferring only the client JS.
- `{ loading: () => <Skeleton/> }` supplies a fallback — give it the **same
  dimensions** as the real component or you trade a JS win for a CLS regression.
- In the App Router, prefer **`<Suspense>` + streaming** for *server* components
  that are slow to fetch (`async-suspense-boundaries`); reserve `next/dynamic` for
  shrinking the **client** bundle.

### Server rendering / streaming

The Pages-Router SSR doc —
<https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering>
— is the **Pages Router** (`getServerSideProps`), which an App-Router app does
**not** use. In the App Router the equivalent levers are Server Components by
default, `<Suspense>` streaming, and explicit dynamic/cache directives
(`export const dynamic`, `revalidate`, the cache-components migration). Always
confirm the App-Router mechanism via `nextjs_docs` rather than porting a
Pages-Router pattern. For caching specifics, the `next-cache-components` skill goes
deeper.

### Bundle analysis & package optimization (Turbopack)

Reference: the *Package Bundling* guide (`nextjs_docs` → "package bundling"). If the
app builds with **Turbopack**, that changes the tooling:

- **Analyze with the Turbopack analyzer**, not `@next/bundle-analyzer` (a webpack
  plugin that does **not** hook a Turbopack `next build`). Use the project's
  `analyze` script (`next experimental-analyze`, interactive treemap +
  import-chain tracing) or its `analyze:output` variant (writes a diagnostics dir
  for diffing). Experimental — the UI may change between releases. For a webpack
  build, use `@next/bundle-analyzer`.
- **`optimizePackageImports`** is the canonical fix for export-heavy packages
  (`bundle-barrel-imports`), but: (1) Next **auto-optimizes** a built-in list
  (`lucide-react`, `date-fns`, `lodash-es`, `recharts`, `@tabler/icons-react`,
  `react-icons/*`, `@heroicons/react/*`, `@mui/*`, … — confirm via the
  optimizePackageImports reference), so most libs need nothing; (2) the option is
  flagged **experimental / not recommended for production** — propose it as a 🟡
  row with that caveat, never a silent config edit.
- **`serverExternalPackages`** opts a server-only dep out of RSC/Route-Handler
  bundling.
- **Move transform-to-UI work (syntax highlight, markdown, charts) to a Server
  Component** when it needs no browser API — the client then receives only
  rendered HTML. Often the largest single client-bundle win.

## 3. context7 — broader optimization docs + non-Next libs

Use `context7` to **survey current Next.js optimization guidance** at the start of
planning, and as the doc source for every **non-Next** library a fix touches.
Resolve each library's id once (via `resolve-library-id`) and reuse it. A common
pin worth knowing:

- Tailwind v4 → `/tailwindlabs/tailwindcss.com` (always query with "v4"; never the v3 index)
- Your image CDN, data SDK, and any other third-party lib a fix touches → resolve as needed.

When context7 and `nextjs_docs` disagree on a **Next.js API**, trust
`nextjs_docs` — it's pinned to the installed version. context7 is for breadth and
for everything that isn't Next.
