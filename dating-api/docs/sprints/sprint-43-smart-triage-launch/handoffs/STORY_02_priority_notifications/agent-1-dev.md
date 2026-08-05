# Handoff: Agent 1 — Senior Dev — Sprint 43 Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_priority_notifications.md](../../STORY_02_priority_notifications.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)  
**Skip Agent 4**

---

## Summary

- Email-only alerts when a **new HIGH (≥85)** browse candidate appears after a successful MatchListRank rebuild (not on mutual LIKE).
- `HighPriorityMatchEmailService` + pure pick/body helpers; Resend via existing `EmailNotificationService`; log on successful send only.
- Prefs: `User.highPriorityMatchEmailsEnabled` (default true) + UI toggle on existing notification settings section.
- Frequency: max 1 email / user / 24h; unique log per viewer↔candidate. Exclude PASS/BLOCK targets.
- Product analytics send/skip events. No push, digest, or open/click tracking.

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | `highPriorityMatchEmailsEnabled` + `HighPriorityMatchEmailLog` |
| `prisma/migrations/20260805190000_high_priority_match_email/` | additive migration |
| `src/notifications/high-priority-match-email.helpers.ts` (+ spec) | pick newly HIGH + email bodies |
| `src/notifications/high-priority-match-email.service.ts` (+ spec) | gates, send, log, analytics |
| `src/notifications/notifications.module.ts` | register + export service |
| `src/me-profile/me-matches.service.ts` | load prior ranks → persist → best-effort notify |
| `src/me-profile/dto/patch-notification-preferences.dto.ts` | optional HIGH flag |
| `src/me-profile/dto/notification-preferences-response.dto.ts` | response field |
| `src/users/users.service.ts` (+ spec) | PATCH persistence |
| `src/auth/auth.dto.ts` | expose on session user |
| `src/logging/error-codes.ts` | HIGH email OK/fail/skip codes |
| `src/analytics/product-analytics.events.ts` | sent / skipped events |
| `dating-ui/.../notification-preferences-section.tsx` | third toggle |
| `dating-ui/.../notification-preferences-api.ts` + `auth/types.ts` | types |
| `dating-ui/src/lib/i18n/{types,en,es,he}.ts` | HIGH pref copy |

---

## Implementation notes

- **Trigger:** `rebuildMatchListRanks` when `snapshot.status === 'ready'` and rows non-empty; prior ranks loaded **before** persist.
- **Subject:** `High compatibility match on Piza` (no name/emoji).
- **CTA:** `/dating/me-matches/{candidateProfileId}` — “View profile”.
- **Reason:** narrative cache `narrativeTldr` (or extract from narrative); no LLM; opener only from `ConversationStarterCache` hit.
- **Log write:** only when `sendTransactionalBestEffort` returns `'sent'` (provider disabled / fail → retry later).
- **Mutual email unchanged.**

---

## How to verify

```bash
cd dating-api
npx prisma migrate deploy   # apply 20260805190000_high_priority_match_email if needed
npx jest src/notifications/high-priority-match-email --no-coverage
npx jest src/users/users.service.spec.ts --no-coverage
```

Manual (Agent 3): enable Resend → rebuild that introduces a new HIGH → email within rebuild → toggle HIGH prefs off → no email; frequency 2nd rebuild same day skipped.

---

## Next

```text
--agent 2 sprint 43 story 2
```
