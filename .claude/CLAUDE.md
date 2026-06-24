## Documentation Discipline

On non-trivial changes during a session, before ending your final response:
1. If an architectural decision was made (new dependency, new pattern, new service, a "we're going to do X not Y" choice) → draft an ADR using the template at `docs/decisions/_template.md`, save to `docs/decisions/NNNN-kebab-title.md` where NNNN is the next sequential number.
2. If an operational procedure was created or learned (how to handle X failure, how to roll back Y, how to onboard Z) → draft a runbook using the template at `docs/runbooks/_template.md`, save to `docs/runbooks/kebab-title.md`.
3. If a feature was planned, started, or shipped this session (e.g. via `/plan` or `/build`) and `docs/PROJECT.md` exists → keep that living overview current: move the feature between its **Planned → In progress → Shipped** lists, refresh **Current focus**, and bump the `updated` date. `docs/PROJECT.md` is the project's living description (created by `/start`); it should never drift from what's actually being built.
4. If `.claude/CLAUDE.md` or any per-app CLAUDE.md is now out of date → update it.
5. For deeper guidance (when to document, when not to, templates), the `docs` skill in `.claude/skills/docs/` is available — load it when doing documentation work.
6. At the end of your final response, list what was documented or explicitly note "no documentation needed" with one-line reasoning.

What is NOT worth documenting (skip these):
- Trivial bug fixes, typo corrections, cosmetic changes
- How frameworks (Next.js, React, Tailwind) work — has official docs
- Step-by-step task narration — code is the documentation

## Preview after visual changes — always

When a change alters anything the user would visually review — page layout, styling, a new or restyled component/section, copy placement, responsive/mobile behavior — **deploy a preview and give the user the direct link to the affected page, without being asked.** Link the exact route you changed (the home page `/`, a specific detail page, a dashboard route, etc.), not just the root, so the user lands right where the change is. If the project deploys multiple variants behind env flags, deploy with the matching env so the route renders correctly.

- **Visual/UI change → redeploy a preview, then paste the link to the page you changed.** Run the local gates first (typecheck + lint); the deploy build is the integration check.
- **Logic-only / non-visual change** (types, server libs, tests, refactors with no render change) → no preview needed.
- Deploying a preview is an approved, low-risk continuation of this workflow — don't re-ask each time; just do it and hand over the link.

## Finishing a turn

Run the work end-to-end, then keep the answer short and easy to read. Write in plain words — no shorthand, no abbreviations, no internal jargon. Match the length to the task and never pad with a mandated section template. Keep going autonomously until the request is done or you hit a real stopping boundary (human-only task, ambiguous user decision → `AskUserQuestion`, destructive or outward-facing action, or a build SPINE step). Don't report after every sub-task.

**Recommend what comes next, then wait for "go".** When there are genuine next steps, end by stating clearly what you recommend doing next — phrased as the action you would take, not a chore for the user. If the user replies "go", proceed with exactly that recommendation without re-asking. If there are no real next steps, don't invent any.

**The wrap-up summary (only after a large task or a build step — not after small or routine work).** When you finish something substantial, lead with a fast, spoken-style recap, as if telling a teammate out loud what you just did. Separate each part below with a blank line so they read as distinct paragraphs — never cram them together. Keep it to these short parts, in order:
1. **What I did** — a bulleted list, 5 bullets maximum. Short, incomplete sentences, 9 words or fewer per bullet.
2. **Next step** — two sentences maximum. Omit this part entirely when this is otherwise the end and there's no further action to take.
3. **If you want to review** — one optional line on how the user could go view or verify the work themselves (for example, start local dev and open the homepage to see the new calculator). This is never your recommendation — it's just something they *can* do. Skip the line when there's nothing visible to check.
4. **My recommendation** — this is **always an action you will take to move the work forward**, never a human chore. Never recommend that the user review, test, or check something — that belongs in the line above. Always propose a concrete next step you can run, even when the immediate task is finished: the next build step, the next phase, starting the next feature, or clearing/compacting and then continuing the plan. Phrase it as what you'll do and end with the trigger, like *"Continue the build into the order-confirmation phase. Say GO and I'll run the next step."*
   - **One clear path:** two short sentences.
   - **Several actions you could take:** a lettered list (a, b, c), at most 3, the first your pick and shown in **bold**, each one short line.
   - **If a reset helps first:** chain it onto the trigger — *"Compact this thread first, then say GO and I'll …"* or *"Start a fresh chat, then say GO and I'll …"* — giving the exact phrase to say or command to run there.
   - **If the immediate task is fully done** and no next step is obvious, look at the build plan / roadmap, find what we could work on next, and suggest that as your next action. Don't just stop — there is almost always a next move you can propose.
   - **If your recommendation is to continue the overall plan/build,** show a quick table of the plan's phases with their status (complete / incomplete), and mark the recommended next phase so it stands out (for example a → arrow or "← next" in its row). Keep the table compact — phase name and status only.
   - **If a preference is genuinely the user's call** (no right answer, like "do you want this everywhere or just here?"): drop the label and ask it plainly as an offer ending in the trigger.
   - **If a question genuinely blocks all progress:** put that single question here instead of a recommendation.

   Below the recommendation, on its own line with a blank line above it, add the bold green-check fallback so doing nothing is always a clear choice: **✅ Otherwise this is complete — you can start a new thread.** It can carry a context move when one helps — for example **✅ Otherwise this is complete — compact this thread, then type GO.**

Only flag a context move (compact / new chat / clear) when it actually helps — a long session, context getting heavy, or a clean break point. If the answer is just keep going, say nothing about context. Skip the whole wrap-up for ordinary turns; it exists so a session is easy to read back after coding, not to decorate every reply.

**Planning is the exception to brevity.** When you are laying out a plan, you may be as thorough as the plan needs — but keep it clear, concise, and easy to understand. Detailed is fine; rambling is not.

A few things that still hold: no internal identifiers (ADR numbers, track ids) — use plain names; never commit or suggest committing.

For a build SPINE step, end by offering: **Complete** (do everything except advancing the build) or **GO** (everything, including the build).
