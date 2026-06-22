---
name: component-system
description: Deep guidance for building React components in a Next.js + shadcn/ui + Tailwind v4 + CVA project — shadcn/ui primitives, CVA variants, a components REGISTRY index, and domain-folder placement. Use whenever creating any new component, modifying anything in your components directory, adding a variant or prop to an existing component, or about to build a button, input, dialog, card, badge, select, sheet, tabs, separator, skeleton, label, avatar, tooltip, dropdown, or any other UI primitive. Also use when planning a feature that will need new UI, when refactoring inline className conditionals into variants, or when deciding where a new component should live. Trigger even when the user does not say "component" — any work that produces JSX is component work and benefits from this guidance. Prevent primitive recreation, default exports, and components leaking into app/ route directories.
---

# Component System

This project has strict rules about how components are built, where they live, and how they're discovered. The single biggest failure mode an LLM has here is **recreating a primitive that already exists** (hand-rolling a `<button>` instead of using `Button`). A components `REGISTRY.md` index is the antidote — read it first, every time.

These are stack defaults for a Next.js + shadcn/ui + Tailwind v4 + CVA project. The high-level rules may be summarized in your project's CLAUDE.md; this skill explains the rules and shows the patterns the codebase actually uses.

> **Paths in this skill are examples.** Use whatever shape your project has — `components/` at the app root in a single app, or `apps/web/components/` in a monorepo. The conventions are what matter, not the literal path.

---

## Mandatory pre-flight — do this before writing any component

1. **Read the components `REGISTRY.md` completely.** The recommended convention is a `REGISTRY.md` index at the root of your components directory (e.g. `components/REGISTRY.md`) that inventories every primitive and composed component. Don't grep, don't skim — read the whole file. It's short. It's the authoritative inventory. If your project doesn't have one yet, create it as you register components.
2. **Search the registry for what you need.** If you need something button-shaped, look at the Button row. If you need a slide-out panel, look at Sheet.
3. **Decide which case you're in:**
   - **Case A — Primitive already exists** → import it from the listed path. Stop. Do not recreate.
   - **Case B — Primitive exists but the variant you need doesn't** → open the existing component file, add the variant to its CVA config, update `REGISTRY.md`. Do not fork the component into a sibling file.
   - **Case C — Composed component needed (e.g. ProductCard)** → build it from registered primitives, place it under `components/[domain]/`, register it.
   - **Case D — Genuinely new UI primitive needed (e.g. Slider, Combobox)** → install via the shadcn CLI: `npx shadcn@latest add slider`. Never hand-write a file in `components/ui/`.
4. **After any component change, update `REGISTRY.md`.** This is non-negotiable. An unregistered component is invisible to future you (and to future Claude).

Why this discipline matters: a design system only stays coherent if there is exactly one implementation of each primitive. If two parts of the app end up using two different Button implementations because someone forked, the design system fractures and theming stops being one knob.

---

## Hard rules (with the why)

### UI primitives come exclusively from shadcn/ui

`components/ui/` is reserved for shadcn-generated files. Install with:

```bash
npx shadcn@latest add [primitive-name]
```

**Why:** shadcn outputs accessible, headless, theme-token-aware components that integrate with the Tailwind v4 tokens in your global stylesheet. Hand-rolling a button means re-implementing focus management, ARIA, keyboard handling, and disabled states — and getting subtle pieces wrong. The CLI also keeps the file structure consistent so future shadcn updates can be diffed.

If you're about to write `<button className="...">` as a fresh component file in `components/ui/button.tsx`, stop. The file already exists. Use it.

### All variant logic uses CVA

No inline ternaries on `className`. Every component with visual variants exports a `cva()` config.

**Why:** CVA gives you (a) discoverability — variants are listed in one place; (b) type safety via `VariantProps`; (c) consumer override via the final `className` slot; (d) composability — the same `buttonVariants` can be applied to an `<a>` styled as a button, without rewriting.

### Named exports, not default

Every component file uses named exports. Exception: `page.tsx` and `layout.tsx` must use `export default` because Next.js requires it.

**Why:** Named exports make imports self-documenting (`import { Button }` tells you what you got; `import Button` could be anything). They also make rename-refactors safer and prevent accidental "default everything" sprawl.

### Components never live in `app/`

`app/` is for route segments (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, route handlers, `template.tsx`, `not-found.tsx`). Reusable JSX lives under `components/[domain]/`.

**Why:** A component in a route directory is invisible to other routes that need it, leads to duplication, and pollutes the routing surface. The compiler doesn't enforce this; the convention does.

### One component per file, file name matches component name

`ProductCard` lives in `components/product/product-card.tsx`. Helper subcomponents that are only used inside `ProductCard` can live in the same file — but as soon as anything else needs them, split them out and register them.

### `Props` interface above the component, named `[ComponentName]Props`

```tsx
interface ProductCardProps extends VariantProps<typeof productCardVariants> {
  product: Product;
  onAddToCart?: (id: string) => void;
}

export function ProductCard({ product, onAddToCart, layout }: ProductCardProps) { ... }
```

**Why:** Predictable location, predictable name. `ComponentNameProps` makes the export searchable and importable by consumers who need the type.

---

## Domain folders — where things go

Organize composed components by their *concern*, not by where they happen to render. A typical layout:

```
components/
├── ui/             # shadcn primitives only (CLI-managed)
├── product/        # ProductCard, ProductGallery, ProductDetails
├── search/         # SearchBar, SearchResults, SearchFacets
├── cart/           # CartDrawer, CartItem, CartSummary
├── layout/         # Header, Footer, MobileNav, Sidebar
├── content/        # BlogPost, Guide, FAQ
└── marketing/      # Hero variants, CTA blocks, social proof
```

These domain names are illustrative — use the domains that match your project. Pick the folder that best describes the component's *concern*, not where it currently happens to render. A `ProductCard` belongs in `product/` even if it first appears on the home page.

If nothing fits, ask the user before inventing a new domain folder. Adding a domain is a design decision, not a side effect.

---

## The canonical CVA pattern

Mirror your existing Button component for new composed components.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const productCardVariants = cva(
  // Base classes — always applied
  "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-shadow",
  {
    variants: {
      layout: {
        grid: "h-full",
        list: "flex-row items-center",
        compact: "p-2",
      },
      emphasis: {
        default: "shadow-sm hover:shadow-md",
        featured: "shadow-md ring-2 ring-primary/20 hover:shadow-lg",
        muted: "opacity-80",
      },
    },
    defaultVariants: {
      layout: "grid",
      emphasis: "default",
    },
  }
);

interface ProductCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof productCardVariants> {
  product: Product;
}

export function ProductCard({
  product,
  layout,
  emphasis,
  className,
  ...props
}: ProductCardProps) {
  return (
    <div
      className={cn(productCardVariants({ layout, emphasis, className }))}
      {...props}
    >
      {/* compose from primitives */}
    </div>
  );
}

export { productCardVariants };
```

Key things to copy:
- `cva()` first arg = base classes; second arg = `{ variants, defaultVariants }`.
- `variants` object: each variant key (e.g. `layout`) maps variant values (e.g. `"grid"`) to a string of classes.
- `defaultVariants` always specified — this is what makes the component usable without props.
- Props interface `extends VariantProps<typeof xVariants>` so consumers get autocomplete.
- `className` from props is merged *inside* the `cva()` call so consumer overrides win the cascade.
- `cn()` from `@/lib/utils` handles class merging + tailwind-merge dedup.
- Export both the component and the variants config — the config is useful when another component wants to apply the same styling to a different element (e.g. `<a className={buttonVariants({ variant: "ghost" })}>`).

---

## Case-by-case examples

### Case A — Primitive exists, just use it

```tsx
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productId }: { productId: string }) {
  return (
    <Button variant="default" size="default" onClick={() => addToCart(productId)}>
      Add to cart
    </Button>
  );
}
```

No new variants invented, no CVA config duplicated. The Button does the work.

### Case B — Need a variant that doesn't exist → edit the primitive

You need a new accent Button variant for a branded CTA. The variant doesn't exist yet.

**Wrong:**

```tsx
// components/marketing/accent-button.tsx — WRONG
export function AccentButton(props) {
  return <button className="bg-yellow-400 text-black ..." {...props} />;
}
```

**Right:** open `components/ui/button.tsx` and add the variant to `buttonVariants`:

```tsx
variants: {
  variant: {
    default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
    // ...existing variants...
    accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  },
  // ...
}
```

Then update the Button row in `REGISTRY.md` to list `accent` among the variant options.

Note: adding `accent` as a color requires a theme token in your global stylesheet (`--color-accent`, `--color-accent-foreground`). See the `tailwind-v4` skill for how to add theme tokens.

### Case C — New composed component

You need `ProductCard`. Search `REGISTRY.md` → not found. Build it from registered primitives:

```tsx
// components/product/product-card.tsx
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const productCardVariants = cva("...", { variants: { ... }, defaultVariants: { ... } });

interface ProductCardProps extends VariantProps<typeof productCardVariants> {
  product: Product;
}

export function ProductCard({ product, layout, className }: ProductCardProps) {
  return (
    <Card className={cn(productCardVariants({ layout, className }))}>
      <CardHeader>{/* ... */}</CardHeader>
      <CardContent>{/* ... */}</CardContent>
      <CardFooter>
        <Button variant="default" size="sm">Add to cart</Button>
      </CardFooter>
    </Card>
  );
}

export { productCardVariants };
```

Then register it (next section).

### Case D — Need a primitive that isn't installed yet

You need a Slider for a range filter. Not in `REGISTRY.md` → install:

```bash
npx shadcn@latest add slider
```

Then register the row in the "UI Primitives" table of `REGISTRY.md`.

---

## REGISTRY.md update — example entry

After building `ProductCard`, add a row to the **Composed Components** table:

```markdown
| ProductCard | `@/components/product/product-card` | Card, Badge, Button | Product display in listings and search results |
```

Columns:
1. **Component** — PascalCase name as exported.
2. **Path** — import path with `@/` alias. No `.tsx` extension.
3. **Built From** — comma-separated list of registered primitives this component uses. This is the trail that future-you follows to understand what depends on what.
4. **Purpose** — one short phrase describing when to use it. Not "displays a product" (obvious) — "Product display in listings and search results" (where it's used).

If the component has CVA variants, also note the variant names in a short cell, e.g. `layout: grid, list, compact`.

For primitives, the row goes in the **UI Primitives** table instead, with the variant column populated from the CVA config.

---

## Wrong patterns — flag immediately

### ❌ Recreating a primitive from scratch

```tsx
// components/cart/cart-button.tsx — WRONG
export function CartButton({ children, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
    >
      {children}
    </button>
  );
}
```

**Why wrong:** Button already exists with these styles, focus management, ARIA, disabled handling, icon slot, and a dozen variants. You're throwing all of that away and creating a new thing the design system has to track. Use `<Button variant="default">{children}</Button>` instead.

### ❌ Inline conditional classNames for variants

```tsx
// WRONG
<div
  className={`rounded p-4 ${featured ? "border-2 border-primary" : "border border-border"} ${compact ? "py-2" : "py-4"}`}
>
```

**Why wrong:** Hard to read, no type safety, no central place to see the available variants, painful to extend. The third time you reach for a ternary inside `className`, you've outgrown ternaries — extract a `cva()` config.

**Fix:**

```tsx
const cardVariants = cva("rounded p-4", {
  variants: {
    emphasis: { default: "border border-border", featured: "border-2 border-primary" },
    density: { default: "py-4", compact: "py-2" },
  },
  defaultVariants: { emphasis: "default", density: "default" },
});
```

### ❌ Default export for a component

```tsx
// WRONG (except for page.tsx / layout.tsx)
export default function ProductCard(...) { ... }
```

**Why wrong:** Imports become guessable and inconsistent, IDE rename refactors silently rename one side, the name in the file can drift from the name at the import site.

**Fix:** `export function ProductCard(...) { ... }` and `import { ProductCard } from "..."`.

### ❌ Component in a route directory

```
app/
└── (storefront)/
    └── products/
        ├── page.tsx
        └── product-grid.tsx  ← WRONG, this is a reusable component
```

**Why wrong:** Other routes that need a product grid can't import it without crossing route boundaries, which is awkward and signals the file is in the wrong place.

**Fix:** Move to `components/product/product-grid.tsx` and import from `page.tsx`.

### ❌ Hand-writing a file in `components/ui/`

```tsx
// components/ui/slider.tsx — WRONG (hand-written, not from shadcn CLI)
export function Slider(...) { ... }
```

**Why wrong:** `components/ui/` is shadcn-managed. Hand-written files there will lack the accessibility, headless behavior, and integration shadcn provides — and they'll confuse the next person who tries to update primitives via the CLI.

**Fix:** `npx shadcn@latest add slider`, then register it.

### ❌ Forking a component to add a variant

```
components/ui/
├── button.tsx
└── button-accent.tsx  ← WRONG
```

**Why wrong:** Now there are two Button implementations to keep in sync. The whole design system drifts.

**Fix:** Add `accent` to the `variant` key in the existing `buttonVariants` CVA config.

### ❌ Not updating REGISTRY.md

You built a new component. It works. You skip the registry update.

**Why wrong:** The next time you (or another agent) builds something in the same area, you re-read the registry, don't see it, and reinvent it. Now there are two components that do the same thing. They drift. The system fractures.

**Fix:** Treat the registry update as part of "done." A component without a registry row is incomplete.

---

## Edge cases and judgment calls

**Compound components (e.g. Dialog has DialogTrigger, DialogContent, DialogHeader, ...).** Register the parent only, with a "Compose:" note listing the subcomponents (the existing Dialog/Card rows in `REGISTRY.md` show the pattern). Don't make a row per subcomponent.

**Server vs client components.** Default to Server Components. Add `"use client"` only when the component genuinely needs browser APIs, hooks, or event handlers — and keep `"use client"` at the leaf, not at the top of a tree. This is a Next.js rule, not a component-system rule, but it matters when deciding where to colocate a component.

**Theme-specific styling.** Don't add `variant: { themeA: "...", themeB: "..." }` to every primitive. Instead, override the semantic color tokens (`--color-primary`, etc.) in a scoped CSS selector. Variants describe shape and emphasis; theme tokens describe color identity. See the `tailwind-v4` skill.

**Truly one-off styling.** If a component is used in exactly one place and will never be reused, you can inline its classes and skip CVA. But: be honest about "one place" — if there's a 70% chance it'll be reused, just build it right.

**Hooks colocated with components.** OK to put a component-specific hook in the same file. If a second component needs it, lift it to a shared hooks directory (e.g. `hooks/`).

---

## TL;DR checklist before saving a component file

- [ ] Read `REGISTRY.md` and confirmed nothing matches
- [ ] File is under `components/[domain]/`, not under `app/`
- [ ] Component is a `function` with a named `export`
- [ ] Props interface is named `[ComponentName]Props` and lives above the component
- [ ] Variant logic uses `cva()`; `defaultVariants` is set; `className` is merged with `cn()`
- [ ] Imports primitives from `@/components/ui/*` instead of hand-rolling
- [ ] `REGISTRY.md` has a new row (or an updated row for variant additions)
