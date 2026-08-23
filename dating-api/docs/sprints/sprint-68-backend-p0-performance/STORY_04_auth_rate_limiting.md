# Story 04 — Auth Rate Limiting

**Sprint:** 68  
**Effort:** ~6 hours  
**Risk:** 🟡 MEDIUM (auth surface + Redis-down behavior)  
**Status:** Done  
**GO_LIVE:** Backend #10

**Handoffs:** [architect](./handoffs/STORY_04_auth_rate_limiting/agent-0-architect.md) · [dev](./handoffs/STORY_04_auth_rate_limiting/agent-1-dev.md) · [CR](./handoffs/STORY_04_auth_rate_limiting/agent-2-cr.md) · [security](./handoffs/STORY_04_auth_rate_limiting/agent-2.5-security.md) · [PM](./handoffs/STORY_04_auth_rate_limiting/agent-3-pm.md)

---

## Objective

Protect unauthenticated auth endpoints from brute-force and quota exhaustion — bots could unboundedly hit Google verify, session creation, and refresh token rotation.

**Deliverable:** Redis-backed fixed-window rate limits on login and refresh via Nest guards; generic 429 on exceed.

---

## Problem (before)

```typescript
@Post('google')
async googleLogin(...) { ... }  // no rate limit

@Post('refresh')
async refresh(...) { ... }       // no rate limit
```

---

## Solution

- Reuse **`createFixedWindowRateLimitStoreProvider`** (same DIP stack as message HTTP / WS RL)
- **`AuthLoginRateLimitGuard`** on `POST /api/v1/auth/google` — **10 / 300s** per client IP
- **`AuthRefreshRateLimitGuard`** on `POST /api/v1/auth/refresh` — **5 / 60s** per client IP
- **`resolveClientIp(req)`** — XFF first hop / `remoteAddress` / `'unknown'`
- Guards run **before** DTO validation (malformed bodies still consume IP quota)
- **429** `{ message: "Too many … attempts. Please wait." }` + trace `AUTH_*_RATE_LIMITED`
- Redis unavailable → per-pod memory fallback (same as message RL)
- **Out of scope:** `logout`, `me`, `@nestjs/throttler`

---

## API

**No success-response change.**

| Endpoint | Limit | Exceed |
|----------|-------|--------|
| `POST /api/v1/auth/google` | 10 / 5 min per IP | **429** `{ "message": "Too many login attempts. Please wait." }` |
| `POST /api/v1/auth/refresh` | 5 / 1 min per IP | **429** `{ "message": "Too many refresh attempts. Please wait." }` |

---

## Success criteria

- [x] Login rate limit 10/5min per IP
- [x] Refresh rate limit 5/1min per IP
- [x] Guards on google + refresh only
- [x] Generic 429 (no account enumeration)
- [x] Unit + integration tests (48 tests in story scope)
- [x] Agent 2 CR approved
- [x] Agent 2.5 security approved

---

## Deploy note

No migration. Redis optional — memory fallback when `REDIS_URL` unset; prod should run with Redis for multi-pod consistency.

Ensure load balancer **sets** `X-Forwarded-For` (do not trust client-supplied XFF on direct-to-app traffic).

---

## Deferred (not blocking Done)

| Item | Notes |
|------|-------|
| Trusted-proxy / `TRUST_PROXY` config | Agent 2.5 residual |
| Auth RL fail-closed when Redis down | Follow-up |
| CDN/WAF edge rate limiting | Ops |
| NAT tuning / CAPTCHA | Product if 429 noise |

---

## Files changed

**New:**
- `src/auth/auth-rate-limit.constants.ts`
- `src/auth/request-client-ip.util.ts`
- `src/auth/auth-login-rate-limit.error.ts`
- `src/auth/auth-refresh-rate-limit.error.ts`
- `src/auth/auth-login-rate-limit-store.provider.ts`
- `src/auth/auth-refresh-rate-limit-store.provider.ts`
- `src/auth/auth-endpoint-rate-limit.service.ts`
- `src/auth/auth-login-rate-limit.guard.ts`
- `src/auth/auth-refresh-rate-limit.guard.ts`
- `src/auth/request-client-ip.util.spec.ts`
- `src/auth/auth-endpoint-rate-limit.service.spec.ts`
- `src/auth/auth-rate-limit.guard.spec.ts`

**Modified:**
- `src/auth/api-v1-auth.controller.ts`
- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth-http.integration.spec.ts`
- `src/logging/error-codes.ts`

---

## Branch

`feature/sprint-68-story-4` — ready for PR/merge (completes Sprint 68 stack)
