# Handoff: Agent 2 — Code review — Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_email_push_notifications.md](../../STORY_01_email_push_notifications.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved (fixed)

---

## Summary

- Reviewed Agent 1 `NotificationsModule` implementation — **no production logic changes required**.
- Added **22** tests across debounce, unsubscribe token, email services, unsubscribe HTTP, and hook assertions.
- Fixed **`me-profile-http.integration.spec.ts`** — missing `userProfile.findFirst` mock caused 500 on nickname-uniqueness check (unrelated to email; pre-existing gap surfaced by profile create path).
- Confirmed security: HMAC unsubscribe with timing-safe compare; no message body in emails; public unsubscribe does not leak user existence; email sends are best-effort and non-blocking.

---

## Review notes

| Area | Finding |
|------|---------|
| Security | Unsubscribe token uses HMAC-SHA256 + `timingSafeEqual`; invalid token → generic 400 — correct |
| Privacy | Mutual/message templates use nickname + deep link only; no message body — verified in tests |
| Idempotency | Email fires only when `created: true`; re-LIKE does not re-notify — tested |
| Online skip | `hasActiveConnection` gates message email — tested |
| Debounce | In-memory 15 min window; documented multi-instance limitation — acceptable per architect |
| Provider | Default `EMAIL_PROVIDER=disabled` (noop); no throw on missing Resend key in dev — correct |
| DI | `NotificationsModule` imported via `MeProfileModule` only — no circular deps |
| Minor | `sign()` throws if `EMAIL_UNSUBSCRIBE_SECRET` unset while `verify()` returns null — acceptable; prod must set secret before sending |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | Add `userProfile.findFirst` mock (default `null`) + reset in `beforeEach` |

---

## Tests added

### Unit — `message-email-debounce.service.spec.ts` (new, **4**)

- First send allowed
- Blocked within 15 min window
- Allowed after window expires
- Independent keys per conversation/recipient

### Unit — `email-unsubscribe-token.service.spec.ts` (new, **4**)

- sign + verify round-trip
- Tampered signature → null
- Expired token → null
- `buildUnsubscribeUrl` encodes valid token

### Unit — `mutual-match-email.service.spec.ts` (new, **3**)

- Sends to both users when enabled
- Skips unsubscribed user
- No message body in email text

### Unit — `new-message-email.service.spec.ts` (new, **4**)

- Skips when recipient online (WS)
- Skips when debounced
- Skips when unsubscribed
- Sends when offline + subscribed; records debounce

### Integration — `email-unsubscribe-http.integration.spec.ts` (new, **2**)

- Valid token → 200 HTML + `emailNotificationsEnabled: false`
- Invalid token → 400, no DB update

### Extended — `me-match-actions.service.spec.ts` (+**2**)

- Notifies email when `created: true`
- No notify when `created: false`

### Extended — `me-conversation-messages.service.spec.ts` (+**1**)

- `maybeNotifyBestEffort` called after successful send

---

## Tests / verification

- [x] Story suite:
  ```bash
  npx jest message-email-debounce email-unsubscribe-token mutual-match-email new-message-email email-unsubscribe-http me-match-actions.service me-conversation-messages.service messaging-socket-registry mutual-matches.service me-profile-http.integration.spec.ts --runInBand
  ```
  **230/230 pass**
- [ ] Full `npm test` — unrelated failures may remain (`enrichment-legacy-phrase-map`, `me-new-model-e2e`); out of Story 1 scope
- [ ] Manual Resend smoke — operator (requires API key + verified domain)

---

## Open questions / blockers

- None blocking Agent 3.

---

## Next agent

```text
--agent 3 sprint 6 story 1
```

**Notes for next agent:**

- Mark story Done pending operator manual Resend smoke (or record waiver for local noop-only).
- Sprint 6 progress: 1/4 after close.
- AC checklist: provider wired ✓, mutual match trigger ✓ (unit + hook), message debounce/online skip ✓, unsubscribe ✓, `.env.example` ✓, tests ✓.
- Manual smoke steps in story file still require real inbox.
