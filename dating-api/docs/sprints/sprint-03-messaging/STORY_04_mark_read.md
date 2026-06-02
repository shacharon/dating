# Story 4: Mark messages as read

**Sprint:** 3  
**Status:** Done  
**Depends on:** Story 2 (message history must exist)

---

## Why

The system needs to track when users have read messages to calculate unread counts and provide read status feedback.

---

## What

**As a** user viewing a conversation  
**I want** the system to mark messages as read  
**So that** unread counts are accurate

### Acceptance criteria

- [x] **Read tracking** — Store when each user last viewed a conversation
- [x] **API endpoint** — `PUT /api/v1/me/conversations/:id/read` updates `lastReadAt` timestamp
- [x] **Auto-call** — UI calls this endpoint when conversation detail mounts or becomes visible
- [x] **Data model** — Extend `MutualMatch` with `user1LastReadAt`, `user2LastReadAt` (or separate table)
- [x] **Current timestamp** — Set `lastReadAt = now()` for session user
- [x] **Idempotent** — Multiple calls update timestamp (no error)
- [x] **Auth** — 401 without session; 403 if user not part of conversation
- [x] **Tests** — API updates lastReadAt, affects unread count calculation

### Out of scope (this story)

- Per-message read receipts (double checkmarks)
- Read status visible to sender
- Typing indicators
- List `unreadCount` badge (Story 5)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_04_mark_read/agent-0-architect.md` for API contract and UI debounce rules.

---

## Definition of done

- [x] Schema updated: add `user1LastReadAt`, `user2LastReadAt` to `MutualMatch`
- [x] Migration `20260601100000_add_mutual_match_read_tracking` created
- [x] API endpoint `PUT /api/v1/me/conversations/:id/read` implemented
- [x] Updates correct user's `lastReadAt` timestamp
- [x] UI calls endpoint on conversation mount + visibility change (5s debounce on visibility)
- [x] Integration test: PUT read → timestamp updated
- [x] Integration test: affects unread count calculation (count 3 → 0 after PUT)
- [ ] Manual smoke: open conversation, verify `lastReadAt` in DB — **pending user verification**

---

## Manual smoke

1. User A sends 3 messages to User B  
2. User B opens conversation  
3. Query DB: `SELECT user2LastReadAt FROM MutualMatch WHERE id = '...'`  
4. Expect: timestamp ≈ current time  
5. User B switches tab away (hidden), then back (visible)  
6. Check network tab: `PUT .../read` called again (after 5s debounce)  
7. DB timestamp updated to new value  

---

## Shipped notes

- **Migration:** `user1LastReadAt`, `user2LastReadAt` on `MutualMatch`.
- **PUT** `.../read` → 200 `{ lastReadAt: "<ISO>" }`; server `now()` only.
- **GET detail** returns session user's `lastReadAt` (`string | null`).
- **`countUnreadForParticipant()`** ready for Story 5; list still returns `unreadCount: 0`.
- **UI:** `markConversationAsRead()` after shell load + `visibilitychange` (5s debounce); errors silent.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| List unread badges | Story 5 |
| Mark read on poll while viewing | out of scope |
| Per-message read receipts | future |
