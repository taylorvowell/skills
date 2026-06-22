---
name: tailwind-v4
description: Deep guidance for Tailwind CSS v4 styling work in a Next.js + shadcn/ui + CVA project. Use whenever editing your global stylesheet (e.g. app/globals.css), postcss.config.*, @theme blocks, CVA variant configs, color/font/spacing tokens, or any component file where new styling decisions are being made. Also use when adding, renaming, or refactoring theme tokens, when picking colors (oklch vs hex), when wiring up border colors, or when you spot any file named tailwind.config.js / tailwind.config.ts (treat that as an emergency). Trigger even when the user does not say "Tailwind" — styling work in this project is always v4 and v3 patterns are a regression risk.
---

# Tailwind CSS v4 Guidance

This project runs Tailwind CSS **v4**. The v3-era patterns most LLM training data knows are wrong here and will break the build or silently produce broken styles. This skill is the deep reference for what "correct" looks like in this repo.

Your project's CLAUDE.md may already state the high-level "don't"s. This skill is for when you're actually in the file making decisions.

> **Paths in this skill are examples.** Use whatever shape your project has — `app/globals.css` and `postcss.config.mjs` at the app root in a single app, or under `apps/web/` in a monorepo. The rules are what matter, not the literal paths.

---

## Emergency check — do this first

Before any styling work, verify v3 config files do **not** exist:

- `tailwind.config.js`
- `tailwind.config.ts`
- `tailwind.config.mjs`
- Any `tailwind.config.*` anywhere in the project (repo root, app, or package directories)

If you find one **that you did not just create in this turn**, stop other work and tell the user:

> "I found `<path>`. This shouldn't exist — Tailwind v4 is CSS-first and reading a config file alongside `@theme` causes split-brain theme tokens. Should I delete it and migrate any values it contains into `@theme` in the global stylesheet?"

Do not silently delete it. The file may contain tokens that need migrating into `@theme` first.

Conversely, if you ever *created* a `tailwind.config.*` file in this session, you've made a mistake — delete it and put the tokens in CSS via `@theme`. **Treat a `tailwind.config.js` as an emergency, not a normal artifact.**

---

## The mental model

In v3, the source of truth for the theme was a JavaScript config file, and CSS imported three magic directives. In v4, the source of truth is **CSS itself**:

- One import (`@import "tailwindcss"`) replaces the three `@tailwind` directives.
- The `@theme` block in CSS replaces `theme.extend` in `tailwind.config.js`.
- File scanning is automatic — there is no `content` array to maintain.
- PostCSS only needs `@tailwindcss/postcss`. Autoprefixer is gone (Lightning CSS handles it).

Theme tokens follow a strict naming convention so Tailwind can auto-generate utility classes from them:

| Token prefix | Generates utilities like | Example |
| --- | --- | --- |
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*` | `--color-primary` → `bg-primary` |
| `--font-*` | `font-*` | `--font-heading` → `font-heading` |
| `--spacing-*` | `p-*`, `m-*`, `w-*`, `h-*`, `gap-*` | `--spacing-gutter` → `p-gutter` |
| `--radius-*` | `rounded-*` | `--radius-lg` → `rounded-lg` |
| `--shadow-*` | `shadow-*` | `--shadow-card` → `shadow-card` |
| `--breakpoint-*` | responsive variants | `--breakpoint-3xl` → `3xl:` |
| `--text-*` | `text-*` (sizes) | `--text-display` → `text-display` |
| `--font-weight-*` | `font-*` weights | `--font-weight-display` → `font-display` |

If you invent a different prefix (e.g. `--colors-primary`, `--primary-color`, `--brand-primary`) Tailwind will not generate utilities for it. The token will only be usable via `var(--whatever)` in raw CSS — defeating the point.

---

## Canonical patterns

### Your global stylesheet (e.g. `app/globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* Theme tokens. Use `@theme inline` when values come from CSS variables
   so token references stay live; use plain `@theme` for literal values. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);

  --font-sans: var(--font-sans);
  --font-heading: var(--font-sans);
  --font-mono: var(--font-geist-mono);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
}

@layer base {
  /* v4's default border color is `currentColor`, NOT gray-200.
     Always set an explicit border on `*` so unprefixed `border` utilities behave. */
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

If your project needs per-theme or explicit light/dark variants, drive them with data attributes on a wrapping element (e.g. `[data-theme="<id>"]` and/or `[data-color-scheme="light|dark]"`) that set the raw CSS variables, then reference those variables from `@theme inline`. Add this layer only if the project actually needs it — a single `:root` + `.dark` pair is enough for most projects.

### `postcss.config.mjs`

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

That is the entire file. No `autoprefixer`, no `tailwindcss` (the v3 plugin), no `cssnano` unless you have a specific reason.

### CVA variant config (correct token usage)

```ts
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  // Base classes reference v4 tokens via the auto-generated utilities.
  "inline-flex items-center justify-center rounded-md border border-border font-sans transition-colors focus-visible:outline-ring/50",
  {
    variants: {
      intent: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

Notes on the example:
- `border border-border` is intentional. `border` alone in v4 uses `currentColor`, which is almost never what you want.
- `bg-primary`, `text-primary-foreground` come from `--color-primary` and `--color-primary-foreground` in `@theme`. If you need a new semantic color (e.g. `--color-brand-accent`), add it to `@theme` first, then use it as `bg-brand-accent`.
- Use `bg-primary/90` (opacity modifier) rather than a separate hover token.

---

## Color rules

- Prefer **`oklch()`** for new color values. It is perceptually uniform, supports wide gamuts, and matches the existing theme. Hex is acceptable only for one-off literal colors that already exist outside our system (e.g. a brand asset).
- Use the **semantic token**, not a raw color, in components. If a section needs a different brand color, its theme overrides `--primary`, not every `bg-blue-500` in the codebase.
- Opacity goes through the slash modifier: `bg-primary/10`, `text-foreground/70`. Do not invent `--color-primary-10` variants.
- When adding a new color scale, follow the shadcn pattern: define `--color-foo` and `--color-foo-foreground` together so any surface using `foo` has a guaranteed legible text token.

## Border, ring, and outline rules

- v4's default border color is `currentColor`. The `* { @apply border-border ... }` rule in your global stylesheet is what makes unprefixed `border` behave like v3. Do not remove that rule.
- When writing one-off borders in a component, always pair the width and the color: `border border-border`, `border-t border-muted`, etc. Never just `border` without a color class unless `currentColor` is what you want.
- For rings, `ring-1 ring-ring/50` is the established pattern.

## Spacing, sizing, radius

- Use the existing `--radius-*` scale (`rounded-sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl`). All derive from `--radius` so re-theming cascades correctly.
- Do not add ad-hoc radius values inline (`rounded-[7px]`) for anything that will appear more than once — add a `--radius-*` token.
- Same for spacing: if a value repeats (gutters, section padding), promote it to `--spacing-*`.

---

## Wrong patterns — flag these immediately

If you see any of these in a file you're editing, stop and surface it to the user before continuing. They are not "style preferences" — they are bugs in v4.

### ❌ `tailwind.config.js` / `tailwind.config.ts`

```js
// tailwind.config.js — DELETE THIS FILE
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { primary: "#3b82f6" },
    },
  },
};
```

**Why wrong:** v4 is CSS-first. A JS config will at best be ignored, at worst create split-brain tokens where some utilities resolve from CSS and some from JS. Migrate the values into `@theme` in the global stylesheet and delete the file.

### ❌ Three `@tailwind` directives

```css
/* WRONG — v3 syntax */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Why wrong:** v4 replaced these with a single `@import "tailwindcss"`. The directives may parse but you'll get inconsistent layer ordering.

### ❌ `content` array

```js
// WRONG — v3 only
content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"];
```

**Why wrong:** v4 auto-detects template files. The array does nothing, and its presence implies a config file exists (see emergency check).

### ❌ Autoprefixer

```js
// postcss.config.mjs — WRONG
const config = {
  plugins: {
    "tailwindcss": {},
    "autoprefixer": {},
  },
};
```

**Why wrong:** v4 uses Lightning CSS internally, which prefixes for you. `autoprefixer` is dead weight and the `tailwindcss` PostCSS plugin name is the old v3 entry point — use `@tailwindcss/postcss`.

### ❌ Wrong token prefix

```css
@theme {
  --primary: oklch(0.205 0 0);         /* WRONG — no utility generated */
  --colors-primary: oklch(0.205 0 0);  /* WRONG — plural */
  --brand-primary: oklch(0.205 0 0);   /* WRONG — non-standard prefix */
}
```

**Why wrong:** Only the exact prefixes (`--color-*`, `--font-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*`, `--text-*`, `--font-weight-*`) trigger utility generation. Without the prefix, `bg-primary` will not exist as a class.

**Fix:**

```css
@theme {
  --color-primary: oklch(0.205 0 0);
}
```

### ❌ Naked `border`

```tsx
<div className="border p-4">...</div>  // border is currentColor, usually invisible
```

**Why wrong:** v4 changed the default border color from gray-200 to currentColor. The `* { border-border }` rule in the global stylesheet patches this globally, but if you ever override the universal border or write component CSS outside Tailwind, the bug returns. Always pair width + color: `border border-border`.

### ❌ Inline className ternaries for variants

```tsx
<button className={`px-4 ${variant === "primary" ? "bg-primary text-white" : "bg-secondary"}`}>
```

**Why wrong:** Not a v4 issue per se, but violates the CVA rule. Use a `cva()` config so variants are discoverable, type-safe, and composable.

### ❌ JS-only theme access

```ts
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../tailwind.config";  // doesn't exist
```

**Why wrong:** There is no JS config to resolve. If you need a theme token in JS (rare — usually unnecessary), read the CSS custom property at runtime: `getComputedStyle(document.documentElement).getPropertyValue("--color-primary")`.

---

## Adding a new theme token — step by step

1. Decide the **prefix**: is it a color? font? spacing? Use the table above.
2. Add it to `@theme` (or `@theme inline` if it should reference another variable):
   ```css
   @theme {
     --color-brand-accent: oklch(85% 0.18 95);
   }
   ```
3. If it's a color and will be used as a background, also define its `-foreground` companion so text on it stays legible:
   ```css
   --color-brand-accent: oklch(85% 0.18 95);
   --color-brand-accent-foreground: oklch(0.145 0 0);
   ```
4. If it should change in dark mode, add a `.dark { --brand-accent: ... }` override. (Note: define the raw variable under `:root`/`.dark`, then reference it from `@theme inline`. See the existing pattern in the global stylesheet.)
5. Use it via the auto-generated utility: `bg-brand-accent`, `text-brand-accent-foreground`. No build step required — v4 generates the class on demand.
6. If a value differs across themes, prefer overriding the semantic `--primary` (etc.) inside a theme-scoped selector rather than adding new tokens per theme.

---

## Diagnosing styling issues — the 4-step ritual

When a user reports "the style isn't applying" / "hover doesn't fire" / "I edited it but it looks the same" — **do not iterate blindly on the className**. Follow this ritual before changing more code:

1. **Confirm the class is in the rendered HTML.** Ask the user to inspect the element and paste the `class` attribute, OR fetch the page over HTTP and grep:
   ```powershell
   (Invoke-WebRequest http://localhost:3000/<route> -UseBasicParsing).Content -match '<the-target-element[^>]*>'
   ```
   If the class isn't there, the React component isn't rendering what you think. Stop styling, start checking the component tree.

2. **Confirm the CSS rule is in the compiled bundle.** Find the bundle URL, grep for the rule:
   ```powershell
   $html = (Invoke-WebRequest http://localhost:3000/<route> -UseBasicParsing).Content
   $cssUrl = ([regex]::Match($html, '/_next/[^"]+\.css')).Value
   $css = (Invoke-WebRequest "http://localhost:3000$cssUrl" -UseBasicParsing).Content
   $css -match '\.hover\\:scale-105:hover'
   ```
   If the rule isn't there, Tailwind didn't pick up the class — restart dev server, check `@source` directives, check the file is in the scan path.

3. **Check what wraps the rule.** This is the step everyone (including past-me) skips. Extract the matching rule WITH context:
   ```powershell
   [regex]::Matches($css, '@media[^{]*\{[^{}]*\.hover\\:scale-105[^}]*\}[^}]*\}') | % Value
   ```
   If the rule is inside `@media (hover: hover)`, `@media (prefers-reduced-motion: no-preference)`, `@supports`, etc., the rule only applies when that media query matches. **Touch devices, devtools touch-emulation, OS reduced-motion all silently disable matching `@media` blocks.**

4. **Force the pseudo-state in devtools and read computed styles.** Ask the user to select the element, click the `:hov` button (Chrome) / hover-pin (Firefox), force `:hover`, and report the COMPUTED `scale` / `box-shadow` / etc. If the computed value matches the rule, it's applying — the visual issue is elsewhere (clipped by overflow, too subtle to perceive). If computed shows nothing, the rule isn't being matched at all.

---

## Known v4 landmines

| Landmine | Symptom | Fix |
| --- | --- | --- |
| **`hover:` gated by `@media (hover: hover)`** — Tailwind v4 default | Hover effects don't fire on touch laptops, Surface devices, or when devtools touch-emulation is on. Class present, rule in CSS, forced `:hover` shows nothing applied. | Override it in the global stylesheet with `@custom-variant hover (&:hover);` at the top. **Don't remove that line.** If hover utilities mysteriously stop working, check that line still exists. |
| **Arbitrary value HMR with Turbopack** | New arbitrary classes like `scale-[1.0237]` sometimes don't appear in the bundle until full dev-server restart. | Prefer built-in utilities (`scale-105`) when equivalent. When arbitrary is necessary and HMR seems stuck, restart the dev server. |
| **Border default = `currentColor`** | Borders disappear or render in unexpected colors. | The `* { @apply border-border }` rule in the global stylesheet patches this, but if a component overrides `*` or writes raw CSS, the bug returns. Always pair `border` with a color class: `border border-border`. |
| **Bracket-syntax `text-[color:var(--color-foo)]`** | Works, but verbose — v4 has a shorter canonical form. | Use `text-(--color-foo)`. Same for `bg-(--color-foo)`, `border-(--color-foo)`, etc. |
| **Split-brain themes from a leftover `tailwind.config.js`** | Some utilities resolve from JS, some from `@theme`. Hard to diagnose. | See "Emergency check" above — if any `tailwind.config.*` exists, surface to the user before doing other work. |

---

## Modern v4 patterns to prefer

These are v4 affordances that older v3-trained instincts miss:

- **Canonical CSS-variable utility form** — `text-(--color-ink)` not `text-[color:var(--color-ink)]`. Shorter, lint-clean.
- **`@custom-variant` for new variants** — define once in CSS, use as a Tailwind prefix everywhere. A common pair is `@custom-variant dark (&:is(.dark *))` and `@custom-variant hover (&:hover)`. Adding a new state variant means another `@custom-variant` line, not a JS plugin.
- **`@utility` for project-specific utilities** — replaces v3's `@layer utilities`. (e.g. a `no-scrollbar` utility.)
- **`@property` declarations** — v4 uses these heavily under the hood for animatable custom properties. If you write your own animated custom property, register it with `@property` so it transitions smoothly.
- **Native CSS features Tailwind v4 supports out of the box** — `oklch()`, `color-mix()`, `:has()`, `@container`, `not-*:` variants, `starting:` variant for entry animations. Reach for these before importing a runtime animation library.
- **`motion-safe:` / `motion-reduce:`** for animations that shouldn't fight `prefers-reduced-motion`. Use `motion-safe:` to scope showy animations; keep informative transitions (e.g. a card hover that conveys state) unconditional.

---

## CSS-layer Next.js + accessibility tips

This skill owns CSS-layer decisions. For things that aren't CSS, see the boundary map below.

**Next.js + CSS** (CSS-side considerations only):
- Don't `@import` Google Fonts in the global stylesheet — `next/font` handles font loading and avoids layout shift. Wire fonts in `app/layout.tsx`.
- Don't style raw `<img>` for images — use `next/image`. CSS-side: always reserve space via `aspect-square` / explicit width-height to avoid CLS.
- Cap third-party CSS `@import`s — every `@import` in the global stylesheet is render-blocking. Keep the list small; don't add more without reason.
- For theme-token color values used at runtime in JS, read the CSS custom property via `getComputedStyle` rather than importing a config — there is no JS config to import.

**CSS-layer accessibility** (HTML/ARIA accessibility belongs in a dedicated accessibility/design-guidelines reference):
- Always pair a `bg-*` with a matching `text-*-foreground`. Color contrast comes from disciplined token pairing — never set foreground text by eye.
- Use `outline-ring/50` or `outline-2 outline-offset-2` for focus styles. **Never `outline-none` without a replacement** — that strips keyboard navigation cues.
- Respect `prefers-reduced-motion` for decorative motion. Informative motion (hover affordances, expanding sections) can stay; full-screen entrance animations should gate behind `motion-safe:`.
- Touch targets: visual size is a CSS concern. Pair size utilities with `min-h-11 min-w-11` (~44×44 px) on tappable affordances. Which element is interactive belongs to the `component-system` skill.

---

## Skill boundary map — when this skill DOES NOT own the decision

When the request crosses out of "CSS-layer styling," route to the right skill. This is the dedup contract.

| Topic | Owned by |
| --- | --- |
| Tailwind tokens / `@theme` / colors / spacing / utility generation / v3-vs-v4 patterns | **this skill** |
| Diagnosing why a style isn't applying (the ritual above) | **this skill** |
| Where a new component file lives / shadcn primitive vs hand-roll / `REGISTRY.md` discipline | `component-system` |
| CVA *discipline* (no inline ternaries, default variants, file structure) | `component-system` |
| CVA *token usage* (what to put in the variant strings) | **this skill** |
| `next/font`, `next/image`, `next/script`, App Router file conventions, RSC vs client boundary | Next.js best-practices reference |
| HTML semantics, ARIA roles, keyboard nav, screen-reader behavior | accessibility/design-guidelines reference |
| React rendering performance, bundle size, hydration cost | React best-practices reference |
| Runtime perf measurement / Lighthouse / Core Web Vitals | `lighthouse-optimize` |

If multiple skills feel relevant, this skill wins for any decision rooted in the CSS bundle or a Tailwind utility. It defers for everything else.

---

## When in doubt

- Read the global stylesheet (e.g. `app/globals.css`) — it is the source of truth for current tokens.
- Search for the token before adding it: `Grep --color-` over your global stylesheet.
- If a value would be used in only one place, inline it (`rounded-[7px]`) and don't pollute the token namespace.
- If a value would be used in more than one place, promote it to a token.
- If a style isn't applying, **run the 4-step ritual above** before changing any code.
