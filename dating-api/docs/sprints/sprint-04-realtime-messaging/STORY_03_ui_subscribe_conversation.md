# Story 3: UI subscribe on conversation route

**Sprint:** 4  
**Status:** Done  
**Depends on:** Story 2 (server emits `message.new`)

---

## Why

The server now pushes `message.new`. The conversation UI must consume that push and stop polling. This is the story that actually replaces the 3s interval with real-time delivery.

---

## What

**As a** user with a conversation open  
**I want** new messages to arrive over the live connection  
**So that** I see them near-instantly and the app stops polling

### Acceptance criteria

- [x] **Socket hook** — `useMessagingSocket` connects on mount (`ws`), disconnects on unmount
- [x] **Subscribe** — Client listens for `message.new`, filters by open `conversationId`
- [x] **Append** — `appendUniqueMessages` + near-bottom auto-scroll
- [x] **Remove polling** — 3s `after` poll gated off when flag is `ws`
- [x] **Feature flag** — `NEXT_PUBLIC_REALTIME=ws|poll`; default `poll` for rollback
- [x] **History unchanged** — Initial `GET` history + `PUT` mark-read unchanged
- [x] **No duplicates** — Self-echo deduped by message `id`
- [x] **Tests** — 38 UI tests (hook + page + flag); ws append, no poll, dedupe

### Out of scope (this story)

- Reconnect/backoff + catch-up (Story 4)
- Live list-page unread badges (Story 5)
- Reconnecting indicator (Story 4/6)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_03_ui_subscribe_conversation/agent-0-architect.md` for the client contract.

---

## Definition of done

- [x] `socket.io-client` connection on conversation mount when flag = `ws`
- [x] `message.new` for open conversation appends to thread
- [x] Auto-scroll near-bottom preserved
- [x] 3s polling disabled when flag = `ws`
- [x] Flag = `poll` reproduces Sprint 3 behavior (poll tick test)
- [x] Initial history load + mark-read unchanged
- [x] UI test: mock `message.new` → bubble appears
- [x] UI test: flag = `ws` → no 3000ms polling interval
- [x] UI test: self-sent message not duplicated by echo
- [ ] Manual smoke: two tabs near-instant — **pending user verification**

---

## Manual smoke

1. Set `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`  
2. Two tabs / accounts on the same conversation  
3. A sends → B sees it **near-instantly** (not ~3s)  
4. Network tab: no repeating `GET .../messages?after=` every 3s  
5. A's own message shows exactly once (no duplicate from echo)  
6. Flip to `NEXT_PUBLIC_REALTIME=poll` → Sprint 3 polling behavior returns

---

## Shipped notes

- **`getRealtimeMode()`** — default `poll`; set `NEXT_PUBLIC_REALTIME=ws` for realtime.
- **`useMessagingSocket`** — `message.new` handler with `conversationId` filter.
- **`page.tsx`** — `handleMessageNew` + gated poll effect (`realtimeMode === 'poll'`).
- **Tests:** `realtime-mode.spec.ts` (3), `use-messaging-socket.spec.ts` (4), `page.spec.tsx` (+6 ws/poll cases).
- **Core realtime path complete** (Stories 1–3); reconnect/catch-up is Story 4.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Reconnect + catch-up | Story 4 |
| Reconnecting indicator | Story 4 |
| Live unread badges on list | Story 5 |
| Remove flag + delete poll code | post-rollout cleanup |
| Browser manual smoke | user verification |
