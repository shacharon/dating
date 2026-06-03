# Story 2: Sentry + structured error logging

**Sprint:** 5  
**Status:** Not started  
**Depends on:** —

---

## Why

There is no production error tracking today. WS auth failures, unhandled exceptions, and client-side crashes are invisible until users report them. Sentry plus existing structured logs gives operators visibility before prod rollout scales.

---

## What

**As a** platform operator  
**I want** unhandled errors captured in Sentry with request context  
**So that** I can diagnose production issues without log archaeology

### Acceptance criteria

- [ ] **API Sentry** — `@sentry/nestjs` (or `@sentry/node`) initialized in `main.ts` with env-gated DSN (`SENTRY_DSN`)
- [ ] **UI Sentry** — `@sentry/nextjs` with env-gated DSN (`NEXT_PUBLIC_SENTRY_DSN`)
- [ ] **No DSN in repo** — `.env.example` documents vars; secrets in deployment only
- [ ] **WS errors captured** — gateway auth fail, rate limit, disconnect anomalies tagged with `messaging-realtime` context
- [ ] **Existing structured logs preserved** — Sentry complements `StructuredObservabilityService`; does not replace error codes
- [ ] **PII scrubbing** — no session tokens, cookies, or message body in Sentry payloads
- [ ] **Sample rate** — configurable; default 1.0 in staging, lower in prod if needed
- [ ] **Tests** — Sentry init skipped when DSN unset; smoke test that capture is wired (mock Sentry in unit test)

### Out of scope (this story)

- Performance monitoring / APM dashboards
- Alert routing (PagerDuty) — document as follow-up
- Product funnel events (Sprint 7 Story 4)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_02_sentry_structured_logging/agent-0-architect.md` after architect run.

Key integration points:
- `dating-api/src/main.ts` — global exception filter
- `dating-api/src/messaging-realtime/messaging.gateway.ts` — capture unexpected errors
- `dating-ui/next.config.ts` — Sentry webpack plugin (optional, env-gated)
- `dating-ui/sentry.client.config.ts` / `sentry.server.config.ts`

---

## Definition of done

- [ ] Sentry packages added to API + UI package.json
- [ ] Init guarded by DSN presence (no-op locally without env)
- [ ] `.env.example` updated
- [ ] PROD_STABILITY.md lists Sentry env vars
- [ ] Unit test: Sentry mock not called when DSN unset
- [ ] Manual: trigger test error in staging → appears in Sentry project

---

## Manual smoke

1. Set `SENTRY_DSN` on API staging → trigger 500 on a test route → event in Sentry  
2. Set `NEXT_PUBLIC_SENTRY_DSN` on UI → trigger client error → event in Sentry  
3. WS auth fail with invalid cookie → breadcrumb or tagged event (not raw cookie)  
4. Unset DSN locally → app starts normally, no Sentry network calls

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Alert rules | ops follow-up |
| Product analytics events | Sprint 7 Story 4 |
