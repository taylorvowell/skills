#!/usr/bin/env node
// PostToolUse hook (Claude Code). After an Edit/Write to a JS/TS file, run ESLint
// on JUST that file and surface any ERRORS back to the model so they get fixed
// in-flow instead of surfacing later at step Verification. REPORT-ONLY: it never
// rewrites the file (no --fix), so it can't collide with an in-progress multi-file
// edit or leave the model's view stale.
//
// Project-shape agnostic: it walks up from the edited file to find the nearest
// `node_modules/eslint/bin/eslint.js` (the app/package that owns the file) and runs
// ESLint from that directory — so it works whether the app lives at the repo root
// or under a monorepo workspace like apps/web. If no local ESLint is found, it
// fails open (does nothing).
//
// Contract: exit 2 with the lint report on stderr → Claude Code feeds it back to
// the model (the tool already ran; this is advisory, not a block). Exit 0 = no
// errors / not applicable / anything went wrong (FAIL OPEN — a broken hook must
// never wedge editing). Scope is intentionally tiny: only JS/TS source, 20s cap,
// errors-only.
import { existsSync } from "node:fs"
import { dirname, resolve, parse as parsePath } from "node:path"
import { spawnSync } from "node:child_process"

// Walk up from `startDir` looking for node_modules/eslint/bin/eslint.js.
// Returns { eslintBin, cwd } or null.
function findEslint(startDir) {
  let dir = startDir
  const { root } = parsePath(dir)
  while (true) {
    const bin = resolve(dir, "node_modules", "eslint", "bin", "eslint.js")
    if (existsSync(bin)) return { eslintBin: bin, cwd: dir }
    if (dir === root) return null
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

let raw = ""
process.stdin.on("data", (c) => (raw += c))
process.stdin.on("end", () => {
  try {
    const filePath = JSON.parse(raw)?.tool_input?.file_path ?? ""
    if (!filePath) process.exit(0)

    const norm = filePath.replace(/\\/g, "/")
    const isLintable = /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(norm) && !norm.endsWith(".d.ts")
    if (!isLintable) process.exit(0)

    const found = findEslint(dirname(resolve(filePath)))
    if (!found) process.exit(0) // no local ESLint — fail open

    // Default (stylish) formatter — ESLint v9 removed `compact`/`unix` from core.
    const res = spawnSync(process.execPath, [found.eslintBin, filePath], {
      cwd: found.cwd,
      timeout: 20000,
      encoding: "utf8",
    })

    // ESLint: status 0 = clean, 1 = lint errors found, 2 = fatal config/internal
    // error, null = timed out. Only 1 is actionable for the model; everything
    // else fails open so the hook never nags about its own breakage.
    if (res.status !== 1) process.exit(0)

    const out = (res.stdout || "").trim().split("\n").slice(-40).join("\n")
    process.stderr.write(
      `Post-edit lint (advisory) — ESLint found errors in ${norm}:\n${out}\n` +
        `Fix these before continuing if this file is part of your current change.\n`,
    )
    process.exit(2)
  } catch {
    process.exit(0) // any failure → fail open
  }
})
