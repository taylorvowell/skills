Run a full type check and lint across the project.

1. Run the project's typecheck script with your package manager (or `tsc --noEmit` in each workspace)
2. Run the project's lint script with your package manager
3. If the project uses Prettier, run a format check (e.g. `prettier --check .`)
4. Report errors grouped by file. Be concise.
5. If I say "fix", fix them all automatically.
