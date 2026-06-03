# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_ws_prod_smoke_flag_flip.md](../../STORY_01_ws_prod_smoke_flag_flip.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **`GET /health/realtime`** — deploy preflight; reports namespace, socket.io path, Redis adapter bound flag, session cookie name (no secrets).
- **`MessagingRealtimeHealthService`** + boot flag via `setMessagingRedisAdapterBound(true)` in `RedisIoAdapter.connectToRedis()`.
- **`HealthModule` wired into `AppModule`** — health routes were previously unregistered.
- **`npm run smoke:ws`** — aggregates both WS integration specs (6 tests).
- **`npm run smoke:ws-preflight`** — curls `/health/realtime` on `SMOKE_BASE_URL` (default `http://localhost:3001`).
- **Runbook** — `SMOKE_WS_PROD_RUNBOOK.md`; `PROD_STABILITY.md` updated with Tier A + UI rebuild note.
- **`getRealtimeMode()` unchanged** — default remains `poll`.
- **Tier B browser smoke** — pending operator (no staging/prod credentials in dev session).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/messaging-realtime/messaging-realtime-redis-state.ts` | created — module-level Redis bound flag |
| `dating-api/src/messaging-realtime/messaging-realtime-health.service.ts` | created |
| `dating-api/src/messaging-realtime/messaging-realtime.constants.ts` | add `MESSAGING_SOCKET_IO_PATH` |
| `dating-api/src/messaging-realtime/redis-io.adapter.ts` | set bound flag on Redis connect |
| `dating-api/src/messaging-realtime/messaging-realtime.module.ts` | export health service |
| `dating-api/src/health/health.controller.ts` | add `GET /health/realtime` |
| `dating-api/src/health/health.module.ts` | import `MessagingRealtimeModule` |
| `dating-api/src/app.module.ts` | import `HealthModule` |
| `dating-api/package.json` | `smoke:ws`, `smoke:ws-preflight` |
| `dating-api/scripts/smoke-ws-preflight.ts` | created |
| `dating-api/docs/sprints/sprint-05-prod-stability/SMOKE_WS_PROD_RUNBOOK.md` | created |
| `dating-api/docs/sprints/sprint-05-prod-stability/PROD_STABILITY.md` | updated |
| `dating-ui/.env.example` | prod rollout note for `NEXT_PUBLIC_REALTIME` |

---

## Decisions (do not reverse without discussion)

- Followed architect: module-level Redis flag (not DI token) — set only in `RedisIoAdapter` after successful Redis connect.
- Registered `HealthModule` in `AppModule` — required for `/health` and `/health/realtime` to be live.
- No prod env changes in repo; flag flip documented for operator only.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npm run smoke:ws` — **6/6** pass
- [ ] `npm run smoke:ws-preflight` — requires running API (not executed in this session)
- [ ] Tier B browser smoke — **pending operator**

---

## Manual smoke (operator — Tier B)

See [SMOKE_WS_PROD_RUNBOOK.md](../../SMOKE_WS_PROD_RUNBOOK.md).

Quick local preflight (with API on `:3001`):

```bash
cd dating-api
npm run start:dev   # separate terminal
npm run smoke:ws-preflight
curl http://localhost:3001/health/realtime
```

Browser smoke (requires `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local` + UI restart):

1. Two accounts, same conversation → near-instant message  
2. Offline → reconnect + catch-up  
3. Flip to `poll` → 3s polling returns  

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Unit tests for health service + controller | Agent 2 |
| Tier B checklist sign-off + prod flag flip | Operator / Agent 3 |
| Sentry monitoring after flag flip | Story 2 |

---

## Open questions / blockers

- None blocking Agent 2.

---

## Next agent

```text
--agent 2 sprint 5 story 1
```

**Notes for next agent:**

- Add `messaging-realtime-health.service.spec.ts` and extend `health.controller.spec.ts`.
- Re-run `npm run smoke:ws` — should stay green.
- Optional: integration test hitting `GET /health/realtime` on test app.
- Do not change `getRealtimeMode()` default.
