# 01 - Example Step

**Phase:** Foundation & Setup
**Status:** not-started
**Estimated effort:** 30 minutes

## Overview

A placeholder step that demonstrates the step-file format the build system executes. Replace it with your first real step. See `.claude/ai-instructions/00 - README.md` for the full template and conventions.

## Dependencies

- None (this is the first step).

## Files & Areas Touched

- (none — placeholder)

## Steps

1. Read `.claude/ai-instructions/00 - README.md` to understand the step-file template, status tracking, self-healing, and blocker conventions.
2. Decide your first real track and step (`docs/runbooks/add-a-track.md` if you have it, or just rewrite this folder).
3. Replace this file with a real step whose Verification is an objective, runnable check.

## Quality Standards

- The step's Verification must be machine-checkable (a command that exits non-zero on failure), not a subjective "looks right".

## Verification

```bash
# Placeholder oracle — always passes. Replace with a real check, e.g.:
#   <your package manager> run typecheck && <your package manager> run lint
echo "example step verified"
```

A non-zero exit, a type error, an ESLint error, or a failing test is a fail. Manual checks ("open the page and confirm…") are listed as prose and confirmed with the user — they can't be auto-verified.

## Definition of Done

- [ ] You have replaced this placeholder with a real first step (or a real track).

## Notes

This example exists only so `/build`, `/status`, `/verify`, and `/roadmap` work the moment the artifact is dropped into a project. Delete it once you have real tracks.
