# Handoff: Agent 0 — Architect — Sprint 43 Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_priority_notifications.md](../../STORY_02_priority_notifications.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Backend + lean prefs UI. **Skip Agent 4** (no eligibility / preference ranking / score-formula change).

---

## Summary

Ship **email-only** “new HIGH browse match” alerts via existing Resend stack to bring users back when a **≥85%** candidate newly appears on their ranked list.

**Reject** the story sample that hooks `onNewMutualMatch` — mutual already emails (`MutualMatchEmailService`). **Reject** push / daily digest / full notification-center / new `/settings/notifications` page for v1.

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| Email stack | `src/notifications/` — Resend + noop; `EmailNotificationService.sendTransactionalBestEffort` appends unsubscribe |
| Mutual email | `mutual-match-email.service.ts` on `MutualMatch` create — subject “It's a match on Piza!” → conversation URL |
| Message email | Offline + debounce (`EMAIL_MESSAGE_DEBOUNCE_MINUTES`) |
| Prefs today | `User.emailNotificationsEnabled` / `inAppNotificationsEnabled` only; UI `notification-preferences-section.tsx` on profile settings |
| Prefs API | `PATCH /api/v1/me/notification-preferences` |
| Push | **None** (no FCM/APNs/web-push) — Sprint 6/8 deferred |
| Priority | HIGH ≥ 85 (`match-priority.ts`); stored on list as `MatchListRank.matchScore` |
| Rebuild | `MeMatchesService.rebuildMatchListRanks` → snapshot → `persistMatchListRankSnapshot` → invalidate list cache; worker reasons: analysis / prefs / action / unmatch / list_empty / budget |
| Opener cache | HIGH-only `ConversationStarterCache` — may be empty; list eager ≤3 gens |
| Product analytics | `product-analytics.events.ts` — no `notification.*` events yet |
| Story draft schema | `UserNotificationPreferences` + `NotificationLog` — **not** in Prisma today |

---

## Decision 1 — Trigger: new HIGH on rank rebuild (locked)

| Option | Verdict |
|--------|---------|
| Fire on mutual LIKE | **Reject** — already emailed; doubles noise; does not fix “browse once then leave” |
| Fire on every list GET when HIGH present | **Reject** — spam while browsing |
| **After successful `ready` rank rebuild, detect newly HIGH candidates** | **Lock** |

**Hook site:** `rebuildMatchListRanks` after successful `persistMatchListRankSnapshot` when `snapshot.status === 'ready'` (and rows written path ran). **Best-effort** — never fail/throw rebuild on notify errors (`void` + catch, same spirit as mutual email).

**Skip notify when:** `budget_exceeded`, `not_ready`, or empty wipe path.

---

## Decision 2 — What counts as “new HIGH” (locked)

Before persist (or from DB prior rows for this `viewerUserId`):

1. Load prior `MatchListRank` rows for viewer (id + score + hardBlocked).  
2. From new snapshot rows, candidates where:
   - `matchScore >= 85` (finite; not −1)
   - `hardBlocked === false`
3. **Newly HIGH** = in new set AND either absent from prior ranks OR prior `matchScore < 85` OR prior was hard-blocked and now not.
4. Exclude candidates the viewer already **PASS** or **BLOCK** (LIKE optional exclude too — **lock: exclude PASS + BLOCK**; allow LIKE so they can still get nudged if they liked but never messaged — actually LIKE without mutual may still want browse reminder. Simpler lock: **exclude any `MatchAction` PASS/BLOCK**; LIKE still eligible for notify if newly HIGH).
5. Among newly HIGH not yet logged as notified for this pair (Decision 4), pick **one** with highest `matchScore` (tie-break `candidateProfileId` asc).

If none → no send.

---

## Decision 3 — Channel & cadence (locked)

| Item | Lock |
|------|------|
| Channel | **Email only** (Resend) |
| Push / SMS / in-app center | **Out of scope** |
| Daily digest batching | **Out of scope** (story already defers) |
| Cadence | **At most 1 HIGH-priority email per user per 24h** |
| Default | Enabled (`highPriorityMatchEmailsEnabled = true`) — opt-out |
| Gates | Must pass: global `emailNotificationsEnabled` **AND** `highPriorityMatchEmailsEnabled` **AND** 24h frequency clear **AND** per-candidate not already notified |

Realtime-as-rebuild: emails go out when rebuild completes (analysis, prefs, etc.), not on a cron.

---

## Decision 4 — Persistence (locked)

**Do not** add full story `UserNotificationPreferences` table (messages / mutual / newMatches / frequency enum) — mutual & messages already use global email flag.

**Additive on `User`:**

```prisma
highPriorityMatchEmailsEnabled Boolean @default(true)
```

**New model `HighPriorityMatchEmailLog`** (name explicit; not a generic NotificationLog kitchen sink):

```prisma
model HighPriorityMatchEmailLog {
  id                   String   @id @default(cuid())
  viewerUserId         String
  candidateProfileId   String
  matchScore           Float
  sentAt               DateTime @default(now())

  @@unique([viewerUserId, candidateProfileId]) // never re-email same pair
  @@index([viewerUserId, sentAt])              // 24h frequency lookup
}
```

- Insert **after** successful provider send (or after noop skip? **Lock: log only when send attempted and provider accepted / noop-configured still counts as “sent for frequency” when `isSendingEnabled` would send — if provider disabled, still write log only when we would have sent to avoid rebuild stampede retries… Actually if provider disabled, don’t write log so enabling Resend later can notify. **Lock: write log only when `EmailNotificationService` reports send OK or when provider is disabled but gates passed? Simpler: write log when gates pass and `sendTransactionalBestEffort` returns without throw — including provider-disabled skip path that traces skipped. Frequency uses log rows; if never logged, may re-attempt next rebuild — OK for local noop.**

Clarify: **Write log when we decide to send and call into email service** (best-effort), so frequency + per-candidate dedup hold even if Resend fails after? Prefer: log on successful send path only; on failure allow retry next rebuild (within 24h still blocked if a prior success exists). If send fails with no log, next rebuild may retry — good.

**24h check:** `findFirst` where `viewerUserId` + `sentAt >= now-24h`.  
**Per-candidate:** unique constraint — skip if row exists for pair.

---

## Decision 5 — Email content & privacy (locked)

| Item | Lock |
|------|------|
| Subject | **No match name**, no score. Plain: `High compatibility match on Piza` (no emoji — deliverability) |
| Body | Nickname (or “someone”), age if available, `{score}%`, one short reason: prefer `whyTldr` if cached else `explainability.reasonShort` — **no LLM call in notify path** |
| Opener | Include **only** if `ConversationStarterCache` hit for current eval pair; **do not** generate for email |
| Photos | **None** in email v1 |
| CTA | Button → `{APP_PUBLIC_URL}/dating/me-matches/{candidateProfileId}` — label **“View profile”** (not “Message” / not conversation — may not be mutual) |
| Copy tone | **Not** “You matched with X” (reserved for mutual). Use “New high-compatibility match” |
| Unsubscribe | Existing HMAC footer via `EmailNotificationService` (global email off) + text link to profile notification settings (`/profile?tab=settings#notifications` or current deep-link) |
| Tracking pixels | **None** |
| Opens/clicks analytics | **Out of scope** for v1 (no pixel / no redirect tracker). Product analytics on **send/skip only** |

Reuse emerald/zinc in HTML accents if any; **not** story’s indigo.

---

## Decision 6 — Service layout (locked)

Mirror mutual-match pattern:

```text
dating-api/src/notifications/
  high-priority-match-email.service.ts
  high-priority-match-email.service.spec.ts
```

- Inject into rebuild path (module already has notifications).  
- Pure helpers OK for “pick candidate / build bodies”.  
- ErrorCodes: `EMAIL_HIGH_PRIORITY_MATCH_SEND_OK` / `_FAILED` / skip codes as needed.  
- Product analytics: e.g. `notification.high_priority_match_email_sent` / `..._skipped` with `reason`: `prefs_off` | `global_email_off` | `frequency` | `already_notified` | `no_candidate`.

**Do not** change mutual-match or message email behavior.

---

## Decision 7 — Prefs UI (locked)

| Item | Lock |
|------|------|
| New `/settings/notifications` page | **Reject for v1** |
| Extend existing `NotificationPreferencesSection` | **Lock** — third toggle: “High-priority match emails” |
| PATCH DTO | Add optional `highPriorityMatchEmailsEnabled?: boolean` |
| Auth/me user payload | Expose the new flag (same as other prefs) |
| Frequency radios / messages / mutual toggles | **Out of scope** |

i18n EN + ES + HE under `profile.notifications.*`.

---

## Decision 8 — Out of scope (Story 2)

- Push / SMS / web push  
- Daily digest / weekly summary  
- In-app notification center / toasts for HIGH  
- Email open/click tracking  
- Firing on mutual create  
- Full per-type prefs table + frequency enum  
- Photos in email  
- LLM generation for email body/opener  
- Changing HIGH threshold (85)  

---

## Acceptance mapping

| Story AC (adjusted) | How we meet it |
|---------------------|----------------|
| HIGH (≥85) new browse candidate triggers email | Decision 1–2 |
| Email: name, score, reason, optional cached opener | Decision 5 |
| Max 1 HIGH email / 24h | Decision 3–4 |
| User can disable HIGH emails | Decision 7 |
| Unsubscribe works | Existing + settings link |
| No send when disabled | Gates Decision 3 |
| Analytics send/skip | Decision 6 (opens/clicks deferred) |
| Mobile HTML | Simple HTML + text alternative like mutual email |

---

## Agent 1 checklist

1. Prisma: `User.highPriorityMatchEmailsEnabled` + `HighPriorityMatchEmailLog` + migration.  
2. Extend prefs DTO / PATCH / auth exposure + UI toggle.  
3. `HighPriorityMatchEmailService` + unit tests (gates, pick highest, no mutual hook).  
4. Wire best-effort after successful ready rebuild; load reason/opener without LLM.  
5. ErrorCodes + product analytics events.  
6. **Do not** touch ranking formula, list cache version, or mutual email copy beyond coexistence.

---

## Next

```text
--agent 1 sprint 43 story 2
```
