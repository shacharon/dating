# Agent commands — Sprint 75 (Three-screen onboarding and profile routes)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`
One command per message. After Agent 3 marks a story Done, that branch is on `main`
(ahead = 0) before the next story starts.

Every story in this sprint touches the UI, so `3.5` runs on all of them.
No Agent 5 — this sprint has no AWS or production deploy work.

**Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
Story 2 may run in parallel with 3–6 if you want it off the critical path; Track B
(7, 8) shares no files with Track A.

## All stories, in order

```text
--agent -1 sprint 75 story 1
--agent 0 sprint 75 story 1
--agent 1 sprint 75 story 1
--agent 2 sprint 75 story 1
--agent 3.5 sprint 75 story 1
--agent 3 sprint 75 story 1

--agent -1 sprint 75 story 2
--agent 0 sprint 75 story 2
--agent 1 sprint 75 story 2
--agent 2 sprint 75 story 2
--agent 3.5 sprint 75 story 2
--agent 3 sprint 75 story 2

--agent -1 sprint 75 story 3
--agent 0 sprint 75 story 3
--agent 1 sprint 75 story 3
--agent 2 sprint 75 story 3
--agent 3.5 sprint 75 story 3
--agent 3 sprint 75 story 3

--agent -1 sprint 75 story 4
--agent 0 sprint 75 story 4
--agent 1 sprint 75 story 4
--agent 2 sprint 75 story 4
--agent 3.5 sprint 75 story 4
--agent 3 sprint 75 story 4

--agent -1 sprint 75 story 5
--agent 0 sprint 75 story 5
--agent 1 sprint 75 story 5
--agent 2 sprint 75 story 5
--agent 3.5 sprint 75 story 5
--agent 3 sprint 75 story 5

--agent -1 sprint 75 story 6
--agent 0 sprint 75 story 6
--agent 1 sprint 75 story 6
--agent 2 sprint 75 story 6
--agent 3.5 sprint 75 story 6
--agent 3 sprint 75 story 6

--agent -1 sprint 75 story 7
--agent 0 sprint 75 story 7
--agent 1 sprint 75 story 7
--agent 2 sprint 75 story 7
--agent 3.5 sprint 75 story 7
--agent 3 sprint 75 story 7

--agent -1 sprint 75 story 8
--agent 0 sprint 75 story 8
--agent 1 sprint 75 story 8
--agent 2 sprint 75 story 8
--agent 3.5 sprint 75 story 8
--agent 3 sprint 75 story 8
```

## Per story

### Story 1 — Story screen first, delete the duplicate

`-1 → 0 → 1 → 2 → 3.5 → 3`

```text
--agent -1 sprint 75 story 1
--agent 0 sprint 75 story 1
--agent 1 sprint 75 story 1
--agent 2 sprint 75 story 1
--agent 3.5 sprint 75 story 1
--agent 3 sprint 75 story 1
```

### Story 2 — Record your story by voice

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Story 1 is on `main`. Agent 0 must cover cost, rate limiting and
the microphone-denied fallback before Agent 1 writes code.

```text
--agent -1 sprint 75 story 2
--agent 0 sprint 75 story 2
--agent 1 sprint 75 story 2
--agent 2 sprint 75 story 2
--agent 3.5 sprint 75 story 2
--agent 3 sprint 75 story 2
```

### Story 3 — One facts screen, four fields

`-1 → 0 → 1 → 2 → 3.5 → 3`

```text
--agent -1 sprint 75 story 3
--agent 0 sprint 75 story 3
--agent 1 sprint 75 story 3
--agent 2 sprint 75 story 3
--agent 3.5 sprint 75 story 3
--agent 3 sprint 75 story 3
```

### Story 4 — Photos screen and finish

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Story 3 is on `main`.

```text
--agent -1 sprint 75 story 4
--agent 0 sprint 75 story 4
--agent 1 sprint 75 story 4
--agent 2 sprint 75 story 4
--agent 3.5 sprint 75 story 4
--agent 3 sprint 75 story 4
```

### Story 5 — Delete beats, tabs and the old stepper

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Stories 1, 3 and 4 are on `main`.

```text
--agent -1 sprint 75 story 5
--agent 0 sprint 75 story 5
--agent 1 sprint 75 story 5
--agent 2 sprint 75 story 5
--agent 3.5 sprint 75 story 5
--agent 3 sprint 75 story 5
```

### Story 6 — Nickname and dating chapter move to settings

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Story 3 is on `main`.

```text
--agent -1 sprint 75 story 6
--agent 0 sprint 75 story 6
--agent 1 sprint 75 story 6
--agent 2 sprint 75 story 6
--agent 3.5 sprint 75 story 6
--agent 3 sprint 75 story 6
```

### Story 7 — Profile tabs become routes

`-1 → 0 → 1 → 2 → 3.5 → 3`

```text
--agent -1 sprint 75 story 7
--agent 0 sprint 75 story 7
--agent 1 sprint 75 story 7
--agent 2 sprint 75 story 7
--agent 3.5 sprint 75 story 7
--agent 3 sprint 75 story 7
```

### Story 8 — Redesign the profile overview

`-1 → 0 → 1 → 2 → 3.5 → 3`
Starts only after Story 7 is on `main`. Agent 3.5 gates this one — the empty-state
criterion is the point of the story.

```text
--agent -1 sprint 75 story 8
--agent 0 sprint 75 story 8
--agent 1 sprint 75 story 8
--agent 2 sprint 75 story 8
--agent 3.5 sprint 75 story 8
--agent 3 sprint 75 story 8
```
