# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_send_message.md](../../STORY_01_send_message.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **New Prisma `Message` model + migration** — first messaging persistence; `conversationId` → `MutualMatch.id`.
- New **`MeConversationMessagesService.sendMessage()`** + **`POST /api/v1/me/conversations/:id/messages`** → **201** + `MessageDto`.
- Reuse Sprint 2 **access rules**: ACTIVE participant only; missing / `UNMATCHED` → **404**; non-participant → **403** (same error bodies as GET/DELETE).
- Extract **`assertActiveConversationParticipant`** on `MeConversationsService` (shared with future GET messages / read).
- UI: enable input on `/dating/conversations/[id]`; remove **"Messaging coming soon"**; show **sent messages in session** (right-aligned); **Send** + **Enter** (no Shift+Enter newline required in Story 1).
- **No rate limit** in Story 1 (Story 6); **no GET history** (Story 2); **no polling** (Story 3).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | updated — `Message`, `MessageStatus`, relations |
| `dating-api/prisma/migrations/*` | created — `Message` table |
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | created |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | created |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | created (agent 2) |
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `assertActiveConversationParticipant` |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `POST conversations/:id/messages` |
| `dating-api/src/me-profile/me-profile.module.ts` | updated — register messages service |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated (agent 2) |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_MESSAGE_SEND_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `sendConversationMessage`, types |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — enabled composer + message list |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. First messaging migration in Story 1

`Message` table does not exist yet. Agent 1 must run `prisma migrate dev` and commit migration.

### 2. `conversationId` = `MutualMatch.id`

Same `:id` as GET detail / DELETE unmatch. No separate conversation entity.

### 3. Access control — DRY via `MeConversationsService`

Add **public** helper (used by messages service):

```typescript
/**
 * Throws NotFoundException or ForbiddenException with Sprint 2 error bodies.
 * Returns match row when ACTIVE and session user is participant.
 */
async assertActiveConversationParticipant(
  sessionUserId: string,
  conversationId: string,
): Promise<{
  id: string;
  userId1: string;
  userId2: string;
}>;
```

Refactor `getById` / `unmatch` to call this helper **optional** in Story 1 (minimize diff); **required** for new messages service.

**Order:** 404 if missing or `status !== ACTIVE` → 403 if not participant.

### 4. New service file — `MeConversationMessagesService`

Keeps `MeConversationsService` focused on list/detail/unmatch. Story 2 adds `listMessages` to messages service.

Inject: `PrismaService`, `MeConversationsService`, `StructuredObservabilityService`.

### 5. Text validation (server)

| Rule | Behavior |
|------|----------|
| Empty / whitespace-only | **400** `{ message: 'Message text is required' }` or structured error |
| Length | **400** if `text.length > 2000` **before** trim (story AC) |
| Persisted value | `text.trim()` — internal whitespace collapsed only at ends |

Use `class-validator` on DTO:

```typescript
export class SendConversationMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message text is required' })
  @MaxLength(2000, { message: 'Message exceeds 2000 characters' })
  text!: string;
}
```

Apply global validation pipe on controller (existing pattern) **or** trim in service after validation — **trim in service** before `create`.

### 6. HTTP status mapping (POST)

| Condition | Status |
|-----------|--------|
| No session | 401 |
| Missing / UNMATCHED conversation | 404 `conversation_not_found` |
| Non-participant | 403 `conversation_forbidden` |
| Invalid body (empty / too long) | 400 |
| Success | **201** + `MessageDto` |

Use **201 Created** (resource created), not 200.

### 7. `MessageDto` shape

```typescript
export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string; // ISO
  status: 'SENT';
}
```

Only return `SENT` messages from POST (never `DELETED` in create path).

### 8. No rate limiting in Story 1

Story 6 adds 10 msg/min. Do not add throttling yet.

### 9. UI — session-only message list (Story 1 scope)

Story 1 has **no GET history**. UI keeps `messages: MessageDto[]` in React state:

- On send success → append returned `MessageDto`
- All bubbles **right-aligned** (viewer is always sender in Story 1)
- Empty state: **"No messages yet. Say hi!"** when array empty
- Remove `conversation-messaging-placeholder` / disabled textarea

**Story 2** will load history on mount and merge alignment using `senderId` vs `fetchAuthMe().user.id`.

### 10. Enter to send

- **Enter** → send (if not empty)
- **Shift+Enter** → newline in textarea (standard chat UX)
- Send button disabled when `trim(text).length === 0` or `sending`

### 11. After send UX

- Clear input on success
- Show inline error on failure (alert under composer)
- Do **not** use optimistic UI in Story 1 (append after 201) — simpler, matches AC "or after response"

### 12. Char counter (optional minimal)

Show `{text.length}/2000` under input — nice for Story 1, aligns with Story 6; **optional** for agent 1 if timeboxed.

---

## Prisma schema

Add enum and model (after `MutualMatch`):

```prisma
enum MessageStatus {
  SENT
  DELETED
}

model Message {
  id             String        @id @default(cuid())
  conversationId String
  conversation   MutualMatch   @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User          @relation(fields: [senderId], references: [id], onDelete: Cascade)
  text           String        @db.Text
  createdAt      DateTime      @default(now())
  status         MessageStatus @default(SENT)

  @@index([conversationId, createdAt])
  @@index([senderId])
}
```

**User model** — add:

```prisma
messages Message[]
```

**MutualMatch model** — add:

```prisma
messages Message[]
```

**Migration name suggestion:** `add_message_table`

---

## Migration plan

```powershell
cd c:\dev\piza\dating\dating-api
npx prisma migrate dev --name add_message_table
npx prisma generate
```

Verify `Message` table in DB before UI smoke.

---

## API contract

### `POST /api/v1/me/conversations/:id/messages`

**Auth:** session cookie (`AuthGuard`).

**Params:** `id` = `MutualMatch.id`.

**Request body:**

```json
{
  "text": "Hello!"
}
```

**Response 201:**

```json
{
  "id": "msg_abc",
  "conversationId": "mutual_row_1",
  "senderId": "user_viewer",
  "text": "Hello!",
  "createdAt": "2026-05-31T16:00:00.000Z",
  "status": "SENT"
}
```

**Response 400** — validation (empty, >2000 chars).

**Response 404:**

```json
{
  "error": "conversation_not_found",
  "message": "Conversation not found."
}
```

**Response 403:**

```json
{
  "error": "conversation_forbidden",
  "message": "You do not have access to this conversation."
}
```

**Not in Story 1:** `GET .../messages`, `PUT .../read`, WebSocket.

---

## Service signatures

### `MeConversationsService`

```typescript
async assertActiveConversationParticipant(
  sessionUserId: string,
  conversationId: string,
): Promise<{ id: string; userId1: string; userId2: string }>;
```

### `MeConversationMessagesService`

```typescript
async sendMessage(
  sessionUserId: string,
  conversationId: string,
  text: string,
): Promise<MessageDto>;
```

**Logic:**

1. `await this.conversations.assertActiveConversationParticipant(sessionUserId, conversationId)`
2. Validate trim / length (if not fully covered by DTO pipe)
3. `prisma.message.create({ data: { conversationId, senderId: sessionUserId, text: trimmed, status: SENT } })`
4. Map to `MessageDto`, trace `ME_CONVERSATIONS_MESSAGE_SEND_OK`

---

## Controller

```typescript
@Post('conversations/:id/messages')
@HttpCode(HttpStatus.CREATED)
sendConversationMessage(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
  @Body() body: SendConversationMessageDto,
) {
  return this.conversationMessages.sendMessage(user.id, id, body.text);
}
```

Register `MeConversationMessagesService` in `MeProfileModule`.

---

## UI contract

### `conversations-api.ts`

```typescript
export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'SENT';
}

export async function sendConversationMessage(
  conversationId: string,
  text: string,
): Promise<MessageDto>;
```

Mirror POST error messages like other conversation helpers.

### `conversations/[id]/page.tsx`

**Layout (top → bottom):**

1. Back link (unchanged)
2. Match card (unchanged)
3. **Message thread** — scrollable `flex-1` area, min-height ~200px
   - Empty: "No messages yet. Say hi!"
   - Rows: bubble with `text` + small `createdAt` time
4. **Composer** — enabled textarea + Send button

**State:**

```typescript
const [messages, setMessages] = useState<MessageDto[]>([]);
const [draft, setDraft] = useState('');
const [sending, setSending] = useState(false);
const [sendError, setSendError] = useState<string | null>(null);
```

**Send handler:** `sendConversationMessage(id, draft)` → append → clear draft.

Optional small component: `ConversationMessageBubble` in same file or `conversation-message-bubble.tsx`.

---

## Test plan (for Agent 2)

### Unit — `me-conversation-messages.service.spec.ts`

| Case | Expected |
|------|----------|
| ACTIVE participant, valid text | `create` called, `MessageDto` returned |
| Empty text | `BadRequestException` |
| >2000 chars | `BadRequestException` |
| Missing conversation | `NotFoundException` (via assert) |
| UNMATCHED | `NotFoundException` |
| Non-participant | `ForbiddenException` |
| Text trimmed | stored trimmed |

### Unit — `assertActiveConversationParticipant` (optional in conversations spec)

| Case | Expected |
|------|----------|
| ACTIVE participant | returns match |
| UNMATCHED | NotFoundException |

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 1: POST /api/v1/me/conversations/:id/messages`**

| Case | Expected |
|------|----------|
| 401 no session | 401 |
| ACTIVE participant | 201, body shape, `prisma.message.create` |
| Non-participant | 403 |
| Missing / UNMATCHED | 404 |
| Empty text | 400 |
| 2001 chars | 400 |

### UI — `conversations/[id]/page.spec.tsx`

| Case | Expected |
|------|----------|
| Composer enabled (not disabled) |
| Send disabled when empty |
| Type + Send → `sendConversationMessage` called, message visible |
| API error → alert shown |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Recipient does not see message until Story 2** — expected; document in manual smoke (only sender's session list updates).
2. **Read tracking / unread** — Story 4–5; `lastReadAt` stays `null` on detail DTO.
3. **DELETED status** — schema included for epic; no DELETE endpoint in Story 1.

---

## Next agent

```text
--agent 1 sprint 3 story 1
```

**Notes for next agent:**

1. Run migration first; verify API starts.
2. Implement `assertActiveConversationParticipant` + messages service + POST route.
3. Replace disabled composer; remove "Messaging coming soon".
4. Session-only message list (no GET) until Story 2.
5. Use **201** on POST success.
