# Story 1: In-app toast on new message

**Sprint:** 8  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** Sprint 4 Story 2 (`message.new` emit)

---

## Why

Unread badges update on the conversations list, but users on other pages (matches, profile) get **no visible signal** when a message arrives. A lightweight toast closes that gap without mixing in email or push vendors.

---

## What

**As a** logged-in user with the app open  
**I want** a brief toast when someone sends me a message  
**So that** I notice new activity even when I'm not on the conversations screen

### Acceptance criteria

- [x] **Global listener** — `AuthenticatedAppShell` (or dedicated provider) subscribes to `message.new` when realtime mode is `ws` and user is authenticated
- [x] **Toast content** — sender display name + “sent you a message”; click navigates to `/dating/conversations/{conversationId}`
- [x] **Auto-dismiss** — toast disappears after ~5s (configurable constant)
- [x] **Skip toast when:**
  - Message is from self
  - User is viewing that conversation (`conversation-focus` active id matches)
  - `inAppNotificationsEnabled === false` (Story 3; until then always show)
- [x] **No email side effect** — toast is UI-only; does not call email APIs
- [x] **Flag-aware** — no socket / no toast when realtime mode is `poll`
- [x] **Tests** — toast shown on peer message; skipped for self / active thread / disabled pref

### Out of scope (this story)

- Email send or Resend changes
- Web push / browser notifications API
- Toast for mutual match (modal already exists on like flow)
- Toast queue / notification center history
- Sound / vibration

---

## Technical notes (guidance, not prescriptive)

- Reuse `useMessagingSocket` with **no** `conversationId` filter (same pattern as conversations list).
- Toast library: pick one lightweight dep (e.g. `sonner`) or minimal custom component — match existing Tailwind style.
- Mount provider once under authenticated layout; avoid duplicate sockets per page (consider shared socket context in follow-up if needed).
- **Provider for delivery:** existing Socket.IO client — no new backend event.

### Channel separation (locked)

| Event | In-app toast | Email |
|-------|--------------|-------|
| Peer message, recipient **online** | Yes | **No** (Sprint 6 skips when WS active) |
| Peer message, recipient **offline** | No | Yes (if email enabled) |

---

## Definition of done

- [x] Toast appears on any `/dating/*` page when peer sends message
- [x] Toast suppressed when conversation is open
- [x] Click opens correct conversation
- [x] Unit/integration tests for skip rules
- [ ] Manual smoke: B on matches page, A sends → B sees toast, A does not get email for B

---

## Manual smoke

1. A and B logged in; B on `/dating/me-matches` (not conversations).
2. A sends message in mutual conversation.
3. B sees toast within 1s; click → lands in thread.
4. B already in that thread → A sends again → **no** toast.
5. B offline (close tab) → A sends → **email only**, no toast.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Provider | `MessageToastProvider` in `AuthenticatedAppShell` |
| Toast | Custom UI; i18n en/es; 5s auto-dismiss; click → conversation |
| Skip rules | `shouldShowMessageToast` — self, active thread, pref stub |
| Labels | `message-toast-labels` — cache warm + `"Someone"` fallback |
| Tests | 15 unit/component tests |

Handoffs: `handoffs/STORY_01_in_app_toast_notifications/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Manual two-browser smoke | Operator |
| Real `inAppNotificationsEnabled` | Story 3 |
| Shared socket context | Story 2 / optional hardening |
| Consolidate list skip with `shouldShowMessageToast` | Optional cleanup |
