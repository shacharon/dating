# Story 3: Notification preferences (separate toggles)

**Sprint:** 8  
**Status:** Planned  
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

- [ ] **Schema** — `User.inAppNotificationsEnabled Boolean @default(true)` (migration)
- [ ] **API** — expose both flags on `GET /api/v1/auth/me` and `PATCH` profile (or dedicated `PATCH /api/v1/me/notification-preferences`)
- [ ] **UI** — profile section with two toggles:
  - “Email me when I'm away” → `emailNotificationsEnabled`
  - “Show in-app alerts” → `inAppNotificationsEnabled`
- [ ] **Email path** — unchanged Sprint 6 logic; respects `emailNotificationsEnabled` only
- [ ] **In-app path** — Story 1 toast + optional future channels respect `inAppNotificationsEnabled` only
- [ ] **Unsubscribe link** — still sets `emailNotificationsEnabled = false` only; does not touch in-app flag
- [ ] **Tests** — API read/write; toast skipped when in-app off; email skipped when email off

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
inAppNotificationsEnabled   → WS toast + (future) in-app surfaces
```

**Not** a single `notificationsEnabled` — product requires independence.

Default both `true` for new users.

---

## Definition of done

- [ ] Migration applied
- [ ] Profile UI shows both toggles with clear copy
- [ ] Disabling email does not affect toasts
- [ ] Disabling in-app does not affect email
- [ ] Tests cover both flags independently

---

## Manual smoke

1. Disable in-app only → still receive email when offline.
2. Disable email only → still see toasts when online.
3. Disable both → badges still show unread (read-state is not a “notification” pref); no toast, no email.
4. Unsubscribe link → email off, in-app unchanged.
