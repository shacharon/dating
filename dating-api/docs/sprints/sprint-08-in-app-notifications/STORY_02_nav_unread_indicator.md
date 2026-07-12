# Story 2: Nav unread indicator

**Sprint:** 8  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** Sprint 3 Story 5 (`unreadCount` on list API)

---

## Why

Sprint 4 Story 5 deferred a **nav-wide** unread dot. Users need a single glance indicator on “Conversations” in the main nav, not only per-row badges on the list page.

---

## What

**As a** user with unread messages  
**I want** a dot or count on the Conversations nav link  
**So that** I know I have new messages from any screen

### Acceptance criteria

- [x] **Nav badge** — show indicator on “Conversations” link when total unread > 0
- [x] **Count source** — sum `unreadCount` from `GET /api/v1/me/conversations` (authoritative)
- [x] **Live update** — increment optimistically on `message.new` (peer only); decrement / reconcile on mark-read + refetch
- [x] **Display** — **numeric emerald pill** (matches list row badge); cap **99+** (documented in handoff)
- [x] **Accessible** — `aria-label` with unread total (i18n en/es)
- [x] **No email coupling** — indicator reflects DB unread state only
- [x] **Tests** — nav shows/hides badge; updates on WS event; reconciles after read

### Out of scope (this story)

- Toasts (Story 1)
- Email preferences
- Unread on other nav items (matches, etc.)

---

## Technical notes

- Fetch conversations summary on app shell mount (lightweight: list endpoint already exists).
- Share unread total state via small context or hook used by shell + conversations pages.
- Reuse `conversation-list-unread` helpers where possible.

**Display choice (locked):** numeric pill, not dot-only — visual consistency with per-row `conversation-unread-badge`.

---

## Definition of done

- [x] Nav dot/count visible when `sum(unreadCount) > 0`
- [x] Clears when all conversations read
- [x] Live bump when peer message arrives on non-conversation pages
- [x] Unit/integration tests for badge + reconcile
- [ ] Manual smoke: B on profile, A sends → nav increments; open thread → clears

---

## Manual smoke

1. B has 2 unread across conversations → nav shows indicator on all `/dating/*` pages.
2. B opens and reads one thread → indicator updates.
3. A sends while B on profile → indicator increments without refresh.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Provider | `MessagingShellProvider` — consolidated toast + nav unread (replaces `MessageToastProvider`) |
| Context | `ConversationUnreadProvider` — `totalUnread`, `refresh`, `reconcileFromList`, `bumpFromMessage` |
| Nav badge | Emerald numeric pill on “Conversations”; cap **99+**; i18n `aria-label` |
| Bump rules | `shouldBumpUnreadForMessage` — same skip rules as toast (self, active thread, pref stub) |
| Reconcile | Shell mount + visibility; list `load()`; detail mark-read `refresh()` |
| Tests | 75 story/regression unit/component tests; full UI suite 192/192 |

Handoffs: `handoffs/STORY_02_nav_unread_indicator/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Manual two-browser smoke | Operator |
| Real `inAppNotificationsEnabled` (nav bump off when pref false) | Story 3 |
| Consolidate list inline bump with `shouldBumpUnreadForMessage` | Optional cleanup |
