Commit current changes and run Lighthouse against the Vercel preview deploy. Reports results when done.

Use this when you've finished a chunk of UI work (new page, new route, image/font/dep change) and want a perf gate before merge. NOT for tight iteration — for that, run a local Lighthouse audit on the route.

The argument (everything after `/commit-and-audit`) becomes the commit subject. If omitted, ask the user for one.

Steps:

1. **Run the `/commit` flow** — invoke the commit slash command (NOT a raw `git commit`). It performs the full secret/sensitive-file safety scan before committing. If it aborts, stop here and surface the finding.

2. **Push the current branch** to origin. Capture the branch name from `git rev-parse --abbrev-ref HEAD`. If push fails (e.g. branch protection on `main`), surface the error and stop.

3. **Detect a PR (optional — only used for the final results comment).**
   - Run `gh pr view --json number,url,state,headRefName` for the current branch.
   - If a PR exists: capture the number + URL.
   - If no PR exists: that's fine — the workflow runs without one (Vercel still deploys a preview for any branch). Skip PR creation unless the user explicitly asks. The audit proceeds; we just won't post a results comment at the end.
   - If current branch IS `main`: stop — `main` deploys go to production, not to preview. Audit production performance via field data, not lab data.

4. **Trigger the audit** — if the project has a Lighthouse CI workflow, fire it explicitly with `gh workflow run <lighthouse-workflow>.yml --ref <branch> -f sha=$(git rev-parse HEAD)`, then resolve the new run id: `gh run list --branch <branch> --workflow <lighthouse-workflow> --limit 1 --json databaseId,url`.

5. **Report intermediate state** to the user:
   - Commit SHA + subject
   - PR URL (if one exists; otherwise "no PR open, results won't be posted to a PR thread")
   - Workflow run URL
   - Expected duration: ~5–8 min (Vercel preview build + Lighthouse desktop+mobile)
   - Tell them they can keep working; you'll notify when results land.

6. **Watch the run in the background** using `gh run watch <run-id> --exit-status` via Bash with `run_in_background: true`. Do NOT poll with sleep loops. The harness will notify on completion.

7. **When the run completes, report results**:
   - Run conclusion (success/failure)
   - For each variant (desktop, mobile): scores from the job summary
   - Link to the action run + link to the published reports
   - If FAILURE: identify which assertion failed (LCP / CLS / TBT / a11y) and on which URL. Offer to invoke the `lighthouse-optimize` skill on the failing route to start a fix loop.
   - If SUCCESS and a PR exists: post a one-line comment with the scores via `gh pr comment <pr-number> --body "Lighthouse ✓: desktop perf X, mobile perf Y, all budgets pass."` If no PR: just report results in chat.

Constraints:
- Don't auto-merge on pass. Always leave merge to the user.
- Don't downgrade or weaken the Lighthouse assertions to "make the audit pass." Fix the underlying regression or push back on the work, never the budget.
- If the Vercel preview times out (the workflow exits in the wait step), report it as infra (likely build failure on Vercel side, missing env vars, or the Vercel↔GitHub integration not installed). Don't retry blindly.
