# Agent commands — Sprint 74 (First login)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`  
One command per message. After Agent 3 marks a story Done, that branch is on `main` (ahead = 0) before the next story.

Story 1 is already Done. Do not run agents for it.

## Story 2 — API health check

`-1 → 0 → 1 → 2 → 3 → 5`

```text
--agent -1 sprint 74 story 2
--agent 0 sprint 74 story 2
--agent 1 sprint 74 story 2
--agent 2 sprint 74 story 2
--agent 3 sprint 74 story 2
--agent 5 sprint 74 story 2
```

## Story 3 — Empty photos

`-1 → 0 → 1 → 2 → 3.5 → 3`

```text
--agent -1 sprint 74 story 3
--agent 0 sprint 74 story 3
--agent 1 sprint 74 story 3
--agent 2 sprint 74 story 3
--agent 3.5 sprint 74 story 3
--agent 3 sprint 74 story 3
```

## Story 4 — Skip and Exit

`-1 → 0 → 1 → 2 → 3.5 → 3`

```text
--agent -1 sprint 74 story 4
--agent 0 sprint 74 story 4
--agent 1 sprint 74 story 4
--agent 2 sprint 74 story 4
--agent 3.5 sprint 74 story 4
--agent 3 sprint 74 story 4
```

## Story 5 — Place tables

`-1 → 0 → 1 → 2 → 3`

```text
--agent -1 sprint 74 story 5
--agent 0 sprint 74 story 5
--agent 1 sprint 74 story 5
--agent 2 sprint 74 story 5
--agent 3 sprint 74 story 5
```

## Story 6 — Reorder Basics

`-1 → 0 → 1 → 2 → 3.5 → 3`  
Starts only after Story 5 is on `main`.

```text
--agent -1 sprint 74 story 6
--agent 0 sprint 74 story 6
--agent 1 sprint 74 story 6
--agent 2 sprint 74 story 6
--agent 3.5 sprint 74 story 6
--agent 3 sprint 74 story 6
```

## Story 7 — Socket origin

`-1 → 0 → 1 → 2 → 3.5 → 3 → 5`

```text
--agent -1 sprint 74 story 7
--agent 0 sprint 74 story 7
--agent 1 sprint 74 story 7
--agent 2 sprint 74 story 7
--agent 3.5 sprint 74 story 7
--agent 3 sprint 74 story 7
--agent 5 sprint 74 story 7
```
