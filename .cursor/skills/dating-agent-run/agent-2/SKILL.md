---
name: dating-agent-2
description: >-
  Agent 2 (Code review) for dating sprint stories. Reviews implementation,
  writes tests, fixes issues. Use when the user runs --agent 2 story N.
disable-model-invocation: true
---

# Agent 2 — Code review + tests

**Command:** `--agent 2 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-1-dev.md`** handoff — **required**. If missing, stop and tell user to run `--agent 1 story <m>` first.
4. Read all files listed in the dev handoff.

## Role skill (read and follow)

Load and apply: [../../dating-code-review/SKILL.md](../../dating-code-review/SKILL.md)

## Your job this step

- [ ] Review code for security, logic, patterns
- [ ] Write/fix tests; run test commands
- [ ] Fix critical/major issues found

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-2-cr.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: verdict (approved | fixed), test paths, commands + results, remaining issues.

**Next (user runs manually):** `--agent 3 story <m>` — or `--agent 1 story <m>` if major fixes needed
