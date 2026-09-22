# Sprint 74 — First login

**Epic:** [First login stories](../../../../docs/work-items/first-login/stories/README.md)  
**Status:** Story 1–3 Done — Stories 4–7 not started  
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)  
**Pipeline:** `.cursor/skills/dating-agent-run/SKILL.md`  
**Repo:** `dating-api` + `dating-ui` + `infra/terraform`

## Goal

A new account can get through Basics on localhost and on findyouraidate.com, and the API task stays up.

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Reset local shacharon@gmail.com](./STORY_01_local_reset.md) | **Done** | — |
| 2 | [API health check must not use wget](./STORY_02_api_healthcheck.md) | **Done** (`dating-dev-api:7`) | — |
| 3 | [No profile means no photos, not a 404](./STORY_03_photos_empty.md) | **Done** (local Basics check pending) | 1 |
| 4 | [Skip and Exit leave Basics](./STORY_04_basics_trap.md) | Proposed | 1 |
| 5 | [Fill the MVP place tables](./STORY_05_place_tables.md) | Proposed | — |
| 6 | [Reorder Basics](./STORY_06_basics_order.md) | Proposed | 5 |
| 7 | [Socket uses the public site, not port 3001](./STORY_07_socket_origin.md) | Proposed | — |

**Order:** 1 (done) → 2 → 3 → 4 → 5 → 6 → 7. Land each story on `main` (ahead = 0) before the next.

Story 1 has no feature branch. It deleted a local database user only. Agent -1 on Story 2 must not block for a missing `feature/sprint-74-story-1`.

## Agents

| Agent | Role | When |
|-------|------|------|
| -1 | Preflight | every open story |
| 0 | Architect | every open story |
| 1 | Senior dev | every open story |
| 2 | Code review | every open story |
| 3.5 | UX review | Stories 3, 4, 6, 7 (UI) |
| 3 | PM, merge to main | every open story |
| 5 | Post-deploy check | Stories 2 and 7 (live site) |

Run one agent per message. Do not chain them.
