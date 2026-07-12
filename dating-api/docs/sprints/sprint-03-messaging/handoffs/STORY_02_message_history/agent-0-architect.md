# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_message_history.md](../../STORY_02_message_history.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **No Prisma migration** — reuse Story 1 `Message` table + `@@index([conversationId, createdAt])`.
- Add **`MeConversationMessagesService.listMessages()`** + **`GET /api/v1/me/conversations/:id/messages`** → **200** + `MessageListDto`.
- Reuse Story 1/2 **access rules** via `assertActiveConversationParticipant` (404 missing/UNMATCHED, 403 non-participant).
- **Cursor pagination:** `limit` (default 50, max 100) + optional `before=<messageId>` for loading **earlier** messages; response `hasMore` + `nextCursor` (oldest message id in page).
- **Initial load** (no `before`): latest `limit` messages, returned **oldest → newest** (chronological ASC).
- UI: fetch history on mount; **left/right bubbles** via `senderId` vs `useAuth().user.id`; timestamps; **Load earlier messages** button; auto-scroll to bottom on first load; merge POST sends without duplicates.
- **Story 3 prep:** same endpoint will gain `after=<messageId>` — **do not implement `after` in Story 2**.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A — no schema change |
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | updated — `MessageListDto`, query types |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | updated — `listMessages()` |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `GET conversations/:id/messages` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated (agent 2) |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_MESSAGES_LIST_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `fetchConversationMessages()` |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | updated — `formatMessageTime()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — history load, alignment, load more, scroll |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated (agent 2) |
| Optional | `conversation-message-bubble.tsx` — extract bubble if page grows |

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Story 1 index supports `where conversationId + orderBy createdAt`. No new columns.

### 2. Same service file — `MeConversationMessagesService`

Story 1 architect reserved `listMessages` here. Keep send + list together.

### 3. Access control — reuse `assertActiveConversationParticipant`

Same order as POST: 404 (missing / UNMATCHED) → 403 (non-participant). No new access logic.

### 4. Cursor = **message ID** (not raw timestamp)

| Param | Semantics |
|-------|-----------|
| *(none)* | Latest page: most recent `limit` messages |
| `before=<messageId>` | Messages **strictly older** than cursor row (by `createdAt`, tie-break `id`) |

**Why ID over ISO timestamp:** stable tie-breaking; Story 3 will add `after=<messageId>` on the same endpoint.

**Invalid cursor:** **400** `{ message: 'Invalid message cursor.' }` if `before` id missing, wrong conversation, or `DELETED`.

**Do not implement `after` in Story 2** — Story 3 polling adds it without breaking Story 2 clients.

### 5. Pagination algorithm

Default `limit = 50`. Clamp `1..100`; invalid `limit` → **400**.

```typescript
// Pseudocode — listMessages(sessionUserId, conversationId, { limit, before? })

await assertActiveConversationParticipant(...);

const take = limit + 1; // probe for hasMore

const whereBase = { conversationId, status: MessageStatus.SENT };

let where = whereBase;
if (before) {
  const cursor = await prisma.message.findFirst({
    where: { id: before, conversationId, status: MessageStatus.SENT },
    select: { id: true, createdAt: true },
  });
  if (!cursor) throw new BadRequestException('Invalid message cursor.');

  where = {
    ...whereBase,
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

const rows = await prisma.message.findMany({
  where,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  take,
  select: { id, conversationId, senderId, text, createdAt, status },
});

const hasMore = rows.length > limit;
if (hasMore) rows.pop();

rows.reverse(); // chronological ASC for client

const messages = rows.map(toMessageDto);
const nextCursor = hasMore && messages.length > 0 ? messages[0].id : null;

return { messages, pagination: { hasMore, nextCursor } };
```

**Empty conversation:** `{ messages: [], pagination: { hasMore: false, nextCursor: null } }` — **200**, not 404.

### 6. HTTP status mapping (GET)

| Condition | Status |
|-----------|--------|
| No session | 401 |
| Missing / UNMATCHED conversation | 404 `conversation_not_found` |
| Non-participant | 403 `conversation_forbidden` |
| Invalid `limit` or `before` cursor | 400 |
| Success | **200** + `MessageListDto` |

### 7. `MessageListDto` shape

```typescript
export interface MessageListDto {
  messages: MessageDto[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null; // message id of oldest item in this page; pass as ?before= for earlier page
  };
}
```

Reuse Story 1 `MessageDto` / `toMessageDto`. Only **`SENT`** rows returned (exclude `DELETED`).

### 8. Query params (controller)

```typescript
@Get('conversations/:id/messages')
listConversationMessages(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
  @Query('limit') limitStr?: string,
  @Query('before') before?: string,
) {
  const limit = parseLimit(limitStr); // default 50, clamp 1-100
  return this.conversationMessages.listMessages(user.id, id, { limit, before });
}
```

Parse `limit` in service or small helper; throw **400** on NaN or out of range.

No validation pipe required for optional query strings (keep simple).

### 9. Observability

Trace on success:

```typescript
ErrorCodes.ME_CONVERSATIONS_MESSAGES_LIST_OK
```

Message: `me conversations messages list conversationId=... userId=... count=... hasMore=...`

### 10. UI — replace session-only list from Story 1

**On mount** (when `id` known):

1. Load conversation detail (existing).
2. **In parallel:** `fetchConversationMessages(id)` → set `messages`, `hasMore`, `nextCursor`.

**Alignment:**

```typescript
const { user } = useAuth();
const isMine = msg.senderId === user?.id;
// mine → flex justify-end, blue bubble
// other → flex justify-start, gray bubble
```

Wrap page (or messaging section) in auth context if not already — app shell provides `AuthProvider`.

**Send merge:** after POST 201, append only if `messages.every(m => m.id !== sent.id)` (dedupe).

**Load earlier:** button at **top** of message list when `hasMore`; calls `fetchConversationMessages(id, { before: nextCursor })`; **prepend** returned messages; update `hasMore` / `nextCursor` from response. Disable button while loading.

**Do not auto-scroll** when prepending earlier messages (preserve scroll position). **Do auto-scroll** on initial load and after send.

**Auto-scroll implementation:**

```typescript
const listRef = useRef<HTMLDivElement>(null);
// after initial messages load OR after send:
listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); // or 'auto' for tests
```

Use `behavior: 'auto'` if smooth causes flaky tests.

**Empty state:** show when `messages.length === 0 && !messagesLoading` — keep copy **"No messages yet. Say hi!"**

**Timestamps:** add `formatMessageTime(iso: string)` in `conversation-display.ts`:

| Age | Display |
|-----|---------|
| &lt; 1 min | `Just now` |
| &lt; 60 min | `Nm ago` |
| Today | locale time (e.g. `3:42 PM`) |
| Yesterday | `Yesterday 3:42 PM` |
| Older | locale date + time (medium) |

Small muted text under or inside bubble; `data-testid="conversation-message-time"`.

**Loading:** optional `messagesLoading` spinner in thread area; errors inline (`conversation-messages-error`).

### 11. No polling in Story 2

Recipient still needs to **reopen conversation** to see new messages until Story 3. Document in manual smoke.

### 12. Char counter / composer

Unchanged from Story 1. Composer stays at bottom.

---

## Prisma schema

**No changes.** Reference query uses existing `Message` model and index.

---

## Migration plan

None.

---

## API contract

### `GET /api/v1/me/conversations/:id/messages`

**Auth:** session cookie (`AuthGuard`).

**Params:** `id` = `MutualMatch.id`.

**Query:**

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `limit` | no | `50` | Page size (1–100) |
| `before` | no | — | Message id; return older messages |

**Response 200:**

```json
{
  "messages": [
    {
      "id": "msg_1",
      "conversationId": "mutual_row_1",
      "senderId": "user_a",
      "text": "Hello!",
      "createdAt": "2026-05-31T16:00:00.000Z",
      "status": "SENT"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "msg_1"
  }
}
```

**Response 400** — invalid `limit` or `before` cursor.

**Response 404 / 403** — same bodies as GET conversation detail.

**Not in Story 2:** `after` query param (Story 3).

---

## Service signatures

### `MeConversationMessagesService`

```typescript
async listMessages(
  sessionUserId: string,
  conversationId: string,
  options: { limit: number; before?: string },
): Promise<MessageListDto>;
```

Existing `sendMessage()` unchanged.

---

## Controller

```typescript
@Get('conversations/:id/messages')
listConversationMessages(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
  @Query('limit') limitStr?: string,
  @Query('before') before?: string,
) {
  return this.conversationMessages.listMessages(user.id, id, {
    limit: parseMessageListLimit(limitStr),
    before: before?.trim() || undefined,
  });
}
```

Register route on `MeProfileController` (module already has messages service).

**Route order:** `GET conversations/:id/messages` and `POST` same path — no conflict with `GET conversations/:id` (different path segment).

---

## UI contract

### `conversations-api.ts`

```typescript
export interface MessageListDto {
  messages: MessageDto[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export async function fetchConversationMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
): Promise<MessageListDto>;
```

Build query string: `?limit=50&before=msg_id`. Mirror 404/403 error messages like other conversation helpers.

### `conversations/[id]/page.tsx`

**New state:**

```typescript
const [messagesLoading, setMessagesLoading] = useState(true);
const [messagesError, setMessagesError] = useState<string | null>(null);
const [hasMore, setHasMore] = useState(false);
const [nextCursor, setNextCursor] = useState<string | null>(null);
const [loadingEarlier, setLoadingEarlier] = useState(false);
const listRef = useRef<HTMLDivElement>(null);
const { user } = useAuth();
```

**Effects:**

- Fetch messages when `id` changes.
- Scroll to bottom once after first successful load (`messagesLoading` false, messages non-empty).

**Load earlier handler:** prepend; update pagination from response.

Optional extract: `ConversationMessageBubble` with props `{ message, isMine }`.

---

## Test plan (for Agent 2)

### Unit — `me-conversation-messages.service.spec.ts`

| Case | Expected |
|------|----------|
| ACTIVE participant, no `before` | latest page, ASC order, `hasMore` correct |
| `before` valid cursor | older page only |
| `before` invalid / wrong conversation | `BadRequestException` |
| Empty history | `{ messages: [], hasMore: false }` |
| `hasMore=true` | `nextCursor` = oldest message id in page |
| Only `SENT` rows | query filters `DELETED` out |
| Missing conversation | `NotFoundException` (via assert) |
| Non-participant | `ForbiddenException` |
| Invalid limit | `BadRequestException` |

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 2: GET /api/v1/me/conversations/:id/messages`**

| Case | Expected |
|------|----------|
| 401 no session | 401 |
| ACTIVE participant, messages exist | 200, shape, chronological ASC |
| Empty history | 200, empty array |
| `before` returns earlier page | 200, `hasMore` / cursor |
| Non-participant | 403 |
| Missing / UNMATCHED | 404 |
| Invalid `before` | 400 |
| Invalid `limit` (0, 101, abc) | 400 |

Mock `prismaMock.message.findMany` and `findFirst` (add to mock if missing).

### UI — `conversations/[id]/page.spec.tsx`

| Case | Expected |
|------|----------|
| Loads messages on mount | `fetchConversationMessages` called |
| Renders left/right bubbles by sender | mock user id vs senderId |
| Shows timestamp | `formatMessageTime` output present |
| Empty state when no messages | "No messages yet" |
| Load earlier button when `hasMore` | click → second fetch with `before` |
| Send still works | append + dedupe |
| Messages error state | alert shown |

Mock `useAuth` → `{ user: { id: 'user_me' } }`.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **No live updates until Story 3** — User B must reopen conversation to see A's new messages.
2. **Read / unread** — Stories 4–5; `lastReadAt` on detail DTO stays `null`.
3. **`after` param** — Story 3 only; architect contract documented above for forward compatibility.
4. **`useAuth` on detail page** — required for alignment; app shell already wraps authenticated routes.

---

## Next agent

```text
--agent 1 sprint 3 story 2
```

**Notes for next agent:**

1. Implement `listMessages` + GET route + error code (no migration).
2. Add `fetchConversationMessages` + `formatMessageTime`.
3. Replace session-only list: load on mount, left/right bubbles, load earlier, auto-scroll.
4. Keep Story 1 send/composer behavior; dedupe on append.
5. Do **not** add `after` or polling (Story 3).
