Audit the performance **and accessibility** of a route in your Next.js app, then recommend fixes — and ask before changing anything.

This is an alias for the `lighthouse-optimize` skill — invoke it. It audits the route with Lighthouse, diagnoses the findings, develops a fix plan, and presents it as a coverage table (modeled on `/audit`) with a **risk column**. It does **not** auto-fix and does **not** loop — it stops and asks what you want done.

Steps:

1. Determine the target route from the argument (everything after `/speedtest`). Default to the homepage (`/`) if none given.
2. Determine the audit environment from the wording — **default is the project's Vercel preview deploy**; "local" means the production build on a free port; "production" means the live site; or pass a pasted URL. Pass it through; the skill maps it to a target. (When local, it always means the production build — the dev server is not a valid audit target.) If pointed at an auth-protected `*-git-*` preview, the runner auto-sends `VERCEL_AUTOMATION_BYPASS_SECRET` (from the local env file) so it doesn't measure the Vercel login page.
3. Invoke the `lighthouse-optimize` skill with that route + environment. Let it run the audit → diagnosis → plan → findings table → **and then stop and ask.** Do NOT let it fix anything before the user chooses.

The skill, by design:

- **Audits, then asks — never auto-fixes.** It presents findings + proposed fixes in a `/audit`-style table where each fix carries an **impact** rating and a **risk** rating (regression / functionality risks — animations, analytics/tracking, load-order, edge cases — plus a 🟢/🟡/🔴 level). No loops: one audit, one plan, one decision.
- **Asks how to proceed** via four choices: apply **all** fixes · **critical only** · only fixes that **won't impact visuals** · or a **custom** set (name what to fix or skip).
- **Deepens diagnosis with Chrome DevTools MCP** — real performance traces + Core Web Vitals insights for the *why*, with fixes grounded in the `vercel-react-best-practices` rulebook and current Next.js docs.
- **Defaults to the preview deploy; local means the production build on an auto-selected free port** — never the dev server (its tooling distorts the numbers) and never colliding with your dev server on :3000. (Remote audits are measurement-only — local fixes show up only after a redeploy.)
- **Checkpoints before the first edit** (a `speedtest-checkpoint-<route>-<ts>` git tag); say "roll back the speedtest" anytime to restore.
- **Targets "good", not a perfect score** — Core Web Vitals green + Performance ≥90 / a11y·BP·SEO ≥95 on desktop and mobile.
- **Won't break the design.** For any approved visual change (contrast, sizing, fonts, layout) it **shows a rendered before/after preview** (with variants for contrast) and confirms before applying. After applying the chosen set it re-audits once to confirm — then stops.

The skill already folds in a read-only static pre-scan (stray `'use client'`, raw `<img>`, missing `sizes`, `useEffect` data fetching, forbidden `tailwind.config.*`, raw `process.env`) as findings in the plan — it doesn't fix them on its own.
