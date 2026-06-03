# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [STORY_01_ws_prod_smoke_flag_flip.md](../../STORY_01_ws_prod_smoke_flag_flip.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Story 1 closed as Done (engineering gate)** — Tier A automated smoke, deploy preflight endpoint, and operator runbook shipped.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 5 progress: 1/4** — next: Sentry + structured error logging (Story 2).
- **Tier B (browser smoke + prod flag flip)** remains **operator-owned** — same waiver pattern as Sprint 4 Story 1 manual smoke.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Tier A `npm run smoke:ws` | Done | 6/6 pass |
| Health tests | Done | 8/8 pass |
| `GET /health/realtime` | Done | `health-http.integration.spec.ts` |
| Operator runbook | Done | `SMOKE_WS_PROD_RUNBOOK.md` |
| Flag flip / rollback docs | Done | runbook + `PROD_STABILITY.md` |
| `getRealtimeMode()` default `poll` | Done | unchanged |
| Tier B browser smoke | Pending operator | PROD_STABILITY checklist unsigned |
| Prod `NEXT_PUBLIC_REALTIME=ws` | Pending operator | requires UI rebuild |
| Rollback drill in target env | Pending operator | documented, not executed |

---

## Acceptance criteria

**3 / 10** engineering AC checked; **7 / 10** Tier B items deferred to operator (documented in story file).

Engineering deliverables complete. Operator must run [SMOKE_WS_PROD_RUNBOOK.md](../../SMOKE_WS_PROD_RUNBOOK.md) Tier B before flipping prod to `ws`.

---

## Sprint 5 progress

| # | Story | Status |
|---|--------|--------|
| 1 | WS prod smoke + flag flip | **Done** (Tier B pending operator) |
| 2 | Sentry + structured error logging | Not started |
| 3 | Remove LOW_INFO_PROFILE_IDS hardcode | Not started |
| 4 | Consolidate overallScore → finalScore | Not started |

---

## Artifacts

| Path | Change |
|------|--------|
| `STORY_01_ws_prod_smoke_flag_flip.md` | Status Done, AC/DoD, shipped notes |
| `README.md` (sprint-05) | 1/4 in progress |
| `handoffs/STORY_01_ws_prod_smoke_flag_flip/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **Tier A engineering gate**; Tier B is operator waiver (consistent with Sprint 4).
- Default realtime mode stays `poll` until operator sets `ws` at UI build time.
- Multi-instance smoke row N/A until Redis + multi-replica deployed.

---

## Tests / verification

- [x] `npm run smoke:ws` — 6/6
- [x] `npx jest messaging-realtime-health health.controller health-http --runInBand` — 8/8
- [x] `npm run build` (dating-api)
- [ ] `npm run smoke:ws-preflight` — requires running API (operator)
- [ ] Tier B browser smoke — pending operator

---

## Operator next steps (before prod flag flip)

1. Run Tier B checklist in [SMOKE_WS_PROD_RUNBOOK.md](../../SMOKE_WS_PROD_RUNBOOK.md) on staging.
2. Sign [PROD_STABILITY.md](../../PROD_STABILITY.md) checklist.
3. Set `NEXT_PUBLIC_REALTIME=ws` on UI deployment → rebuild/redeploy.
4. Monitor structured logs 24h (`MESSAGING_WS_CONNECT_OK`, `MESSAGING_WS_AUTH_FAILED`).

---

## Open questions / blockers

- None blocking Story 2.

---

## Next work

```text
--agent 0 sprint 5 story 2
```

**Notes:** Sentry on API + UI; env-gated DSN; no secrets in repo. See `STORY_02_sentry_structured_logging.md`.
