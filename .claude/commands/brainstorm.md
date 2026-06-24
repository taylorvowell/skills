Brainstorm and flesh out a feature idea together, right before planning it.

Invoke the `brainstorm` skill immediately and follow it end-to-end. Everything after `/brainstorm` is the idea to work on:

- `/brainstorm <your idea>` — flesh out a raw idea into a clear, project-aware concept: restate it logically, showcase the features and how someone would use it, show how it fits the current app, and suggest angles for a unique experience. Then it loops on your feedback and closes each turn by asking for more thoughts or a **GO**.
- On the first **GO** — it writes the agreed concept to `docs/brainstorms/<slug>.md`.
- On a second **GO** — it hands the write-up to the `plan` skill to start planning (or you can start a fresh thread and type `/plan <feature name>`).

This is the step JUST BEFORE `/plan` — it produces the fleshed-out idea that `/plan` decomposes into build steps. It does not write app code and does not commit.

If the argument is empty, ask the user what idea they want to brainstorm (one line).
