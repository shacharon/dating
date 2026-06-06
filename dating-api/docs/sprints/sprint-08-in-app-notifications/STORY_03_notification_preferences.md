# Story 3: Notification preferences (separate toggles)

**Sprint:** 8  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** Sprint 6 Story 1 (`emailNotificationsEnabled`), Story 1–2 (in-app channel)

---

## Why

Email opt-out exists via unsubscribe link only. In-app toasts have no user control. Channels must be **independently** configurable — disabling email must not disable toasts and vice versa.

---

## What

**As a** user  
**I want** separate settings for in-app and email notifications  
**So that** I control how I'm alerted without one channel forcing the other

### Acceptance criteria

- [x] **Schema** — `User.inAppNotificationsEnabled Boolean @default(true)` (migration)
- [x] **API** — both flags on `GET /api/v1/auth/me`; write via **`PATCH /api/v1/me/notification-preferences`**
- [x] **UI** — profile section with two toggles:
  - “Email me when I'm away” → `emailNotificationsEnabled`
  - “Show in-app alerts” → `inAppNotificationsEnabled`
- [x] **Email path** — unchanged Sprint 6 logic; respects `emailNotificationsEnabled` only
- [x] **In-app path** — toast + nav optimistic bump respect `inAppNotificationsEnabled`; unread badges from API **not** gated
- [x] **Unsubscribe link** — still sets `emailNotificationsEnabled = false` only; does not touch in-app flag
- [x] **Tests** — API read/write; toast/nav skipped when in-app off; email gated independently

### Out of scope (this story)

- Web push opt-in
- Per-conversation mute
- Marketing email preferences
- SMS

---

## Technical notes

### Two flags, two channels (locked)

```
emailNotificationsEnabled     → Resend email (offline only)
inAppNotificationsEnabled   → WS toast + nav live bump (proactive alerts)
```

**Not** a single `notificationsEnabled` — product requires independence.

Default both `true` for new users.

**Read-state vs alerts:** list row badges and nav pill from API reconcile always reflect DB `unreadCount`; only proactive alerts (toast, nav WS bump) respect `inAppNotificationsEnabled`.

---

## Definition of done

- [x] Migration created (`20260606120000_user_in_app_notifications_enabled`)
- [x] Profile UI shows both toggles with clear copy (i18n en/es)
- [x] Disabling email does not affect toasts
- [x] Disabling in-app does not affect email
- [x] Tests cover both flags independently
- [ ] Manual smoke: toggle matrix + unsubscribe regression — **pending operator**

---

## Manual smoke

1. `npx prisma migrate deploy` then restart API.
2. Disable in-app only → still receive email when offline.
3. Disable email only → still see toasts when online (`ws`).
4. Disable both → badges still show unread; no toast; no email.
5. Unsubscribe link → email off, in-app unchanged.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Schema | `User.inAppNotificationsEnabled` + migration |
| Read | `AuthMeResponseDto` — both flags on `GET /api/v1/auth/me` |
| Write | `PATCH /api/v1/me/notification-preferences` (partial body) |
| UI | `NotificationPreferencesSection` on `/dating/profile` |
| In-app wire | `shouldShowInAppAlert` + auth cache sync; toast + nav bump gated |
| Email | Unchanged Sprint 6; unsubscribe email-only |
| Tests | 31 API + 29 UI story scope; full suites 1318/1318 + 201/201 |

Handoffs: `handoffs/STORY_03_notification_preferences/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Operator migrate + manual smoke | Operator |
| Consolidate list `handleListMessageNew` with shared helper | Optional cleanup |
