# Coverage Axes

The 13 core axes every audit must consider, plus the **Hardening lenses** (A–G, at the end of this file) that are mandatory in post-build mode and applied as-relevant otherwise. Use this as a "did I look here?" pass before drafting findings — not every axis will produce findings for every audit, and that's fine.

For each axis, the entries below describe **what to look for** (the bad patterns) and **the source of truth** (where the finding's citation will come from). Cite the source of truth on every finding.

Findings from the hardening lenses use the same six-field shape and the same severity rubric as the core axes — they extend coverage, they aren't a separate report.

---

## 1. Next.js best practices

**What to look for:**
- `'use client'` higher in the tree than necessary (should be at the leaf — event handler, browser API, hook).
- Data fetching in `useEffect` that belongs server-side.
- Use of `pages/` directory (forbidden — App Router only).
- Missing `next/image` or raw `<img>` tags (must be `next/image` — or your image-CDN component — with a sized container).
- Missing `next/font` for any custom font (causes CLS).
- API routes without Zod validation on inputs.
- Default exports on components (only allowed for `page.tsx` and `layout.tsx`).
- `metadata` / `generateMetadata` missing on routes that need it.
- Mixing Edge runtime with non-edge-compatible code (Edge is for middleware and edge-config routes; use Node for heavy operations and routes that need Node APIs).

**Source of truth:** `next-best-practices` skill, `CLAUDE.md` ("Next.js Rules"), Next.js docs.

---

## 2. Performance & code optimization

**The lens:** this axis is about the *code* being efficient — doing the least work to get the right result: not recomputing, not over-fetching, not walking the same data twice, not shipping waste. It is **static reasoning about the source**, distinct from `/speedtest` (which *measures* a route's runtime LCP/INP/CLS in a real browser). Do not punt code-efficiency findings to speedtest — speedtest measures the symptom; this axis finds the cause in the code. Everything below you can find by reading. If the concern is purely a runtime route metric, name it and hand it to speedtest; otherwise it's yours.

**Wasted / redundant work:**
- The same value computed more than once when it could be derived once and reused — re-sorting, re-filtering, or re-mapping the same array in multiple spots, or on every render.
- Work whose result is discarded, or computed before an early return that makes it unnecessary.
- Client-side recomputation of something the server already returned (cross-ref axis 7) — e.g. re-deriving a total the backend sends.
- Expensive synchronous work in render (sort/filter/reduce over large arrays, `JSON.parse`, regex compile) that should be memoized, precomputed, or moved server-side.

**Algorithmic efficiency:**
- O(n²) shapes: `.find()` / `.includes()` / `.filter()` called inside a `.map()` or loop over the same collection — a `Map`/`Set` lookup usually makes it O(n).
- Repeated linear scans of the same data that could share a single pass.
- Cloning or rebuilding large structures in a hot path; unnecessary deep copies.
- Data-structure mismatch — an array used for membership tests (wants a `Set`); repeated `Object.keys().find()` (wants a keyed lookup).

**Data-fetching efficiency:**
- Request waterfalls — sequential `await`s with no data dependency between them that should be a single `Promise.all` (cross-ref axis 5).
- N+1 fetches — a query per item in a loop instead of one batched query.
- Over-fetching — selecting/returning fields the caller never uses; fetching a full list just to show a count.
- Missing dedup/caching — the same fetch issued from multiple places in one render tree that React `cache()` (server) or a shared loader would collapse into one.
- Blocking the whole page on one slow `await` where Suspense + streaming would let the rest paint first.

**React render efficiency:**
- New object/array/function identities created every render and passed as props or hook deps — busts memoization and re-renders children.
- Genuinely expensive derivations not wrapped in `useMemo`. (Be judgment-led: do **not** recommend memoizing cheap work — over-memoization is its own debt.)
- State placed too high, re-rendering a large tree on every keystroke; state that should be colocated at a leaf.
- Large lists rendered in full where windowing/virtualization is warranted.

**Bundle & loading:**
- Heavy client imports that should be `dynamic()` (below-the-fold, modals, drawers, charts, editors).
- Whole-library/barrel imports (`import _ from "lodash"`, the whole `date-fns`) instead of named/per-function imports.
- A `'use client'` boundary dragging a server-safe module into the browser bundle.
- `unstable_cache` where `use cache` would be cleaner (respect any formal deferral of Cache Components).
- Missing `priority` on the LCP image; images without dimensions — but if it's purely a runtime-metric question, hand it to `/speedtest`.

**How to find it:** read the hot paths and the data layer, not just the component shells. Trace each significant piece of data from where it's fetched → transformed → rendered, and count how many times it's walked. For every expensive-looking operation ask the three questions: does this run **more often** than it must, over **more data** than it must, fetching **more** than it must?

**Source of truth:** `vercel-react-best-practices`, `vercel-optimize`, `next-cache-components`, `CLAUDE.md` ("Performance"). For runtime *measurement* defer to `lighthouse-optimize` / `/speedtest`. Cite the specific pattern, not "perf best practice."

---

## 3. Structural soundness & architecture fit

**What to look for — structural soundness:**
- Files that mix concerns (a "Cart" file that does fetching, UI, and analytics — should be split).
- Files way over a reasonable size (>500 lines is a yellow flag, >1000 is a red flag, but it depends).
- Circular imports.
- Server-only code reachable from client (`'use client'` files importing server-only modules).
- Tight coupling between unrelated domains (e.g., `cart/` importing from `account/` internals).
- Components that should be route-level but are nested in other components, or vice versa.
- Broken layering: e.g., `lib/` calling into `components/`.

**What to look for — architecture fit (does this belong the way the system is actually built?):**

Read `CLAUDE.md`'s "Architecture Flow" and the relevant architecture decision records *before* judging this — fit is measured against the project's declared design, not generic taste.

- **Respects the data-flow boundaries.** If the declared flow is `CMS → API layer → frontend` and this code has the frontend calling the CMS directly, that's a fit violation even though it "works." Honor every "X never calls Y directly — always through Z" rule.
- **One way to do a thing.** Does this introduce a *second, parallel* pattern for something the codebase already solves one way — a different data-fetching approach, a different state path, a hand-rolled version of an existing utility/primitive? Competing patterns are architectural debt: every future reader now has to learn both, and the next person picks at random.
- **Layering direction holds.** Dependencies point the intended way (UI → lib → data, never the reverse); no domain reaching into another domain's internals.
- **Right seam / altitude.** Business logic in `lib/` or Server Actions, not buried in a component; cross-cutting concerns (auth, validation, logging) handled at the boundary, not re-implemented per call site.
- **Composes, doesn't island.** Will the rest of the system be able to build on this, or is it a one-off the next feature will have to work around or duplicate?

**The fit test:** *"If a new engineer followed the patterns already in this repo, is this what they'd have built? If not — is the deviation deliberate and better, or accidental drift?"* Accidental drift is a finding; a deliberate, justified deviation is not (but should be documented — cross-ref axis 10).

**Source of truth:** `CLAUDE.md` ("Architecture Flow" + "Components — STRICT RULES"), the project's architecture decision records, general software architecture principles (cite the principle or the project rule, not just "vibes").

---

## 4. Componentization / modularization

**What to look for:**
- Hand-built primitives that should be from `components/ui/` (Button, Input, Dialog, Card, Badge, Select, Sheet, Tabs, Separator, Skeleton, Label, Avatar, Tooltip, Dropdown).
- Inline ternaries on `className` that should be CVA variants.
- Components that mix variant logic with business logic.
- Domain logic embedded inside UI components (should be in `lib/` or a Server Action).
- Components with so many boolean props (`isOpen`, `isLoading`, `isError`, `isCollapsed`) that they're begging to be split or compounded.
- Inline styles or arbitrary Tailwind values that should be theme tokens.

**Source of truth:** a component-system skill, your component registry (e.g. `components/REGISTRY.md`), relevant architecture decision records.

---

## 5. Scalability & reusability

**What to look for:**
- Hardcoded names, slugs, or constants that should be config-driven.
- Components that work for one instance/variant but would break when reused for another (anything intended to be parameterized or reusable).
- Server Actions or API routes that fetch all-of-X when they should paginate.
- N+1 queries, sequential awaits that could be `Promise.all`.
- Patterns that work at 10 items but won't at 10,000 (in-memory filtering, full-list re-renders, etc.).
- Lack of a clean "props API" — components require too much consumer knowledge to use.

**Source of truth:** Next.js streaming/pagination docs, general scalability principles, and any project decision record that establishes a reuse/parameterization constraint.

---

## 6. Logical placement

**What to look for:**
- Components in `app/` route directories (forbidden — must be in `components/[domain]/`).
- New files in `components/ui/` (forbidden — that folder is shadcn-managed only).
- Domain-specific components in the wrong domain folder (e.g., a cart-specific helper in `components/product/`).
- Utilities in `components/` that should be in `lib/`.
- Server Actions colocated where they shouldn't be (Server Actions belong in their feature's folder, not in a global `actions/` graveyard).
- Types defined inline that should be in a shared types location (e.g., a `packages/shared` workspace in a monorepo, or a `lib/types` module in a single app).

**Cross-reference: naming.** Placement and naming are paired concerns. A file in the right folder but with a wrong-domain name (e.g., `CatalogCard.tsx` in `components/product/`) is still a finding — but it lives under axis 9's "Naming consistency & clarity" section. Whenever you flag a placement issue, also check whether the name is still right after the placement fix; sometimes a move makes the rename obvious.

**Source of truth:** `CLAUDE.md` ("Component File Location"), your project's structure conventions.

---

## 7. Reuse vs. duplication

**This is the highest-value axis.** Always check this first.

**What to look for:**
- Two components that do 80% the same thing (almost always: collapse via CVA variants, don't fork).
- Multiple implementations of the same hook / utility / type.
- Custom wrapper around a primitive that the primitive already does via a variant.
- Identical fetch/transform logic in multiple Server Actions.
- A new component built when the component registry already had a primitive that would have worked with a `layout` or `density` variant.

**How to find it:** `grep` the component registry for keywords matching the new component's responsibility. Read the existing component's CVA config — does the variant axis the new thing needs already exist or could it be added?

**Source of truth:** your component registry (e.g. `components/REGISTRY.md`), relevant architecture decision records.

---

## 8. Tech debt — carried and introduced

**Mandatory axis — every audit includes this section even if empty.** It runs in two directions: debt the code *already carries*, and debt your *recommendations would add*. The second is the one auditors most often forget — but the first is what the user usually means by "is this creating tech debt?"

**Debt the existing code carries (hunt for it):**
- **Speculative / premature abstraction** — a factory, generic, hook, or config layer built for a generality that never arrived (abstraction-for-one, a config option for a value that never changes, a "flexible" system with exactly one caller). The bar is the North Star: the *leanest* thing that completely does the job.
- **Copy-paste forks** — the same logic duplicated and now quietly drifting (cross-ref axis 7). This is the classic compounding debt.
- **Half-done migrations / transitional states** — `V2`/`new`/`legacy`/`old` living beside the original, a migration that stalled, a feature flag whose other branch is dead.
- **Deferral markers** — `TODO` / `FIXME` / `HACK` / `XXX`, `@ts-ignore` / `@ts-expect-error`, `eslint-disable`, and silent `catch {}` swallows. Grep the scope; each is a deferred decision someone has to pay back.
- **Dead code** — unused exports, unreachable branches, commented-out blocks, props no caller passes. Run the project's dead-code tool over the scope if it has one (e.g. `knip`).
- **Workarounds that outlived their cause** — a patch for a framework bug fixed three versions ago; a hand-rolled polyfill now native.
- **Stringly-typed / unvalidated seams** — `any`, untyped external data, magic strings where an enum or `as const` belongs.

**Debt your recommendations would add (own it honestly):**
- A recommended refactor that introduces a new abstraction the codebase doesn't have — justify that it's load-bearing, not speculative, or don't recommend it.
- Merging components into one CVA component behind a confusing discriminated-union props API — note the cost.
- A move that requires adding a new context provider — note the reach.
- A dependency on a library upgrade or a new dependency — call out the install + maintenance cost.
- A "transitional" state where some callers use the new API and others don't — plan the cleanup or accept the debt explicitly.

If you find none in either direction, say so plainly. "None — the scope carried no markers or dead code, and the recommendations are pure removal/consolidation with no new abstractions" is a valid and valuable result.

**Source of truth:** `CLAUDE.md` (North Star — "the leanest way that completely does the job"), the project's dead-code tool, and your own honesty.

---

## 9. Project conventions & coding standards

**What to look for — mechanical conventions:**
- `any` anywhere in TypeScript (forbidden — use `unknown` and narrow).
- Missing Zod validation at any external-data boundary.
- Default exports outside `page.tsx`/`layout.tsx`.
- File name not matching component name.
- `Props` interface not named `[ComponentName]Props` or not defined above the component.
- `../../../` imports instead of `@/` path aliases.
- `tailwind.config.{js,ts}` exists (EMERGENCY — v4 is CSS-first).
- v3 directives like `@tailwind base;` instead of `@import "tailwindcss";`.
- Color tokens not prefixed with `--color-*`, spacing not `--spacing-*`, fonts not `--font-*`.
- Border colors not set explicitly (v4 default is `currentColor`).
- Hardcoded hex colors instead of theme tokens (`var(--color-bg)`, etc.).
- `localStorage` usage (forbidden — use React state or server state).
- Raw `process.env` outside the env module (e.g. `lib/env.ts`).
- Any secret / service-role / privileged API key reachable from any `'use client'` file.

### Naming consistency & clarity

Naming is one of the two hard problems in software. Bad names compound as the codebase grows — a future developer (human or AI) wastes minutes per file figuring out what each thing does. Check both **mechanical consistency** (does this name follow the local pattern?) and **semantic clarity** (does the name actually describe what the thing does?).

**Mechanical: inline with current patterns**
- **Domain prefix matches folder.** Components in `components/product/` should start with `Product*` (or be sub-domain primitives like `<Gallery>` only when the registry uses that convention). Components in `components/cart/` should start with `Cart*` — exception: registry-registered primitives reused inside the folder. A file named `CatalogCard.tsx` in `components/product/` is a yellow flag — either rename to `ProductCatalogCard.tsx`, or (better) check whether it should be a variant on the existing `ProductCard` (axis 7).
- **Sibling naming pattern.** Glance at the other files in the same folder. If every other component uses `<Domain><Noun>` and the new one is `<Verb><Noun>` or just `<Noun>`, that's a pattern break worth flagging.
- **File casing.** The recommended convention is **PascalCase for `.tsx` component files** (`ProductCard.tsx`), **kebab-case for non-component modules** (`format-price.ts`, `api-client.ts`). Mixing is a red flag.
- **Variant vocabulary aligned with the registry.** CVA variants should use a shared vocabulary — `density`, `layout`, `size`, `tone`, `intent`. New variants should reuse that vocabulary, not invent `compactness`, `dimension`, `colorMood`. Grep the component registry for existing variant names before flagging.
- **Hook names follow `use<Noun>` for state-reads and `use<Verb><Noun>` for actions** (e.g., `useCart` returns state, `useAddToCart` returns an action). If a new hook breaks this, flag it.
- **Server Action names are verbs** (`addToCart`, `placeOrder`, `updateAddress`) not nouns or noun-phrases. They are functions that *do* things.

**Semantic: does the name make sense?**
- **Name accurately describes the thing.** A `<CartItem>` that actually renders a row in a cross-sell strip is misnamed — it should be `<CrossSellItem>` or `<CartCrossSellRow>`. A `useProduct()` that returns a list of products should be `useProducts()`. Misnames mislead future readers and grep searches.
- **Discoverability.** Would a new developer (or AI agent grepping the codebase) land on this file when searching for the concept? If the user has to know the exact internal jargon to find the file, the name is too clever. Plain words > clever words.
- **No silent collisions.** Two `<ProductPrice>` components in different folders that do different things is a smell — at minimum the divergence should be intentional and documented; at best one should be merged with the other via a variant.
- **No vestigial qualifiers.** A name like `NewProductCard.tsx` or `ProductCardV2.tsx` is debt — the qualifier outlives the "new"-ness. If there's a v2 because v1 still exists for migration reasons, that's an open question worth flagging; otherwise, rename and delete the old.
- **No abbreviation tax.** `prodCardCfg`, `mdusaCli`, `xSellRow` — if the abbreviation isn't a project-wide convention, expand it. Cost of a longer name is paid once at writing; cost of an unclear abbreviation is paid every time someone reads it.

**Mechanical: rename-vs-remove decision.** When naming is wrong AND there's a duplication finding from axis 7, prefer **remove via consolidation** over **rename**. A rename is only the right fix when the thing genuinely deserves to exist but the label is wrong.

**Source of truth:** `CLAUDE.md` (project-level, "TypeScript Rules" + "Components — STRICT RULES" sections), your Tailwind v4 / security / component-system skills, and your component registry (the canonical variant vocabulary). For naming clarity specifically, defend with established naming-principle citations only when they help — usually the project-internal pattern is the strongest justification.

---

## 10. Documentation for AI coders

**What to look for:**
- New components missing from the component registry (e.g. `components/REGISTRY.md`).
- A non-obvious pattern with no inline comment explaining *why* (only the why — what is already documented by the code).
- A complex Server Action with no JSDoc on its public signature.
- A new architectural pattern that should have an architecture decision record but doesn't.
- An operational procedure (e.g., "how to onboard a new tenant/config") with no runbook.

**Apply with restraint.** A good CLAUDE.md is explicit: don't write trivial comments, don't document framework behavior. Only flag documentation gaps where a future AI coder would genuinely be lost — the load-bearing context that isn't in the code or git history.

**Source of truth:** `CLAUDE.md` ("Don't" + any Documentation Discipline section), a `docs` skill if one exists.

---

## 11. Test coverage (only what's load-bearing)

**What to look for:**
- A critical user path (e.g. cart add, checkout submit, auth) with no end-to-end coverage.
- A complex pure function with no unit test.
- An API route with non-trivial validation logic but no integration test.
- A previously-fixed bug with no regression test guarding it.

**Don't flag:**
- Routine UI components.
- Trivial getters/setters.
- Anything that's a known stub or placeholder not yet wired to real behavior (testing a stub passes meaninglessly — see `CLAUDE.md` "Testing Discipline").

**Source of truth:** your testing methodology decision record, `CLAUDE.md` ("Testing Discipline").

---

## 12. Latest Next.js / React / Vercel leverage

**What to look for (opportunities, not violations):**
- Routes that would benefit from PPR / Cache Components but are using older patterns (see `next-cache-components` skill, but respect any project decision that defers the migration).
- Page transitions that could use the React View Transitions API (see `vercel-react-view-transitions` skill).
- Hand-rolled bot detection that BotID could handle.
- Provider-specific AI SDK imports (`@ai-sdk/anthropic`, `@ai-sdk/openai`) where the Vercel AI Gateway with `"provider/model"` strings would be cleaner.
- `vercel.json` that should be `vercel.ts`.
- Edge Functions where Fluid Compute (default) is now recommended.
- Use of `unstable_cache` where `use cache` would be cleaner.

**Apply with restraint.** "Latest leverage" findings are usually Medium or Low severity unless the current pattern is actively deprecated. Flag the opportunity; don't demand the migration.

**Doc-ground before you claim it.** This stack runs ahead of training data — never assert "X is new / deprecated / has a better replacement" from memory. Verify against the installed version's docs first: the `next-devtools` MCP (`nextjs_docs`) for Next.js, `context7` for everything else (Tailwind v4 → `/tailwindlabs/tailwindcss.com`, query "v4"). A latest-leverage finding with no doc citation is not a finding.

**Source of truth:** Vercel skills (`vercel-react-best-practices`, `next-cache-components`, etc.), the `next-devtools` MCP / `context7` for installed-version docs, official Vercel/Next docs.

---

## 13. Additional architectural suggestions

This is the catch-all for findings that don't fit cleanly into 1–12. Use it sparingly. Examples of what belongs here:

- "This domain folder is growing fast — consider splitting into subdomains."
- "The cart domain has 12 separate Server Actions; consider consolidating into a single `cart.ts` actions module with named exports."
- "There's no public-facing contract for what `<ExpertPanel>` expects — would benefit from a type-exported `ExpertConfig`."
- "Three different audits have hit the same registry-discovery problem; consider adding a `pnpm registry:check` script."

**Source of truth:** your judgment, but always include "why this matters" — if it's just "I'd prefer it this way," cut it.

---

# Hardening lenses (A–G)

These extend the 13 core axes for the **post-build hardening pass** — the audit a feature gets right after it ships. They target the failure class that passes in dev and bites in prod: missing auth, stale caches, empty failure branches, broken a11y on a custom composition, an env var that's set locally but not in prod. **All seven are mandatory in post-build mode.** In an ordinary target-scoped deep audit, run lens A (security) always and the rest when the scope includes routes, data fetching/mutation, or user-facing UI. Findings use the same six-field shape and severity rubric as the core axes.

---

## A. Security *(run on every deep audit, not only post-build)*

**What to look for:**
- A user-facing route, Server Action, or API handler that performs a privileged action with **no auth or authorization check** (authenticated ≠ authorized — does *this* user own *this* resource?).
- External data used without validation at the boundary — form input, route/search params, webhook bodies, third-party API responses — with no Zod (or equivalent) schema.
- A secret / service-role key / privileged backend client **reachable from client code** (`'use client'` file importing a server-only module or the server env).
- A webhook handler with no signature verification, or one that trusts the payload before verifying.
- Secrets or PII written into logs, error-monitoring, or analytics payloads (cross-ref lens G).
- An abusable endpoint (auth, sign-up, expensive query, LLM call) with no rate limiting.
- For any LLM/AI feature: untrusted input concatenated into a prompt with no injection defense.

**Note:** this is the audit's first-class security pass. A *standalone* security-only deep-dive (threat model, full surface sweep) is `/security-review`'s job — but a deep audit never skips security.

**Source of truth:** the `security` skill, `CLAUDE.md` (env / security-critical rules), `/security-review`.

---

## B. Rendering strategy

**What to look for:**
- A route rendered dynamically that could be static or ISR (no per-request/personalized data), or rendered static when it needs per-request data — the wrong default either ships stale content or pays a render cost on every request.
- RSC discipline: `'use client'` higher than the leaf; a client boundary dragging server-safe modules into the bundle (cross-ref axis 2).
- Data fetched in `useEffect` that should be a Server Component or Server Action (cross-ref axis 1).
- Below-the-fold / modal / chart / editor client chunks not behind `dynamic()`.
- One slow `await` blocking the whole page paint where a Suspense boundary would stream the shell first.
- `unstable_cache` where `use cache` fits (respect any formal deferral of Cache Components — cross-ref axis 12).

**Source of truth:** `next-best-practices`, `next-cache-components`, `vercel-react-best-practices`; doc-ground rendering-API claims via the `next-devtools` MCP.

---

## C. Failure-path completeness

The happy path is what gets built and demoed; the failure paths are what get forgotten. This lens asks, for every surface the feature added: *what happens when it's loading, empty, or broken?*

**What to look for:**
- App Router boundaries missing where the feature's routes need them: `loading.tsx` (no streamed fallback), `error.tsx` (an unhandled throw white-screens the segment), `not-found.tsx`, `global-error.tsx`.
- The **three states** on every data-driven surface: a populated state but no **loading** state, no **empty** state ("you have no orders yet"), and no **error** state. Flag whichever are missing.
- Server Actions that `throw` into the void instead of returning a **typed error result** the UI can render; optimistic updates with no rollback on rejection.
- Empty `catch {}` / `catch (e) {}` that swallow a failure silently (axis 8 flags the *marker*; this lens judges the *missing behavior* — what should happen instead).
- Network/external calls with no timeout or no handling of the non-200 path.

**Source of truth:** `next-best-practices` (error/loading conventions), `CLAUDE.md`.

---

## D. Accessibility (static)

Readable-from-source accessibility — distinct from the runtime Lighthouse/contrast pass, which belongs to `/speedtest`. shadcn primitives ship accessible; the risk is in the **custom compositions** a new feature introduces.

**What to look for:**
- Non-semantic interactive elements: `onClick` on a `div`/`span` instead of a `<button>`/`<a>`; clickable things not keyboard-operable.
- Images with no `alt` (or decorative images missing `alt=""`).
- Form controls with no associated `<label>` (or `aria-label`/`aria-labelledby`).
- Modals/menus/popovers with no focus management — focus not trapped while open, not restored to the trigger on close.
- Broken heading hierarchy (an `h1`→`h3` jump, multiple `h1`s), or visual-only hierarchy via font size.
- Icon-only buttons with no accessible name.

**Don't** re-flag what shadcn already handles correctly, and hand color-contrast / runtime-AOM checks to `/speedtest`.

**Source of truth:** `web-design-guidelines`, WCAG 2.2 AA.

---

## E. Cache-invalidation correctness

In the RSC / Cache Components world, the most common data-freshness bug isn't on the read side — it's a write that never invalidates the read.

**What to look for:**
- A mutation (Server Action or route that writes) with **no `revalidatePath` / `revalidateTag` / `updateTag`** after the write — the UI keeps showing pre-mutation data until a hard reload.
- A cache tag/key on the write side that **doesn't match** what the readers cache under (invalidates the wrong thing → still stale).
- Over-broad invalidation (revalidating the whole layout when one tag would do) — the inverse cost.
- `revalidatePath` used where a tag is more precise, or a mutation relying on a TTL to "eventually" refresh when correctness needs immediacy.

**Source of truth:** `next-cache-components` (`cacheTag` / `updateTag` / `revalidateTag`), installed-version Next docs (doc-ground via the `next-devtools` MCP).

---

## F. Config / environment parity

The "works on my machine, 500s in prod" class — a feature reads an env var that exists in `.env.local` and nowhere else.

**What to look for:**
- A new `process.env.*` read whose variable is **not in `.env.example`** (empty-valued) — the next environment won't know to set it.
- A new env var not **validated in the env module** (`lib/env.ts` for client, `lib/env-server.ts` for server) — a missing value fails silently at runtime instead of loudly at boot.
- Raw `process.env` access **outside** the env modules (cross-ref axis 9).
- A var on the **wrong side of the trust boundary** — a server secret read in a `'use client'` path, or a `NEXT_PUBLIC_*` used where a server-only secret was intended.
- Hardcoded values (URLs, keys, IDs) that differ between preview and prod and should be env-driven.

**Source of truth:** the `security` skill (env trust boundary), `CLAUDE.md` (Environment Variables — safety-critical).

---

## G. Observability

Can you tell, from prod, whether this feature is working — without a user reporting it?

**What to look for:**
- Key user actions (the conversions/events the product cares about) with no analytics event fired (the project's analytics — e.g. PostHog).
- Risky paths — payments, external API calls, mutations, webhooks — with no error monitoring (e.g. Sentry) capturing failures.
- Logging at the wrong altitude: silent where a failure needs a breadcrumb, or noisy/`console.log`-spammy in a hot path. Any log/event that leaks a secret or PII is a **security** finding too (cross-ref lens A).
- A feature flag with no way to observe whether the flagged path is being taken.

**Apply with restraint** — match the project's actual observability posture (don't demand Sentry if the project doesn't use it). Flag the gap relative to what the project already does elsewhere.

**Source of truth:** `CLAUDE.md` (North Star — observable; MCP/observability section), the project's connected analytics / error-monitoring services.

---

## Conditional lenses (apply only when the scope calls for it)

**SEO / metadata depth** — for user-facing/public routes only:
- Missing `metadata` / `generateMetadata`; missing or generic OG/Twitter images; no canonical URL; missing structured data (JSON-LD) where it helps; sitemap/robots not updated for new public routes.
- **Source of truth:** `next-best-practices`, Next metadata docs.

**New-dependency justification** — when the feature added dependencies:
- A redundant dependency (a second date / state / validation library when one exists); a whole-library/barrel import where named imports would tree-shake (cross-ref axis 2 bundle); a heavy dependency for a job the platform already does.
- **Not** CVE / supply-chain scanning — that's a dedicated tool and is deliberately out of audit scope.
- **Source of truth:** `CLAUDE.md` (North Star — leanest thing that does the job), `package.json`.

---

## Severity calibration cheatsheet

When in doubt:

- It violates a hard rule in `CLAUDE.md` → **Critical**.
- It would break a parameterized/reusable system, hit a perf budget, or leak a secret → **Critical**.
- A missing auth/authorization check, an unvalidated external-data boundary, or a secret reachable from the client (lens A) → **Critical**.
- A mutation that never invalidates its cache so the UI shows stale data (lens E), or a new env var missing from `.env.example` / the env module (lens F) → **High**.
- An unhandled failure path — no `error.tsx`, no error state, a swallowed `catch` (lens C) — or a custom interactive element that isn't keyboard-accessible (lens D) → **High** (or Medium if the surface is low-traffic / internal).
- It violates an architecture decision record or duplicates a registered primitive → **High**.
- It misses a latest-Next.js leverage opportunity but the current code works → **Medium** (or Low if obscure).
- A missing analytics event or error-monitoring on a risky path (lens G) → **Medium**.
- It's a documentation/naming/location nit → **Low**.

When in doubt about effort:

- One file, mechanical change → **Quick**.
- Multiple files, but well-bounded → **Moderate**.
- Touches >5 files, requires migration of callers → **Large**.

---

## Anti-patterns: things that are not findings

Don't include:

- "Could use Tailwind class X instead of Y" (lint-level, not architectural).
- "Variable name could be clearer" (unless the unclear name is in a public API).
- "Could add JSDoc here" (unless the function has non-obvious behavior).
- "I'd organize this slightly differently" (without a concrete `why`).
- "This should use TanStack Query / Zustand / Redux" (the project deliberately does not use those — see `CLAUDE.md` Don'ts).
- Anything you'd hesitate to defend if challenged. Trust your hesitation.
