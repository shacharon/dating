---
name: dating-agent-3
description: >-
  Agent 3 (PM) for dating sprint stories. Closes story — checks DoD, updates
  status, summarizes pipeline. Use when the user runs --agent 3 story N.
disable-model-invocation: true
---

# Agent 3 — PM / close story

**Command:** `--agent 3 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read all handoffs: `agent-0-architect.md`, `agent-1-dev.md`, `agent-2-cr.md`.
4. If the story touches eligibility/preference dimensions/ranking, also read `agent-4-e2e.md` — **required** for these stories. If missing, stop and tell user to run `--agent 4 story <m>` first.

## Role skill (read and follow)

Load and apply: [../../dating-pm-contractor/SKILL.md](../../dating-pm-contractor/SKILL.md)

## Your job this step

- [ ] Verify DoD against handoffs from agents 0–2
- [ ] Realtime/proxy stories: confirm runtime topology + browser Network smoke not deferred without tracker — [dating-runtime-verification](../../dating-runtime-verification/SKILL.md)
- [ ] Eligibility/preference/ranking stories: confirm `agent-4-e2e.md` exists and its verdict isn't `blocked`, or a tracked follow-up exists — [dating-e2e-verification](../../dating-e2e-verification/SKILL.md)
- [ ] Update story Status + DoD checkboxes in story file
- [ ] Update sprint README checklist status
- [ ] **Do not** implement code

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-3-pm.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: final status (Done | Blocked), DoD summary, what's deferred.

**Next story (when user is ready):** `--agent 0 story <m+1>`
