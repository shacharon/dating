# Story 3: Real-time message updates

**Sprint:** 3  
**Status:** Done  
**Depends on:** Story 2 (message history must be loadable)

---

## Why

Users expect to see new messages without refreshing the page. Polling provides a "real-time feel" without WebSocket complexity.

---

## What

**As a** user in an open conversation  
**I want** to see new messages automatically  
**So that** I don't have to refresh to continue the conversation

### Acceptance criteria

- [x] **Polling mechanism** — UI polls every **3 seconds** when conversation is open
- [x] **API query** — `GET /api/v1/me/conversations/:id/messages?after=<messageId>` returns messages newer than cursor
- [x] **New messages appear** — Receiver sees sender's message within ~3s (when tab visible)
- [x] **Visibility check** — Polling pauses when tab/window is hidden (`document.visibilityState`)
- [x] **Auto-scroll** — Scroll to bottom when new message arrives (near-bottom guard on poll)
- [x] **Stop on unmount** — Polling stops when user navigates away from conversation
- [x] **No duplicate messages** — Dedupe by message ID (`appendUniqueMessages`)
- [x] **Tests** — deferred to Agent 2 (see handoff note)

### Out of scope (this story)

- WebSocket (defer to future optimization)
- Typing indicators
- Online/offline status
- Message delivery status

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_03_realtime_updates/agent-0-architect.md` for `after` algorithm and polling contract.

---

## Definition of done

- [x] API supports `after` query param to fetch messages after a cursor
- [x] UI polls every 3 seconds when conversation detail is mounted
- [x] Polling pauses when tab is hidden (visibility API)
- [x] New messages append to list automatically
- [x] Auto-scroll to bottom when new message arrives (near-bottom on poll)
- [x] Polling stops on unmount
- [x] No duplicate messages in UI
- [ ] Integration test: send message, poll with `after`, receive new message — **Agent 2 pending**
- [ ] UI test: mock polling, verify new messages appear — **Agent 2 pending**
- [ ] Manual smoke: two tabs, send from one, see in other within 3s — **pending user verification**

---

## Manual smoke

1. User A opens conversation in Browser Tab 1  
2. User B opens same conversation in Browser Tab 2  
3. User A sends "Hello!" → appears immediately in Tab 1  
4. Within ~3 seconds, Tab 2 shows "Hello!"  
5. User B sends "Hi!" → appears in Tab 2, then Tab 1 within ~3s  
6. Hide Tab 1 (another tab) → polling stops (check network tab)  
7. Switch back → catch-up poll resumes  

---

## Shipped notes

- **`listMessagesAfter()`** — `after=<messageId>`; ASC; `hasMore: false`; limit cap 100.
- **`before` + `after` together** → 400.
- UI: **3000 ms** interval; `visibilitychange` catch-up; silent poll errors.
- Empty thread: no poll until `lastId` exists (first message via send or reload).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Story 3 automated tests | `--agent 2 sprint 3 story 3` |
| WebSocket | Future |
| Read / unread | Stories 4–5 |
