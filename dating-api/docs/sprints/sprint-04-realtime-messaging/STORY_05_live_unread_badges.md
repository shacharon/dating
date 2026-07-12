# Story 5: Live unread badges on list (optional)

**Sprint:** 4  
**Status:** Done  
**Depends on:** Story 2 (server emits to participant rooms)

---

## Why

Sprint 3 Story 5 added unread badges to `/dating/conversations`, but they only refresh on mount or tab-visibility — not while the user sits on the list. With a live channel, the badge can update the moment a new message arrives, closing that known gap.

---

## What

**As a** user looking at my conversation list  
**I want** unread badges to update live when a new message arrives  
**So that** I see new activity without navigating or switching tabs

### Acceptance criteria

- [x] **Unread event** — Recipient receives Story 2 `message.new` on `user:<recipientId>` room (no new server event)
- [x] **List subscribes** — List page uses `useMessagingSocket` while mounted when `ws`
- [x] **Badge updates live** — Optimistic `unreadCount++` and unread-first re-sort without navigation
- [x] **Open conversation excluded** — `conversation-focus` skips bump for active thread id
- [x] **Consistency** — Mount + `visibilitychange` refetch replaces optimistic counts from `GET /api/v1/me/conversations`
- [x] **Flag-aware** — `poll` keeps Sprint 3 refetch-only behavior; no list socket
- [x] **Tests** — live bump, active skip, self-message skip, reconcile, poll off, util + hook coverage

### Out of scope (this story)

- Nav-wide total unread dot (still future)
- Push notifications (FCM/web push)
- Typing/presence

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_05_live_unread_badges/agent-0-architect.md`.

---

## Definition of done

- [x] Recipient receives a live signal on new message while on the list
- [x] Affected row's badge increments and re-sorts unread-first
- [x] Currently-open conversation does not increment the list badge
- [x] Authoritative refetch reconciles counts
- [x] Flag = `poll` preserves Sprint 3 behavior
- [x] UI test: event → badge increments; open-conversation excluded
- [ ] Manual smoke: sit on list, peer sends, badge bumps live — **pending user verification**

---

## Manual smoke

1. Account B on `/dating/conversations` (not opening any thread), flag = `ws`  
2. Account A sends a message to B  
3. B's badge for that conversation increments **live** and the row sorts to the top  
4. B opens the conversation → returns to list → count reconciled to 0  
5. A sends to a conversation B currently has open → list badge does not inflate

---

## Shipped notes

- **`conversation-focus.ts`** — module-level active conversation id for list exclusion.
- **`conversation-list-unread.ts`** — `incrementUnreadForConversation`, `sortConversationsUnreadFirst` (matches API sort).
- **`conversations/page.tsx`** — list `useMessagingSocket` when `ws`; peer-only handler.
- **`conversations/[id]/page.tsx`** — sets/clears active id on mount/unmount.
- **`use-messaging-socket.ts`** — optional `conversationId`; list omits filter; no catch-up without id.
- **Tests:** util 3, list page 13, hook 11 (+ detail focus 1).
- **No API changes** — reuses Story 2 emit.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Nav-wide unread total | future |
| Push notifications | future |
| Shared socket / list reconnecting UI | Story 6 (optional) |
| Hardening | Story 6 |
