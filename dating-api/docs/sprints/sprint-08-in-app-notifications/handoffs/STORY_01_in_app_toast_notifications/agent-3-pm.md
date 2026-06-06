# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [STORY_01_in_app_toast_notifications.md](../../STORY_01_in_app_toast_notifications.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 1 closed as Done (engineering gate)** — global in-app message toast shipped via `MessageToastProvider` in `AuthenticatedAppShell`; reuses `message.new` WS; no API/email changes.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 8 progress: 1/3** — next: Story 2 (nav unread indicator).
- **Manual two-browser smoke** remains **operator-owned** — requires `NEXT_PUBLIC_REALTIME=ws` and two logged-in accounts.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| No API / DB changes | Done | UI-only per agent-0/1/2 |
| Global WS listener in app shell | Done | `message-toast-provider.tsx` + `authenticated-app-shell.tsx` |
| Toast UI (custom, i18n) | Done | `message-toast.tsx`, `en.ts` / `es.ts` |
| Skip rules (self, active thread, pref stub) | Done | `message-in-app-notify.ts` |
| Label cache + Someone fallback | Done | `message-toast-labels.ts` |
| No email side effects | Done | CR verified — no notification imports |
| Tests passing (story scope) | Done | **15/15** (see agent-2-cr.md) |
| Manual smoke | Pending operator | Steps in story file |

---

## Acceptance criteria

**8 / 8** engineering AC met. `inAppNotificationsEnabled === false` skip is **stubbed true** until Story 3 (documented waiver).

Manual smoke step 5 (offline → email only) depends on Sprint 6 Resend config — operator smoke when domain ready.

---

## Sprint 8 progress

| # | Story | Status |
|---|--------|--------|
| 1 | In-app toast on new message | **Done** (manual smoke pending operator) |
| 2 | Nav unread indicator | Not started |
| 3 | Notification preferences | Not started |

---

## Artifacts

| Path | Change |
|------|--------|
| `STORY_01_in_app_toast_notifications.md` | Status Done, shipped notes |
| `README.md` (sprint-08) | 1/3 in progress |
| `handoffs/STORY_01_in_app_toast_notifications/agent-3-pm.md` | this file |

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Provider | `MessageToastProvider` — shell-level `message.new` listener |
| Toast | Custom bottom-right toast; 5s auto-dismiss; click → conversation |
| Skip | `shouldShowMessageToast` — self, active thread, pref stub |
| Labels | Conversations cache warm + `"Someone"` fallback |
| i18n | `notifications.messageToast*` (en/es) |
| Tests | 15 unit/component tests |

Handoffs: `handoffs/STORY_01_in_app_toast_notifications/agent-*.md`

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; two-browser manual smoke is operator waiver (same as Sprint 4 Story 5 / Sprint 6 Story 1).
- Third socket in app shell accepted; shared `MessagingSocketProvider` deferred.
- `isInAppNotificationsEnabled()` real wiring deferred to **Story 3**.

---

## Tests / verification

- [x] Story suite — **15/15** pass
- [ ] Manual smoke — pending operator

---

## Operator manual smoke

1. Set `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`; restart UI + API.
2. Users A and B — mutual match with conversation.
3. B on `/dating/me-matches`; A sends message → B sees toast within ~1s.
4. Click toast → `/dating/conversations/{id}`.
5. B opens thread; A sends again → **no** toast.
6. Optional: B closes tab; A sends → email only (needs Resend env).

---

## Open questions / blockers

- None blocking Story 2.

---

## Next work

```text
--agent 0 sprint 8 story 2
```

**Notes:** Nav unread dot on “Conversations” link — sum `unreadCount`, live bump via same `message.new`. See `STORY_02_nav_unread_indicator.md`.
