# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_redis_ws_rate_limit.md](../../STORY_03_redis_ws_rate_limit.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Redis fixed-window counter** when `REDIS_URL` is set — key `ws:ratelimit:<userId>`; same semantics as today’s in-memory bucket (30 events / 60s from first event in window).
- **In-memory store unchanged** when `REDIS_URL` unset — single-instance behavior identical to Sprint 4 Story 6.
- **Fail-open on Redis errors** — log `ws_rate_limit_redis_degraded` + allow inbound event (availability over strict abuse control).
- **Dedicated Redis client** for rate limit (do not reuse socket.io pub/sub clients from `RedisIoAdapter`).
- **Atomic consume** — replace `assertCanReceive` + `recordReceive` pair with single **`consumeInboundSlot(userId)`** in gateway to avoid cross-replica TOCTOU races.
- **Env-configurable limits** — optional `WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW`, `WS_INBOUND_RATE_LIMIT_WINDOW_MS`.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `messaging-ws-inbound.constants.ts` | Read limits from env with safe defaults |
| `messaging-ws-rate-limit-store.interface.ts` | **New** — `WsRateLimitStore` |
| `messaging-ws-rate-limit-memory.store.ts` | **New** — extract current Map logic |
| `messaging-ws-rate-limit-redis.store.ts` | **New** — Redis INCR + PEXPIRE + Lua consume |
| `messaging-ws-rate-limit.service.ts` | Facade: pick store on init; `consumeInboundSlot`; `resetForTests` |
| `messaging-ws-rate-limit.service.spec.ts` | Memory path unchanged behavior |
| `messaging-ws-rate-limit-redis.spec.ts` | **New** — mock Redis client; two stores share counter |
| `messaging.gateway.ts` | `guardInbound` → `await consumeInboundSlot` |
| `messaging.gateway.spec.ts` | Update mocks to `consumeInboundSlot` |
| `messaging-realtime-ws.integration.spec.ts` | Update rate-limit flood setup |
| `messaging-realtime-health.service.ts` | +`wsRateLimitRedis: boolean` in snapshot |
| `messaging-realtime-health.service.spec.ts` | snapshot field |
| `docs/sprints/sprint-04-realtime-messaging/PROD_REALTIME.md` | Multi-instance: shared rate limit |
| `docs/sprints/sprint-04-realtime-messaging/LOAD_SMOKE_WS.md` | Cross-instance flood note |
| `handoffs/STORY_03_redis_ws_rate_limit/agent-1-dev.md` | created by agent 1 |

**Do not change (this story):**

| Path | Reason |
|------|--------|
| `redis-io.adapter.ts` | Socket.io fan-out only; separate rate-limit client |
| REST `ConversationMessageRateLimitService` | Out of scope |
| Per-IP limits | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Window algorithm: fixed window (locked)

Match existing in-memory behavior:

| Property | Value |
|----------|-------|
| Window start | First `recordReceive` after idle/expiry |
| Window length | `WS_INBOUND_RATE_LIMIT_WINDOW_MS` (default **60_000**) |
| Max events | `WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW` (default **30**) |
| On exceed | `WsRateLimitExceededError` → gateway disconnect |

**Not** a sliding zset window in v1 — avoids behavior drift vs Sprint 4 tests.

**Redis mapping:**

```text
KEY   ws:ratelimit:{userId}
INCR  on consume
PEXPIRE key WINDOW_MS on first increment (count === 1)
GET   not needed if using Lua consume (below)
```

### 2. Atomic consume (locked)

Replace gateway pattern:

```typescript
// OLD
this.rateLimit.assertCanReceive(userId);
this.rateLimit.recordReceive(userId);

// NEW
await this.rateLimit.consumeInboundSlot(userId);
```

**Lua script** (single round-trip, replica-safe):

```lua
-- KEYS[1] = key, ARGV[1] = max, ARGV[2] = windowMs
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c >= tonumber(ARGV[1]) then
  return 0
end
c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 1
```

Return `0` → throw `WsRateLimitExceededError`; return `1` → allowed.

**Memory store:** same check-then-increment logic inline (single process — already serialized per event loop).

Keep `assertCanReceive` / `recordReceive` as **deprecated wrappers** calling `consumeInboundSlot` for minimal test churn, or update all tests to `consumeInboundSlot` only (preferred: one public method).

### 3. Fail mode: fail-open (locked)

On Redis connection errors, command timeouts, or Lua failures during `consumeInboundSlot`:

| Action | Detail |
|--------|--------|
| Log | `SimpleLogger.warn` JSON `{ event: 'ws_rate_limit_redis_degraded', userId, err }` |
| Sentry | Optional `captureMessage` warning, tag `subsystem: messaging-realtime` (max once per process per minute if easy) |
| Allow | **Do not** disconnect user — event proceeds |

**Rationale:** Redis outage should not brick messaging; abuse limit is degraded, not security boundary.

When Redis unavailable at **boot** (`REDIS_URL` set but connect fails): fall back to **in-memory** for process lifetime + boot warn (same fail-open spirit).

### 4. Redis client lifecycle (locked)

| Case | Store |
|------|-------|
| `REDIS_URL` unset | `MemoryWsRateLimitStore` only |
| `REDIS_URL` set + connect OK | `RedisWsRateLimitStore` |
| `REDIS_URL` set + connect fail | `MemoryWsRateLimitStore` + warn |

Implementation:

- `MessagingWsRateLimitService implements OnModuleInit, OnModuleDestroy`
- `createClient({ url })` from `redis` package (same as adapter)
- `client.connect()` in `onModuleInit`; `quit()` in `onModuleDestroy`
- **Do not** share `RedisIoAdapter` pub/sub clients — different lifecycle owner (`main.ts` vs Nest DI)

### 5. Key pattern and env (locked)

```typescript
export function wsRateLimitRedisKey(userId: string): string {
  return `ws:ratelimit:${userId}`;
}
```

```typescript
// messaging-ws-inbound.constants.ts
function parsePositiveInt(env: string | undefined, fallback: number): number {
  const n = env != null ? parseInt(env, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW = parsePositiveInt(
  process.env.WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  30,
);
export const WS_INBOUND_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
  process.env.WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  60_000,
);
```

Document in `PROD_REALTIME.md` optional overrides.

### 6. Health snapshot (recommended)

Extend `MessagingRealtimeHealthSnapshot`:

```typescript
wsRateLimitRedis: boolean; // true when Redis store active (not memory fallback)
```

`redisAdapter` stays separate (socket.io fan-out). Both true in normal multi-instance deploy.

### 7. Gateway async (locked)

`guardInbound` becomes `async` and handlers `await this.guardInbound(client)` — subscribe/unsubscribe already async-capable in Nest WS.

---

## Regression tests (required)

### `messaging-ws-rate-limit.service.spec.ts` (memory)

Keep existing three cases via `consumeInboundSlot` (or memory store directly):

| Case | Expect |
|------|--------|
| Under limit | no throw |
| 31st consume in window | `WsRateLimitExceededError` |
| After window expiry | allowed again |

### `messaging-ws-rate-limit-redis.spec.ts` (new)

Use **in-memory fake** implementing `eval` / `incr` / `get` / `pexpire` or jest mock of `RedisClientType`:

| Case | Expect |
|------|--------|
| Store A consumes 30, Store B consume 31st | **throws** (shared fake Redis) |
| Redis error on consume | **does not throw** (fail-open) |

No CI dependency on live Redis required.

### `messaging-realtime-ws.integration.spec.ts`

Update flood test to use `consumeInboundSlot` loop instead of `recordReceive` only.

### `messaging.gateway.spec.ts`

Mock `consumeInboundSlot` instead of `assertCanReceive` / `recordReceive`.

---

## Documentation updates

### `PROD_REALTIME.md` — add under multi-instance / Redis section:

```markdown
## Multi-instance (REDIS_URL set)

- Socket.io uses Redis adapter for cross-replica emits.
- **Inbound WS rate limits are shared** via Redis keys `ws:ratelimit:<userId>` (same 30 events / 60s per user globally).
- If Redis is unavailable at runtime, rate limiting **degrades fail-open** (events allowed; warning logged) — prefer fixing Redis over blocking chat.
```

### `LOAD_SMOKE_WS.md` — add step:

```markdown
## Cross-instance rate limit (optional)

With two API processes and `REDIS_URL`:
1. Connect user A to instance 1, flood subscribe (>30/min).
2. Connect same user to instance 2 — further subscribes should disconnect (shared limit).
```

---

## Backward compatibility

| Scenario | Expected |
|----------|----------|
| No `REDIS_URL` | Identical to Sprint 4 — in-memory only |
| Single replica + Redis | Stricter global limit (correct); fan-out + rate limit both use Redis |
| Existing clients | No wire protocol change |
| Limits | Same defaults unless env overrides |

---

## Verification commands

```bash
cd dating-api
npx jest src/messaging-realtime/messaging-ws-rate-limit
npx jest src/messaging-realtime/messaging.gateway.spec.ts
npx jest src/messaging-realtime/messaging-realtime-ws.integration.spec.ts
npm test
npm run build
rg "assertCanReceive|recordReceive" src/messaging-realtime/messaging.gateway.ts
# expect none — only consumeInboundSlot
```

---

## Open questions / blockers

- None for Agent 1.
- **Operator:** multi-instance deploy must set `REDIS_URL` (already required for fan-out).

---

## Next agent

```text
--agent 1 sprint 7 story 3
```
