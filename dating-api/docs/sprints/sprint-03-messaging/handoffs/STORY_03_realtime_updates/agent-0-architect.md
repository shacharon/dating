# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_realtime_updates.md](../../STORY_03_realtime_updates.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-01  
**Status:** complete  

---

## Summary

- **No Prisma migration** — extend Story 2 `GET .../messages` with **`after=<messageId>`** for forward-only fetch (polling).
- Extend **`MeConversationMessagesService.listMessages()`** — `after` mode returns messages **strictly newer** than cursor, ASC, no backward pagination.
- **`before` and `after` are mutually exclusive** — both set → **400**.
- UI: **3s polling** while conversation detail is mounted; **pause when `document.visibilityState !== 'visible'`**; append + **dedupe by id**; auto-scroll when poll adds messages (with near-bottom guard).
- Reuse **`fetchConversationMessages`** with `after` option — no new endpoint.
- **No WebSocket**, typing indicators, or delivery status in Story 3.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | updated — `after` branch in `listMessages()` |
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | updated — options / validation helpers (optional) |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `@Query('after')` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated (agent 2) |
| `dating-api/src/logging/error-codes.ts` | optional — `ME_CONVERSATIONS_MESSAGES_POLL_OK` or reuse `LIST_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `after` query param |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — polling effect |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. Same GET endpoint — extend Story 2 contract

`GET /api/v1/me/conversations/:id/messages` gains optional **`after`** query param. Story 1 POST and Story 2 `before` pagination unchanged.

### 2. Cursor = message ID (consistent with Story 2)

| Param | Semantics |
|-------|-----------|
| *(none)* | Latest page (Story 2) — `limit` default 50 |
| `before=<messageId>` | Older messages (Story 2) |
| `after=<messageId>` | **Newer** messages only (Story 3 polling) |

**Invalid `after`:** **400** `{ message: 'Invalid message cursor.' }` (same message as invalid `before`).

**Mutual exclusion:** if both `before` and `after` present → **400** `{ message: 'Cannot use before and after together.' }`.

### 3. `after` query algorithm

```typescript
// After assertActiveConversationParticipant + mutual-exclusion checks:

const cursor = await prisma.message.findFirst({
  where: { id: after, conversationId, status: MessageStatus.SENT },
  select: { id: true, createdAt: true },
});
if (!cursor) throw new BadRequestException('Invalid message cursor.');

const pollLimit = Math.min(limit, 100); // cap burst for polling

const rows = await prisma.message.findMany({
  where: {
    conversationId,
    status: MessageStatus.SENT,
    OR: [
      { createdAt: { gt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { gt: cursor.id } },
    ],
  },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  take: pollLimit,
  select: messageSelect,
});

return {
  messages: rows.map(toMessageDto),
  pagination: { hasMore: false, nextCursor: null }, // forward poll does not paginate
};
```

**Empty poll:** **200** `{ messages: [], pagination: { hasMore: false, nextCursor: null } }`.

**Default `limit` when `after` only:** use parsed limit (default 50) but **cap at 100** for polling safety.

### 4. Service signature change

```typescript
async listMessages(
  sessionUserId: string,
  conversationId: string,
  options: { limit: number; before?: string; after?: string },
): Promise<MessageListDto>;
```

Controller:

```typescript
@Get('conversations/:id/messages')
listConversationMessages(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
  @Query('limit') limitStr?: string,
  @Query('before') before?: string,
  @Query('after') after?: string,
) {
  return this.conversationMessages.listMessages(user.id, id, {
    limit: parseMessageListLimit(limitStr),
    before: before?.trim() || undefined,
    after: after?.trim() || undefined,
  });
}
```

### 5. HTTP status mapping (unchanged except new 400 case)

| Condition | Status |
|-----------|--------|
| No session | 401 |
| Missing / UNMATCHED | 404 |
| Non-participant | 403 |
| Invalid limit / cursor / both cursors | 400 |
| Success | **200** + `MessageListDto` |

### 6. Observability

Reuse **`ME_CONVERSATIONS_MESSAGES_LIST_OK`** with log segment `after=` when polling (no new code required). Optional dedicated poll code only if dashboards need it — **skip in Story 3**.

### 7. UI polling — 3 second interval

| Rule | Value |
|------|--------|
| Interval | **3000 ms** |
| Start | After initial `fetchConversationMessages` completes (`!messagesLoading`) and conversation detail loaded |
| Stop | `clearInterval` on unmount or `id` change |
| Pause | Skip tick when `document.visibilityState !== 'visible'` |
| Also listen | `visibilitychange` → run one poll immediately when tab becomes visible (catch-up) |

**Poll request:**

```typescript
const lastId = messages[messages.length - 1]?.id;
if (!lastId) return; // empty thread: rely on initial load / send; optional no-op poll

const { messages: incoming } = await fetchConversationMessages(id, {
  after: lastId,
  limit: 100,
});
```

**Empty thread alternative (optional):** if `messages.length === 0`, poll with `limit=20` and no `after` only when architect wants catch-up without send — **prefer skip** until first message exists to avoid re-downloading empty latest page every 3s. When first message arrives via send or other tab, initial load or send path updates state.

### 8. Merge / dedupe

```typescript
setMessages((prev) => {
  const ids = new Set(prev.map((m) => m.id));
  const append = incoming.filter((m) => !ids.has(m.id));
  if (append.length === 0) return prev;
  return [...prev, ...append];
});
```

POST send path already dedupes — keep both.

### 9. Auto-scroll on poll

When poll **appends** one or more messages:

- Call `scrollListToBottom(listRef.current)` **only if** user is near bottom:

```typescript
function isNearBottom(el: HTMLDivElement, thresholdPx = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}
```

- If user scrolled up reading history, do not jerk scroll (better UX; still satisfies “new message visible” when they are already at bottom).
- Always scroll on **send success** (existing behavior).

### 10. Polling errors

- Poll failures: **silent retry** (do not replace thread with error banner). Optional `console` only — no user-facing poll error in Story 3.
- Initial load errors still use `conversation-messages-error` (Story 2).

### 11. No changes to load-earlier

`before` pagination and “Load earlier messages” unchanged. Polling runs independently.

### 12. Testing — fake timers

UI tests use **`vi.useFakeTimers()`** + `vi.advanceTimersByTime(3000)` to assert poll without waiting 3s real time. Restore real timers in `afterEach`.

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API contract

### `GET /api/v1/me/conversations/:id/messages?after=<messageId>`

**Auth:** session cookie.

**Query (Story 3 addition):**

| Param | Required | Description |
|-------|----------|-------------|
| `after` | no | Message id; return rows **strictly newer** than cursor |
| `limit` | no | Default 50; max 100 when used with `after` |

**Cannot combine** `before` and `after`.

**Response 200 (example):**

```json
{
  "messages": [
    {
      "id": "msg_new",
      "conversationId": "mutual_row_1",
      "senderId": "user_b",
      "text": "Hi!",
      "createdAt": "2026-06-01T18:00:01.000Z",
      "status": "SENT"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null
  }
}
```

---

## UI contract

### `conversations-api.ts`

```typescript
export async function fetchConversationMessages(
  conversationId: string,
  options?: { limit?: number; before?: string; after?: string },
): Promise<MessageListDto>;
```

Add `after` to `URLSearchParams` when set.

### `conversations/[id]/page.tsx`

**New refs / helpers:**

```typescript
const POLL_INTERVAL_MS = 3000;
const messagesRef = useRef<MessageDto[]>([]);
// keep messagesRef.current = messages in effect for poll closure stability (optional)

useEffect(() => {
  if (!id || messagesLoading) return;

  const poll = async () => {
    if (document.visibilityState !== 'visible') return;
    const list = messagesRef.current;
    const lastId = list[list.length - 1]?.id;
    if (!lastId) return;
    try {
      const { messages: incoming } = await fetchConversationMessages(id, {
        after: lastId,
        limit: 100,
      });
      // merge + conditional scroll (see §9)
    } catch {
      // silent
    }
  };

  const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void poll();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onVisible);
  };
}, [id, messagesLoading]);
```

Sync `messagesRef` whenever `messages` state updates.

---

## Test plan (for Agent 2)

### Unit — `me-conversation-messages.service.spec.ts`

| Case | Expected |
|------|----------|
| `after` valid — returns only newer messages ASC | correct ids/order |
| `after` invalid | `BadRequestException` |
| `before` + `after` together | `BadRequestException` |
| `after` empty result | `messages: []` |
| `after` respects SENT filter | query includes status |
| Existing `before` / default tests | still pass |

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 3: GET .../messages?after=`**

| Case | Expected |
|------|----------|
| `after` returns messages newer than cursor | 200, ASC, excludes cursor row |
| `after` with no new messages | 200, `[]` |
| `before` + `after` | 400 |
| Invalid `after` | 400 |
| 401 / 403 / 404 | same as Story 2 |

### UI — `page.spec.tsx`

| Case | Expected |
|------|----------|
| Starts polling after messages load | `fetchConversationMessages` called with `after` on timer |
| Appends polled message | text visible |
| Dedupes duplicate id | single bubble |
| Does not poll when tab hidden | advance timers, no extra fetch (mock visibility) |
| Clears interval on unmount | no fetch after unmount |

Use `vi.stubGlobal` or `Object.defineProperty(document, 'visibilityState', ...)` for visibility tests.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Empty thread polling** — skipped until `lastId` exists; first message from other user requires reopen OR send unless optional no-`after` poll added later.
2. **Read receipts / unread** — Stories 4–5 unchanged.
3. **WebSocket** — future; polling is intentional for Story 3.

---

## Next agent

```text
--agent 1 sprint 3 story 3
```

**Notes for next agent:**

1. Extend `listMessages` + controller `after` param; mutual-exclusion validation.
2. Extend `fetchConversationMessages` + polling effect in `page.tsx`.
3. Use **3000 ms** interval; visibility pause + catch-up on visible.
4. Near-bottom guard before scroll on poll append.
5. Do not add WebSocket or typing indicators.
