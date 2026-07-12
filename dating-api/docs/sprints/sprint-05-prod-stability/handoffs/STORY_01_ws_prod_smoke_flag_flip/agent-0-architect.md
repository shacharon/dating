# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_ws_prod_smoke_flag_flip.md](../../STORY_01_ws_prod_smoke_flag_flip.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No Prisma migration** — Story 1 is verification + operator gate, not new product features.
- **Two-tier smoke model:**
  - **Tier A (automated):** `npm run smoke:ws` runs existing WS integration specs; optional new `GET /health/realtime` for deploy preflight.
  - **Tier B (manual browser):** operator executes checklist in `PROD_STABILITY.md`, records pass/fail + sign-off in PM handoff.
- **Flag flip:** UI env only — set `NEXT_PUBLIC_REALTIME=ws` on UI deployment after Tier A + Tier B pass. Rollback: set `poll` (no API redeploy).
- **Networking unchanged from Sprint 4:** same-origin proxy for `/api/*` + `/socket.io` (see `dating-ui/next.config.ts`); prod must mirror local pattern.
- **Multi-instance:** verify only if `REDIS_URL` already deployed; mark N/A otherwise — do not block Story 1 close on Redis infra provisioning.
- **Agent 1 scope:** health endpoint extension, npm smoke script, consolidated runbook doc — **not** forced prod env change in code.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/health/health.controller.ts` | extend or add `GET /health/realtime` |
| `dating-api/src/health/health.module.ts` | wire realtime status provider (if split) |
| `dating-api/src/messaging-realtime/messaging-realtime-health.service.ts` | created — reports namespace, redis adapter bound |
| `dating-api/package.json` | add `"smoke:ws": "jest ... --runInBand"` |
| `dating-api/docs/sprints/sprint-05-prod-stability/SMOKE_WS_PROD_RUNBOOK.md` | created — Tier A + Tier B steps, env preflight |
| `dating-api/docs/sprints/sprint-05-prod-stability/PROD_STABILITY.md` | updated — link runbook, preflight table |
| `dating-ui/.env.example` | confirm `NEXT_PUBLIC_REALTIME` prod note |
| `dating-api/docs/sprints/sprint-05-prod-stability/handoffs/STORY_01_ws_prod_smoke_flag_flip/agent-1-dev.md` | created by agent 1 |

**No UI code changes required** unless architect-approved dev-only smoke banner (out of scope — do not add).

---

## Decisions (do not reverse without discussion)

### 1. Story type — verification gate, not feature delivery

Sprint 4 code is **already shipped**. Story 1 closes the **operator gate** left open in Sprint 4 Stories 1–6 (`Manual smoke — pending user verification`).

| Layer | Owner | Deliverable |
|-------|-------|-------------|
| Automated regression | Agent 1 + 2 | `npm run smoke:ws` green |
| Deploy preflight | Agent 1 | `GET /health/realtime` |
| Browser smoke | **Operator / user** | PROD_STABILITY checklist |
| Flag flip | **Operator** | UI env `NEXT_PUBLIC_REALTIME=ws` |
| Sign-off | Agent 3 (PM) | handoff records dates + waivers |

Agent 1 **must not** hardcode `NEXT_PUBLIC_REALTIME=ws` as default in `getRealtimeMode()` — default stays `poll` for safe rollback.

### 2. Tier A — automated smoke (`npm run smoke:ws`)

Aggregate existing integration specs (already cover auth, subscribe authz, message emit):

```json
"smoke:ws": "jest src/messaging-realtime/messaging-realtime-ws.integration.spec.ts src/me-profile/me-conversation-messages-ws.integration.spec.ts --runInBand"
```

**Pass criteria:** all tests green against local test harness (mocked Prisma in gateway spec; full message path in me-profile spec).

Optional extension (Agent 1 if time): `scripts/smoke-ws-preflight.ts` that curls `GET /health/realtime` on `SMOKE_BASE_URL` (default `http://localhost:3001`) and exits 0/1 — **not blocking** if health endpoint ships.

### 3. Tier B — manual browser checklist (operator)

Canonical checklist lives in `PROD_STABILITY.md` (8 rows). Agent 1 creates **`SMOKE_WS_PROD_RUNBOOK.md`** with:

1. **Preflight** — env vars table (copy from PROD_REALTIME + PROD_STABILITY)
2. **Per-step instructions** — DevTools paths, expected log codes, timing thresholds
3. **Evidence column** — screenshot/log snippet optional
4. **Rollback drill** — flip `poll`, confirm 3s interval in Network tab
5. **Multi-instance appendix** — copy from LOAD_SMOKE_WS.md; mark N/A if single replica

Steps map 1:1 to story AC — do not invent new gates.

### 4. `GET /health/realtime` — deploy preflight contract

Extend health surface for operators and CI smoke scripts.

**Route:** `GET /health/realtime`  
**Auth:** none (same as `GET /health`)  
**Response 200:**

```typescript
{
  ok: true;
  service: 'dating-api';
  ts: string; // ISO
  messaging: {
    namespace: '/ws/messaging';
    socketIoPath: '/socket.io';
    redisAdapter: boolean; // true when REDIS_URL was set at boot
    sessionCookieName: string; // from AuthSessionConfigService, e.g. 'dating_session'
  };
}
```

**Implementation sketch:**

```typescript
@Injectable()
export class MessagingRealtimeHealthService {
  constructor(
    private readonly config: AuthSessionConfigService,
    @Optional() @Inject(REDIS_ADAPTER_BOUND) private readonly redisBound?: boolean,
  ) {}

  snapshot(): RealtimeHealthSnapshot { ... }
}
```

Simplest approach: set a module-level flag in `RedisIoAdapter.connect()` when Redis adapter attaches; `false` when single-instance `IoAdapter` only.

**Do not** expose secrets, Redis URL, or session pepper.

### 5. Environment preflight (before browser smoke)

| Variable | Where | Check |
|----------|--------|-------|
| `NEXT_PUBLIC_REALTIME` | UI build env | Will be `ws` **after** gate passes; use `ws` in staging first |
| `SESSION_SECRET_PEPPER` | API | non-empty in target env |
| `CORS_ORIGIN` | API | includes UI origin |
| `REDIS_URL` | API | set iff replicas > 1 |
| `cookieSecure` | API auth config | `true` in prod |
| `API_PROXY_TARGET` | UI (server) | points to API if not same container |

**Cross-origin trap:** If prod UI sets `NEXT_PUBLIC_API_URL` to API host directly, HttpOnly `SameSite=Lax` cookies may **not** reach WS handshake. **Preferred prod topology:**

```text
Browser → UI host (Next.js)
           ├─ /api/*        → rewrite → API
           └─ /socket.io/*  → rewrite → API
```

Reference: `dating-ui/next.config.ts` rewrites for `/socket.io` and `/socket.io/:path*`.

### 6. Flag flip procedure (operator — document in runbook)

**Staging first:**

1. Deploy API (Sprint 4 code already present).
2. Run `npm run smoke:ws` in CI or locally against staging API.
3. Execute Tier B browser checklist on **staging** with `NEXT_PUBLIC_REALTIME=ws`.
4. If pass → set staging UI env permanently to `ws`.

**Production:**

1. Repeat Tier B on prod (or accept staging sign-off + prod smoke steps 1–7 only).
2. Set `NEXT_PUBLIC_REALTIME=ws` on **UI deployment** (rebuild/redeploy UI required — Next.js bakes `NEXT_PUBLIC_*` at build time).
3. Monitor structured logs for 24h: `MESSAGING_WS_CONNECT_OK`, `MESSAGING_WS_AUTH_FAILED`, `MESSAGING_WS_SUBSCRIBE_DENIED`.
4. **Rollback:** set `NEXT_PUBLIC_REALTIME=poll`, redeploy UI only.

**Important:** changing the flag requires a **UI rebuild**, not a runtime toggle.

### 7. Wire contract (unchanged from Sprint 4)

No new REST or WS events. Reference for smoke testers:

| Piece | Value |
|-------|--------|
| Engine path | `/socket.io` |
| Namespace | `/ws/messaging` |
| Auth | HttpOnly session cookie on handshake |
| Server push | `message.new` |
| Client inbound | `conversation.subscribe` / `conversation.unsubscribe` |
| Subscribe ack | `subscribe.ok` / `subscribe.denied` |

**Log codes to verify in manual smoke:**

| Code | When |
|------|------|
| `MESSAGING_WS_CONNECT_OK` | valid cookie connect |
| `MESSAGING_WS_AUTH_FAILED` | no/invalid cookie |
| `MESSAGING_WS_DISCONNECT_OK` | disconnect / logout |
| `MESSAGING_WS_SUBSCRIBE_DENIED` | non-participant subscribe |
| `MESSAGING_WS_SUBSCRIBE_OK` | participant subscribe |

### 8. Multi-instance verification (conditional)

**Only run if** prod/staging already has `REDIS_URL` + ≥2 API replicas.

Procedure (from LOAD_SMOKE_WS.md):

1. User B connected to replica 2 (via LB).
2. `POST` message via REST on replica 1.
3. User B receives `message.new`.

If single replica: checklist row 8 = **N/A — documented**.

### 9. Service signatures (Agent 1)

```typescript
// dating-api/src/messaging-realtime/messaging-realtime-health.service.ts
export type RealtimeHealthSnapshot = {
  namespace: string;
  socketIoPath: string;
  redisAdapter: boolean;
  sessionCookieName: string;
};

@Injectable()
export class MessagingRealtimeHealthService {
  getSnapshot(): RealtimeHealthSnapshot;
}

// dating-api/src/health/health.controller.ts
@Get('health/realtime')
realtime(): { ok: true; service: string; ts: string; messaging: RealtimeHealthSnapshot };
```

Register `MessagingRealtimeHealthService` in `MessagingRealtimeModule` (export) and import into `HealthModule` — **or** keep health self-contained with optional import to avoid circular deps. Preferred: health controller injects `MessagingRealtimeHealthService` via `HealthModule` importing `MessagingRealtimeModule`.

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API / wire contract (new)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health/realtime` | none | `{ ok, service, ts, messaging: RealtimeHealthSnapshot }` |

All other contracts unchanged (Sprint 4).

---

## UI contract

| Item | Story 1 |
|------|---------|
| `getRealtimeMode()` | unchanged — default `poll` |
| Prod flag | operator sets `NEXT_PUBLIC_REALTIME=ws` at **build** time |
| Browser smoke | manual only |

---

## Test plan (for Agent 2)

### Unit — `messaging-realtime-health.service.spec.ts`

| Case | Expected |
|------|----------|
| No Redis at boot | `redisAdapter: false` |
| Redis adapter bound | `redisAdapter: true` |
| Session cookie name | matches config stub |

### Unit — `health.controller.spec.ts` (extend)

| Case | Expected |
|------|----------|
| `GET /health/realtime` | 200 + messaging block |

### Integration — existing (no change required if already green)

| Spec | Covers |
|------|--------|
| `messaging-realtime-ws.integration.spec.ts` | auth, subscribe denied, rate limit |
| `me-conversation-messages-ws.integration.spec.ts` | REST send → `message.new` |

### npm script

| Command | Expected |
|---------|----------|
| `npm run smoke:ws` | all WS integration specs pass |

### Manual (operator — not Agent 2 automated)

Tier B checklist in PROD_STABILITY.md — 8 rows.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Target environment URL** — operator must supply staging/prod URL before Tier B; architect cannot execute.
2. **Multi-instance** — may be N/A; do not block story on Redis provisioning.
3. **UI rebuild for flag** — operator must know `NEXT_PUBLIC_*` requires redeploy (document prominently in runbook).
4. **Sentry** — deferred to Story 2; 24h monitoring in flag flip uses structured logs only until then.

---

## Next agent

```text
--agent 1 sprint 5 story 1
```

**Notes for next agent:**

1. Add `GET /health/realtime` + `MessagingRealtimeHealthService` (redis bound flag from adapter boot).
2. Add `npm run smoke:ws` aggregating both WS integration specs.
3. Create `SMOKE_WS_PROD_RUNBOOK.md` — Tier A commands + Tier B browser steps with log codes.
4. Update `PROD_STABILITY.md` — link runbook, clarify UI rebuild requirement for flag flip.
5. **Do not** change `getRealtimeMode()` default.
6. **Do not** set prod env vars in repo — document only.
7. Execute Tier B manual smoke if operator credentials available; otherwise leave checklist for user and record "pending operator" in dev handoff.
