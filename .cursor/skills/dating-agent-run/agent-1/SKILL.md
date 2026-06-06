---
name: dating-agent-1
description: >-
  Agent 1 (Senior dev) for dating sprint stories. Implements backend and
  frontend from architect handoff. Use when the user runs --agent 1 story N.
disable-model-invocation: true
---

# Agent 1 — Senior dev

**Command:** `--agent 1 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-0-architect.md`** handoff — **required**. If missing, stop and tell user to run `--agent 0 story <m>` first.

## Role skill (read and follow)

Load and apply: [../../dating-senior-dev/SKILL.md](../../dating-senior-dev/SKILL.md)

## Your job this step

- [ ] Implement per architect handoff (schema migration, API, UI)
- [ ] `npx prisma migrate deploy` when schema changed
- [ ] Manual smoke in **real browser** for realtime/auth — [dating-runtime-verification](../../dating-runtime-verification/SKILL.md)
- [ ] **Do not** write full test suite (agent 2's job)

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-1-dev.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: files changed, how to run migration/dev server, **browser Network smoke** (pass/deferred), deferred gaps.

**Next (user runs manually):** `--agent 2 story <m>`
