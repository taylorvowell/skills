---
description: Run pre-deploy safety checks, then deploy to Vercel via the deploy-to-vercel skill
---

Deploy the project to Vercel, gated behind pre-deploy checks.

1. **Preflight (always first).** Run the project's lint, typecheck, and test scripts with its package manager. Show `git status`. Confirm no `.env*` files are staged. Show what's about to deploy (branch, target). If any gate fails, stop and report — don't deploy.
2. **Deploy.** Invoke the `deploy-to-vercel` skill to run the deploy and return the URL. For token-based / non-interactive / CI contexts use `vercel-cli-with-tokens`; for broader project management (domains, env vars, logs) reach for `vercel-cli`.
3. Report the deployment URL and the target (preview / production) back to the user.

Default to a **preview** deploy unless the user explicitly asks for production.
