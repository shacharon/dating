# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [STORY_02_nav_unread_indicator.md](../../STORY_02_nav_unread_indicator.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 2 closed as Done (engineering gate)** — nav unread pill on “Conversations” link; total from `sum(unreadCount)`; live bump via consolidated `MessagingShellProvider`; no API/email changes.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 8 progress: 2/3** — next: Story 3 (notification preferences).
- **Manual two-browser smoke** remains **operator-owned** — requires `NEXT_PUBLIC_REALTIME=ws` and two logged-in accounts.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| No API / DB changes | Done | UI-only per agent-0/1/2 |
| Nav badge when total > 0 | Done | `authenticated-app-shell.tsx` + `conversation-unread-context.tsx` |
| Authoritative count from list API | Done | `sumUnreadCounts` + `refresh()` / `reconcileFromList()` |
| Live optimistic bump on `message.new` | Done | `MessagingShellProvider` + `shouldBumpUnreadForMessage` |
| Reconcile on mark-read + refetch | Done | detail `refreshNavUnread()`; list `load()`; visibility |
| Display: numeric pill, cap 99+ | Done | Documented in story + `authenticated-app-shell.spec.tsx` |
| Accessible `aria-label` | Done | `nav.conversationsUnreadLabel` (en/es) |
| No email coupling | Done | CR verified — no notification/email imports |
| Story 1 toast preserved | Done | Migrated tests in `messaging-shell-provider.spec.tsx` |
| Tests passing (story scope) | Done | **75/75** story/regression; **192/192** full UI (agent-2-cr.md) |
| Manual smoke | Pending operator | Steps in story file |

---

## Acceptance criteria

**7 / 7** engineering AC met. `inAppNotificationsEnabled === false` skip for nav bump is **stubbed true** until Story 3 (same waiver as Story 1 toast).

**Display choice:** numeric emerald pill (not dot-only) — matches list row badge style.

---

## Sprint 8 progress

| # | Story | Status |
|---|--------|--------|
| 1 | In-app toast on new message | **Done** (manual smoke pending operator) |
| 2 | Nav unread indicator | **Done** (manual smoke pending operator) |
| 3 | Notification preferences | Not started |

---

## Artifacts

| Path | Change |
|------|--------|
| `STORY_02_nav_unread_indicator.md` | Status Done, AC/DoD checked, shipped notes |
| `README.md` (sprint-08) | 2/3 in progress |
| `handoffs/STORY_02_nav_unread_indicator/agent-3-pm.md` | this file |

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Consolidation | `MessageToastProvider` → `MessagingShellProvider` (single shell socket) |
| Context | `ConversationUnreadProvider` — shared nav total across shell + pages |
| Nav badge | Emerald numeric pill; **99+** cap; i18n `aria-label` |
| Helpers | `conversation-unread-total.ts`, `shouldBumpUnreadForMessage` |
| Reconcile | mount, visibility, list load, detail mark-read |
| Tests | 75 story/regression; full suite 192/192 |

Handoffs: `handoffs/STORY_02_nav_unread_indicator/agent-*.md`

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; two-browser manual smoke is operator waiver (same as Story 1 / Sprint 4 Story 5).
- **Numeric pill** chosen over dot-only — documented in story shipped section.
- Shell socket consolidation **completed** (Story 1 follow-up “shared socket context” partially addressed).
- `isInAppNotificationsEnabled()` real wiring deferred to **Story 3** (toast + nav bump together).

---

## Tests / verification

- [x] Story suite — **75/75** pass
- [x] Full UI suite — **192/192** pass
- [ ] Manual smoke — pending operator

---

## Operator manual smoke

1. Set `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`; restart UI + API.
2. Users A and B — mutual match; B has unread across ≥1 conversation (or A sends to create unread).
3. B on `/dating/profile` (not conversations) → nav “Conversations” shows pill with correct total.
4. B opens a thread and mark-read runs → pill clears or updates.
5. B on `/dating/me-matches`; A sends → pill increments without page refresh.
6. Combined with Story 1: same message may show **toast + nav bump** (both in-app; no email while B online).

---

## Open questions / blockers

- None blocking Story 3.

---

## Next work

```text
--agent 0 sprint 8 story 3
```

**Notes:** Story 3 wires `inAppNotificationsEnabled` and `emailNotificationsEnabled` as **separate** profile toggles; toast + nav bump must respect in-app pref off. See `STORY_03_notification_preferences.md`.
