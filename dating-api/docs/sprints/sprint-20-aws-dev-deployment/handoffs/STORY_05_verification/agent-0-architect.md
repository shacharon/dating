# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_verification.md](../../STORY_05_verification.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  

**Mode:** Retro lock — verification **tooling** already landed. Agent 1 verifies tooling + CI gate alignment; **do not invent live passes**. Filling `VERIFIED_DEV.md` with real results is **human** after apply/deploy. Agent 4 only if live `DEV_BASE_URL` exists and PM wants automated e2e beyond smoke.

---

## Summary

- Sprint 20 **exit gate** = live proof of L1–L10 fixes + Sprint 19 p95 bar.
- **Automated now:** `smoke-cloud-dev.sh` (`/health` + `/health/realtime` redisAdapter) wired **fail-closed** into Story 04 `deploy-dev.yml`.
- **Manual checklist:** `VERIFICATION_CHECKLIST.md` (9 checks).
- **Sign-off:** `VERIFIED_DEV.md` starts **PENDING_INFRA** → flip to **VERIFIED** only with real evidence.
- **Forbidden:** Marking checks PASS without a live URL / fabricated results.

---

## Artifacts (locked)

| Path | Role |
|------|------|
| `dating-api/scripts/smoke-cloud-dev.sh` | Automated cloud smoke (CI gate) |
| `dating-api/package.json` → `smoke:cloud-dev` | npm convenience (if present) |
| `VERIFICATION_CHECKLIST.md` | Full 9-check + k6 commands |
| `VERIFIED_DEV.md` | Sign-off table (status machine) |
| `ci-post-deploy-smoke.snippet.yml` | Historical harden snippet — **Story 04 already fail-closed**; Agent 1 may note snippet obsolete or align wording |
| Story 04 deploy `smoke` job | Must remain fail-closed (CR already) |

---

## Decisions (do not reverse without discussion)

### 1. Two tiers of proof

| Tier | What | Blocks Story 05 “tooling Done” | Blocks Sprint 20 “VERIFIED” |
|------|------|--------------------------------|-----------------------------|
| A — Tooling | Script + checklist + CI gate + empty sign-off template | Yes (Agent 1–3) | No |
| B — Live | All 9 checks + k6 p95 + filled `VERIFIED_DEV.md` | No | **Yes** |

PM may accept Story 5 as **Done (PENDING_INFRA)** for tooling; sprint exit stays open until Tier B.

### 2. Automated smoke scope (locked)

`smoke-cloud-dev.sh` **must** assert:

- `GET /health` → 200, `ok: true`
- `GET /health/realtime` → `messaging.redisAdapter === true` when `REQUIRE_REDIS_ADAPTER=1` (cloud default)

Optional: `SESSION_COOKIE` → `GET /api/v1/auth/me` 200.

Does **not** replace manual photo/Rekognition/analysis/chat/k6.

### 3. Manual nine checks (must stay in checklist)

1. Health / Redis adapter (L2)  
2. Auth cookie Secure + me (L4/L8)  
3. Photos S3 persistence (L1)  
4. Rekognition moderation (not mock)  
5. Analysis queued path (L3)  
6. Chat WS multi-instance (API desired ≥2 once)  
7. k6 match-list **p95 < 2000ms**  
8. Smoke in CI (Story 04)  
9. CloudWatch stdout / optional Sentry (L7)

### 4. k6

- Script: Sprint 19 `load-test-matches.js`
- Modest VUs on `dev` (story: VUS=25 DURATION=2m)
- Fail bar: p95 < 2000ms

### 5. Failure mapping

| Failure class | Fix in |
|---------------|--------|
| Photos / disk | Story 01/03 |
| Infra / SG / Redis | Story 02 |
| Cookies / drivers | Story 03 |
| Deploy / migrate / smoke gate | Story 04 |
| Checklist gaps | Story 05 tooling |

### 6. Agent 4

- **Default skip** (no live URL).
- If human provides `DEV_BASE_URL`, Agent 4 may run smoke only and record results — still no fabricated manual e2e.

---

## Acceptance mapping

| Criterion | Owner | Bar |
|-----------|--------|-----|
| Tooling artifacts present + CI fail-closed | Agent 1/2 | Pass |
| Live 9 checks + k6 + VERIFIED | Human | PENDING_INFRA |
| No fake PASS in VERIFIED_DEV | Agent 2/3 | Enforce |

---

## Agent 1 instructions

1. Confirm smoke script, checklist, VERIFIED_DEV, package script, deploy smoke job fail-closed.
2. Fix gaps only (e.g. missing npm script; snippet contradicts fail-closed — update snippet or deprecate).
3. Do **not** fill VERIFIED_DEV with fake passes.
4. Write `handoffs/STORY_05_verification/agent-1-dev.md`.
5. Commit only if files change.

---

## Agent 2 instructions

- [ ] Smoke covers health + redisAdapter; exit 1 on fail
- [ ] Checklist covers all 9 + k6
- [ ] VERIFIED_DEV is PENDING_INFRA / TBD only
- [ ] CI gate fail-closed (Story 04)
- [ ] No fabricated results
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept tooling as **Done (PENDING_INFRA)** if CR PASS.
- Do **not** mark Sprint 20 fully complete until `VERIFIED_DEV.md` Status = VERIFIED.
- Update story + README accordingly.
- Write `agent-3-pm.md`.

---

## Open risks

1. Operators mark VERIFIED without multi-instance chat test — PM must require checklist evidence.
2. k6 cost/OpenAI burn on `dev` — keep VUs modest.
3. Soft local `REQUIRE_REDIS_ADAPTER=0` must never be default in cloud CI.
