# Story 2: Load message history

**Sprint:** 3  
**Status:** Done  
**Depends on:** Story 1 (messages must be sendable)

---

## Why

Users need to see past messages when opening a conversation. Without history, context is lost and conversation feels broken.

---

## What

**As a** user opening a conversation  
**I want** to see all previous messages  
**So that** I can follow the conversation thread

### Acceptance criteria

- [x] **API endpoint** — `GET /api/v1/me/conversations/:id/messages` returns message list
- [x] **Pagination** — Cursor-based: `?limit=50&before=<messageId>`
- [x] **Default limit** — 50 messages per request
- [x] **Sort order** — Oldest first (chronological: `createdAt ASC`)
- [x] **UI display** — Messages render in conversation detail page
- [x] **Alignment** — Sender's messages on right, other user's on left (chat bubble style)
- [x] **Timestamps** — Show relative time ("2m ago", "Yesterday") or full timestamp
- [x] **Load more** — "Load earlier messages" button at top (if more exist)
- [x] **Empty state** — "No messages yet. Say hi!" when history is empty
- [x] **Auto-scroll** — Scroll to bottom on initial load
- [x] **Auth** — 401 without session; 403 if user not part of conversation
- [x] **Tests** — API returns messages, UI renders list, pagination, empty state

### Out of scope (this story)

- Infinite scroll (manual load more for now)
- Search messages
- Message reactions
- Link/URL previews
- Live polling / `after` cursor (Story 3)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_02_message_history/agent-0-architect.md` for API contract and pagination algorithm.

---

## Definition of done

- [x] API endpoint `GET /api/v1/me/conversations/:id/messages` implemented
- [x] Cursor-based pagination with `limit` and `before` params
- [x] Messages returned in chronological order (oldest first)
- [x] UI renders message list on conversation detail page
- [x] Sender vs receiver alignment (left/right bubbles)
- [x] Timestamps displayed
- [x] "Load earlier messages" button (if `hasMore`)
- [x] Empty state: "No messages yet"
- [x] Auto-scroll to bottom on initial load
- [x] Integration test: GET messages → returns list, pagination works
- [x] UI test: renders messages, load more button, empty state
- [ ] Manual smoke: open conversation with messages, see history, load more — **pending user verification**

---

## Manual smoke

1. User A and User B exchange 5 messages  
2. User A opens conversation  
3. See all 5 messages in chronological order  
4. User A's messages on right (blue), User B's on left (gray)  
5. User B opens same conversation → sees the same 5 messages  
6. Send 50+ messages total → reopen conversation  
7. See last 50 messages + "Load earlier messages" button  
8. Click button → see earlier messages (scroll position preserved)

---

## Shipped notes

- **`MeConversationMessagesService.listMessages()`** — **200** + `MessageListDto`; message **ID** cursor for `before`.
- **`parseMessageListLimit()`** — default 50, max 100; invalid → **400**.
- UI: **`fetchConversationMessages`** on mount; **`useAuth()`** for bubble alignment; **`formatMessageTime()`**.
- Load earlier prepends without auto-scroll; send dedupes by message id.
- **47 automated tests** for Story 2 scope (10 new unit + 12 integration + 6 new UI; 17 service / 18 page spec totals include Story 1).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Polling / `after` param | Story 3 |
| Read / unread | Stories 4–5 |
| Live manual smoke | User verification |
