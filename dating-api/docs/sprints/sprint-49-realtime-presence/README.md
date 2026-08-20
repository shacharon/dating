# Sprint 49 — Realtime Presence Fabric (P0)

**Status:** Done (Stories 01–03 Done; Agent 5 post-deploy pending per story)  
**Depends on:** Sprint 48 recommended (Redis discipline); Redis required in multi-instance  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api` (+ tiny UI only if Architect requires)  
**Round:** 2

---

## Goal

1. Replace process-local `MessagingSocketRegistry` with Redis-backed presence (or Socket.IO rooms as SoT)
2. Shared Redis email debounce (replace in-memory Map)
3. WS auth `deletedAt` parity with HTTP AuthGuard
4. Session revoke → pub/sub disconnect (reduce per-socket Prisma timers if possible)

---

## Stories

| # | Story | Extra agents | Status |
|---|-------|--------------|--------|
| 01 | [Redis presence](./STORY_01_redis_presence.md) | 2.5, 5 | **Done** |
| 02 | [Email debounce + online-skip](./STORY_02_email_debounce_redis.md) | 2.5, 5 | **Done** |
| 03 | [WS deletedAt + revoke disconnect](./STORY_03_ws_auth_revoke.md) | 2.5, 5 | **Done** |

**Order:** 01 → 02 → 03.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Multi-instance online | Email skip sees sockets on other nodes |
| Soft-deleted user | Cannot keep WS after HTTP would reject |
| Logout / revoke | Disconnects remote sockets |

---

## Merge / deploy notes

- Preferred tip: `feature/sprint-49-story-3` (stacks 01–03).
- Agent 5 for stories 01–03: re-run **1–3 days after** production deploy with `REDIS_URL`.
- Optional operator Browser Network: WS 101 + logout closes socket.
