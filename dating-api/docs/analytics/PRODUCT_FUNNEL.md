# Product funnel analytics

Sprint 7 Story 4 — server-side funnel events as structured JSON logs (`logKind: product_analytics`).

## Events

| Event | When | Properties |
|-------|------|------------|
| `profile.submitted` | Profile transitions to `SUBMITTED` | `profileId`, `priorStatus` |
| `profile.photo_gate_blocked` | Match list `not_ready(no_photo)` or submit rejected for missing photo | `surface` (`match_list` \| `submit`) |
| `photo.moderation_pending` | Profile photo uploaded and queued (`PENDING`) | _(empty)_ |
| `photo.moderation_decided` | Admin approves or rejects a pending photo | `decision` (`approve` \| `reject`) |
| `match.list_viewed` | Match list returns `status: ready` | `matchCount`, `viewerProfileId` |
| `match.action` | Like / pass / block / undo | `action`, `candidateProfileId` |
| `match.mutual_created` | New mutual match row created | `mutualMatchId`, `otherUserId` (×2 users) |
| `conversation.opened` | GET conversation detail | `conversationIdHash` |
| `message.sent` | Message persisted | `conversationIdHash` |
| `messaging.ws_connected` | WS auth + registry success | `activeConnections` |
| `messaging.ws_disconnected` | WS disconnect (authenticated) | `activeConnections` |
| `user.reported` | User report persisted | `reason` (enum only) |
| `report.ops_resolved` | Admin dismisses or marks action taken on a report | `status` (`DISMISSED` \| `ACTION_TAKEN`) |
| `match.feedback` | Viewer submits match suggestion feedback (PUT) | `sentiment` (`positive` \| `negative`) — weekly review: [MATCH_QUALITY_RUNBOOK.md](./MATCH_QUALITY_RUNBOOK.md) |
| `referral.landing_viewed` | Public landing beacon (pre-auth) | `refPresent` (boolean) — envelope `userId: anonymous` |
| `referral.signup_completed` | New user created with valid referrer | _(empty — new user id in envelope only)_ |
| `account.deleted` | User account soft-deleted | _(empty — `userId` in envelope only)_ |

## Match quality (Sprint 11)

Weekly PM review: [MATCH_QUALITY_RUNBOOK.md](./MATCH_QUALITY_RUNBOOK.md). Primary events for adoption proxy: `match.list_viewed` (denominator — distinct users), `match.feedback` (numerator — distinct users who submitted thumbs).

## PII policy

**Allowed:** opaque ids (`userId`, `profileId`, `candidateProfileId`, `mutualMatchId`, `otherUserId`), enums, counts, `conversationIdHash` (16 hex). Pre-auth landing uses envelope `userId: anonymous` only.

**Forbidden:** email, name, nickname, location, message text, profile text, photo URLs, session tokens, raw `conversationId` on message/open events, **referrer id in analytics properties** (stored in DB only).

Analytics lines are **not** sent to Sentry. Operational traces remain on `StructuredObservabilityService`.

## Configuration

```text
# Default: enabled. Set to false to disable all product events.
PRODUCT_ANALYTICS_ENABLED=false

# Recommended in production — peppers conversationId hashing.
PRODUCT_ANALYTICS_HASH_SALT=
```

## Local dev

Stdout and optional file sink (`STRUCTURED_LOG_FILE` / `logs/dating-api.log`):

```powershell
Get-Content dating-api/logs/dating-api.log -Wait | Select-String product_analytics
```

Example line:

```json
{"logKind":"product_analytics","event":"match.action","userId":"...","properties":{"action":"like","candidateProfileId":"..."}}
```

## CloudWatch Insights

```sql
fields @timestamp, event, userId, properties
| filter logKind = "product_analytics"
| stats count() by event
```

Funnel sequence (happy path):

```text
profile.submitted → match.list_viewed → match.action (like)
  → match.mutual_created → conversation.opened → message.sent
  → messaging.ws_connected
```

## Future

PostHog/Mixpanel via `AnalyticsProvider` v2 when `POSTHOG_API_KEY` is set (not in v1).
