# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_emit_message_new.md](../../STORY_02_emit_message_new.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No Prisma migration** — REST `POST .../messages` unchanged; add **best-effort** socket push after persist.
- **Wire `RealtimePublisher`** into `MeConversationMessagesService.sendMessage()` via `MeProfileModule` importing `MessagingRealtimeModule`.
- **Order:** `assertActiveConversationParticipant` (capture match) → validate → rate limit → **`prisma.message.create`** → `toMessageDto` → **`publishToUsers([userId1, userId2], 'message.new', dto)`** → return **201** `MessageDto`.
- **Payload:** existing `MessageDto` from `toMessageDto(row)` — already includes `conversationId`; identical shape to REST response and `dating-ui` `MessageDto`.
- **Recipients:** both `MutualMatch` participants (`match.userId1`, `match.userId2`) — sender gets echo in their `user:<senderId>` room (required for multi-tab / sender UI without waiting for HTTP response body).
- **Failure policy:** wrap publish in `try/catch`; log `MESSAGING_MESSAGE_NEW_PUBLISH_FAILED`; **never** throw to the controller — HTTP **201** still returns.
- **Story 2 scope:** API emit only. **No UI** changes (polling remains until Story 3).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/messaging-realtime/messaging-realtime.constants.ts` | add `MESSAGING_EVENT_MESSAGE_NEW = 'message.new'` |
| `dating-api/src/me-profile/me-profile.module.ts` | `imports: [MessagingRealtimeModule]` |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | inject `RealtimePublisher`; publish after create |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | mock publisher; publish + failure tests |
| `dating-api/src/logging/error-codes.ts` | add `MESSAGING_MESSAGE_NEW_PUBLISH_FAILED` (optional `..._OK`) |
| `dating-api/src/messaging-realtime/messaging-realtime-ws.integration.spec.ts` | optional: POST + socket receives frame (Agent 2) |

**No changes:** `MeProfileController`, `RealtimePublisher` implementation (unless Agent 1 adds thin `publishMessageNew` helper — not required), UI, gateway auth.

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Message row is already durable before push. Missed push is recovered by Story 4 catch-up (`GET ?after=`).

### 2. Module wiring — `MeProfileModule` imports `MessagingRealtimeModule`

Story 1 exported `RealtimePublisher` from `MessagingRealtimeModule` (registered in `AppModule`). Story 2 adds the **me-profile** import so `MeConversationMessagesService` can inject it:

```typescript
// me-profile.module.ts
import { MessagingRealtimeModule } from '../messaging-realtime/messaging-realtime.module';

@Module({
  imports: [
    // ...existing
    MessagingRealtimeModule,
  ],
  // ...
})
export class MeProfileModule {}
```

`AppModule` keeps `MessagingRealtimeModule` (gateway must bootstrap). Duplicate import is fine in Nest.

### 3. Reuse `assertActiveConversationParticipant` return value

`sendMessage()` already calls it but discards the result. **Capture** it once at the top:

```typescript
const match = await this.conversations.assertActiveConversationParticipant(
  sessionUserId,
  conversationId,
);
```

After `create`, participants are `[match.userId1, match.userId2]` — no extra Prisma query, no peer-resolution helper.

### 4. Event contract — `message.new`

| Field | Value |
|-------|--------|
| **Event name** | `'message.new'` (constant `MESSAGING_EVENT_MESSAGE_NEW`) |
| **Transport** | socket.io server → client on namespace `/ws/messaging` |
| **Rooms** | `user:<userId1>` and `user:<userId2>` via `publishToUsers` |
| **Payload** | `MessageDto` — same as REST **201** body |

```typescript
// messaging-realtime.constants.ts
export const MESSAGING_EVENT_MESSAGE_NEW = 'message.new';
```

**Payload shape (API + UI aligned):**

```typescript
interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string; // ISO-8601
  status: 'SENT';
}
```

**Client routing (Story 3):** filter `payload.conversationId === openConversationId`; ignore other conversations. No `conversation:<id>` rooms in Story 2.

**Wire example (socket.io client):**

```javascript
socket.on('message.new', (msg) => {
  // msg: MessageDto
});
```

### 5. `sendMessage()` flow (exact order)

```typescript
async sendMessage(
  sessionUserId: string,
  conversationId: string,
  text: string,
): Promise<MessageDto> {
  const match = await this.conversations.assertActiveConversationParticipant(
    sessionUserId,
    conversationId,
  );

  const trimmed = text.trim();
  if (!trimmed) {
    throw new BadRequestException('Message text is required');
  }

  this.messageRateLimit.assertCanSend(sessionUserId);
  logProfanityIfDetected(this.obs, sessionUserId, conversationId, trimmed);

  const row = await this.prisma.message.create({ /* unchanged */ });
  this.messageRateLimit.recordSend(sessionUserId);

  this.obs.trace(
    `me conversations message send conversationId=${conversationId} userId=${sessionUserId}`,
    ErrorCodes.ME_CONVERSATIONS_MESSAGE_SEND_OK,
  );

  const dto = toMessageDto(row);

  this.publishMessageNewBestEffort(
    match.userId1,
    match.userId2,
    dto,
    conversationId,
  );

  return dto;
}
```

**Never emit before `create` resolves.** If `create` throws, no publish.

### 6. Best-effort publish helper (private on service)

Keep logic in `MeConversationMessagesService` (not on `RealtimePublisher`) so publisher stays transport-only:

```typescript
private publishMessageNewBestEffort(
  userId1: string,
  userId2: string,
  payload: MessageDto,
  conversationId: string,
): void {
  try {
    this.realtime.publishToUsers(
      [userId1, userId2],
      MESSAGING_EVENT_MESSAGE_NEW,
      payload,
    );
  } catch (err) {
    this.obs.error(
      `messaging message.new publish failed conversationId=${conversationId} messageId=${payload.id}`,
      ErrorCodes.MESSAGING_MESSAGE_NEW_PUBLISH_FAILED,
      err,
    );
  }
}
```

- Use **`obs.error`** (not `trace`) on failure — matches “log on error” AC.
- **Do not rethrow.** Controller still returns **201** + `dto`.
- Today `Namespace.emit` is sync and rarely throws; wrap anyway for Story 6 Redis adapter.
- **Unbound publisher** (no WS server in unit tests): `publishToUsers` is already a no-op when `namespaceServer` is null — tests assert **mock was called**, integration asserts **frame received**.

Optional success trace (not blocking): `MESSAGING_MESSAGE_NEW_PUBLISH_OK` — skip unless Agent 1 wants symmetry; Story AC only requires failure code.

### 7. `RealtimePublisher` — use as-is

```typescript
this.realtime.publishToUsers(
  [userId1, userId2],
  MESSAGING_EVENT_MESSAGE_NEW,
  payload,
);
```

No dedupe needed (`userId1 !== userId2` on `MutualMatch`). Sender and recipient always get one emit each (two loop iterations in `publishToUsers`).

### 8. REST / controller — unchanged

- Route: `POST /api/v1/me/conversations/:id/messages`
- Status: **201**
- Body: `MessageDto`
- Validation, rate limit, profanity, participant checks — unchanged

### 9. UI — no changes (Story 2)

| Item | Story 2 |
|------|---------|
| `conversations/[id]/page.tsx` | Still polls every 3s |
| `createMessagingSocket()` | Still unused on page |
| `NEXT_PUBLIC_REALTIME` | Story 3 |

Manual smoke uses devtools WS listener or console `socket.on('message.new', ...)`.

### 10. Observability

Add to `error-codes.ts`:

```typescript
MESSAGING_MESSAGE_NEW_PUBLISH_FAILED: 'MESSAGING_MESSAGE_NEW_PUBLISH_FAILED',
```

Log fields: `conversationId`, `messageId` — **no** message text in logs (privacy).

Existing `ME_CONVERSATIONS_MESSAGE_SEND_OK` stays on successful persist (before publish).

### 11. Security / authz (Story 2 minimum)

- Push only runs after participant assertion + successful insert.
- Payload only goes to the two match participant rooms (not a global broadcast).
- Conversation-level subscribe authz remains **Story 6**; clients must filter by `conversationId`.

### 12. Out of scope (confirm)

- UI subscribe / remove polling → Story 3
- `after` catch-up on reconnect → Story 4
- `unread.bump` (or similar) → Story 5
- Redis adapter / rate limit on emit → Story 6
- Inbound `@SubscribeMessage` handlers → none

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API / wire contract

### REST (unchanged)

| Method | Path | Success |
|--------|------|---------|
| POST | `/api/v1/me/conversations/:id/messages` | **201** + `MessageDto` |

### WebSocket (new server → client event)

| Event | Payload | Recipients |
|-------|---------|------------|
| `message.new` | `MessageDto` | `user:<userId1>`, `user:<userId2>` |

Emitted **only** from `sendMessage()` after Story 2. No emit on list/history/read.

---

## UI contract (Story 2)

**None** — document for Story 3:

```typescript
// Story 3 will use:
import { createMessagingSocket } from '@/lib/messaging-socket';
import type { MessageDto } from '@/lib/conversations-api';

socket.on('message.new', (msg: MessageDto) => { /* append if msg.conversationId matches */ });
```

---

## Test plan (for Agent 2)

### Unit — `me-conversation-messages.service.spec.ts`

Extend constructor with mock `RealtimePublisher`:

| Case | Expected |
|------|----------|
| Successful send | `publishToUsers` called once with `[otherUserId, sessionUserId]` or `[userId1, userId2]` from mock match, event `'message.new'`, payload === returned `MessageDto` |
| Participant order | When `userId1=other`, `userId2=session`, array is `[other, session]` (order does not matter for delivery) |
| `publishToUsers` throws | `sendMessage` still resolves; returns `MessageDto`; `obs.error` with `MESSAGING_MESSAGE_NEW_PUBLISH_FAILED`; `prisma.message.create` was called |
| Rate limit / validation failures | `publishToUsers` **not** called |
| `create` throws | `publishToUsers` **not** called |

Mock match from Story 1 spec pattern:

```typescript
{
  id: conversationId,
  userId1: otherUserId,
  userId2: sessionUserId,
  createdAt: new Date(),
  user1LastReadAt: null,
  user2LastReadAt: null,
}
```

### Integration (recommended)

In `messaging-realtime-ws.integration.spec.ts` or `me-profile-http.integration.spec.ts`:

1. Login user A and B (existing harness).
2. Open `socket.io-client` for each with session cookie → namespace `/ws/messaging`.
3. `POST` message as A on mutual conversation.
4. Assert B's socket receives `message.new` with matching `id` / `text`.
5. Assert A's socket also receives (echo).
6. Optional: stub `RealtimePublisher` throw → POST still **201** (unit covers this; integration optional).

### UI

**None.**

---

## Manual smoke (user)

1. Two accounts with mutual match; both logged in.
2. Connect sockets (Story 1 console snippet or `createMessagingSocket().connect()`).
3. Register `socket.on('message.new', console.log)`.
4. Send via UI or REST `POST`.
5. Both tabs show frame; `POST` still **201**.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Publisher unbound in tests** — unit tests mock `RealtimePublisher`; integration needs live gateway (`afterInit` bind).
2. **No connected clients** — emit is fire-and-forget; no error if rooms empty (socket.io no-op). Acceptable.
3. **Duplicate delivery Story 3** — client must dedupe by `message.id` when merging WS + POST response (Story 3 architect note).

---

## Next agent

```text
--agent 1 sprint 4 story 2
```

**Notes for Agent 1:**

1. Add `MESSAGING_EVENT_MESSAGE_NEW` constant.
2. `MeProfileModule` → import `MessagingRealtimeModule`.
3. Inject `RealtimePublisher` into `MeConversationMessagesService`.
4. Capture `match` from `assertActiveConversationParticipant`; publish after `toMessageDto`.
5. Private `publishMessageNewBestEffort` with `try/catch` + `MESSAGING_MESSAGE_NEW_PUBLISH_FAILED`.
6. Do **not** change UI or gateway.
7. Hand off to Agent 2 for unit tests (+ optional integration).
