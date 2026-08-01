# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_message_rate_limit_redis.md](../../STORY_05_message_rate_limit_redis.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

HTTP message send RL mirrors WS: memory + Redis stores, Lua fixed-window `consumeSendSlot` before `message.create`. Key `http:msg:ratelimit:{userId}`. Fail-open on Redis errors; connect fail / no `REDIS_URL` → memory. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Atomic `consumeSendSlot` (no assert/record) | Pass |
| Lua same shape as WS | Pass |
| Key `http:msg:ratelimit:{userId}` | Pass |
| Limits 10 / 60s unchanged | Pass |
| Fail-open + memory fallback | Pass |
| Own Redis client | Pass |
| Specs: memory + Redis mock + sendMessage | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `conversation-message-rate-limit-*.ts` (interface/memory/redis/error) | New store layer |
| `conversation-message-rate-limit.service.ts` | Orchestrator + HttpException mapping |
| `conversation-message.constants.ts` | `httpMessageRateLimitRedisKey` |
| `me-conversation-messages.service.ts` | `await consumeSendSlot` before create |
| Specs + HTTP/WS integration `resetForTests` | Async; Redis mock suite |

---

## Verification

- `npm run build` — pass
- `npx jest` rate-limit + messages service specs — 30 passed
- HTTP integration `-t "returns 429 on 11th POST"` — pass

---

## Agent 2 notes

- Service maps `MessageRateLimitExceededError` → 429 body; store never throws HttpException.
- Window-recovery covered on memory only (fake timers / Date.now spy).
