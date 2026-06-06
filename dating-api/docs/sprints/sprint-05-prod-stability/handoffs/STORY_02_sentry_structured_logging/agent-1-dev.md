# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_sentry_structured_logging.md](../../STORY_02_sentry_structured_logging.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **API:** `@sentry/node` + `@sentry/nestjs`; early `src/instrument.ts`; global `SentryModule` with `SentryBridgeService` (no-op without `SENTRY_DSN`).
- **Hooks:** HTTP unhandled/5xx → `captureException`; WS auth/rate-limit/session-invalid → `captureMessage` (warning); email send fail → `captureException`; `requestId` tag on HTTP via correlation middleware.
- **PII:** `sentry-pii.ts` `beforeSend` / `beforeBreadcrumb` scrub cookies, auth headers, sensitive routes.
- **UI:** `@sentry/nextjs` — `instrumentation.ts`, client/server configs, `global-error.tsx`, `withSentryConfig` (sourcemaps upload disabled without `SENTRY_AUTH_TOKEN`).
- **Smoke route:** `GET /api/v1/health/sentry-test` (non-prod or `ENABLE_SENTRY_TEST=1`).
- **Tests:** `sentry-bridge.service.spec.ts`, `sentry-config.service.spec.ts`; health specs updated. **1247/1247** Jest pass; API `npm run build` green.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/instrument.ts` | created |
| `dating-api/src/main.ts` | `import './instrument'` first |
| `dating-api/src/observability/*` | Sentry module, bridge, config, PII, init options, specs |
| `dating-api/src/logging/observability-exception.filter.ts` | Sentry on fatal + 5xx |
| `dating-api/src/logging/request-correlation.middleware.ts` | `requestId` Sentry tag |
| `dating-api/src/logging/structured-logging.module.ts` | imports `SentryModule` |
| `dating-api/src/messaging-realtime/messaging.gateway.ts` | WS Sentry messages |
| `dating-api/src/notifications/email-notification.service.ts` | email fail → Sentry |
| `dating-api/src/health/health.controller.ts` | `GET /health/sentry-test` |
| `dating-api/package.json` | `@sentry/nestjs`, `@sentry/node` |
| `dating-api/.env.example` | Sentry vars |
| `dating-ui/instrumentation.ts` | created |
| `dating-ui/sentry.*.config.ts` | created |
| `dating-ui/sentry.shared.config.ts` | created |
| `dating-ui/src/app/global-error.tsx` | created |
| `dating-ui/next.config.ts` | `withSentryConfig` |
| `dating-ui/package.json` | `@sentry/nextjs` |
| `dating-ui/.env.example` | Sentry vars |
| `PROD_STABILITY.md` | `ENABLE_SENTRY_TEST` + smoke note |

---

## Decisions (do not reverse without discussion)

- **No `SentryModule.forRoot()` in AppModule** — `instrument.ts` init is sufficient; bridge service for feature hooks.
- **WS auth failures are warnings**, not exceptions — avoids Sentry noise for expected denies.
- **UI source map upload off** unless `SENTRY_AUTH_TOKEN` set (`sourcemaps.disable`).
- **Structured logs unchanged** — all `obs.*` calls preserved.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass  
- [x] `npm test` (dating-api) — **1247/1247** pass  
- [ ] `npm run typecheck` (dating-ui) — pre-existing spec errors unrelated to Sentry; new Sentry files compile via Next build path  
- [x] Manual: app starts with DSN unset (no code path requires DSN)  

**Manual smoke (operator, needs real DSN):**

1. Set `SENTRY_DSN` → `GET http://127.0.0.1:3001/api/v1/health/sentry-test` → event in Sentry  
2. Set `NEXT_PUBLIC_SENTRY_DSN` → trigger client error → event in Sentry  
3. WS without cookie → warning with `subsystem=messaging-realtime`, no cookie in payload  

---

## Open questions / blockers

- None for Agent 2.

**Deferred:** PagerDuty alerts; Sprint 7.4 funnel analytics (separate emitter).

---

## Next agent

```text
--agent 2 sprint 5 story 2
```

**Notes for Agent 2:**

- Review PII scrub coverage in `sentry-pii.ts` and UI `beforeSend`.
- Optional: add integration test for `/health/sentry-test` with mock Sentry.
- Confirm email failure path does not attach `to` address to Sentry extras (currently only tags + error message in obs log).
