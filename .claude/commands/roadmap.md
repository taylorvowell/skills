Show the macro build roadmap across all tracks.

Invoke the `roadmap` skill. It will:
1. Read `.claude/ROADMAP.json` (declarations only — the macro index of all tracks)
2. Derive a live status rollup by reading each track's `statusFile` (its own `_STATUS.json`)
3. Run four cross-track consistency checks: spine uniqueness, dependency satisfaction, ownership collision, lifecycle-vs-derived drift
4. Regenerate `.claude/ROADMAP.md` (the human-readable rollup)
5. Report the table + any check failures + a recommended next track to advance

Read-only on declarations: it NEVER writes progress into `ROADMAP.json`. Each track's own `_STATUS.json` is the sole authority for that track's progress; the roadmap derives, never duplicates. The only file it writes is `ROADMAP.md`.

This is the MACRO view (spans all tracks). For a single track's detail use `/feature <name> status`. To advance the spine track use `/build`; to advance any track use `/feature <name>`. To add a new track see `docs/runbooks/add-a-track.md`.
