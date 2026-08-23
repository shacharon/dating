# Story 02 — Message Send Idempotency

**Sprint:** 68  
**Effort:** ~4 hours  
**Risk:** 🟡 MEDIUM (unique constraint + side-effect gate)  
**Status:** Done  
**GO_LIVE:** Backend #7

**Handoffs:** [architect](./handoffs/STORY_02_message_send_idempotency/agent-0-architect.md) · [dev](./handoffs/STORY_02_message_send_idempotency/agent-1-dev.md) · [CR](./handoffs/STORY_02_message_send_idempotency/agent-2-cr.md) · [PM](./handoffs/STORY_02_message_send_idempotency/agent-3-pm.md)

---

## Objective

Prevent duplicate message rows when clients retry `POST /api/v1/me/conversations/:id/messages` after timeout or network failure (Android duplicate bubbles).

**Deliverable:** Optional `clientMessageId` (UUID v4) with composite unique key; idempotent replay returns existing row; side effects only on first insert.

---

## Problem (before)

```typescript
// Every POST always inserted a new row — no client dedupe key
await prisma.message.create({ data: { conversationId, senderId, text } });
// Retry → second row, different server id, duplicate UI bubble
```

---

## Solution

- **`Message.clientMessageId`** nullable column + unique `(conversationId, senderId, clientMessageId)`
- **`findSentMessageByClientKey`** lookup-before-insert when `clientMessageId` present
- **`createSentMessage`** returns `{ row, created }`; P2002 race → existing row
- **`sendMessage`** early return on replay — skips moderation, rate limit, analytics, realtime, email, push
- **409** `message_idempotency_conflict` when same key, different text
- **Backward compatible:** omitting `clientMessageId` unchanged (multiple NULL keys allowed in Postgres)

---

## API (extended, backward compatible)

```http
POST /api/v1/me/conversations/:id/messages

{ "text": "Hello!", "clientMessageId": "550e8400-e29b-41d4-a716-446655440000" }
→ 201 MessageDto (first send OR idempotent retry — same body)
```

| Code | When |
|------|------|
| 201 | Created or idempotent replay |
| 400 | Empty text, invalid UUID v4, moderation fail |
| 409 | Same `clientMessageId`, different `text` |
| 429 | Rate limit (first insert only; replay skipped) |

---

## Success criteria

- [x] Optional `clientMessageId` on send request + response DTO
- [x] Unique constraint prevents duplicate rows per (conversation, sender, client key)
- [x] Idempotent replay returns same row; side effects gated to first insert
- [x] Rate limit not consumed on replay (lookup-first path)
- [x] Prisma migration committed
- [x] Unit + integration tests (96 tests in story scope)
- [x] Agent 2 CR approved

---

## Deploy note

Run migration in target env after merge:

```bash
cd dating-api
npx prisma migrate deploy
```

---

## Deferred (not blocking Done)

| Item | Notes |
|------|-------|
| Android FE sending `clientMessageId` | FE-06 follow-up |
| P2002 race path rate-limit slot | Concurrent duplicate only; typical retry hits lookup-first |
| Require `clientMessageId` on all clients | Optional by design |

---

## Files changed

**New:**
- `prisma/migrations/20260823120000_message_client_message_id/migration.sql`

**Modified:**
- `prisma/schema.prisma`
- `src/me-profile/repositories/conversation.repository.types.ts`
- `src/me-profile/repositories/conversation.repository.ts`
- `src/me-profile/repositories/prisma-conversation.repository.ts`
- `src/me-profile/me-conversation-messages.dto.ts`
- `src/me-profile/me-conversations.errors.ts`
- `src/logging/error-codes.ts`
- `src/me-profile/me-conversation-messages.service.ts`
- `src/me-profile/me-profile.controller.ts`
- `src/me-profile/repositories/prisma-conversation.repository.spec.ts`
- `src/me-profile/me-conversation-messages.service.spec.ts`
- `src/me-profile/me-profile-http-conversations.integration.spec.ts`

---

## Branch

`feature/sprint-68-story-2` — ready for PR/merge
