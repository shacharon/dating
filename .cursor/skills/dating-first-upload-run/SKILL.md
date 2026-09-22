---
name: dating-first-upload-run
description: >-
  Orchestrator for Dating first AWS upload. Run one role per message with
  --upload-agent product|architect|devops|qa phase <id>. Loads role skill and
  phase playbook; writes handoffs under docs/first-upload/handoffs/.
disable-model-invocation: true
---

# Dating first-upload orchestrator

One agent per user message. Do not auto-chain.

## Command

```text
--upload-agent <product|architect|devops|qa> phase <id>
```

`phase` ids: `0` `1` `2` `3` `4` `5a` `5b` `5c` `5d` `5e` `5f` `5g` `6` `7` `8`

Examples: `--upload-agent product phase 1` · `--upload-agent qa phase 5g`

## Pipeline (every phase)

| Order | Agent | Role skill | Handoff |
|-------|--------|------------|---------|
| 1 | product | [dating-first-upload-product](../dating-first-upload-product/SKILL.md) | `agent-product.md` |
| 2 | architect | [dating-first-upload-architect](../dating-first-upload-architect/SKILL.md) | `agent-architect.md` |
| 3 | devops | [dating-first-upload-devops](../dating-first-upload-devops/SKILL.md) | `agent-devops.md` |
| 4 | qa | [dating-first-upload-qa](../dating-first-upload-qa/SKILL.md) | `agent-qa.md` |

Step skills: [agent-product](./agent-product/SKILL.md), [agent-architect](./agent-architect/SKILL.md), [agent-devops](./agent-devops/SKILL.md), [agent-qa](./agent-qa/SKILL.md)

Per-phase playbook: [phases.md](./phases.md)  
Plan: [docs/DATING_FIRST_UPLOAD_PLAN.md](../../../docs/DATING_FIRST_UPLOAD_PLAN.md)  
Handoff template: [handoff-template.md](./handoff-template.md)

## Execution flow

1. Parse `--upload-agent` + `phase`.
2. Read this file + matching `agent-*/SKILL.md` + role skill + **this phase** section in `phases.md`.
3. Require prior handoffs (architect needs product; devops needs architect; qa needs devops).
4. Do the job. Write `docs/first-upload/handoffs/phase-<id>/agent-<role>.md`.
5. Reply with handoff path + next command. **Stop.**

## Isolation

This pipeline is **Dating only**. Do not load Going2Eat deploy skill or `angular-piza/.cursor/aws-deploy.json`.

## Phase 0

Already complete in the plan. If invoked: product confirms done; others no-op with status complete.
