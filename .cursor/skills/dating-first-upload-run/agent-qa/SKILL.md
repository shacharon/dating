---
name: dating-first-upload-agent-qa
description: >-
  Step spec for first-upload QA agent. Use when --upload-agent qa.
disable-model-invocation: true
---

# Agent — QA

**Command:** `--upload-agent qa phase <id>`

1. Read [../SKILL.md](../SKILL.md)
2. Role: [../../dating-first-upload-qa/SKILL.md](../../dating-first-upload-qa/SKILL.md)
3. **Required:** `agent-product.md` + `agent-devops.md`
4. Read-only verify exit test
5. Write `docs/first-upload/handoffs/phase-<id>/agent-qa.md`
6. Stop. Pass → `--upload-agent product phase <next>`. Fail → `--upload-agent devops phase <id>`
