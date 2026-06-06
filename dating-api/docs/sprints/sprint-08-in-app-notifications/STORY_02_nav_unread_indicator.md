# Story 2: Nav unread indicator

**Sprint:** 8  
**Status:** Planned  
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

- [ ] **Nav badge** — show indicator on “Conversations” link when total unread > 0
- [ ] **Count source** — sum `unreadCount` from `GET /api/v1/me/conversations` (authoritative)
- [ ] **Live update** — increment optimistically on `message.new` (peer only); decrement / reconcile on mark-read + refetch
- [ ] **Display** — dot for any unread, or numeric pill if total ≤ 99 (pick one in impl; document in handoff)
- [ ] **Accessible** — `aria-label` with unread total
- [ ] **No email coupling** — indicator reflects DB unread state only
- [ ] **Tests** — nav shows/hides badge; updates on WS event; reconciles after read

### Out of scope (this story)

- Toasts (Story 1)
- Email preferences
- Unread on other nav items (matches, etc.)

---

## Technical notes

- Fetch conversations summary on app shell mount (lightweight: list endpoint already exists).
- Share unread total state via small context or hook used by shell + conversations pages.
- Reuse `conversation-list-unread` helpers where possible.

---

## Definition of done

- [ ] Nav dot/count visible when `sum(unreadCount) > 0`
- [ ] Clears when all conversations read
- [ ] Live bump when peer message arrives on non-conversation pages
- [ ] Tests pass

---

## Manual smoke

1. B has 2 unread across conversations → nav shows indicator on all `/dating/*` pages.
2. B opens and reads one thread → indicator updates.
3. A sends while B on profile → indicator increments without refresh.
