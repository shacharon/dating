# Story 02 — Rate-Limit Store DI

**Sprint:** 61  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW (interfaces already exist)  
**Status:** Done

---

## Objective

Stop `ConversationMessageRateLimitService` and `MessagingWsRateLimitService` from calling `createClient` / `new Redis*Store` / `new Memory*Store` inside the service. Bind stores via Nest factory (same pattern as `PHOTO_STORAGE`).

---

## Current offenders

| Service | Path |
|---------|------|
| HTTP message rate limit | `me-profile/conversation-message-rate-limit.service.ts` |
| WS rate limit | `messaging-realtime/messaging-ws-rate-limit.service.ts` |

**Already good:** `MessageRateLimitStore`, `WsRateLimitStore` interfaces.

**DIP gap:** store selection + Redis lifecycle live inside the service. *(resolved — store providers)*

---

## Design

Shipped as `OnModuleInit` store providers (not sync `useFactory` — shared `REDIS_CLIENT` is not connected at construct time). Tokens: `MESSAGE_RATE_LIMIT_STORE` / `WS_RATE_LIMIT_STORE`.

Historical sketch:

```typescript
// In module (example)
{
  provide: MESSAGE_RATE_LIMIT_STORE,
  useFactory: (redis /* or null */, config) => {
    if (config.redisEnabled) return new RedisMessageRateLimitStore(redis);
    return new MemoryMessageRateLimitStore();
  },
  inject: [REDIS_CLIENT /* optional */, RateLimitConfig],
}
```

Prefer sharing `REDIS_CLIENT` from Story 01 when Redis is enabled (avoid second connection pool).

**ISP cleanup (optional):** move `resetForTests()` off production interface — deferred.

---

## Tasks

1. ~~Add Nest tokens for message + WS stores.~~
2. ~~Module factories choose Redis vs memory from config (same env flags as today).~~ *(via shared handle availability)*
3. ~~Strip `createClient` / `new` from both services.~~
4. ~~Specs: rate-limit unit + wiring / provider binding.~~

---

## Success

- [x] Zero Redis client construction inside rate-limit services
- [x] Behavior parity (memory in tests, Redis when configured)
- [x] Optional: shared Redis client with cache module

---

## Follow-up

Story 03 — moderation ports (independent of Redis once 01–02 land).

---

## Shipped

`feature/sprint-61-story-2` @ `b852a19`

- `eeee1f6` — feat: rate-limit store DI via shared REDIS_CLIENT
- `6f04fd1` — test: guard rate-limit store DI wiring
- `b852a19` — chore: close sprint 61 story 2

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (no Agent 4 / 2.5 / 3.5)
