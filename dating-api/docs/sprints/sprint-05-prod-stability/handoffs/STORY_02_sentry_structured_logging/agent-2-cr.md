# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_sentry_structured_logging.md](../../STORY_02_sentry_structured_logging.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved (fixed)

---

## Summary

- Reviewed Sentry bridge, PII scrubbers, exception filter, WS/email hooks, UI config, and health smoke route.
- **Fixed:** removed `Sentry.getCurrentScope().setTag` from HTTP correlation middleware — risk of cross-request tag leakage without Nest Sentry request isolation; `requestId` remains on events via `SentryBridgeService` + ALS `getRequestLogFields()`.
- **Added tests:** `sentry-pii.spec.ts` (5 cases), health `sentry-test` integration (404/500), bridge `captureMessage` test.
- **PII hardening:** scrub `to`, `email`, `subject` in Sentry extras.
- **Docs:** corrected smoke URL to `GET /health/sentry-test` (not `/api/v1`).

---

## Review findings

| Severity | Finding | Resolution |
|----------|---------|------------|
| **Major** | Global Sentry scope tag in middleware could leak `requestId` across concurrent requests | **Fixed** — removed; bridge uses `withScope` + request log context |
| Minor | Story/docs said `/api/v1/health/sentry-test` | **Fixed** — `PROD_STABILITY.md` |
| Minor | `@sentry/nestjs` in package.json but init via `@sentry/node` `instrument.ts` only | **Accepted** — AC allows either; no unused import in code |
| Minor | Email `obs.error` logs `to=` in structured JSON (not Sentry) | **Accepted** — Sentry path has no email in extras; PII scrub added defensively |

**Security:** No DSN in repo; cookies/auth redacted; smoke route gated off in prod; no message bodies on sensitive routes.

**Logic:** Bridge no-op without DSN ✓; WS expected failures as warnings ✓; 5xx/fatal → exceptions ✓.

---

## Artifacts (CR changes)

| Path | Change |
|------|--------|
| `dating-api/src/logging/request-correlation.middleware.ts` | removed global Sentry scope tag |
| `dating-api/src/observability/sentry-pii.ts` | extra keys `to`, `email`, `subject` |
| `dating-api/src/observability/sentry-pii.spec.ts` | **created** |
| `dating-api/src/observability/sentry-bridge.service.spec.ts` | +`captureMessage` test |
| `dating-api/src/health/health-http.integration.spec.ts` | +sentry-test 404/500 tests |
| `PROD_STABILITY.md` | correct health path |

---

## Tests / verification

| Command | Result |
|---------|--------|
| `npm test` (dating-api) | **1255/1255** pass |
| `npm run build` (dating-api) | pass |

**Test files added/updated:**

- `src/observability/sentry-pii.spec.ts`
- `src/observability/sentry-bridge.service.spec.ts`
- `src/observability/sentry-config.service.spec.ts` (from dev)
- `src/health/health-http.integration.spec.ts`

---

## Acceptance criteria (engineering)

- [x] API Sentry init env-gated (`instrument.ts` + `SENTRY_DSN`)
- [x] UI Sentry env-gated (`NEXT_PUBLIC_SENTRY_DSN`, `enabled: false` when unset)
- [x] No DSN in repo (`.env.example` only)
- [x] WS errors captured (warning messages + tags)
- [x] Structured logs preserved
- [x] PII scrubbing (API + UI `beforeSend`)
- [x] Sample rate configurable
- [x] Tests — bridge no-op without DSN; PII scrub; health route

**Pending operator:** manual Sentry project smoke with real DSN.

---

## Open questions / blockers

- None for Agent 3.

---

## Next agent

```text
--agent 3 sprint 5 story 2
```

**Notes for PM:**

- Mark story AC checkboxes and close when operator confirms optional Sentry smoke.
- Sprint 7 Story 4 (funnel analytics) unblocked after PM sign-off.
