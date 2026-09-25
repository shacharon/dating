# Agent commands — Sprint 76 (Tell people about analysis)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`
One command per message. After Agent 3 marks a story Done, that branch is on `main`
(ahead = 0) before the next story starts.

Every story touches the UI, so `3.5` runs on all of them.
No Agent 5 — this sprint has no AWS or production deploy work.

**Order:** 1 and 2 may run in parallel. Story 3 starts only after Story 2 is on `main`.

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

### Story 1 — Hint on the page before login

`-1 → 0 → 1 → 2 → 3.5 → 3`
May run in parallel with Story 2. Files: landing copy and the public landing page.

```text
--agent -1 sprint 76 story 1
--agent 0 sprint 76 story 1
--agent 1 sprint 76 story 1
--agent 2 sprint 76 story 1
--agent 3.5 sprint 76 story 1
--agent 3 sprint 76 story 1
```

### Story 2 — Profile hint, button, and result

`-1 → 0 → 1 → 2 → 3.5 → 3`
May run in parallel with Story 1. Files: read-only Profile overview.

```text
--agent -1 sprint 76 story 2
--agent 0 sprint 76 story 2
--agent 1 sprint 76 story 2
--agent 2 sprint 76 story 2
--agent 3.5 sprint 76 story 2
--agent 3 sprint 76 story 2
```

### Story 3 — No nag anywhere else

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
