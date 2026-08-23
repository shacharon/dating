# Story 01 — Push Notifications Frontend

**Sprint:** FE-06  
**Effort:** ~12–16 hours  
**Risk:** 🟡 MEDIUM (Capacitor plugin + Firebase ops + auth wiring)  
**Status:** Done  
**GO_LIVE:** Frontend #4  
**Depends on:** FE-05 Done (`feature/fe-sprint-05-story-4`); Sprint 67 Story 1 (`feature/sprint-67-story-1`)

**Handoffs:** [preflight](./handoffs/STORY_01_push_notifications/agent--1-preflight.md) · [architect](./handoffs/STORY_01_push_notifications/agent-0-architect.md) · [dev](./handoffs/STORY_01_push_notifications/agent-1-dev.md) · [CR](./handoffs/STORY_01_push_notifications/agent-2-cr.md) · [security](./handoffs/STORY_01_push_notifications/agent-2.5-security.md) · [PM](./handoffs/STORY_01_push_notifications/agent-3-pm.md)

---

## Objective

Register Capacitor Android FCM tokens with the backend and handle notification taps so users receive **message** and **mutual match** pushes when backgrounded.

**Deliverable:** Device token API client + Capacitor push registration lifecycle (login/register, logout/unregister, tap → route).

---

## Problem (before)

```text
Sprint 67 backend     → POST/DELETE /api/v1/me/devices + FCM dispatch
dating-ui             → no @capacitor/push-notifications
Capacitor WebView     → no token registration; taps N/A
google-services.json  → missing (Gradle skips FCM plugin)
```

---

## Solution

- **`@capacitor/push-notifications@7.0.7`** — Capacitor 7 aligned
- **`device-tokens-api.ts`** — `registerDeviceToken` / `unregisterDeviceToken` via `authenticatedFetch`
- **`capacitor-push.ts`** — Capacitor-only wrapper (permissions, listeners, dynamic import)
- **`push-notification-routing.ts`** — map FCM `data` → in-app path
- **`PushNotificationsRegistration`** — mounted in authenticated shell
- **Logout hook** — unregister last token before session clear
- **`.env.example`** — Firebase / `google-services.json` ops note

---

## Backend FCM data contract (Sprint 67.1)

| `data.type` | `data.conversationId` meaning | Route |
|-------------|------------------------------|-------|
| `new_message` | Conversation (mutual match) id | `/dating/conversations/{id}` |
| `mutual_match` | Mutual match id (field name legacy) | `/dating/me-matches/{id}` |

---

## Out of scope (Story 1)

- Web Push / VAPID
- iOS / `@capacitor/ios`
- Custom foreground notification UI
- `themeColor` / StatusBar plugin
- Committing `google-services.json` or FCM server keys
- Backend changes
- Physical device receive E2E (Agent 3.5; needs Firebase config)

---

## Success criteria

- [x] `@capacitor/push-notifications` installed; `cap sync android` succeeds
- [x] Capacitor + authenticated → token POSTed to `/api/v1/me/devices` with `platform: 'android'`
- [x] Logout → DELETE token (best-effort)
- [x] Token refresh re-registers (upsert via registration listener)
- [x] Notification tap routes per `data.type`
- [x] Web / non-Capacitor → no-op
- [x] Unit tests: API client + routing + Capacitor guard (18 story-scoped)
- [x] Full Vitest green; Agent 2 CR + Agent 2.5 approved

---

## How to run (native dev)

```bash
# Terminal 1 — API from Sprint 67.1 branch
cd dating-api
git checkout feature/sprint-67-story-1
npm run start:dev

# Terminal 2 — UI
cd dating-ui
git checkout feature/fe-sprint-06-story-1
# Place google-services.json at android/app/google-services.json (ops)
cross-env NEXT_PUBLIC_API_URL=http://10.0.2.2:3001 npm run build:capacitor
npm run cap:sync:android
npm run cap:open:android
```

Sign in → accept notification permission → verify token in API DB / logs.

---

## Files changed

**New:**
- `src/lib/push/push-notification-routing.ts` + spec
- `src/lib/push/device-tokens-api.ts` + spec
- `src/lib/push/capacitor-push.ts` + spec
- `src/components/push-notifications-registration.tsx` + spec

**Modified:**
- `src/components/authenticated-app-shell.tsx` — mount registration
- `src/contexts/auth-context.tsx` — logout unregister
- `src/lib/observability/ui-error-codes.ts` — `UI_PUSH_REGISTER`
- `package.json` / `package-lock.json` — push plugin
- `.env.example` — Firebase note

---

## Known limitations

- Real FCM on device requires ops `google-services.json` + backend `PUSH_PROVIDER=fcm`
- Backend / FE-05 not on `main` — branch-stack workflow
- Lock-screen PII in FCM body (backend/product)
- `/me/devices` HTTP rate limit deferred (Sprint 67 residual)

---

## Branch

`feature/fe-sprint-06-story-1` from `feature/fe-sprint-05-story-4` (`7881a4d`) — ready for PR/merge; stack Story 2 from tip
