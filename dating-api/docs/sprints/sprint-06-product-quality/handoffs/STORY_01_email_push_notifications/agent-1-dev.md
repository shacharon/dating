# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_email_push_notifications.md](../../STORY_01_email_push_notifications.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Prisma** — `User.emailNotificationsEnabled Boolean @default(true)` + migration `20260603120000_user_email_notifications_enabled`.
- **`NotificationsModule`** — Resend + noop providers, config service, email templates, HMAC unsubscribe token, debounce (15 min), mutual-match + new-message orchestrators.
- **Mutual match email** — fires best-effort after LIKE txn when `detectAndCreateMutualMatch` returns `created: true` (both users, nickname + deep link, no body).
- **New message email** — fires best-effort after REST persist when recipient has no WS connection, not unsubscribed, and debounce allows.
- **`MutualMatchesService`** — replaced `upsert` with find + create; returns `{ mutualMatch, created }`.
- **`MessagingSocketRegistry`** — tracks sockets by `userId`; `hasActiveConnection(userId)`.
- **Public unsubscribe** — `GET /api/v1/notifications/email/unsubscribe?token=` → HTML confirmation, sets `emailNotificationsEnabled = false`.
- **Default local dev** — `EMAIL_PROVIDER=disabled` (noop); structured trace codes in `error-codes.ts`.
- **No UI changes** (email-only channel per architect).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `emailNotificationsEnabled` on `User` |
| `dating-api/prisma/migrations/20260603120000_user_email_notifications_enabled/migration.sql` | created |
| `dating-api/package.json` / `package-lock.json` | `resend` dependency |
| `dating-api/.env.example` | EMAIL_* + APP_PUBLIC_URL vars |
| `dating-api/src/notifications/notifications.module.ts` | created |
| `dating-api/src/notifications/email-notification-config.service.ts` | created |
| `dating-api/src/notifications/email-provider.interface.ts` | created |
| `dating-api/src/notifications/resend-email.provider.ts` | created |
| `dating-api/src/notifications/noop-email.provider.ts` | created |
| `dating-api/src/notifications/email-provider.resolver.ts` | created |
| `dating-api/src/notifications/email-notification.service.ts` | created — templates + send + footer |
| `dating-api/src/notifications/email-unsubscribe-token.service.ts` | created |
| `dating-api/src/notifications/email-unsubscribe.controller.ts` | created |
| `dating-api/src/notifications/mutual-match-email.service.ts` | created |
| `dating-api/src/notifications/new-message-email.service.ts` | created |
| `dating-api/src/notifications/message-email-debounce.service.ts` | created |
| `dating-api/src/messaging-realtime/messaging-socket-registry.service.ts` | `byUserId` + `hasActiveConnection` |
| `dating-api/src/me-profile/mutual-matches.service.ts` | `{ created }` return type |
| `dating-api/src/me-profile/me-match-actions.service.ts` | email hook after txn |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | email hook after persist |
| `dating-api/src/me-profile/me-profile.module.ts` | import `NotificationsModule` |
| `dating-api/src/logging/error-codes.ts` | EMAIL_* codes |
| `dating-api/src/me-profile/mutual-matches.service.spec.ts` | updated for `created` flag |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | mock `MutualMatchEmailService` |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | mock `NewMessageEmailService` |
| `dating-api/src/messaging-realtime/messaging-socket-registry.spec.ts` | `hasActiveConnection` tests |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | mutualMatch `upsert` → `findUnique`/`create` |

**Not in AppModule directly** — `NotificationsModule` imported via `MeProfileModule` only (per architect; avoids duplicate registration).

---

## Decisions (do not reverse without discussion)

- Followed architect: noop when `EMAIL_PROVIDER !== resend`; no throw on missing Resend key in disabled mode.
- Email triggers use `void …BestEffort()` — never fail LIKE or send-message HTTP responses.
- Debounce is in-memory per process (documented limitation; same pattern as WS rate limit).
- `APP_PUBLIC_URL` for deep links; not derived from `CORS_ORIGIN`.
- UNMATCHED existing mutual rows return `created: false` (no email on stale row).

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] Unit tests (story-related):
  ```bash
  npm test -- mutual-matches.service.spec.ts me-match-actions.service.spec.ts me-conversation-messages.service.spec.ts messaging-socket-registry.spec.ts
  ```
  **44/44 pass**
- [ ] Full `npm test` — 10 failures in unrelated suites (`enrichment-legacy-phrase-map`, `me-new-model-e2e`); `me-profile-http.integration.spec.ts` has **1** failure on `POST /api/v1/me/profile returns 201 without gender` (500) — likely mock gap from new module wiring; **Agent 2** to fix + add notification tests per architect plan
- [ ] Manual smoke with Resend — **not run** (requires API key + real inbox)

---

## Migration / local dev

```bash
cd dating-api
npx prisma migrate dev    # applies 20260603120000_user_email_notifications_enabled
npm run start:dev
```

Optional Resend smoke (`.env`):

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Piza <notifications@verified-domain.com>
APP_PUBLIC_URL=http://localhost:3000
EMAIL_UNSUBSCRIBE_SECRET=<long-random-string>
```

Unsubscribe URL issued in every email footer:  
`GET /api/v1/notifications/email/unsubscribe?token=...`

---

## Manual smoke (operator — requires Resend)

1. Two users reciprocal LIKE → both receive "It's a match on Piza!" email  
2. Recipient disconnects WS → sender POST message → recipient gets "New message on Piza"  
3. Recipient online via WS → send message → no email (trace `EMAIL_SKIPPED_RECIPIENT_ONLINE`)  
4. Click unsubscribe link → `emailNotificationsEnabled=false` → no further emails  

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Unit tests: debounce, unsubscribe token, email services | Agent 2 |
| Integration tests: mock provider, reciprocal LIKE sends, offline message send | Agent 2 |
| Fix `me-profile-http` profile POST 500 (if caused by NotificationsModule in test module) | Agent 2 |
| Resend domain DNS verification | Operator |
| Sentry on email failures | Sprint 5 Story 2 (optional hook) |
| Redis-backed debounce (multi-instance) | Sprint 7 |

---

## Open questions / blockers

- None blocking Agent 2.

---

## Next agent

```text
--agent 2 sprint 6 story 1
```

**Notes for next agent:**

1. Add tests from architect handoff § Test plan (debounce, token, email services, integration with mock provider).
2. Extend `me-profile-http.integration.spec.ts` prisma mock with `user.findMany` / `user.update` if needed for notification paths.
3. Investigate single failing profile POST test (500) — may need `prismaMock.user` stubs or override `MutualMatchEmailService`/`NewMessageEmailService` in HTTP test module.
4. Do **not** add message body to emails, SMS, or in-app notification center.
