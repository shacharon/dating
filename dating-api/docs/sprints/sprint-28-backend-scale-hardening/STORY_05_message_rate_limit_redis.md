# Story 05 — Message send rate limit → Redis

**Sprint 28 · Status: PLANNED**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** Redis already used for WS RL / cache locally

---

## Objective

Move HTTP conversation message rate limiting from in-memory to Redis so multi-API-task deploys share one limit.

## Why

[`ConversationMessageRateLimitService`](../../../src/me-profile/conversation-message-rate-limit.service.ts) is process-local today. WS path already has a Redis store pattern to mirror.

## Scope / tasks

1. Mirror [`messaging-ws-rate-limit-redis.store.ts`](../../../src/messaging-realtime/messaging-ws-rate-limit-redis.store.ts) patterns for HTTP send RL.
2. Architect locks: key shape, window, fail-open vs fail-closed when Redis down.
3. Keep memory fallback for tests / Redis-less local if locked.
4. Specs for allow / 429 / window recovery.

## Acceptance criteria

- [ ] Message send RL uses Redis when Redis is configured
- [ ] 429 behavior preserved
- [ ] Multi-process safe (documented key design)
- [ ] Tests cover Redis path (mock) and fallback if applicable

## Commit message

```
fix(messaging): share HTTP message rate limit via Redis

Sprint 28 Story 5
```
