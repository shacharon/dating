# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [STORY_02_sentry_structured_logging.md](../../STORY_02_sentry_structured_logging.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Story 2 closed as Done (engineering gate)** — Sentry wired for API + UI with env-gated DSN, PII scrubbing, structured-log complement, and automated tests.
- Full pipeline: architect → dev → code review (1 fix) → pm.
- **Sprint 5 progress: 2/4** — next per [closeout plan](../../SPRINT_5_6_7_CLOSEOUT.md): **Sprint 7 Story 2** (legacy cleanup) or Sprint 5 Story 3.
- **Sprint 7 Story 4** (funnel analytics) is **unblocked** — depends on this story’s Sentry baseline.
- **Operator smoke** with a real Sentry project DSN remains pending (same waiver as Story 1 Tier B).

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Sentry packages API + UI | Done | `@sentry/node`, `@sentry/nestjs`, `@sentry/nextjs` in package.json |
| Init guarded by DSN | Done | `instrument.ts`, `getSentryUiOptions()` `enabled: false` |
| `.env.example` updated | Done | dating-api + dating-ui |
| `PROD_STABILITY.md` Sentry vars | Done | + `ENABLE_SENTRY_TEST`, smoke path |
| Unit test: no Sentry when DSN unset | Done | `sentry-bridge.service.spec.ts` |
| Manual staging → event in Sentry | **Pending operator** | needs project DSN + dashboard check |
| Tests passing | Done | **1255/1255** Jest (dating-api) |
| Build | Done | `npm run build` (dating-api) |

---

## Acceptance criteria

**8 / 8** engineering AC met. **Manual smoke (4 steps)** deferred to operator.

| AC | Notes |
|----|-------|
| API Sentry | `@sentry/node` via `instrument.ts` + `SentryBridgeService` |
| UI Sentry | `@sentry/nextjs`, `instrumentation.ts`, `global-error.tsx` |
| No DSN in repo | `.env.example` only |
| WS errors | Auth fail, rate limit, session invalid → Sentry **warnings** with `messaging-realtime` tag; routine disconnects stay structured-log only (by design) |
| Structured logs preserved | No removal of `StructuredObservabilityService` |
| PII scrubbing | `sentry-pii.ts` + UI `beforeSend` |
| Sample rate | `SENTRY_TRACES_SAMPLE_RATE` env; default 0 dev, 0.1 prod per docs |
| Tests | Bridge, config, PII, health `sentry-test` route |

---

## Sprint 5 progress

| # | Story | Status |
|---|--------|--------|
| 1 | WS prod smoke + flag flip | **Done** (Tier B pending operator) |
| 2 | Sentry + structured error logging | **Done** (operator Sentry smoke pending) |
| 3 | Remove LOW_INFO_PROFILE_IDS hardcode | Ready |
| 4 | Consolidate overallScore → finalScore | Ready |

---

## Artifacts

| Path | Change |
|------|--------|
| `STORY_02_sentry_structured_logging.md` | Status Done, AC/DoD, shipped table |
| `README.md` (sprint-05) | 2/4 |
| `handoffs/STORY_02_sentry_structured_logging/agent-*.md` | full pipeline |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; operator confirms events in Sentry dashboard when DSN is configured.
- `@sentry/nestjs` listed in package.json; runtime init uses `@sentry/node` `instrument.ts` (AC allows either).
- `GET /health/sentry-test` for controlled API smoke (not under `/api/v1`).
- PagerDuty / alert rules → ops follow-up (out of scope).

---

## Tests / verification

- [x] `npm test` (dating-api) — **1255/1255**
- [x] `npm run build` (dating-api)
- [ ] Operator: set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` → smoke per story Manual smoke section
- [ ] Operator: unset DSN → confirm no Sentry traffic (local)

---

## Deferred / operator

| Item | Owner |
|------|--------|
| Staging/prod Sentry dashboard smoke | Operator |
| PagerDuty alert rules | Ops follow-up |
| Product funnel events | Sprint 7 Story 4 |
| UI `npm run typecheck` pre-existing failures | Separate cleanup |

---

## Open questions / blockers

- None.

---

## Next story (closeout plan)

```text
--agent 0 sprint 7 story 2
```

Alternative (stay in Sprint 5 engine cleanup):

```text
--agent 0 sprint 5 story 3
```
