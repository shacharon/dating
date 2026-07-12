# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_sentry_structured_logging.md](../../STORY_02_sentry_structured_logging.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No Prisma / no API contract changes** — platform observability story only.
- **Sentry complements existing structured logs** — keep `StructuredObservabilityService`, `ObservabilityExceptionFilter`, and `ErrorCodes`; add a thin **optional** bridge that calls Sentry only when `SENTRY_DSN` is set.
- **API:** `@sentry/nestjs` + early `instrument.ts` import in `main.ts`; global HTTP exceptions → Sentry; WS + email failures → tagged messages (not full exceptions for expected auth deny).
- **UI:** `@sentry/nextjs` with `instrumentation.ts` + `sentry.client.config.ts` / `sentry.server.config.ts`; DSN gated via `NEXT_PUBLIC_SENTRY_DSN`; **no source-map upload required** for local dev (webpack plugin optional / off without `SENTRY_AUTH_TOKEN`).
- **PII:** `beforeSend` scrub cookies, `Authorization`, session cookie name, message bodies; never attach raw `Cookie` header or email bodies.
- **Agent 1** implements bridge + hooks + tests; **does not** remove or downgrade structured JSON logging.

---

## Artifacts (Agent 1 — planned paths)

| Path | Change |
|------|--------|
| `dating-api/src/instrument.ts` | **created** — `Sentry.init()` when DSN set (imported first from `main.ts`) |
| `dating-api/src/main.ts` | **updated** — `import './instrument'` as first line |
| `dating-api/src/observability/sentry-config.service.ts` | **created** — DSN, environment, sample rates |
| `dating-api/src/observability/sentry-bridge.service.ts` | **created** — `captureException`, `captureMessage`, `isEnabled` |
| `dating-api/src/observability/sentry.module.ts` | **created** — global providers |
| `dating-api/src/observability/sentry-pii.ts` | **created** — `beforeSend` + `beforeBreadcrumb` scrubbers |
| `dating-api/src/logging/observability-exception.filter.ts` | **updated** — bridge on `fatal` + unhandled paths |
| `dating-api/src/logging/structured-logging.module.ts` | **updated** — import `SentryModule` |
| `dating-api/src/messaging-realtime/messaging.gateway.ts` | **updated** — Sentry message on auth fail / rate limit / session invalid |
| `dating-api/src/notifications/email-notification.service.ts` | **updated** — `captureException` after `obs.error` on send fail |
| `dating-api/src/observability/sentry-bridge.service.spec.ts` | **created** |
| `dating-api/package.json` | **updated** — `@sentry/nestjs`, `@sentry/node` |
| `dating-api/.env.example` | **updated** — Sentry vars |
| `dating-ui/instrumentation.ts` | **created** — register Sentry for Next server |
| `dating-ui/sentry.client.config.ts` | **created** |
| `dating-ui/sentry.server.config.ts` | **created** |
| `dating-ui/src/app/global-error.tsx` | **created** (optional but recommended) — client boundary capture |
| `dating-ui/next.config.ts` | **updated** — wrap with `withSentryConfig` only when build upload env present |
| `dating-ui/package.json` | **updated** — `@sentry/nextjs` |
| `dating-ui/.env.example` | **updated** — `NEXT_PUBLIC_SENTRY_DSN`, etc. |
| `dating-api/docs/sprints/sprint-05-prod-stability/PROD_STABILITY.md` | **updated** — confirm Sentry table (already stubbed) |

**Out of scope (Agent 1):** PagerDuty alerts, performance dashboards, Sprint 7 funnel events.

---

## Decisions (do not reverse without discussion)

### 1. Structured logs remain source of truth

| Layer | Role |
|-------|------|
| `StructuredObservabilityService` | Primary — JSON lines, `errorCode`, `requestId`, file sink |
| Sentry | Secondary — unhandled errors, operator triage, client crashes |

Every existing `obs.trace` / `obs.error` / `obs.fatal` call **stays**. Sentry hooks are **additive** via `SentryBridgeService` (inject optional; no-op when DSN unset).

### 2. API bootstrap order

```text
main.ts line 1: import './instrument'
instrument.ts: if (SENTRY_DSN) Sentry.init({ ... beforeSend: scrubPii })
main.ts: NestFactory.create(...)
```

Do **not** init Sentry only inside `AppModule` — too late for some bootstrap failures. `SentryModule.forRoot()` from `@sentry/nestjs` may still be imported in `AppModule` for request-scoped integration if the package requires it; architect defers to official Nest 11 docs — minimum bar: `instrument.ts` + exception filter bridge.

### 3. Environment variables

**API (`dating-api/.env`)**

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `SENTRY_DSN` | No | unset = disabled | Never commit |
| `SENTRY_ENVIRONMENT` | No | `NODE_ENV` or `development` | e.g. `staging`, `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0` local, `0.1` prod doc | Performance traces; story allows low prod rate |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | `0` | Keep off unless explicitly enabled |

**UI (`dating-ui/.env.local`)**

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | unset = disabled | Public DSN is OK per Sentry |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | No | same pattern as API | |
| `SENTRY_DSN` | No | — | Server-side Next (can mirror public DSN) |
| `SENTRY_AUTH_TOKEN` | No | — | **Only** for CI source map upload; not needed locally |

**Build-time (optional):** `SENTRY_ORG`, `SENTRY_PROJECT` — only if enabling `withSentryConfig` upload in CI.

### 4. PII scrubbing (`sentry-pii.ts`)

Apply in `beforeSend` (and `beforeBreadcrumb` for request breadcrumbs):

| Scrub | How |
|-------|-----|
| `Cookie` header | Remove or replace with `[Filtered]` |
| `Authorization` | Remove |
| `dating_session` / `SESSION_COOKIE_NAME` | Redact cookie values in extras |
| Request body | Drop for routes matching `/messages`, `/auth`, `/notifications` |
| Email content | Never set `extra.body`, `extra.html`, `extra.text` from notification code |
| User email | Do not set Sentry user.email; use `user.id` only when already in log context |

WS handshake: **never** attach `handshake.headers.cookie` to Sentry.

### 5. HTTP errors — what goes to Sentry

| Case | Structured log | Sentry |
|------|----------------|--------|
| Unhandled non-HTTP exception | `obs.fatal` + `HTTP_UNHANDLED` | `captureException` |
| HttpException status ≥ 500 (filter) | `obs.httpServerError` | `captureException` |
| HttpException 4xx | usually already logged by feature | **no** Sentry (noise) |
| Expected WS auth deny | `obs.trace` + `MESSAGING_WS_AUTH_FAILED` | `captureMessage` level **warning**, tags `subsystem=messaging-realtime`, `reason=auth_failed` |
| WS rate limit | `MESSAGING_WS_RATE_LIMITED` | `captureMessage` warning |
| WS session invalidated | `MESSAGING_WS_SESSION_INVALIDATED` | `captureMessage` warning |
| Email send failure | `obs.error` + fail code | `captureException` (real provider errors) |

### 6. Request correlation

In `requestCorrelationMiddleware` (or a small Sentry middleware after it):

- When DSN set: `Sentry.getCurrentScope().setTag('requestId', requestId)` from context
- On HTTP response finish: optional breadcrumb `http` with route + status (no cookie)

Reuse `getRequestLogFields()` from `request-log-context.ts` — do not duplicate ID generation.

### 7. UI integration (Next.js 16)

- Add `instrumentation.ts` at `dating-ui/` root (Next convention).
- `sentry.client.config.ts` / `sentry.server.config.ts` — shared `sentry.shared.config.ts` for DSN + environment + `tracesSampleRate`.
- `next.config.ts`: `export default withSentryConfig(nextConfig, { silent: true, disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN, disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN })` so **local `npm run dev` works without Sentry org tokens**.
- Optional `global-error.tsx` under `src/app/` to report React render errors.
- **Do not** wrap every `fetch` manually — rely on Sentry Next SDK defaults; product logger (`emitProductLog`) unchanged.

### 8. Dev test hook (staging only)

Optional guarded route for manual smoke (AC):

```http
GET /api/v1/health/sentry-test
```

- Enabled only when `SENTRY_DSN` set **and** (`NODE_ENV !== 'production'` OR `ENABLE_SENTRY_TEST=1`).
- Throws controlled `Error('Sentry test')` → must appear in Sentry project.
- Document in PROD_STABILITY manual smoke; **disable in production** by default.

---

## Service signatures (copy-paste for Agent 1)

```typescript
// sentry-config.service.ts
@Injectable()
export class SentryConfigService {
  get isEnabled(): boolean;
  get dsn(): string | undefined;
  get environment(): string;
  get tracesSampleRate(): number;
}

// sentry-bridge.service.ts
@Injectable()
export class SentryBridgeService {
  constructor(private readonly cfg: SentryConfigService);

  captureException(error: unknown, context?: {
    errorCode?: string;
    tags?: Record<string, string>;
    level?: 'error' | 'warning';
  }): void;

  captureMessage(message: string, context?: {
    errorCode?: string;
    tags?: Record<string, string>;
    level?: 'error' | 'warning' | 'info';
  }): void;
}
```

**Module:**

```typescript
@Global()
@Module({
  providers: [SentryConfigService, SentryBridgeService],
  exports: [SentryBridgeService],
})
export class SentryModule {}
```

Import `SentryModule` in `AppModule` (or `StructuredLoggingModule`).

**Exception filter change (conceptual):**

```typescript
// After obs.fatal(...) in catch():
this.sentry.captureException(exception, {
  errorCode: ErrorCodes.HTTP_UNHANDLED,
  tags: { subsystem: 'http' },
});
```

**Messaging gateway (conceptual):**

```typescript
// After obs.trace auth failed:
this.sentry.captureMessage(`messaging ws auth failed reason=${result.reason}`, {
  errorCode: ErrorCodes.MESSAGING_WS_AUTH_FAILED,
  tags: { subsystem: 'messaging-realtime', reason: result.reason },
  level: 'warning',
});
```

---

## Integration points (existing code)

| File | Hook |
|------|------|
| `structured-logging.module.ts` | Import `SentryModule`; inject bridge into filter |
| `observability-exception.filter.ts` | Bridge on fatal + 5xx paths |
| `messaging.gateway.ts` | `handleConnection` auth fail; `guardInbound` rate limit; session timer invalid |
| `email-notification.service.ts` | `catch` after `obs.error` |
| `auth.service.ts` | **optional** — `AUTH_LOGIN_FAILURE` only if exception is non-HttpException (avoid duplicate 401 noise) |
| `main.ts` | `import './instrument'` first line |

**Do not** change: Prisma schema, REST DTOs, WS event names, `ErrorCodes` enum values (may add `SENTRY_DISABLED` trace code optional — not required).

---

## Tests (Agent 1 + 2)

| Test | Assert |
|------|--------|
| `sentry-bridge.service.spec.ts` | `captureException` no-op when DSN unset; mock `@sentry/node` called when DSN set |
| `sentry-config.service.spec.ts` | sample rates parse; disabled without DSN |
| `instrument.ts` side-effect | Import with empty env → no throw (smoke via bootstrap test optional) |
| Existing suite | Full `npm test` must stay green |

**Mock pattern:** `jest.mock('@sentry/node', () => ({ init: jest.fn(), captureException: jest.fn(), ... }))`

---

## Manual smoke (operator — after Agent 1)

1. Unset DSN → `npm run start:dev` + `npm run dev` — no Sentry network (verify via devtools or Sentry debug off).  
2. Set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` → hit `GET /api/v1/health/sentry-test` → event in Sentry.  
3. UI: throw in dev-only button or `global-error` test page → client event.  
4. WS: connect without cookie → warning event tagged `messaging-realtime`, no cookie in payload.  
5. Structured log file still receives JSON lines for same incident.

---

## Open questions / blockers

- None for Agent 1.

**Follow-up (not this story):** PagerDuty alert rules; Sprint 7.4 product funnel events must use separate emitter (not Sentry breadcrumbs).

---

## Next agent

```text
--agent 1 sprint 5 story 2
```

**Notes for Agent 1:**

1. Read `@sentry/nestjs` + `@sentry/nextjs` docs for Nest 11 / Next 16.1 — pin compatible versions in package.json.  
2. Keep diffs minimal — bridge service + hooks, no refactor of `StructuredObservabilityService`.  
3. Run full API test suite + `dating-ui npm test` before handoff.  
4. Update `PROD_STABILITY.md` Sentry section with `ENABLE_SENTRY_TEST` if test route added.  
5. Sprint 6 email code already has `obs.error` — add one-line bridge call only.
