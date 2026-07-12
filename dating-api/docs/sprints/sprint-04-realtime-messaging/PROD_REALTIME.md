# Production gate — real-time messaging (Sprint 4)

Use this checklist before enabling WebSockets in production.

## Environment

| Variable | Where | Requirement |
|----------|--------|-------------|
| `NEXT_PUBLIC_REALTIME` | UI | Set to `ws` when rolling out; `poll` for instant rollback (no API deploy) |
| `SESSION_SECRET_PEPPER` | API | Required; sessions cannot validate without it |
| `CORS_ORIGIN` | API | Comma-separated list including production UI origin(s) |
| `REDIS_URL` | API | **Required when running more than one API instance**; enables socket.io Redis adapter |
| Cookie `Secure` | API auth config | Enable in production (`cookieSecure`) |

## Networking

- **Preferred:** UI reverse-proxy forwards both `/api/*` and `/socket.io/*` to the API (same-origin cookies).
- **Alternative:** Shared parent domain with `CORS_ORIGIN` and credentialed cross-origin WS (harder to get right).
- Do **not** point `NEXT_PUBLIC_API_URL` at a different host unless cookie domain is aligned.

## Single-instance mode

If `REDIS_URL` is unset:

- Run **one** API replica for correct WS fan-out, **or**
- Use load-balancer sticky sessions (fragile); emits from instance A will not reach users connected to instance B.
- Inbound WS rate limits use **in-memory** counters per process (30 events / 60s per user).

## Multi-instance (`REDIS_URL` set)

- Socket.io uses the Redis adapter for cross-replica emits.
- **Inbound WS rate limits are shared** via Redis keys `ws:ratelimit:<userId>` (default **30 events / 60s** per user globally).
- Optional env: `WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW`, `WS_INBOUND_RATE_LIMIT_WINDOW_MS`.
- If Redis is unavailable at runtime, rate limiting **degrades fail-open** (events allowed; `ws_rate_limit_redis_degraded` warning logged) — fix Redis rather than blocking chat.
- `/health` reports `messaging.wsRateLimitRedis` when the Redis-backed limiter is active.

## Smoke (Stories 1–6)

1. Two accounts, same conversation, `NEXT_PUBLIC_REALTIME=ws` — message appears near-instantly.
2. Brief offline on recipient — reconnect + catch-up backfill.
3. List page — unread badge bumps live (Story 5).
4. `conversation.subscribe` denied for non-participant (devtools / test client).
5. Logout — socket disconnects; reconnect without cookie fails.
6. With Redis + two API processes — send on A, receive on B.

## Rollback

Set `NEXT_PUBLIC_REALTIME=poll` on the UI deployment. Conversation route returns to Sprint 3 HTTP polling.
