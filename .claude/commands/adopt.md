Adopt this toolkit into the EXISTING project in the current repo.

Invoke the `adopt` skill immediately and follow it end-to-end. Everything after `/adopt` is extra context from the user (e.g. a focus area or constraint) — pass it along. The skill is self-contained (its `references/` carry the CLAUDE.md structure, the skills index, and the hooks block).

It will: research the repo → author/restructure the root `CLAUDE.md` into the proven structure using the project's real facts (folding in any existing CLAUDE.md/AGENTS) → wire in the skills index + verify the secret-safety hooks → ask about intent (North Star, ranked priorities) and any opt-in upgrades → summarize. The project's conventions stay authoritative; nothing is overwritten without confirmation; it does NOT commit.
