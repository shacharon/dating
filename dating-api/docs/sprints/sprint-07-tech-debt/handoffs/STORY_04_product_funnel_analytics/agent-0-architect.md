# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_product_funnel_analytics.md](../../STORY_04_product_funnel_analytics.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Provider v1 (locked):** structured JSON log sink via existing `SimpleLogger.emitStructured` — **not** PostHog/Mixpanel in this story (no new npm deps).
- **New `AnalyticsModule`** with `AnalyticsService.track(userId, event, properties)` and pluggable `AnalyticsProvider` interface; v1 ships one provider: `StructuredLogAnalyticsProvider`.
- **Env-gated:** `PRODUCT_ANALYTICS_ENABLED` (default on unless `0` / `false` / `off`); optional `PRODUCT_ANALYTICS_HASH_SALT` for `conversationId` hashing.
- **Eight funnel events** emitted server-side at state transitions; **no Prisma migration**.
- **PII:** no email, name, message text, profile text, or photo URLs in `properties`; opaque ids (`userId`, `profileId`) allowed in envelope; `message.sent` uses **hashed** `conversationId` only.
- **Sentry separation:** analytics never calls `SentryBridgeService` / `@sentry/node`; distinct `logKind: 'product_analytics'` discriminator vs observability `trace`/`error` lines.
- **Dashboard doc:** `dating-api/docs/analytics/PRODUCT_FUNNEL.md` with log query examples (CloudWatch / local file).

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `src/analytics/analytics.module.ts` | **New** — `@Global()` module, exports `AnalyticsService` |
| `src/analytics/analytics.service.ts` | **New** — `track()`, enabled check, delegates to provider |
| `src/analytics/analytics-provider.interface.ts` | **New** — `AnalyticsProvider` |
| `src/analytics/structured-log-analytics.provider.ts` | **New** — JSON line via `SimpleLogger` |
| `src/analytics/product-analytics.events.ts` | **New** — event name union + per-event property types |
| `src/analytics/hash-conversation-id.ts` | **New** — SHA-256 truncated hex |
| `src/analytics/analytics.service.spec.ts` | **New** — mock provider; disabled when env off |
| `src/analytics/hash-conversation-id.spec.ts` | **New** — stable hash given salt |
| `docs/analytics/PRODUCT_FUNNEL.md` | **New** — schema + query examples |
| `src/app.module.ts` | Import `AnalyticsModule` |
| `src/me-profile/me-profile.module.ts` | Import `AnalyticsModule` (if not global-only consumers) |
| `src/me-profile/me-profile.service.ts` | `profile.submitted` after successful SUBMITTED update |
| `src/me-profile/me-matches.service.ts` | `match.list_viewed` when `status === 'ready'` |
| `src/me-profile/me-match-actions.service.ts` | `match.action`, `match.mutual_created`, undo → `match.action` |
| `src/me-profile/me-conversations.service.ts` | `conversation.opened` in `getById` |
| `src/me-profile/me-conversation-messages.service.ts` | `message.sent` after message row created |
| `src/messaging-realtime/messaging-realtime.module.ts` | Ensure `AnalyticsService` injectable in gateway |
| `src/messaging-realtime/messaging.gateway.ts` | `messaging.ws_connected` / `messaging.ws_disconnected` |
| `src/me-profile/me-match-actions.service.spec.ts` | Assert `analytics.track` on `createAction` LIKE |
| `.env.example` | `PRODUCT_ANALYTICS_*` comments |
| `handoffs/STORY_04_product_funnel_analytics/agent-1-dev.md` | created by agent 1 |

**Do not change (this story):**

| Path | Reason |
|------|--------|
| `dating-ui/**` | UI page-view SDK optional / deferred |
| `observability/sentry-*.ts` | Error path only; no funnel events |
| `StructuredObservabilityService` | Keep ops traces separate; do not overload with product events |
| Prisma schema | No new tables for v1 |

---

## Decisions (do not reverse without discussion)

### 1. Provider: structured log sink v1 (locked)

Sprint README already locked: *structured product events → logs + optional PostHog later*.

| v1 | v2 (follow-up) |
|----|----------------|
| `StructuredLogAnalyticsProvider` → `SimpleLogger.emitStructured` | `PostHogAnalyticsProvider` when `POSTHOG_API_KEY` set |

**Rationale:** Reuses CloudWatch/local file pipeline from Sprint 5.2; zero new vendor SDK; satisfies AC “provider wired (or structured JSON logs)”.

**Line shape** (distinct from `StructuredLogLine`):

```typescript
type ProductAnalyticsLogLine = {
  timestamp: string;       // ISO
  logKind: 'product_analytics';
  service: string;         // SERVICE_NAME || 'dating-api'
  env: string;             // NODE_ENV
  event: ProductAnalyticsEventName;
  userId: string;          // subject user (opaque cuid)
  properties: ProductAnalyticsProperties; // event-specific, no PII fields
  requestId?: string | null; // from getRequestLogFields() when HTTP context exists
};
```

Emit only through `AnalyticsService` → provider — **never** `obs.trace` for product funnel.

### 2. Env gating (locked)

```typescript
function isProductAnalyticsEnabled(): boolean {
  const v = process.env.PRODUCT_ANALYTICS_ENABLED?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
  return true; // default ON (including production) unless explicitly disabled
}
```

Optional salt (recommended in prod):

```text
PRODUCT_ANALYTICS_HASH_SALT=<long random string>
```

Used only in `hashConversationId(id)` — HMAC-style: `sha256(salt + ':' + id).hex().slice(0, 16)`.

### 3. Event catalog (locked)

Stable names (snake.case with dot prefix):

| Event | Emit when | `userId` | Properties (no PII) |
|-------|-----------|----------|---------------------|
| `profile.submitted` | `MeProfileService.submitForUser` after DB row → `SUBMITTED` | submitter | `{ profileId, priorStatus }` |
| `match.list_viewed` | `MeMatchesService.list` returns `{ status: 'ready', ... }` | viewer | `{ matchCount, viewerProfileId }` |
| `match.action` | `MeMatchActionsService.createAction` success | actor | `{ action: 'like' \| 'pass' \| 'block', candidateProfileId }` |
| `match.action` | `MeMatchActionsService.deleteAction` success | actor | `{ action: 'undo', candidateProfileId }` |
| `match.mutual_created` | `detectResult?.created === true` inside `createAction` tx path | **each participant** | `{ mutualMatchId, otherUserId }` — emit **two** `track` calls (actor + target) |
| `conversation.opened` | `MeConversationsService.getById` success | opener | `{ conversationIdHash }` |
| `message.sent` | `MeConversationMessagesService.sendMessage` after `message.create` | sender | `{ conversationIdHash }` — **no** `text`, length, or profanity flags |
| `messaging.ws_connected` | `MessagingGateway.handleConnection` after auth + registry | user | `{ activeConnections }` (number) |
| `messaging.ws_disconnected` | `MessagingGateway.handleDisconnect` when `data.userId` set | user | `{ activeConnections }` |

**Do not emit:**

- `match.list_viewed` on `not_ready` (no funnel step yet)
- `profile.submitted` on failed validation / rejected state
- `match.mutual_created` when `created: false` (idempotent re-like)
- WS events on auth failure disconnect (no authenticated `userId`)

**`candidateProfileId`:** `UserProfile.id` of target (already used in match APIs) — not email/name.

### 4. PII policy (locked)

| Allowed in envelope / properties | Forbidden |
|----------------------------------|-----------|
| Opaque ids: `userId`, `profileId`, `candidateProfileId`, `mutualMatchId`, `otherUserId` | `email`, `name`, `nickname`, `locationLabel` |
| `conversationIdHash` (16 hex) | Raw `conversationId` on `message.sent` / `conversation.opened` |
| Enum strings: `action`, `priorStatus`, counts | Message `text`, profile `profileText`, photo URLs |
| `activeConnections` count | Session token, cookie, `sessionId` on analytics lines |

**Sentry:** Do not send analytics lines to Sentry. Existing `obs.trace` for ops remains unchanged alongside analytics (duplicate connect logs are acceptable).

### 5. Service API (locked)

```typescript
// product-analytics.events.ts
export const ProductAnalyticsEvents = {
  PROFILE_SUBMITTED: 'profile.submitted',
  MATCH_LIST_VIEWED: 'match.list_viewed',
  MATCH_ACTION: 'match.action',
  MATCH_MUTUAL_CREATED: 'match.mutual_created',
  CONVERSATION_OPENED: 'conversation.opened',
  MESSAGE_SENT: 'message.sent',
  MESSAGING_WS_CONNECTED: 'messaging.ws_connected',
  MESSAGING_WS_DISCONNECTED: 'messaging.ws_disconnected',
} as const;

export type ProductAnalyticsEventName =
  (typeof ProductAnalyticsEvents)[keyof typeof ProductAnalyticsEvents];

// analytics.service.ts
@Injectable()
export class AnalyticsService {
  track(
    userId: string,
    event: ProductAnalyticsEventName,
    properties: Record<string, string | number | boolean>,
  ): void; // sync, fire-and-forget; must not throw to callers
}
```

Implementation: wrap provider in try/catch; swallow errors (best-effort telemetry).

### 6. Module placement (locked)

```text
AnalyticsModule (@Global)
  providers: [AnalyticsService, StructuredLogAnalyticsProvider]
  exports: [AnalyticsService]

AppModule imports AnalyticsModule once.
```

Inject `AnalyticsService` into me-profile services + `MessagingGateway`. **No** circular import: `analytics/` must not import `me-profile/`.

### 7. Integration map (locked)

```text
POST /api/v1/me/profile/submit
  → MeProfileService.submitForUser → profile.submitted

GET /api/v1/me/matches
  → MeMatchesService.list (ready path) → match.list_viewed

POST /api/v1/me/matches/:id/actions
  → MeMatchActionsService.createAction → match.action [+ match.mutual_created x2 if created]

DELETE /api/v1/me/matches/:id/actions
  → MeMatchActionsService.deleteAction → match.action (undo)

GET /api/v1/me/conversations/:id
  → MeConversationsService.getById → conversation.opened

POST /api/v1/me/conversations/:id/messages
  → MeConversationMessagesService.sendMessage → message.sent

WS /messaging namespace
  → MessagingGateway handleConnection / handleDisconnect
```

**Not in v1:** `MeConversationsService.list` (list endpoint) — detail open is the funnel step per story smoke #4 path via `getById`.

### 8. PostHog interface (stub only)

Define `AnalyticsProvider` with `capture(event, userId, properties)`. v1 single implementation. Comment in module file for future:

```text
// v2: if (POSTHOG_API_KEY) register PostHogAnalyticsProvider as composite or replace
```

Do **not** add `posthog-node` in agent 1.

---

## Regression tests (required)

### `analytics.service.spec.ts`

| Case | Expect |
|------|--------|
| Enabled + track | mock provider `capture` called once with event + properties |
| `PRODUCT_ANALYTICS_ENABLED=false` | provider not called |
| Provider throws | `track` does not throw to caller |

### `me-match-actions.service.spec.ts`

| Case | Expect |
|------|--------|
| `createAction` LIKE success | `analytics.track` with `match.action` + `action: 'like'` |
| LIKE + `detectResult.created` | additionally `match.mutual_created` ×2 (actor + target userIds) |

### Optional (nice)

- `hash-conversation-id.spec.ts` — same id + salt → same hash; salt change → different hash
- `messaging.gateway.spec.ts` — connect emits `messaging.ws_connected` when analytics mocked

**No** live PostHog/Redis integration tests.

---

## Documentation (`docs/analytics/PRODUCT_FUNNEL.md`)

Include:

1. Event table (copy from §3)
2. PII rules (copy from §4)
3. **Local dev:** tail `logs/dating-api.log` or stdout:

   ```bash
   # PowerShell
   Get-Content dating-api/logs/dating-api.log -Wait | Select-String product_analytics
   ```

4. **CloudWatch Insights** example:

   ```sql
   fields @timestamp, event, userId, properties
   | filter logKind = "product_analytics"
   | stats count() by event
   ```

5. Funnel sequence diagram (text): submit → list → action → mutual → open → message → ws

---

## `.env.example` additions

```text
# --- Product funnel analytics (Sprint 7 Story 4) ---
# Emit structured JSON lines with logKind=product_analytics (default: enabled).
# PRODUCT_ANALYTICS_ENABLED=false
# Optional pepper for conversationId hashing (recommended in production).
# PRODUCT_ANALYTICS_HASH_SALT=
```

---

## Backward compatibility

| Scenario | Expected |
|----------|----------|
| Analytics disabled | Zero new log lines; API behavior unchanged |
| Analytics enabled | Extra JSON lines on stdout/file; no API contract change |
| Existing clients | No wire protocol change |
| Observability | `StructuredObservabilityService` unchanged |

---

## Verification commands

```bash
cd dating-api
npx jest src/analytics
npx jest src/me-profile/me-match-actions.service.spec.ts
npx jest src/messaging-realtime/messaging.gateway.spec.ts
npm test
npm run build
rg "logKind.*product_analytics" src/analytics
rg "Sentry" src/analytics
# expect no Sentry imports in analytics/
```

Manual smoke (operator): story file § Manual smoke — grep logs for each event name after scripted flow.

---

## Open questions / blockers

- None for Agent 1.
- **UI page-view tracking:** explicitly deferred (story out of scope).
- **PostHog:** follow-up epic; interface only in v1.

---

## Next agent

```text
--agent 1 sprint 7 story 4
```

**Notes for agent 1:**

- Register `AnalyticsModule` in `AppModule` before feature modules that inject `AnalyticsService`.
- Use constructor injection; avoid static imports from me-profile into analytics.
- Keep `track()` synchronous; do not `await` external HTTP in v1.
- After implementation, run full suite (expect **1303+** tests).
