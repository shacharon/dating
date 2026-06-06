# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_notification_preferences.md](../../STORY_03_notification_preferences.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Prisma migration** — add `User.inAppNotificationsEnabled Boolean @default(true)` (mirrors existing `emailNotificationsEnabled`).
- **Read path** — extend `GET /api/v1/auth/me` (`AuthMeResponseDto`) with **both** flags (`emailNotificationsEnabled` already on `User`, not yet exposed to client).
- **Write path** — new **`PATCH /api/v1/me/notification-preferences`** (partial body; at least one boolean required). **Do not** use `PATCH /api/v1/me/profile` — prefs live on `User`, not `UserProfile`.
- **UI** — profile page section with **two independent toggles**; i18n en/es.
- **In-app wiring** — replace `isInAppNotificationsEnabled()` stub; toast + **nav optimistic bump** respect pref; **unread badges from API** (nav pill reconcile, list row badges) **always** reflect DB read-state.
- **Email path** — **unchanged** Sprint 6; unsubscribe sets `emailNotificationsEnabled = false` only.
- **Break Story 2 alias** — `shouldBumpUnreadForMessage` must **not** remain a full alias of `shouldShowMessageToast` once pref wiring lands (see §5).

---

## Artifacts

### dating-api

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `inAppNotificationsEnabled Boolean @default(true)` on `User` |
| `dating-api/prisma/migrations/20260606120000_user_in_app_notifications_enabled/migration.sql` | created |
| `dating-api/src/auth/auth.dto.ts` | extend `AuthMeResponseDto` + `toAuthMeResponseDto` |
| `dating-api/src/me-profile/dto/patch-notification-preferences.dto.ts` | created |
| `dating-api/src/me-profile/dto/notification-preferences-response.dto.ts` | created |
| `dating-api/src/users/users.service.ts` | `updateNotificationPreferences(userId, patch)` |
| `dating-api/src/me-profile/me-profile.controller.ts` | `PATCH notification-preferences` |
| `dating-api/src/auth/auth-http.integration.spec.ts` | `auth/me` includes both flags |
| `dating-api/src/me-profile/me-notification-preferences-http.integration.spec.ts` | created — PATCH read/write, validation, 401 |

**No changes:** `email-unsubscribe.controller.ts`, `new-message-email.service.ts`, `mutual-match-email.service.ts` logic (already gate on `emailNotificationsEnabled` only).

### dating-ui

| Path | Change |
|------|--------|
| `dating-ui/src/lib/auth/types.ts` | `emailNotificationsEnabled`, `inAppNotificationsEnabled` on `AuthUser` |
| `dating-ui/src/lib/auth/auth-api.ts` | parse both flags from `auth/me` |
| `dating-ui/src/lib/notification-preferences-api.ts` | created — `patchNotificationPreferences` |
| `dating-ui/src/lib/message-in-app-notify.ts` | replace stub; sync getter from auth |
| `dating-ui/src/contexts/auth-context.tsx` | sync in-app pref cache on `setUser` / `refresh` |
| `dating-ui/src/components/notification-preferences-section.tsx` | created — two toggles |
| `dating-ui/src/app/dating/profile/page.tsx` | mount notifications section (authenticated) |
| `dating-ui/src/lib/i18n/types.ts` | `profile.notifications.*` copy keys |
| `dating-ui/src/lib/i18n/en.ts` / `es.ts` | toggle labels + help text |
| `dating-ui/src/lib/message-in-app-notify.spec.ts` | pref-off tests (toast + nav bump) |
| `dating-ui/src/components/messaging-shell-provider.spec.tsx` | nav bump skipped when in-app off |
| `dating-ui/src/lib/notification-preferences-api.spec.ts` | created (optional) or profile section spec |

---

## Decisions (do not reverse without discussion)

### 1. Two flags on `User` — not profile, not merged

| Field | Channel | Default |
|-------|---------|---------|
| `emailNotificationsEnabled` | Resend email (offline only) | `true` |
| `inAppNotificationsEnabled` | Proactive in-app alerts | `true` |

**Rejected:** single `notificationsEnabled`, prefs on `UserProfile`, or profile PATCH for user flags.

---

### 2. API shape

**`GET /api/v1/auth/me`** — extend response (session user, every authenticated page):

```typescript
export interface AuthMeResponseDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
}
```

**`PATCH /api/v1/me/notification-preferences`** — authenticated; body partial:

```typescript
export interface PatchNotificationPreferencesDto {
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
}

export interface NotificationPreferencesResponseDto {
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
}
```

| Rule | Detail |
|------|--------|
| Validation | At least one key required; values must be booleans; reject unknown keys |
| Empty body | `400` |
| Success | `200` + full prefs DTO |
| Auth | `AuthGuard`; user id from session only |

Implementation: `UsersService.updateNotificationPreferences` → `prisma.user.update` with whitelisted fields.

Route lives on existing `MeProfileController` (`@Controller('api/v1/me')`) **before** parameterized routes — static segment `notification-preferences`.

---

### 3. Unsubscribe — email only (unchanged)

`GET /api/v1/notifications/email/unsubscribe?token=` continues:

```typescript
data: { emailNotificationsEnabled: false }
```

**Must not** set `inAppNotificationsEnabled`. Add regression assertion in existing unsubscribe integration spec if touched.

---

### 4. Email send path — no changes

Sprint 6 gates already correct:

- `new-message-email.service.ts` — `recipient.emailNotificationsEnabled`
- `mutual-match-email.service.ts` — per-user `emailNotificationsEnabled`
- WS online → no email (unchanged)

Story 3 adds **no** server-side check for `inAppNotificationsEnabled` — in-app is client-only today.

---

### 5. In-app pref scope — proactive alerts vs read-state (locked)

Story 3 manual smoke: *“Disable both → badges still show unread.”*

| Surface | `inAppNotificationsEnabled === false` |
|---------|--------------------------------------|
| Message toast | **Suppress** |
| Nav optimistic `bumpFromMessage` (WS) | **Suppress** |
| Nav pill after `refresh()` / `reconcileFromList()` | **Still show** (DB truth) |
| Conversations list row badges (API / reconcile) | **Still show** |
| List page optimistic row bump (`handleListMessageNew`) | **Still bump** (user on inbox = read-state UX, not proactive alert) |

**Mandatory:** split helpers in `message-in-app-notify.ts`:

```typescript
/** Proactive in-app alerts: toast + nav live bump */
export function shouldShowInAppAlert(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  if (!sessionUserId || msg.senderId === sessionUserId) return false;
  if (msg.conversationId === getActiveConversationId()) return false;
  if (!isInAppNotificationsEnabled()) return false;
  return true;
}

export function shouldShowMessageToast(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  return shouldShowInAppAlert(msg, sessionUserId);
}

export function shouldBumpUnreadForMessage(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  return shouldShowInAppAlert(msg, sessionUserId);
}
```

`MessagingShellProvider` continues to call `shouldShowMessageToast` + `shouldBumpUnreadForMessage` — both gated. List page keeps inline peer/active checks **without** in-app pref (out of scope unless trivial).

---

### 6. Client pref cache — wire stub

Replace stub in `message-in-app-notify.ts`:

```typescript
let cachedInAppEnabled = true;

export function setInAppNotificationsEnabledPreference(enabled: boolean): void {
  cachedInAppEnabled = enabled;
}

export function isInAppNotificationsEnabled(): boolean {
  return cachedInAppEnabled;
}
```

`AuthProvider` after every successful `setUser`:

```typescript
setInAppNotificationsEnabledPreference(user.inAppNotificationsEnabled ?? true);
```

On logout / unauthenticated: reset to `true` (inert — no shell).

After PATCH toggle: `await patchNotificationPreferences(...)` then `await auth.refresh()` so shell + cache stay in sync.

**Rejected:** reading `localStorage` for pref; server is source of truth.

---

### 7. Profile UI — notifications section

New section on `/dating/profile` — **visible whenever session is authenticated** (use `useAuth()`), even while profile draft loads or if user has no profile yet.

| Toggle | Maps to | Copy (en) |
|--------|---------|-----------|
| In-app | `inAppNotificationsEnabled` | **“Show in-app alerts”** — help: “Toast when you receive a message while the app is open.” |
| Email | `emailNotificationsEnabled` | **“Email me when I'm away”** — help: “Email when you're not online. Unsubscribe link in emails still works.” |

UX:

- Native `<input type="checkbox">` styled consistently with onboarding forms (no new npm dep).
- Optimistic UI optional; on failure revert + inline error.
- `data-testid`: `notification-pref-in-app`, `notification-pref-email`.

Place section **after page title**, before profile field sections (or after Basics — agent 1 pick; prefer **dedicated “Notifications” card before Basics**).

---

### 8. i18n

```typescript
// types.ts — profile.notifications
notificationsTitle: string;
inAppLabel: string;
inAppHelp: string;
emailLabel: string;
emailHelp: string;
saveError: string;
```

Spanish mirrors English tone in `es.ts`.

---

## Service / module signatures

```typescript
// users.service.ts
updateNotificationPreferences(
  userId: string,
  patch: PatchNotificationPreferencesDto,
): Promise<NotificationPreferencesResponseDto>;

// auth.dto.ts
export function toAuthMeResponseDto(user: User): AuthMeResponseDto;

// notification-preferences-api.ts (UI)
export async function patchNotificationPreferences(
  patch: Partial<{
    emailNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
  }>,
): Promise<NotificationPreferencesResponseDto>;

// message-in-app-notify.ts
export function setInAppNotificationsEnabledPreference(enabled: boolean): void;
export function isInAppNotificationsEnabled(): boolean;
export function shouldShowInAppAlert(msg: MessageDto, sessionUserId: string): boolean;
```

---

## Tests / verification (agent 2 scope — agent 1 smoke)

### Agent 1 manual smoke

1. Disable in-app only → still receive email when offline (Sprint 6 noop/resend).
2. Disable email only → still see toast when online (`ws`).
3. Disable both → nav/list badges still show unread counts from API; no toast; no email.
4. Unsubscribe link → email off; in-app unchanged; toast still works if in-app on.

### Agent 2 automated targets

**API:**

```bash
cd dating-api
npm test -- src/auth/auth-http.integration.spec.ts \
  src/me-profile/me-notification-preferences-http.integration.spec.ts \
  src/notifications/email-unsubscribe-http.integration.spec.ts
```

| Case | Expect |
|------|--------|
| `GET auth/me` | Both booleans present |
| `PATCH` one flag | Other flag unchanged |
| `PATCH` both | Both updated |
| `PATCH` empty body | `400` |
| `PATCH` non-boolean | `400` |
| Unsubscribe | Only `emailNotificationsEnabled` → false |

**UI:**

```bash
cd dating-ui
npm test -- src/lib/message-in-app-notify.spec.ts \
  src/components/messaging-shell-provider.spec.tsx \
  src/components/notification-preferences-section.spec.tsx
```

| Case | Expect |
|------|--------|
| `isInAppNotificationsEnabled` false | No toast |
| `isInAppNotificationsEnabled` false | Nav bump unchanged (total stays at API value) |
| `shouldBumpUnreadForMessage` peer + in-app on | +1 |
| Toggle PATCH | API called; auth refresh |
| Parse `auth/me` | Both flags on `AuthUser` |

Run full suites before handoff: `cd dating-api && npm test`, `cd dating-ui && npm test`.

---

## Migration notes (Story 1–2 → Story 3)

1. Story 1 stub `isInAppNotificationsEnabled(): true` → auth-synced cache.
2. Story 2 `shouldBumpUnreadForMessage` alias → shares `shouldShowInAppAlert` (toast + nav bump only).
3. Nav pill **visibility** from API reconcile is **not** gated by pref — manual smoke §3.
4. No changes to `MessagingShellProvider` socket count.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 8 story 3
```

**Notes for agent 1:**

1. Apply migration; extend `auth/me` before UI depends on it.
2. Implement `PATCH /api/v1/me/notification-preferences` with strict DTO validation.
3. Do **not** modify email send services beyond tests if needed.
4. Wire auth cache + replace stub; update `messaging-shell-provider` tests for pref-off nav bump.
5. Profile notifications section must work without profile draft (auth-only).
6. After toggle save, call `auth.refresh()`.
7. Unsubscribe integration spec: assert `inAppNotificationsEnabled` unchanged.
