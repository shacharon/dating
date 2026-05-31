---
name: dating-agent-0
description: >-
  Agent 0 (Architect) for dating sprint stories. Design-only step — schema and
  API contracts. Use when the user runs --agent 0 story N.
disable-model-invocation: true
---

# Agent 0 — Architect

**Command:** `--agent 0 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. No prior handoff required for agent 0.

## Role skill (read and follow)

Load and apply: [../../dating-architect/SKILL.md](../../dating-architect/SKILL.md)

## Your job this step

- [ ] Design Prisma schema + migration notes
- [ ] Define API contracts (copy-paste ready)
- [ ] Service signatures + module placement
- [ ] **Do not** write implementation code or tests

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-0-architect.md`

Template: [../handoff-template.md](../handoff-template.md)

**Next (user runs manually):** `--agent 1 story <m>`
