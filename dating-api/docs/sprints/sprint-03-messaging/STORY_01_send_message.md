# Story 1: Send a text message

**Sprint:** 3  
**Status:** Done  
**Depends on:** Sprint 2 (conversation shell must exist)

---

## Why

Users need to be able to send text messages to their matches. This is the core interaction for building connection.

---

## What

**As a** user in a conversation  
**I want** to type and send a text message  
**So that** I can communicate with my match

### Acceptance criteria

- [x] **Message input** — Text input field enabled on conversation detail page
- [x] **Send button** — Submit button to send message (or Enter key)
- [x] **API endpoint** — `POST /api/v1/me/conversations/:id/messages` with `{ text: string }`
- [x] **Validation** — Max 2000 characters (client + server)
- [x] **Empty guard** — Send button disabled when input is empty or whitespace-only
- [x] **Persistence** — Message saved to `Message` table with sender, conversation, timestamp
- [x] **Response** — API returns created message with ID, timestamp
- [x] **Immediate display** — Message appears in UI after API response (session list; no GET history until Story 2)
- [x] **Auth** — 401 without session; 403 if user not part of conversation
- [x] **Conversation validation** — 404 if conversation doesn't exist or is unmatched
- [x] **Tests** — API POST message, UI sends and displays, validation, auth

### Out of scope (this story)

- Read receipts
- Delivery status
- Media attachments
- Message editing/deletion
- Typing indicators
- Recipient seeing messages (Story 2 — GET history)
- Rate limiting (Story 6)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_01_send_message/agent-0-architect.md` for API contract and service signatures.

```prisma
model Message {
  id             String        @id @default(cuid())
  conversationId String        // MutualMatch.id
  senderId       String        // User.id
  text           String        @db.Text
  createdAt      DateTime      @default(now())
  status         MessageStatus @default(SENT)

  @@index([conversationId, createdAt])
  @@index([senderId])
}

enum MessageStatus {
  SENT
  DELETED
}
```

---

## Definition of done

- [x] Prisma schema + migration applied locally (`Message` table)
- [x] API endpoint `POST /api/v1/me/conversations/:id/messages` implemented
- [x] Validation: max 2000 chars, non-empty
- [x] Access control: session user must be conversation participant
- [x] UI: message input field + send button
- [x] UI: message appears after send (after 201 response)
- [x] Integration test: POST message → saved to DB, returned
- [x] Integration test: non-participant → 403
- [x] Integration test: empty text → 400
- [x] Integration test: 2001 chars → 400
- [x] UI test: type message, click send, message displayed
- [ ] Manual smoke: send message, see in UI, verify in DB — **pending user verification**

---

## Manual smoke

1. User A opens conversation with User B  
2. Type "Hello!" in message input  
3. Click **Send** (or press Enter)  
4. See message appear in thread  
5. Query DB: `SELECT * FROM "Message" WHERE "conversationId" = '...'`  
6. Expect: 1 row with text "Hello!", senderId = A, status = SENT  
7. Refresh page → message list empty (session-only until Story 2)  
8. User B opens same conversation → no messages yet (expected until Story 2)

---

## Shipped notes

- **`MeConversationMessagesService.sendMessage()`** — **201** + `MessageDto`; trim before persist.
- **`MeConversationsService.assertActiveConversationParticipant()`** — shared gate for send / get / unmatch.
- **`@UsePipes(MeProfileValidationPipe)`** on POST (Agent 2) — `MaxLength(2000)` + `IsNotEmpty`.
- UI: session-only bubbles (right-aligned); Enter send / Shift+Enter newline; char counter.
- **35 automated tests** for Story 1 (7 messages unit + 2 assert unit + 9 integration + 3 new UI send tests; 12 total in page spec).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| GET message history | Story 2 |
| Recipient sees messages | Story 2 |
| Polling / real-time | Story 3 |
| Rate limit 10/min | Story 6 |
| Live manual smoke | User verification |
