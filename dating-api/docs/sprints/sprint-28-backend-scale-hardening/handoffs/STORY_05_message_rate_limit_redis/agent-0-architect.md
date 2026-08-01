# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_message_rate_limit_redis.md](../../STORY_05_message_rate_limit_redis.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Move HTTP message send RL to Redis (multi-task safe). Mirror WS RL store layout. Skip Agent 4 if unit specs cover Redis mock + memory fallback.

---

## Summary

[`ConversationMessageRateLimitService`](../../../../../src/me-profile/conversation-message-rate-limit.service.ts) is process-local (`Map` buckets). Multi-API-task deploys get **N × limit**. WS already ships Redis fixed-window consume — mirror that for HTTP send.

---

## Current semantics (must preserve for clients)

| Item | Value |
|------|--------|
| Limit | `MESSAGE_RATE_LIMIT_MAX_PER_WINDOW` = **10** |
| Window | `MESSAGE_RATE_LIMIT_WINDOW_MS` = **60_000** |
| Scope | Per `sessionUserId` (not per conversation) |
| 429 body | `{ message: 'Too many messages. Please wait.' }` |
| Status | `429 Too Many Requests` |

Today: `assertCanSend` then `recordSend` **after** successful `message.create` (failed creates do not increment).

---

## Decisions (do not reverse without discussion)

### 1. Atomic consume (locked) — replace assert + record

**Call once before `message.create`:**

```ts
await this.messageRateLimit.consumeSendSlot(sessionUserId);
```

- Remove `assertCanSend` / `recordSend` from the public service API and from `MeConversationMessagesService.sendMessage`.
- Use the **same Lua fixed-window pattern** as [`WS_RATE_LIMIT_CONSUME_LUA`](../../../../../src/messaging-realtime/messaging-ws-rate-limit-redis.store.ts) (GET → reject if ≥ max → INCR → PEXPIRE on first).
- **Trade-off (accepted):** if create fails after consume, the slot is still spent. Rare; preferred over TOCTOU overshoot across tasks. Do **not** keep split assert/record on Redis.

Memory store must match: consume increments in one step (like `MemoryWsRateLimitStore`), not assert-then-record.

### 2. Redis key design (locked) — multi-process safe

```ts
export function httpMessageRateLimitRedisKey(userId: string): string {
  return `http:msg:ratelimit:${userId}`;
}
```

| Rule | Why |
|------|-----|
| Prefix `http:msg:ratelimit:` | Distinct from `ws:ratelimit:` — **do not** share counters with WS inbound RL |
| One key per user | Matches current per-user HTTP limit |
| Fixed window via PEXPIRE | Same as WS; document in constants comment |

All API tasks sharing `REDIS_URL` share one counter per user.

### 3. Fail-open / fallback (locked)

| Case | Behavior |
|------|----------|
| `REDIS_URL` unset / empty | **Memory** store (local + default tests) |
| Connect fails at init | Log warn → **Memory**; `usingRedisStore = false` |
| Redis error during consume (not limit exceeded) | Log `http_message_rate_limit_redis_degraded` → **allow** (fail-open), same spirit as WS |
| Limit exceeded | Throw → map to **429** HttpException (same body/status) |

Do **not** fail-closed (block all sends when Redis blips).

### 4. Code layout (locked)

Mirror WS files under `me-profile/` (HTTP-named):

| Piece | Role |
|-------|------|
| `conversation-message-rate-limit-store.interface.ts` | `consumeSendSlot`, `resetForTests` |
| `conversation-message-rate-limit-memory.store.ts` | In-memory fixed window |
| `conversation-message-rate-limit-redis.store.ts` | Lua + fail-open `onDegraded` |
| `conversation-message-rate-limit.error.ts` | `MessageRateLimitExceededError` (store throws; service maps to HttpException) |
| `conversation-message-rate-limit.service.ts` | `OnModuleInit`/`Destroy`, own `createClient({ url })`, `isUsingRedisStore()`, `consumeSendSlot` |
| `conversation-message.constants.ts` | Keep max/window; add `httpMessageRateLimitRedisKey` |

- Inject `SimpleLogger` (already `@Global`).
- **Own Redis client** (do not reuse WS service’s client or invent a shared RL connection pool this story).
- Do **not** change limit numbers or window unless env already exists — keep constants as-is (no new env knobs required).

### 5. Call site (locked)

`MeConversationMessagesService.sendMessage`:

1. Participant + trim validation (unchanged).
2. `await this.messageRateLimit.consumeSendSlot(sessionUserId)`.
3. Profanity log + `message.create` + analytics / publish (unchanged).

Unit mocks: replace `assertCanSend`/`recordSend` with `consumeSendSlot`.

### 6. Tests (locked)

- **Memory:** Port existing specs to `consumeSendSlot` — allow / 429 on 11th / window recovery / `resetForTests`.
- **Redis store:** Mock `client.eval` → `1` allow, `0` → exceeded; degraded path calls `onDegraded` and does not throw.
- **Service init (optional light):** no `REDIS_URL` → memory; `isUsingRedisStore() === false`.
- Update `me-conversation-messages.service.spec.ts` mocks.
- HTTP/WS integration specs that `resetForTests()`: make **async** if needed (`await resetForTests()`).

### 7. Agent 4

- **Skip** if §6 lands (no live Redis e2e required).

---

## Artifacts

| Path | Change |
|------|--------|
| New store/error/interface files | As §4 |
| `conversation-message-rate-limit.service.ts` | Redis/memory orchestrator |
| `conversation-message.constants.ts` | Key helper |
| `me-conversation-messages.service.ts` | `consumeSendSlot` |
| Specs listed in §6 | Update |

Optional one-liner in story AC / constants JSDoc is enough for “documented key design”; no separate ops doc required unless Agent 1 wants a short `docs/ops` note.

---

## Out of scope

- Unifying HTTP + WS into one limiter  
- Changing 10/min limit or response shape  
- Sharing Redis client with cache / WS modules  
- PgBouncer / deploy  

---

## Agent 1 instructions

1. Implement stores + service per §1–4; wire `sendMessage`.
2. Specs per §6; `npm run build` + rate-limit + messages service jest.
3. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
fix(messaging): share HTTP message rate limit via Redis

Sprint 28 Story 5
```

---

## Agent 2 instructions

- [ ] Redis used when `REDIS_URL` configured; memory otherwise
- [ ] 429 body/status unchanged
- [ ] Key `http:msg:ratelimit:{userId}`; not shared with WS keys
- [ ] Fail-open on Redis errors; connect fail → memory
- [ ] Atomic consume (no split assert/record on Redis)
- [ ] Specs cover memory + Redis mock
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Integration specs may assume sync `resetForTests` — update to async.  
2. Fake timers + Redis path: Redis TTL is wall-clock; window-recovery tests stay on **memory** store.
