# Story 34.1 Backend — Message Previews on Conversation List (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 1 — Message previews (backend phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** Done (ACCEPT)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for this phase only; frontend is a **separate** waterfall after this ACCEPT.

---

## Goal

Extend `GET /api/v1/me/conversations` so each list item includes a nullable **`lastMessage`** preview. Keep existing **`unreadCount`** behavior unchanged.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Route | `GET /api/v1/me/conversations` via `MeProfileController.listConversations` |
| Service | `MeConversationsService.list()` in `dating-api/src/me-profile/me-conversations.service.ts` |
| Conversation entity | Prisma **`MutualMatch`** (not `Conversation`) |
| Messages | Prisma **`Message`** (`text`, `senderId`, `createdAt`, `status` SENT\|DELETED) |
| Unread | Already on list items; batch SQL in `me-conversations-unread-batch.ts`; uses `user1LastReadAt` / `user2LastReadAt` — **no** `Message.readAt` |
| List response | `{ conversations, nextCursor, hasMore }` — **not** `{ total }` |
| Indexes | `@@index([conversationId, createdAt])` already exists — **no schema migration required** for this story |

### AGENT_COMMANDS corrections (outdated prompt — ignore these)

- ❌ `prisma.conversation` / `Message.readAt` / `getUnreadCount` with `readAt: null`
- ❌ Separate `me-conversation-messages.controller.ts` / `list-my-conversations.dto.ts`
- ❌ Re-implementing unread from scratch
- ❌ Nesting `messages: { take: 1 }` on **all** matches before pagination (N+full-inbox cost)

---

## Locked API contract

### Add to `ConversationListItemDto`

```typescript
export interface ConversationLastMessageDto {
  text: string;
  senderId: string;
  /** ISO-8601; maps from Message.createdAt */
  sentAt: string;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
  /** Newest SENT message, or null if none */
  lastMessage: ConversationLastMessageDto | null;
}
```

### Semantics

| Case | `lastMessage` |
|------|----------------|
| ≥1 SENT message | Latest by `(createdAt DESC, id DESC)` |
| Only DELETED / no rows | `null` |
| Empty brand-new match | `null` |

- Include **own** and **peer** last messages (preview is “what’s the latest line”, not peer-only).
- Do **not** change `unreadCount`, cursor encoding, or sort order (`unreadCount` DESC, `matchedAt` DESC, `id` ASC).
- Truncation for UI (60 chars, “You:”) is **frontend Story 34.1** — API returns full `text` (DB already Text; keep as stored).

---

## Locked implementation approach

1. Keep existing `list()` flow: load ACTIVE matches → batch unread → sort → **paginate** → hydrate profiles for page.
2. **After pagination**, batch-fetch last SENT message for **page conversation IDs only** (≤ `limit`, max 50).
3. New helper (mirror unread batch style):  
   `dating-api/src/me-profile/me-conversations-last-message-batch.ts`  
   - Preferred: one (or chunked) `$queryRaw` with `DISTINCT ON ("conversationId")` … `WHERE status = 'SENT' ORDER BY "conversationId", "createdAt" DESC, "id" DESC`  
   - Acceptable fallback: `Promise.all` of `message.findFirst` per id on the page only (max 50) if raw SQL is painful — document choice in Agent 1 handoff.
4. Map into `lastMessage: { text, senderId, sentAt: createdAt.toISOString() }`.
5. Empty map → `lastMessage: null`.

### Out of scope (this phase)

- Frontend UI / `conversations-api.ts` types (Story 34.1 **frontend** waterfall)
- Changing unread-total endpoint
- Soft-delete preview text rewriting
- New Prisma indexes / migrations (existing indexes sufficient)
- WebSocket push of list preview (optional later; list refetch already exists)

---

## Files Agent 1 should touch

| Path | Change |
|------|--------|
| `me-conversations.service.ts` | Extend DTO + attach `lastMessage` after page hydrate |
| `me-conversations-last-message-batch.ts` | **New** batch helper |
| `me-conversations-last-message-batch.spec.ts` | Unit tests for batch helper |
| `me-conversations.service.spec.ts` | List includes lastMessage / null |
| `me-profile-http.integration.spec.ts` | Assert list payload fields |

Controller route signature unchanged.

---

## Tests (required)

- Conversation with messages → `lastMessage` matches newest SENT
- Conversation with no messages → `lastMessage: null`
- DELETED-only / ignore DELETED when a SENT exists
- `unreadCount` unchanged vs current fixtures
- Batch helper: empty ids → empty map; multiple conversations → correct mapping

---

## Acceptance criteria

- [x] List items include `lastMessage: { text, senderId, sentAt } \| null`
- [x] `lastMessage` null when no SENT messages
- [x] Existing `unreadCount` semantics preserved
- [x] Last-message fetch only for **paginated page** (not full inbox include)
- [x] No `readAt` / no wrong Prisma models
- [x] Unit + integration coverage
- [x] No required schema migration

---

## Agent 3 next

```
--agent 3 sprint 34 story 1 backend
```

## Done — next phase

Backend ACCEPT complete. Start frontend waterfall:

```
--agent 0 sprint 34 story 1 frontend
```
