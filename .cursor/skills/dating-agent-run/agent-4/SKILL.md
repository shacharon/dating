---
name: dating-agent-4
description: >-
  Agent 4 (E2E tester) for dating sprint stories. Runs end-to-end integration
  tests through the shared matching-engine harness for stories touching
  eligibility, preference dimensions, or ranking. Use when the user runs
  --agent 4 story N.
disable-model-invocation: true
---

# Agent 4 — E2E tester

**Command:** `--agent 4 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-2-cr.md`** handoff — **required**. If missing, stop and tell user to run `--agent 2 story <m>` first.
4. Check whether the story touches eligibility, preference dimensions, ranking, or the matches endpoints (trigger table in the role skill). If not, this step is **N/A** — say so and tell the user to skip to `--agent 3 story <m>`.

## Role skill (read and follow)

Load and apply: [../../dating-e2e-tester/SKILL.md](../../dating-e2e-tester/SKILL.md)

## Your job this step

- [ ] Confirm the 3 baseline E2E specs are still green, unmodified (unless the story intentionally changes that behavior — must already be flagged upstream)
- [ ] Add/extend E2E scenario(s) using `me-matches-eligibility-harness.ts` for whatever this story changed
- [ ] Run `npx jest --no-coverage "integration.spec" --runInBand` (from `dating-api`) and report the real result
- [ ] **Do not** rewrite unit tests (agent 2's job) or implement fixes (agent 1's job) — if E2E finds a real bug, stop, write `blocked`, and send back to `--agent 1`

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-4-e2e.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: baseline spec status (green/red), new scenarios added + file paths, full test run output, bugs found (→ agent 1) vs. none.

**Next (user runs manually):** `--agent 3 story <m>` — or `--agent 1 story <m>` if E2E found a real bug
