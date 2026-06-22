# Phase Document Template

This template produces each `NN-phase-N-<slug>.md` file in an audit folder. One file per phase. The file is designed so a fresh Claude can execute it without needing the surrounding chat context.

Copy the structure below into each phase file, replacing `<bracketed>` placeholders. **Paths and commands below are illustrative** — resolve paths against your Next.js app directory (the repo root for a single app, or a workspace like `apps/web/` in a monorepo), and replace example commands with your package manager's equivalents (`pnpm` / `npm` / `yarn` / `bun`).

---

```markdown
# Phase <N>: <Phase Title>

| Field          | Value                              |
|----------------|------------------------------------|
| Audit          | <audit-slug-YYYY-MM-DD>            |
| Phase          | <N> of <total>                     |
| Resolves       | C1, H2, M3                         |
| Effort         | Quick / Moderate / Large           |
| Touches        | <N> files                          |
| Dependencies   | Phase <N-1> complete, or "None"    |
| Status         | Pending                            |
| Checkpoint     | Required / Not required            |

## Goal

<One paragraph. What is this phase accomplishing? What does the codebase look like before vs. after?>

## Findings resolved by this phase

For each finding ID listed above, restate the recommendation here so the executor doesn't have to jump back to the overview:

- **C1 — <short title>:** <recommendation, verbatim from overview>
- **H2 — <short title>:** <recommendation, verbatim from overview>

## Preconditions

Run each check before starting. If any fails, STOP and report to the user.

```bash
# Example checks. Replace with phase-specific ones.
test -f components/product/ProductCard.tsx
git status --porcelain | wc -l    # expect 0 — working tree should be clean
```

Also confirm:
- Previous phase status in `_status.md` is `complete` (if this phase has a dependency).
- No uncommitted changes in the audit's scope (working tree clean for the touched files).

## Tasks

Numbered, ordered, atomic. Each task has: file path, change description, and (if non-obvious) a code sketch or before/after.

### Task 1 — <verb-noun: "Add `layout` variant to ProductCard CVA">

**File:** [components/product/ProductCard.tsx](components/product/ProductCard.tsx)

**Change:** Add a `layout` variant axis to the existing `productCardVariants` CVA config with values `"default"` and `"compact"`.

**Sketch:**

```tsx
export const productCardVariants = cva(
  "rounded-md border bg-card",
  {
    variants: {
      // ... existing variants
      layout: {
        default: "p-4",
        compact: "p-2",
      },
    },
    defaultVariants: {
      // ...
      layout: "default",
    },
  }
);
```

**Why this task is here:** Resolves the duplication called out in C1 — `CatalogProductCard.tsx` exists solely because the original card didn't expose a layout axis.

### Task 2 — <verb-noun>

**File:** ...

**Change:** ...

### Task 3 — Migrate callers of `<CatalogProductCard>` to `<ProductCard layout="compact">`

**Files:**
- [components/product/ProductGrid.tsx](components/product/ProductGrid.tsx)
- [components/cart/CartCrossSell.tsx](components/cart/CartCrossSell.tsx)

**Change:** Replace each `<CatalogProductCard ...>` with `<ProductCard layout="compact" ...>`. Adjust prop names where they differ.

### Task 4 — Delete `CatalogProductCard.tsx`

**File:** [components/product/CatalogProductCard.tsx](components/product/CatalogProductCard.tsx)

**Change:** Delete the file. Update the component registry (e.g. `components/REGISTRY.md`) to remove the entry.

## Verification

Run each command. **Pass** = all return exit 0 and (where checked) the expected output. **Fail** = any non-zero exit, unexpected output, or timeout >60s.

```bash
# Build still passes (substitute your package manager + typecheck script)
<pkg> typecheck

# Lint still passes
<pkg> lint

# Unit tests still pass (only run the affected scope)
<pkg> test:unit -- product

# The component registry no longer mentions the deleted component
! grep -q "CatalogProductCard" components/REGISTRY.md

# Deleted file is actually gone
test ! -f components/product/CatalogProductCard.tsx
```

### End-to-end (only when this phase touches user-facing flow code)

If during audit planning this phase was flagged as touching a critical user flow (cart, checkout, auth) or as restructuring selectors that existing end-to-end specs target, include the affected spec runs in Verification. Otherwise omit this section.

```bash
# Run the specific specs that exercise the changed flow
<pkg> exec playwright test \
  tests/e2e/cart-cross-sell.spec.ts \
  tests/e2e/cart-checkout-flow.spec.ts
```

**Don't add E2E runs to phases that:** rename mechanically without changing rendered output, touch only internal utilities or types, modify only the registry / docs / config files, or are pure removal (no behavior change). E2E runs cost 3–10 minutes; spend that budget only when the phase's risk actually warrants it.

**If an E2E run fails:**
- If the failure is because the change explicitly renamed a selector AND this phase's Tasks section already told the executor to update the test file accordingly, it's not a regression — the executor should have updated the test as part of the phase. Verify the update was made.
- If the failure indicates an actual regression (UI doesn't render, server action 500s, console errors), that's an escalation trigger per the overview's Execution Instructions.

### Manual checks

If any verification step requires manual confirmation that an AI executor cannot run autonomously, call it out explicitly:

> **Manual check:** Open `http://localhost:3000/cart` and confirm the cross-sell strip renders identically to before. This is an Escalation Trigger per the overview's Execution Instructions — execution pauses for user confirmation before this phase is marked complete.

Use Manual checks sparingly. Every Manual check pauses autonomous execution, so reserve them for verifications that genuinely can't be expressed as a command (e.g., visual regression on a deliberately-not-pixel-tested page). For most flows, an `expect()` in an end-to-end spec is better than a Manual check.

## Completion criteria

This phase is complete when:

- All Verification commands return exit 0.
- Any manual checks have been confirmed by the user.
- `_status.md` shows phase `<N>` status as `complete` with `completedAt` set.
- A git commit covering this phase has been created via `/commit`.

## Rollback

If this phase needs to be rolled back after partial execution:

- **If a `checkpoint` was created** (the table at the top says `Checkpoint: Required`): use `/rollback` to restore. Then update `_status.md` to set this phase back to `pending` and clear `startedAt`/`completedAt`.
- **If no checkpoint exists:** `git reset --hard HEAD~1` undoes the last commit but only after confirmation from the user. Never do this without asking.

## Notes for the AI coder

<Use this section only if there's something non-obvious about executing this phase. Examples:>
- "Task 3 must happen after Task 1 — if you swap them, callers will break before the variant exists."
- "The migration in Task 3 is across 4 callers. Two of them pass a `compact={true}` prop that needs to become the `layout="compact"` form."
- "If `pnpm typecheck` fails after Task 1, the most likely cause is a forgotten `defaultVariants` entry — add `layout: 'default'` to the defaults."

If there's nothing tricky, omit this section.
```

---

## Notes on filling out the phase template

**Tasks are atomic.** Each task should be either fully done or not started — never partially done. If you can't make a task atomic, split it.

**File paths everywhere.** Every task names the file(s) it touches. The executor should never have to grep around to figure out what to change.

**Code sketches when the change is non-obvious.** For "rename X to Y" tasks, a description is enough. For "add a variant to this CVA config," include a code block so the executor doesn't have to invent the structure.

**Verification commands are real.** Don't put `# pseudo-verification` — the executor will literally run these. If you can't write a verification command, the phase isn't well-bounded enough; rethink the phase boundary.

**Manual checks are flagged explicitly.** The phase doc should never silently rely on the executor "checking the page renders." Either it's a command, or it's an explicit `Manual check:` callout that pauses for user confirmation.

**Rollback is not optional.** Every phase has a rollback strategy. The `checkpoint` flag in the header table determines whether `/rollback` is the strategy or whether `git reset` is.

**Phase docs are independent.** Don't say "see phase 1 for context" — restate what's needed. A future Claude might pick up at phase 3 in a fresh session.
