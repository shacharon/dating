# Sprint 8: In-app notifications

**Epic:** Notification channels — complete the in-app layer without touching email  
**Duration:** ~1 week (3 stories)  
**Goal:** Toast alerts, nav unread indicator, and user-facing channel preferences. Email stays a separate offline channel (Sprint 6).  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** [Sprint 4](../sprint-04-realtime-messaging/README.md) (WS `message.new`), [Sprint 6](../sprint-06-product-quality/STORY_01_email_push_notifications.md) (email — **do not merge channels**)

---

## Quick answer: toaster vs email — **separate**

| | **In-app (toast + badges)** | **Email** |
|---|---------------------------|-----------|
| **Purpose** | Alert while user has the app open | Alert when user is away / offline |
| **Provider** | Socket.IO (own WS gateway) — no vendor | Resend (Sprint 6) |
| **Trigger** | `message.new` WS event (recipient online) | Message persisted **and** recipient has **no** active WS |
| **User preference** | `inAppNotificationsEnabled` (new, Story 3) | `emailNotificationsEnabled` (exists) |
| **DB unread indicator** | Shared source: `lastReadAt` + `unreadCount` — **not** a notification preference | Same unread math; email is independent delivery |
| **Story** | Sprint 8 Stories 1–3 | Sprint 6 Story 1 (**done**) |

**Rule:** One incoming message does **not** mean “send toast **and** email.” The server picks **at most one outbound channel** for new-message alerts:

1. Recipient **online** (WS) → in-app only (toast + badge; no email — already implemented).
2. Recipient **offline** → email only (if `emailNotificationsEnabled`; already implemented).
3. Never both for the same message.

Mutual match follows the same split: in-app modal (Sprint 2 Story 4) + email when offline (Sprint 6) — independent hooks, independent prefs.

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [In-app toast on new message](./STORY_01_in_app_toast_notifications.md) | **Done** (manual smoke pending operator) | Sprint 4 Story 2 |
| 2 | [Nav unread indicator](./STORY_02_nav_unread_indicator.md) | **Done** (manual smoke pending operator) | Sprint 3 Story 5 |
| 3 | [Notification preferences (separate toggles)](./STORY_03_notification_preferences.md) | **Done** (manual smoke pending operator) | Sprint 6 Story 1 |

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Channels | **Separate stories, separate prefs** | Toast ≠ email; user may want one without the other |
| Toast provider | **None** — react to existing `message.new` | No FCM/vendor for v1 in-app |
| Global WS listener | **App shell** (`AuthenticatedAppShell`) | Toasts on any `/dating/*` page, not only conversations |
| Skip toast when | Active conversation open, own message, `inAppNotificationsEnabled=false` | Avoid noise |
| Email changes | **Out of scope** | Sprint 6 contract frozen unless bugfix |
| Web push / SMS | **Deferred** | Future sprint |

---

## Already shipped (do not re-build)

| Capability | Sprint |
|------------|--------|
| `user1LastReadAt` / `user2LastReadAt` + `unreadCount` | 3–4 |
| Live list badge bump on `message.new` | 4 Story 5 |
| Chat bubble on `message.new` | 4 Story 2 |
| Match celebration modal | 2 Story 4 |
| Email (Resend / noop) + unsubscribe | 6 Story 1 |

---

## Deferred / future sprint

| Item | Notes |
|------|-------|
| Web Push (FCM / VAPID) | Tab closed / background — third channel |
| In-app notification center (inbox) | History of alerts |
| Per-conversation mute | |
| “You have N unread” banner on reconnect | Optional Story 1 follow-up |
| SMS | |

---

## Manual smoke (sprint-level)

1. User B online on `/dating/me-matches` → A sends message → B sees **toast** (Story 1), **no email**.
2. User B closes tab / disconnects WS → A sends message → B gets **email only** (Sprint 6), no toast.
3. Nav shows unread dot when any `unreadCount > 0` (Story 2).
4. Profile: disable in-app → no toast; disable email → no email; channels independent (Story 3).
