# Sprint 49 — Realtime Presence Fabric (P0)

**Status:** In Progress (Story 01 Done)  
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
| 02 | [Email debounce + online-skip](./STORY_02_email_debounce_redis.md) | 2.5, 5 | Planned |
| 03 | [WS deletedAt + revoke disconnect](./STORY_03_ws_auth_revoke.md) | 2.5, 5 | Planned |

**Order:** 01 → 02 → 03.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Multi-instance online | Email skip sees sockets on other nodes |
| Soft-deleted user | Cannot keep WS after HTTP would reject |
| Logout / revoke | Disconnects remote sockets |
