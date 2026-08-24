---
name: dating-agent--1
description: >-
  Agent -1 (Pre-flight) for dating sprint stories. Validates dependencies,
  story readiness, and checks for conflicts before architecture starts.
  Use when the user runs --agent -1 story N.
disable-model-invocation: true
---

# Agent -1 — Pre-flight

**Command:** `--agent -1 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and paths.
2. Read the story file + linked epic + sprint README.
3. No prior handoff required for agent -1.

## Role skill (read and follow)

Load and apply: [../../dating-preflight/SKILL.md](../../dating-preflight/SKILL.md)

## Your job this step

- [ ] Verify story dependencies are met (e.g., "Depends on Sprint X Done")
- [ ] **Git land check:** if story `m > 1`, previous story tip `feature/sprint-<s>-story-<m-1>` (or documented tip) must be an **ancestor of `main`** (`git rev-list --count main..<tip>` = **0**). If still ahead → verdict **blocked** (“previous story not merged to main”)
- [ ] If this is story 1 of a sprint that depends on another sprint Done, that sprint’s tip must likewise be on `main` (ahead = 0)
- [ ] Check story is well-defined (AC, DoD, Why/What present)
- [ ] Detect conflicting stories in progress (same files, same services)
- [ ] Validate sprint context (is this sprint blocked? are previous stories done **and on main**?)
- [ ] Flag missing epic links or broken references
- [ ] Estimate story complexity (Small/Medium/Large/Split)
- [ ] **Do not** design or implement anything

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent--1-preflight.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: dependencies status, conflicts found, story readiness verdict (ready | needs-clarification | blocked), complexity estimate.

## Git (handoffs are local only)

Handoff files are in `.gitignore` and stay local. No git commit needed for Agent -1.

**Next (user runs manually):** `--agent 0 story <m>` if verdict is "ready", else fix blockers first
