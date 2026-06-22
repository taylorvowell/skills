#!/usr/bin/env node
// PreToolUse guard (Claude Code hook). Hard-blocks Edit/Write to files the agent
// must NEVER write: `.env*` secret files and dependency lockfiles (hand-editing a
// lockfile corrupts it — always go through the package manager's install/add).
// `.env.example` / `.env.sample` are allowed (placeholder templates). Exit code 2
// blocks the tool call and shows the stderr message to the model. Scope is kept
// intentionally tiny so the per-edit cost stays negligible.
import { basename } from "node:path"

const LOCKFILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
])

let raw = ""
process.stdin.on("data", (chunk) => {
  raw += chunk
})
process.stdin.on("end", () => {
  let filePath = ""
  try {
    filePath = JSON.parse(raw)?.tool_input?.file_path ?? ""
  } catch {
    // No parseable input — fail open (don't block on a malformed hook payload).
    process.exit(0)
  }

  const base = basename(filePath)
  const isEnv = /^\.env(\.|$)/.test(base) && !base.endsWith(".example") && !base.endsWith(".sample")
  const isLockfile = LOCKFILES.has(base)

  if (isEnv || isLockfile) {
    const reason = isLockfile
      ? `${base} must never be hand-edited — run your package manager's install/add instead (e.g. \`pnpm install\`, \`npm install\`).`
      : `${base} holds secrets and must never be written by the agent — edit it manually, and commit only .env.example with empty values.`
    process.stderr.write(`Blocked edit to ${base}: ${reason}\n`)
    process.exit(2)
  }

  process.exit(0)
})
