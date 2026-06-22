# Feature tracks

Each subfolder here is one **track** — a self-contained, multi-session mini-build the build system advances one verified step at a time.

```
.claude/feature-tracks/<track-id>/
├── _STATUS.json          # machine-readable progress (written atomically by progress-tracker)
├── _PROGRESS.md          # human-readable, append-only progress log
└── NN - Title.md         # numbered step files (01, 02, …)
```

- A track is declared in `.claude/ROADMAP.json` (its `id`, `goal`, `phase`, `statusFile`, `dir`, `lifecycle`, `dependsOn`, `owns`).
- Exactly one track is the **spine** (`spine: true` in ROADMAP.json). `/build` advances the spine; `/feature <id>` advances any track.
- Step status lives ONLY in each track's `_STATUS.json` — never hand-write progress into `ROADMAP.json`. `/roadmap` derives the macro rollup from these files.

The shipped `example-track/` exists only so the build commands work immediately. Replace it with your own tracks. The step-file template and all conventions are in `.claude/ai-instructions/00 - README.md`.
