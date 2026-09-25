# Agent commands — Sprint 76 (Skippable preferences)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`
One command per message. After Agent 3 marks a story Done, that branch is on `main`
(ahead = 0) before the next story starts.

Every story in this sprint touches the UI, so `3.5` runs on all of them.
No Agent 5 — this sprint has no AWS or production deploy work.

**Order:** 1 → 2 → 3.

## All stories, in order

```text
--agent -1 sprint 76 story 1
--agent 0 sprint 76 story 1
--agent 1 sprint 76 story 1
--agent 2 sprint 76 story 1
--agent 3.5 sprint 76 story 1
--agent 3 sprint 76 story 1

--agent -1 sprint 76 story 2
--agent 0 sprint 76 story 2
--agent 1 sprint 76 story 2
--agent 2 sprint 76 story 2
--agent 3.5 sprint 76 story 2
--agent 3 sprint 76 story 2

--agent -1 sprint 76 story 3
--agent 0 sprint 76 story 3
--agent 1 sprint 76 story 3
--agent 2 sprint 76 story 3
--agent 3.5 sprint 76 story 3
--agent 3 sprint 76 story 3
```

## Per story

### Story 1 — Onboarding Preferences step

`-1 → 0 → 1 → 2 → 3.5 → 3`

```text
--agent -1 sprint 76 story 1
--agent 0 sprint 76 story 1
--agent 1 sprint 76 story 1
--agent 2 sprint 76 story 1
--agent 3.5 sprint 76 story 1
--agent 3 sprint 76 story 1
```

### Story 2 — Update details Preferences section

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Story 1 is on `main`.

```text
--agent -1 sprint 76 story 2
--agent 0 sprint 76 story 2
--agent 1 sprint 76 story 2
--agent 2 sprint 76 story 2
--agent 3.5 sprint 76 story 2
--agent 3 sprint 76 story 2
```

### Story 3 — Retire `/settings/preferences`

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Story 2 is on `main`.

```text
--agent -1 sprint 76 story 3
--agent 0 sprint 76 story 3
--agent 1 sprint 76 story 3
--agent 2 sprint 76 story 3
--agent 3.5 sprint 76 story 3
--agent 3 sprint 76 story 3
```
