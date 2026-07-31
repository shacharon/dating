# Sprint 20 Story 5 — Cloud verification checklist

Use this against the live AWS `dev` origin after Story 02 apply + Story 04 first deploy.

**Sign-off file:** [`VERIFIED_DEV.md`](./VERIFIED_DEV.md)  
**Automated smoke:** `dating-api/scripts/smoke-cloud-dev.sh`  
**Local UI smoke (not cloud gate):** `dating-ui/smoke-test.sh` / `dating-ui/DEPLOYMENT_SMOKE_TEST.md`

Set once:

```bash
export BASE_URL=https://<dev-hostname>   # public ALB / CloudFront origin
# optional, for auth probe + k6:
export SESSION_COOKIE='dating_session=...'
```

---

## 1. Liveness / health (L2)

- [ ] `GET $BASE_URL/health` → **200**, body `{ "ok": true, "service": "dating-api", ... }`
- [ ] `GET $BASE_URL/health/realtime` → **200**, and `messaging.redisAdapter === true`
- [ ] Automated: `BASE_URL=$BASE_URL ./dating-api/scripts/smoke-cloud-dev.sh` exits **0**

Expected `/health/realtime` fields (`dating-api/src/health/health.controller.ts`):

| Field | Expected |
|-------|----------|
| `ok` | `true` |
| `service` | `"dating-api"` |
| `messaging.namespace` | `"/ws/messaging"` |
| `messaging.socketIoPath` | `"/socket.io"` |
| `messaging.redisAdapter` | `true` on cloud |
| `messaging.wsRateLimitRedis` | `true` when Redis limiter active |
| `messaging.sessionCookieName` | e.g. `"dating_session"` |

---

## 2. Auth e2e (L4 / L8)

- [ ] Google Sign-In on the `dev` origin succeeds
- [ ] Session cookie set with **`Secure`**; persists across requests
- [ ] `GET /api/v1/auth/me` returns the user (no 401 loop)
- [ ] Optional automated: `SESSION_COOKIE='...' BASE_URL=$BASE_URL ./dating-api/scripts/smoke-cloud-dev.sh`

---

## 3. Photos e2e — S3 (L1)

- [ ] Upload a photo via UI/API
- [ ] Object lands in **S3** (not container ephemeral disk)
- [ ] Photo still available after API task restart / replace
- [ ] Served via CDN or authenticated URL as configured

---

## 4. Moderation — Rekognition e2e

- [ ] Upload uses **Rekognition** (not mock driver)
- [ ] Clean photo → `APPROVED`
- [ ] Flagged case → `FLAGGED_FOR_REVIEW`
- [ ] Admin queue `/admin/photos` shows the flagged item
- [ ] SLA cron behavior sane (no runaway duplicates)

---

## 5. Analysis queued path e2e (L3)

- [ ] `POST /api/v1/me/profile/submit` → **202** + `analysisJobId`
- [ ] Polling `analysis-status` completes via the **queued** path (Redis)
- [ ] Still completes after killing/replacing an API task mid-job

---

## 6. Chat WebSocket multi-instance e2e (L2)

- [ ] WebSocket chat works on `dev`
- [ ] With API desired count **≥ 2** + ALB stickiness, messages deliver across instances (Redis adapter fan-out)
- [ ] Re-check `/health/realtime` → `redisAdapter: true` on both tasks’ path

---

## 7. k6 performance — match-list p95 &lt; 2000ms

Script (existing):  
`dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/load-test-matches.js`

```bash
BASE_URL=https://<dev-hostname> \
SESSION_COOKIE='dating_session=...' \
VUS=25 \
DURATION=2m \
k6 run dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/load-test-matches.js
```

- [ ] Threshold `http_req_duration` **p(95) &lt; 2000** passes
- [ ] Paste summary into [`VERIFIED_DEV.md`](./VERIFIED_DEV.md) (do not invent numbers)

Keep load modest on `dev` (cost / throttling).

---

## 8. Smoke automated + CI gate

- [ ] `smoke-cloud-dev.sh` green against live `BASE_URL`
- [ ] Post-deploy job in `.github/workflows/deploy-dev.yml` runs the script and **fails the deploy** on non-zero exit  
  → Story 04 drafts a soft `smoke` job; harden with [`ci-post-deploy-smoke.snippet.yml`](./ci-post-deploy-smoke.snippet.yml) (require script + `DEV_BASE_URL`)

---

## 9. Observability — CloudWatch / Sentry

- [ ] API logs visible in **CloudWatch** (`STRUCTURED_LOG_FILE=0`, stdout — L7)
- [ ] Sentry receives a test event if `SENTRY_DSN` / `ENABLE_SENTRY_TEST` configured (`GET /health/sentry-test` only when enabled)

---

## Exit gate

All 9 sections above must be **pass** before marking Sprint 20 done. Record results in [`VERIFIED_DEV.md`](./VERIFIED_DEV.md). If infra is not live yet, leave status **PENDING_INFRA** and do not fabricate passes.
