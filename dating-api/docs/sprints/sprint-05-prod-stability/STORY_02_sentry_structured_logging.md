# Story 2: Sentry + structured error logging

**Sprint:** 5  
**Status:** Done (engineering gate — operator Sentry dashboard smoke pending)  
**Closeout order:** 1 (start here)  
**Depends on:** —  
**Unblocks:** Sprint 7 Story 4 (funnel analytics)

---

## Why

There is no production error tracking today. WS auth failures, unhandled exceptions, and client-side crashes are invisible until users report them. Sentry plus existing structured logs gives operators visibility before prod rollout scales.

---

## What

**As a** platform operator  
**I want** unhandled errors captured in Sentry with request context  
**So that** I can diagnose production issues without log archaeology

### Acceptance criteria

- [x] **API Sentry** — `@sentry/node` initialized via `instrument.ts` (imported first in `main.ts`) with env-gated DSN (`SENTRY_DSN`)
- [x] **UI Sentry** — `@sentry/nextjs` with env-gated DSN (`NEXT_PUBLIC_SENTRY_DSN`)
- [x] **No DSN in repo** — `.env.example` documents vars; secrets in deployment only
- [x] **WS errors captured** — gateway auth fail, rate limit, session invalid → Sentry warnings tagged `messaging-realtime` (routine disconnects: structured logs only)
- [x] **Existing structured logs preserved** — Sentry complements `StructuredObservabilityService`; does not replace error codes
- [x] **PII scrubbing** — no session tokens, cookies, or message body in Sentry payloads (`sentry-pii.ts` + UI `beforeSend`)
- [x] **Sample rate** — configurable via `SENTRY_TRACES_SAMPLE_RATE` (default 0 dev; 0.1 prod documented in `PROD_STABILITY.md`)
- [x] **Tests** — Sentry bridge no-op when DSN unset; PII scrub; health `sentry-test` route

### Out of scope (this story)

- Performance monitoring / APM dashboards
- Alert routing (PagerDuty) — document as follow-up
- Product funnel events (Sprint 7 Story 4)

---

## Technical notes

See `handoffs/STORY_02_sentry_structured_logging/agent-0-architect.md`.

---

## Definition of done

- [x] Sentry packages added to API + UI package.json
- [x] Init guarded by DSN presence (no-op locally without env)
- [x] `.env.example` updated
- [x] PROD_STABILITY.md lists Sentry env vars
- [x] Unit test: Sentry mock not called when DSN unset
- [ ] Manual: trigger test error in staging → appears in Sentry project (**pending operator**)

---

## Shipped (2026-06-03)

| Area | Deliverable |
|------|-------------|
| API init | `src/instrument.ts`, `SentryModule`, `SentryBridgeService` |
| HTTP | `ObservabilityExceptionFilter` → Sentry on 5xx/fatal |
| WS | Auth / rate limit / session invalid → `captureMessage` warnings |
| Email | Send failure → `captureException` |
| PII | `sentry-pii.ts` + UI scrub |
| Smoke route | `GET /health/sentry-test` (non-prod default) |
| UI | `instrumentation.ts`, client/server config, `global-error.tsx` |
| Tests | **1255/1255** Jest pass |

Handoffs: `handoffs/STORY_02_sentry_structured_logging/agent-*.md`

---

## Agent run

```text
--agent 0 sprint 5 story 2
--agent 1 sprint 5 story 2
--agent 2 sprint 5 story 2
--agent 3 sprint 5 story 2
```

---

## Manual smoke (operator)

1. Set `SENTRY_DSN` on API staging → `GET /health/sentry-test` → event in Sentry  
2. Set `NEXT_PUBLIC_SENTRY_DSN` on UI → trigger client error → event in Sentry  
3. WS auth fail with invalid cookie → warning tagged `messaging-realtime`, no cookie in payload  
4. Unset DSN locally → app starts normally, no Sentry network calls

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Alert rules | ops follow-up |
| Product analytics events | Sprint 7 Story 4 |
| Operator dashboard smoke | when DSN configured in staging/prod |
