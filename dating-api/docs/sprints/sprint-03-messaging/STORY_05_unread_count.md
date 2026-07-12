# Story 5: Show unread count

**Sprint:** 3  
**Status:** Done  
**Depends on:** Story 4 (read tracking must exist)

---

## Why

Users need to see which conversations have new messages they haven't read yet. This drives engagement and helps prioritize conversations.

---

## What

**As a** user viewing my conversation list  
**I want** to see a count of unread messages per conversation  
**So that** I know which conversations need attention

### Acceptance criteria

- [x] **Unread count** — Each conversation in list shows count of unread messages
- [x] **Calculation** — Count messages where `createdAt > user's lastReadAt` AND sender is the other user only
- [x] **API field** — `GET /api/v1/me/conversations` response includes `unreadCount` per conversation
- [x] **UI badge** — Display badge next to conversation (emerald pill with number)
- [x] **Zero handling** — No badge when `unreadCount = 0`
- [x] **Update after read** — Count clears after opening conversation (Story 4 mark-read + list refetch on return/visibility)
- [x] **Sort priority** — Unread conversations first, then `matchedAt` desc
- [x] **Tests** — Unit, integration, UI coverage (Agent 2)

### Out of scope (this story)

- Total unread across all conversations (notification dot in nav)
- Desktop/push notifications
- Unread message preview in list
- Live badge updates while staying on list without navigation (no list polling)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_05_unread_count/agent-0-architect.md` for list algorithm and UI contract.

---

## Definition of done

- [x] API calculates unread count per conversation
- [x] Response includes `unreadCount` field in conversation list
- [x] UI displays badge when `unreadCount > 0`
- [x] Badge hidden when `unreadCount = 0`
- [x] Opening conversation (marking as read) updates count to 0 on list return
- [x] Integration test: unread count 3 → PUT read → 0
- [x] Integration test: sort unread before read
- [x] UI test: renders badge, hidden at zero, visibility refetch
- [ ] Manual smoke: unread badge appears, clears after viewing — **pending user verification**

---

## Manual smoke

1. User A sends 3 messages to User B  
2. User B views `/dating/conversations` (without opening the conversation)  
3. See badge **3** next to User A's conversation  
4. User B clicks conversation → opens detail page  
5. Return to `/dating/conversations`  
6. Badge is gone (count = 0)  
7. User A sends another message  
8. User B navigates back to list or switches tab visible → badge shows **1** (refetch, not live polling)

---

## Shipped notes

- **`list()`** uses `countUnreadForMatchRow()` + shared `unreadMessageCountWhere()` (same as Story 4).
- **Sort:** `unreadCount` desc, then `matchedAt` desc.
- **UI:** `conversation-unread-badge`, `99+` cap, `aria-label`; list refetches on `visibilitychange`.
- **Null `lastReadAt`:** all peer SENT messages count as unread.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Nav total unread dot | future |
| List polling for live badges | future / WebSocket |
| Story 6 safety guardrails | Done (Story 6) |
