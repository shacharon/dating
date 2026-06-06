# Handoff: Agent 1 — Senior dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_notification_preferences.md](../../STORY_03_notification_preferences.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Shipped **separate notification preferences** — `inAppNotificationsEnabled` + existing `emailNotificationsEnabled` on `User`.
- **`GET /api/v1/auth/me`** exposes both flags; **`PATCH /api/v1/me/notification-preferences`** updates either/both independently.
- **Profile UI** — “Notifications” card with two toggles (i18n en/es); saves via PATCH then `auth.refresh()`.
- **In-app wiring** — replaced `isInAppNotificationsEnabled()` stub; auth context syncs cache; toast + nav optimistic bump respect pref; unread badges from API unchanged.
- Email path + unsubscribe **unchanged** (email flag only).
- **API 28/28** story tests pass; **UI 28/28** story scope tests pass.

---

## Artifacts

### dating-api

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `inAppNotificationsEnabled` on `User` |
| `dating-api/prisma/migrations/20260606120000_user_in_app_notifications_enabled/migration.sql` | created |
| `dating-api/src/auth/auth.dto.ts` | both flags on `AuthMeResponseDto` |
| `dating-api/src/me-profile/dto/patch-notification-preferences.dto.ts` | created |
| `dating-api/src/me-profile/dto/notification-preferences-response.dto.ts` | created |
| `dating-api/src/users/users.service.ts` | `updateNotificationPreferences` |
| `dating-api/src/me-profile/me-profile.controller.ts` | `PATCH notification-preferences` |
| `dating-api/src/auth/auth-http.integration.spec.ts` | `auth/me` + login body flags |
| `dating-api/src/me-profile/me-notification-preferences-http.integration.spec.ts` | created — 5 tests |
| `dating-api/src/users/users.service.spec.ts` | +1 prefs test |
| `dating-api/src/notifications/email-unsubscribe-http.integration.spec.ts` | assert in-app flag untouched |

### dating-ui

| Path | Change |
|------|--------|
| `dating-ui/src/lib/auth/types.ts` | both flags on `AuthUser` |
| `dating-ui/src/lib/auth/auth-api.ts` | parse both flags |
| `dating-ui/src/lib/notification-preferences-api.ts` | created |
| `dating-ui/src/lib/message-in-app-notify.ts` | cache + `shouldShowInAppAlert` |
| `dating-ui/src/contexts/auth-context.tsx` | sync in-app pref on user changes |
| `dating-ui/src/components/notification-preferences-section.tsx` | created |
| `dating-ui/src/app/dating/profile/page.tsx` | mount notifications section (all states) |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `profile.notifications.*` |
| `dating-ui/src/lib/message-in-app-notify.spec.ts` | pref-off tests |
| `dating-ui/src/components/messaging-shell-provider.spec.tsx` | +1 in-app off test |
| `dating-ui/src/components/notification-preferences-section.spec.tsx` | created — 2 tests |
| `dating-ui/src/lib/auth/auth-api.spec.ts` | +1 parse flags test |
| `dating-ui/src/lib/notification-preferences-api.spec.ts` | created — 1 test |

---

## Decisions (do not reverse without discussion)

- Followed architect: dedicated PATCH endpoint (not profile PATCH); proactive alerts gated; list row live bump not gated.
- `shouldShowInAppAlert` shared by toast + nav bump; list page keeps inline peer/active checks.
- `toAuthMeResponseDto` uses `?? true` for flags when mock/partial user rows omit them.
- Notifications section visible whenever authenticated on profile page (including loading / no-draft).

---

## Tests / verification

- [x] API:
  ```bash
  cd dating-api
  npm test -- src/auth/auth-http.integration.spec.ts \
    src/me-profile/me-notification-preferences-http.integration.spec.ts \
    src/notifications/email-unsubscribe-http.integration.spec.ts \
    src/users/users.service.spec.ts
  ```
  → **28/28 pass**
- [x] UI story scope:
  ```bash
  cd dating-ui
  npm test -- src/lib/message-in-app-notify.spec.ts \
    src/components/messaging-shell-provider.spec.tsx \
    src/components/notification-preferences-section.spec.tsx \
    src/lib/auth/auth-api.spec.ts \
    src/lib/notification-preferences-api.spec.ts
  ```
  → **28/28 pass**
- [ ] Manual smoke — **pending operator**

### How to manual smoke

1. Run migration: `cd dating-api && npx prisma migrate deploy`
2. Restart API + UI.
3. `/dating/profile` → toggle “Show in-app alerts” off → peer message while on matches: **no toast**, nav optimistic bump off; badges still show after visiting conversations list.
4. Toggle “Email me when I'm away” off → still get toasts when online.
5. Unsubscribe link → email off only; in-app toggle unchanged.

---

## Open questions / blockers

- Apply migration on operator DB before smoke (`20260606120000_user_in_app_notifications_enabled`).
- One flaky poll-interval assertion in `[id]/page.spec.tsx` under full-suite parallel run — passes in isolation (pre-existing).

---

## Next agent

```text
--agent 2 sprint 8 story 3
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — channel independence, unsubscribe regression, in-app vs read-state split.
- Run story test targets above; optional full-suite gate.
- Verify `emailNotificationsEnabled` still gates email services only.
