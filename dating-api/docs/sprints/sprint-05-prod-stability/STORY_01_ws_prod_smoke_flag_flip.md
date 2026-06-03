# Story 1: WS prod smoke + flag flip

**Sprint:** 5  
**Status:** Done  
**Depends on:** Sprint 4 (realtime messaging complete)

---

## Why

Sprint 4 shipped WebSocket push behind `NEXT_PUBLIC_REALTIME=ws|poll` but manual prod smoke and the production flag flip were left pending. This story closes that gate so realtime messaging is verified in the target environment before wider rollout.

---

## What

**As a** platform operator  
**I want** WebSocket messaging verified in staging/production and the realtime flag enabled  
**So that** users get near-instant messages without relying on 3s polling

### Acceptance criteria

- [x] **Tier A automated gate** — `npm run smoke:ws` (6/6) + `GET /health/realtime` + runbook shipped
- [x] **Flag flip documented** — rollback steps in [SMOKE_WS_PROD_RUNBOOK.md](./SMOKE_WS_PROD_RUNBOOK.md) + [PROD_STABILITY.md](./PROD_STABILITY.md)
- [ ] **Smoke checklist executed (Tier B)** — browser steps in target environment — **pending operator**
- [ ] **Browser 101 confirmed** — pending operator
- [ ] **Two-user message flow** — pending operator
- [ ] **Reconnect + catch-up** — pending operator
- [ ] **Rollback verified** — pending operator
- [ ] **Non-participant subscribe denied** — pending operator
- [ ] **Logout disconnects socket** — pending operator
- [ ] **Multi-instance (if applicable)** — N/A until Redis multi-replica deployed
- [ ] **Sign-off** — PROD_STABILITY checklist rows unsigned — **pending operator**

### Out of scope (this story)

- Sentry integration (Story 2)
- New WS features (typing, presence)
- Infra provisioning (Redis, LB) — verify only if already deployed

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_01_ws_prod_smoke_flag_flip/agent-0-architect.md`.

Reference docs:
- [SMOKE_WS_PROD_RUNBOOK.md](./SMOKE_WS_PROD_RUNBOOK.md)
- [PROD_STABILITY.md](./PROD_STABILITY.md)
- [Sprint 4 PROD_REALTIME.md](../sprint-04-realtime-messaging/PROD_REALTIME.md)
- [LOAD_SMOKE_WS.md](../sprint-04-realtime-messaging/LOAD_SMOKE_WS.md)

---

## Definition of done

- [x] Tier A automated smoke green (`npm run smoke:ws` — 6/6; health tests — 8/8)
- [x] Operator runbook + preflight endpoint shipped
- [x] Flag flip / rollback documented (UI rebuild requirement noted)
- [ ] Tier B browser smoke executed in staging/prod — **pending operator**
- [ ] `NEXT_PUBLIC_REALTIME=ws` set in production/staging UI env — **pending operator**
- [ ] Rollback to `poll` tested once in target env — **pending operator**
- [x] No P0/P1 WS code issues open

---

## Manual smoke

See [SMOKE_WS_PROD_RUNBOOK.md](./SMOKE_WS_PROD_RUNBOOK.md) — Tier B steps for operator.

---

## Shipped notes

- **`GET /health/realtime`** — deploy preflight (`namespace`, `socketIoPath`, `redisAdapter`, `sessionCookieName`).
- **`HealthModule`** registered in `AppModule` (health routes now live).
- **`npm run smoke:ws`** — aggregates WS integration specs (6 tests).
- **`npm run smoke:ws-preflight`** — optional curl script against running API.
- **`SMOKE_WS_PROD_RUNBOOK.md`** — Tier A + Tier B operator guide.
- **`getRealtimeMode()`** unchanged — default `poll` for safe rollback.
- **Tests:** health 8/8 + smoke:ws 6/6.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Tier B browser smoke + prod flag flip | Operator |
| Sentry for WS errors | Story 2 |
| Redis-backed rate limit across replicas | Sprint 7 Story 3 |
