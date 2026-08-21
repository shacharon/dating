# Story 02 — Rate-Limit Store DI

**Sprint:** 61  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW (interfaces already exist)  
**Status:** Planned

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

**DIP gap:** store selection + Redis lifecycle live inside the service.

---

## Design

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

Service constructor becomes:

```typescript
constructor(
  @Inject(MESSAGE_RATE_LIMIT_STORE) private readonly store: MessageRateLimitStore,
) {}
```

Prefer sharing `REDIS_CLIENT` from Story 01 when Redis is enabled (avoid second connection pool).

**ISP cleanup (optional same PR):** move `resetForTests()` off production interface onto a test-only helper or `ResettableRateLimitStore`.

---

## Tasks

1. Add Nest tokens for message + WS stores.
2. Module factories choose Redis vs memory from config (same env flags as today).
3. Strip `createClient` / `new` from both services.
4. Specs: rate-limit unit + messaging gateway / send-message paths that assert 429 behavior.

---

## Success

- [ ] Zero Redis client construction inside rate-limit services
- [ ] Behavior parity (memory in tests, Redis when configured)
- [ ] Optional: shared Redis client with cache module

---

## Follow-up

Story 03 — moderation ports (independent of Redis once 01–02 land).
