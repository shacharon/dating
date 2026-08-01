# Story 05 — Message send rate limit → Redis

**Sprint 28 · Status: IN PROGRESS (Dev complete → Agent 2 CR)**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** Redis already used for WS RL / cache locally

**Handoff:** [`handoffs/STORY_05_message_rate_limit_redis/agent-0-architect.md`](./handoffs/STORY_05_message_rate_limit_redis/agent-0-architect.md)

---

## Objective

Move HTTP conversation message rate limiting from in-memory to Redis so multi-API-task deploys share one limit.

## Why

[`ConversationMessageRateLimitService`](../../../src/me-profile/conversation-message-rate-limit.service.ts) is process-local today. WS path already has a Redis store pattern to mirror.

## Scope / tasks

1. Mirror [`messaging-ws-rate-limit-redis.store.ts`](../../../src/messaging-realtime/messaging-ws-rate-limit-redis.store.ts) patterns for HTTP send RL.
2. Architect locks: key shape, window, fail-open vs fail-closed when Redis down. ✅
3. Keep memory fallback for tests / Redis-less local if locked. ✅
4. Specs for allow / 429 / window recovery.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| API | Single async `consumeSendSlot` before `message.create` (drop assert/record) |
| Algorithm | Same Lua fixed-window consume as WS |
| Key | `http:msg:ratelimit:{userId}` (not shared with `ws:ratelimit:`) |
| Limits | Keep **10** / **60s** |
| Redis down / eval error | **Fail-open** (allow + log); connect fail → memory |
| Client | Own Redis client from `REDIS_URL` (do not reuse WS client) |

## Acceptance criteria

- [ ] Message send RL uses Redis when Redis is configured
- [ ] 429 behavior preserved (`{ message: 'Too many messages. Please wait.' }`)
- [ ] Multi-process safe (key `http:msg:ratelimit:{userId}`)
- [ ] Tests cover Redis path (mock) and memory fallback

## Commit message

```
fix(messaging): share HTTP message rate limit via Redis

Sprint 28 Story 5
```
