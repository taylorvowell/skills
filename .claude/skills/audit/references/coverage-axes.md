# Coverage Axes

The 13 axes every audit must consider. Use this as a "did I look here?" pass before drafting findings — not every axis will produce findings for every audit, and that's fine.

For each axis, the entries below describe **what to look for** (the bad patterns) and **the source of truth** (where the finding's citation will come from). Cite the source of truth on every finding.

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

## 2. Performance / optimization

**What to look for:**
- Large client-side imports that should be `dynamic()` with `ssr: false`.
- Components without lazy loading where they should have it (below-the-fold, modals, drawers).
- Images missing dimensions / using `fill` without a sized container (CLS risk).
- Missing `priority` on LCP image.
- Synchronous heavy work in render (sorting, filtering big arrays) that should be memoized or moved server-side.
- Unbounded `useEffect` chains, re-renders from new object/array identities every render.
- `unstable_cache` where `use cache` would be cleaner (but check whether the project has formally deferred Cache Components migration).
- Bundle-size red flags: importing the entire `lodash`, the whole `date-fns` instead of named imports, etc.
- Anything that would blow LCP < 2.5s, INP < 200ms, CLS < 0.1.

**Source of truth:** `vercel-react-best-practices`, `vercel-optimize`, `lighthouse-optimize` skills, `CLAUDE.md` ("Performance").

---

## 3. Structural soundness

**What to look for:**
- Files that mix concerns (a "Cart" file that does fetching, UI, and analytics — should be split).
- Files way over a reasonable size (>500 lines is a yellow flag, >1000 is a red flag, but it depends).
- Circular imports.
- Server-only code reachable from client (`'use client'` files importing server-only modules).
- Tight coupling between unrelated domains (e.g., `cart/` importing from `account/` internals).
- Components that should be route-level but are nested in other components, or vice versa.
- Broken layering: e.g., `lib/` calling into `components/`.

**Source of truth:** `CLAUDE.md` ("Components — STRICT RULES"), general software architecture principles (cite the principle, not just "vibes").

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

## 8. Tech debt invoked by the solve

**This is the rare and mandatory axis.** Every audit must include this section even if empty.

**What to look for in your own recommendations:**
- Does a recommended refactor introduce a new abstraction the codebase doesn't have yet? That's debt unless it's clearly load-bearing.
- Does merging two components into one CVA component introduce a `discriminated union` props API that's confusing? Note the cost.
- Does moving a component require adding a new context provider? That has reach implications.
- Does the recommendation depend on a library upgrade or new dependency? Call out the install + maintenance cost.
- Does it create a "transitional" state where some callers use the new API and others don't? Plan the cleanup or accept the debt explicitly.

**Source of truth:** your own honesty. If you find no debt, say so plainly in the doc.

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

**Source of truth:** Vercel skills (`vercel-react-best-practices`, `next-cache-components`, etc.), official Vercel/Next docs.

---

## 13. Additional architectural suggestions

This is the catch-all for findings that don't fit cleanly into 1–12. Use it sparingly. Examples of what belongs here:

- "This domain folder is growing fast — consider splitting into subdomains."
- "The cart domain has 12 separate Server Actions; consider consolidating into a single `cart.ts` actions module with named exports."
- "There's no public-facing contract for what `<ExpertPanel>` expects — would benefit from a type-exported `ExpertConfig`."
- "Three different audits have hit the same registry-discovery problem; consider adding a `pnpm registry:check` script."

**Source of truth:** your judgment, but always include "why this matters" — if it's just "I'd prefer it this way," cut it.

---

## Severity calibration cheatsheet

When in doubt:

- It violates a hard rule in `CLAUDE.md` → **Critical**.
- It would break a parameterized/reusable system, hit a perf budget, or leak a secret → **Critical**.
- It violates an architecture decision record or duplicates a registered primitive → **High**.
- It misses a latest-Next.js leverage opportunity but the current code works → **Medium** (or Low if obscure).
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
