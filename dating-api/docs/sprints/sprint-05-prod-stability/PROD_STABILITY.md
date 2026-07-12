# Production gate — Sprint 5 stability

Use this checklist for Story 1 (WS prod smoke) and Story 2 (Sentry env).

**Full runbook:** [SMOKE_WS_PROD_RUNBOOK.md](./SMOKE_WS_PROD_RUNBOOK.md) — Tier A automated + Tier B browser steps.

> **Flag flip requires UI rebuild.** `NEXT_PUBLIC_REALTIME` is baked at Next.js build time — changing it needs a UI redeploy, not a runtime toggle.

## Environment — WebSocket (from Sprint 4)

| Variable | Where | Requirement |
|----------|--------|-------------|
| `NEXT_PUBLIC_REALTIME` | UI | `ws` for rollout; `poll` for instant rollback |
| `SESSION_SECRET_PEPPER` | API | Required |
| `CORS_ORIGIN` | API | Production UI origin(s) |
| `REDIS_URL` | API | Required when API replicas > 1 |
| Cookie `Secure` | API auth config | Enable in production |

See also: [Sprint 4 PROD_REALTIME.md](../sprint-04-realtime-messaging/PROD_REALTIME.md)

## Environment — Sentry (Story 2)

| Variable | Where | Requirement |
|----------|--------|-------------|
| `SENTRY_DSN` | API | Optional locally; set in staging/prod |
| `NEXT_PUBLIC_SENTRY_DSN` | UI | Optional locally; set in staging/prod |
| `SENTRY_ENVIRONMENT` | API + UI | e.g. `production`, `staging` |
| `SENTRY_TRACES_SAMPLE_RATE` | API + UI | e.g. `0.1` in prod |
| `ENABLE_SENTRY_TEST` | API | Set `1` to allow `GET /health/sentry-test` in production (default: off in prod) |

**Never commit DSN values to git.**

**Sentry smoke (staging):** with `SENTRY_DSN` set, `GET /health/sentry-test` throws a controlled error that should appear in the Sentry project (route disabled in production unless `ENABLE_SENTRY_TEST=1`). Health routes are not under `/api/v1`.

## Tier A — automated (before browser smoke)

```bash
cd dating-api
npm run smoke:ws
# optional, API must be running:
npm run smoke:ws-preflight
```

## WS smoke checklist (Story 1 sign-off — Tier B)

| # | Step | Pass | Date | Notes |
|---|------|------|------|-------|
| 1 | Browser WS 101 on `/socket.io` + namespace `/ws/messaging` | ☐ | | |
| 2 | Session cookie sent on handshake | ☐ | | |
| 3 | Two users, same conversation, message near-instant | ☐ | | |
| 4 | Reconnect + catch-up after brief offline | ☐ | | |
| 5 | `NEXT_PUBLIC_REALTIME=poll` rollback works | ☐ | | |
| 6 | Non-participant subscribe denied | ☐ | | |
| 7 | Logout disconnects socket | ☐ | | |
| 8 | Multi-instance fan-out (if Redis deployed) | ☐ | N/A | |

## Flag flip

1. Deploy API with Sprint 4 code (already shipped).  
2. Set `NEXT_PUBLIC_REALTIME=ws` on UI deployment.  
3. Monitor Sentry + structured logs for 24h.  
4. Rollback: set `NEXT_PUBLIC_REALTIME=poll` (no API deploy needed).

## Sign-off

| Role | Name | Date |
|------|------|------|
| PM | | |
| Operator | | |

**Deviations / open issues:**

_(record any failed smoke steps or waivers)_
