# Verified AWS `dev` — Sprint 20 sign-off

| Field | Value |
|-------|--------|
| **Status** | **PENDING_INFRA** |
| **Public URL** | TBD — set after Story 02 apply + Story 04 first deploy (`DEV_BASE_URL`) |
| **Verified date (UTC)** | TBD |
| **Verified by** | TBD |
| **Git SHA deployed** | TBD |
| **Live smoke run** | **Not executed** — no `DEV_BASE_URL` / live `dev` origin available when Story 05 tooling landed |

> Do **not** mark Sprint 20 complete until Status is `VERIFIED` and the results table below is filled with real outcomes (no fabricated passes).

---

## Automated smoke

```bash
export BASE_URL=https://<dev-hostname>
# optional:
export SESSION_COOKIE='dating_session=...'
chmod +x dating-api/scripts/smoke-cloud-dev.sh
./dating-api/scripts/smoke-cloud-dev.sh
```

| Check | Result | Notes |
|-------|--------|-------|
| `GET /health` = 200 | TBD | |
| `GET /health/realtime` + `messaging.redisAdapter === true` | TBD | |
| Optional `GET /api/v1/auth/me` with `SESSION_COOKIE` | TBD | Skip if cookie unset |
| Script exit code | TBD | Must be 0 for CI gate |

---

## Story checks (9)

| # | Check | Result | Evidence / notes |
|---|--------|--------|------------------|
| 1 | Liveness/health (L2) | TBD | Smoke script + curls |
| 2 | Auth e2e (L4/L8) | TBD | Secure cookie, `/api/v1/auth/me` |
| 3 | Photos e2e S3 (L1) | TBD | Object in bucket; survives task restart |
| 4 | Moderation Rekognition e2e | TBD | APPROVED / FLAGGED_FOR_REVIEW |
| 5 | Analysis queued path e2e (L3) | TBD | 202 + job completes across restart |
| 6 | Chat WS multi-instance e2e (L2) | TBD | Desired count ≥ 2 once |
| 7 | k6 match-list p95 &lt; 2000ms | TBD | Paste summary below |
| 8 | Smoke automated + CI gate | TBD | `deploy-dev.yml` post-deploy step |
| 9 | Observability CloudWatch/Sentry | TBD | Log stream + Sentry event |

Full procedure: [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md)

---

## k6 summary (placeholder)

Command:

```bash
BASE_URL=https://<dev-hostname> \
SESSION_COOKIE='dating_session=...' \
VUS=25 \
DURATION=2m \
k6 run dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/load-test-matches.js
```

| Metric | Target | Actual |
|--------|--------|--------|
| `http_req_duration` p95 | &lt; 2000 ms | TBD |
| VUs | 25 (suggested) | TBD |
| Duration | 2m (suggested) | TBD |
| Pass/fail | thresholds green | TBD |

Paste k6 end-of-run summary here:

```
TBD — run after live BASE_URL exists
```

---

## Blockers (as of tooling commit)

1. **No live AWS `dev` URL** — Stories 01–04 may still be landing; `DEV_BASE_URL` / `BASE_URL` unset in this environment.
2. **`.github/workflows/deploy-dev.yml`** — Story 04 drafts a `smoke` job. Harden it with [`ci-post-deploy-smoke.snippet.yml`](./ci-post-deploy-smoke.snippet.yml) so missing script / `DEV_BASE_URL` / smoke failure fails the deploy (do not soft-skip).
3. Human must obtain a session cookie for auth + k6 after Google OAuth is configured for the `dev` origin.

---

## Human steps to close Sprint 20

1. Complete Story 02 (`terraform apply`) and Story 03 (secrets/config).
2. Land Story 04 `deploy-dev.yml`; replace the soft smoke job with [`ci-post-deploy-smoke.snippet.yml`](./ci-post-deploy-smoke.snippet.yml) (fail on smoke failure).
3. First successful deploy → set `DEV_BASE_URL` (GitHub var/secret + local shell).
4. Run `dating-api/scripts/smoke-cloud-dev.sh` against live URL; record results here.
5. Execute manual e2e rows 2–6 and 9 from the checklist (scale API to ≥2 tasks once for chat).
6. Run k6; paste p95 summary; assert p95 &lt; 2000ms.
7. Flip **Status** → `VERIFIED`, fill date/SHA/URL, check Story 05 acceptance criteria.
