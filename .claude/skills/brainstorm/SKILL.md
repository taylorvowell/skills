---
name: brainstorm
description: Collaborative ideation partner that fleshes out a raw feature idea into a clear, shareable concept BEFORE planning. Use when the user types /brainstorm, or says "brainstorm", "help me flesh out this idea", "I have an idea for…", "let's think through X together", "work on this solution with me", "explore/develop this concept", "I'm thinking about adding…", or otherwise brings a half-formed feature idea they want to expand and pressure-test rather than immediately build. Grounds the idea in THIS project — restates it logically, showcases the features and how someone would use it, shows where it fits the existing app, and suggests cross-feature angles for a unique experience — then loops on the user's feedback and, on GO, writes the concept to docs/brainstorms/<slug>.md and offers to hand it to /plan. This is the step JUST BEFORE /plan: it produces the fleshed-out idea that /plan decomposes into steps. NOT for strategic vendor/architecture decisions (that's /architect), NOT for parking a someday idea you won't build now (that's /future), and NOT for breaking an already-clear feature into build steps (that's /plan).
---

# Brainstorm — flesh out an idea before it's planned

This skill is the **thinking-out-loud step that comes right before `/plan`**. The user arrives with a spark — sometimes a sentence, sometimes a paragraph — and your job is to turn it into a clear, vivid, *project-aware* concept you both believe in. You expand it, make it concrete, connect it to what already exists, and surface the angles they hadn't thought of. Then, only once they're happy, you write it down so `/plan` can pick it up cold.

The value here is **collaboration, not a one-shot dump**. You propose a richer version of their idea, they react, you fold in their reactions, and you converge together. Think of yourself as a sharp product partner across the table, not a form to fill in.

## Where this sits

`spark → /brainstorm (flesh out + agree) → /plan (decompose into steps) → /build`

- It's **not** `/architect` — that's for strategic, cross-system, build-vs-buy, vendor decisions.
- It's **not** `/future` — that parks an idea you've decided *not* to build now.
- It's **not** `/plan` — that breaks an already-clear feature into numbered, verifiable steps. Brainstorm produces the clear feature that plan consumes.

If, partway through, the idea turns out to really be a strategic architecture question, say so and suggest `/architect`. If the user decides they don't want it now after all, suggest `/future`.

## Step 1 — Ground yourself in the project (quick, but do it)

A generic brainstorm is worthless; the whole point is an idea shaped to *this* app. Before responding, take a fast read of the project so your suggestions are specific and your "how it fits" is real, not invented:

- **`CLAUDE.md`** — the project's purpose, North Star, ranked priorities, domain rules. Tie the idea to these.
- **What already exists** — skim the app's surface area: routes/pages, `components/REGISTRY.md` if present, existing feature tracks (`.claude/feature-tracks/`), the roadmap (`.claude/ROADMAP.json`), and the backlog (`docs/icebox/`). You're looking for features this idea could lean on, overlap with, or uniquely combine with.

Keep this light — a few targeted reads, not a full audit. You want enough to make the brainstorm concrete and to spot "oh, this could plug into the X you already have."

## Step 2 — Present the fleshed-out concept (in chat, not a file yet)

Respond conversationally with a richer, concrete version of their idea. **Don't write a file at this stage** — this is the part you iterate on together, and writing too early wastes both of your effort.

There's no rigid template — shape it to the idea — but a strong brainstorm usually covers:

- **The idea, restated clearly.** One or two sentences that capture the essence, sharpened. Show them you understood it, logically laid out.
- **What it does — the core features.** The capabilities, fleshed out beyond what they said. Make the fuzzy parts concrete.
- **How someone actually uses it.** A short walkthrough of the experience — the user's path through it, start to finish. This is where an idea becomes real.
- **How it fits the current app.** Where it would live, what existing features it connects to or builds on, what it complements. This is grounded in Step 1 — name real parts of the project.
- **Ideas to make it shine.** Your suggestions: extra features worth considering, a unique angle, a way to combine it with something else in the app for an experience competitors wouldn't have. This is where you add value beyond stenography — push the idea somewhere better.
- **Open questions.** The handful of decisions still genuinely fuzzy — flag them so they're conscious choices, not silent assumptions.

Be vivid and specific. Prefer "users land on the dashboard and see a live 'momentum' strip across the top, fed by the activity you already track" over "add a dashboard widget." Concreteness is what makes the user able to react.

## Step 3 — Ask the two closing questions

End every brainstorm turn with exactly these two prompts, so the user always knows where the conversation can go:

> **Any additional ideas, changes or thoughts?**
>
> **If you're happy, do you want me to write this idea up as a `.md`? Just say _GO_.**

Then **loop**: if they add thoughts or changes, fold them into the concept and present the updated version, closing again with the same two questions. Stay in this loop — refining together — until they say GO. There's no limit on the back-and-forth; converging is the point.

## Step 4 — On GO, write the idea up

When the user says GO (the first one), write the concept to `docs/brainstorms/<slug>.md` (create the `docs/brainstorms/` directory if it doesn't exist). Pick a short kebab-case `<slug>` from the feature name. Capture the *final, agreed* version — everything you converged on, written so a reader (human or `/plan` in a fresh thread) understands it with zero chat context.

Use this structure:

```markdown
---
title: <Feature name>
status: brainstorm        # brainstorm → planned (once it becomes a track)
created: <today's date, YYYY-MM-DD>
serves: <which project goal / priority this supports>
---

# <Feature name>

**One-liner.** <the essence in a sentence>

## The concept
<the idea, restated and fleshed out>

## Core features
- <capability, concrete>

## How it's used
<the user's walkthrough — the experience start to finish>

## How it fits the app
<where it lives; existing features it builds on / connects to — name real parts of the project>

## Ideas worth considering
<the extra angles, unique combinations, stretch features you surfaced together>

## Open questions
- <decisions still to make>

## Notes
<source: brainstorm on <date>; anything else a planner should know>
```

Write it immediately — don't make the user wait — then show a tight confirmation (the path + a one-line summary of what you captured).

## Step 5 — Offer the handoff to planning

After the file is written, offer the natural next step:

> Written to `docs/brainstorms/<slug>.md`. Want me to start planning this now with the planning skill? Say **_GO_** again — or start a fresh thread and type **`/plan <feature name>`** to kick it off there.

- If they say **GO** again → invoke the `plan` skill, seeding it with the brainstorm file (treat the write-up as the feature description so `/plan` clarifies scope and scaffolds the track from it). Update the brainstorm's frontmatter `status:` to `planned` once a track exists.
- If they'd rather plan in a fresh thread → that's often the cleaner choice for a big feature (clean context). Give them the exact `/plan <feature name>` to type and stop there.

## Things that keep this good

- **Ground before you ideate.** The difference between a useful brainstorm and a generic one is whether it's shaped to this specific app. Always do the quick Step 1 read.
- **Iterate in chat; write once.** The file is the *output* of agreement, not the medium of discussion. Don't write or rewrite the `.md` on every turn — only on GO.
- **Push the idea, don't just echo it.** Your suggestions and the cross-feature angles are the point. A brainstorm that only restates what the user said added nothing.
- **Always close with the two questions** so the path forward (more thoughts, or GO) is never ambiguous.
- **Don't start building.** This skill flesh-out and writes up — it never edits app code. Building happens through `/plan` → `/build`.
