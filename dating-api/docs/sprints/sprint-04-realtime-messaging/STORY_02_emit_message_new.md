# Story 2: Emit message.new on send

**Sprint:** 4  
**Status:** Done  
**Depends on:** Story 1 (authenticated gateway + user rooms)

---

## Why

The authenticated channel exists; now the server must actually push new messages. When a message is persisted via the existing REST `POST`, both participants' sockets should receive it so the UI can append without polling.

---

## What

**As a** participant in a conversation  
**I want** the server to push a new message to both participants when it's sent  
**So that** delivery is near-instant instead of waiting for the next poll

### Acceptance criteria

- [x] **Emit after persist** — After `sendMessage()` saves the row (REST path unchanged), publish a `message.new` event
- [x] **Recipients** — Emit to both participants via `user:<userId1>` and `user:<userId2>` from `MutualMatch`
- [x] **Payload** — `MessageDto` (`id`, `conversationId`, `senderId`, `text`, `createdAt`, `status`)
- [x] **Publisher abstraction** — `RealtimePublisher.publishToUsers` (mockable; adapter-ready)
- [x] **REST contract unchanged** — `POST` still returns **201** + `MessageDto`; emit failure does not fail the request
- [x] **Order of operations** — persist → emit (never emit before commit)
- [x] **Tests** — unit (publish + failure + no-publish paths) + WS integration (both sockets receive frame)

### Out of scope (this story)

- UI consuming the event / removing polling (Story 3)
- Reconnect/catch-up (Story 4)
- Unread badge events (Story 5)
- Per-event rate limiting (Story 6)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_02_emit_message_new/agent-0-architect.md` for the event contract.

---

## Definition of done

- [x] `RealtimePublisher` injected into the send path
- [x] On successful `POST .../messages`, `message.new` emitted to both participant rooms
- [x] Payload matches `MessageDto` (includes `conversationId`)
- [x] Emit errors logged (`MESSAGING_MESSAGE_NEW_PUBLISH_FAILED`); HTTP response unchanged
- [x] Unit test: send invokes publisher with both user ids + correct payload
- [x] Unit test: publisher throw → send still resolves with `MessageDto`
- [x] Integration test: POST → recipient + sender sockets receive `message.new`
- [ ] Manual smoke: browser WS frames on send — **pending user verification**

---

## Manual smoke

1. Two accounts (A, B) mutually matched, both connected (Story 1 sockets open)  
2. A sends a message via the UI (REST `POST`)  
3. In B's dev tools → WS frames, observe a `message.new` frame with A's text and the `conversationId`  
4. Confirm A also receives the frame (echo to sender room)  
5. Confirm the `POST` response is still **201** with the `MessageDto`

---

## Shipped notes

- **`MeConversationMessagesService.sendMessage()`** — captures `match` from `assertActiveConversationParticipant`; `publishMessageNewBestEffort` after `toMessageDto`.
- **`MeProfileModule`** imports `MessagingRealtimeModule`.
- **Constant** `MESSAGING_EVENT_MESSAGE_NEW` (`'message.new'`).
- **Tests:** 22 unit/integration (`me-conversation-messages`); 15 realtime gateway tests unchanged.
- **UI unchanged** — conversation page still polls until Story 3.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| UI appends on event + removes polling | Story 3 |
| Catch-up on reconnect | Story 4 |
| Unread bump event | Story 5 |
| Redis pub/sub for multi-instance | Story 6 |
| Browser manual smoke | user verification |
