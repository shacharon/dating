# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_mark_read.md](../../STORY_04_mark_read.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-01  
**Status:** complete  

---

## Summary

- **Prisma migration** — add nullable `user1LastReadAt`, `user2LastReadAt` on `MutualMatch` (epic decision; no separate participant table).
- **API** — `PUT /api/v1/me/conversations/:id/read` sets the session user’s read timestamp to **server `now()`**; idempotent (always succeeds for participant).
- **`MeConversationsService.markAsRead()`** — reuse `assertActiveConversationParticipant()`; same 401/403/404 mapping as messages/unmatch.
- **`getById()`** — return session user’s **`lastReadAt`** (`string | null` ISO) instead of hard-coded `null`.
- **`countUnreadForParticipant()`** — implement unread count query in this story (used by Story 5 list); **do not** wire `unreadCount` into `list()` yet (Story 5).
- **UI** — `markConversationAsRead(id)` on conversation detail **mount** + **`visibilitychange` → visible**; **5s debounce** on visibility-driven calls (mount always fires).
- **No** per-message receipts, sender-visible read status, or list-page mark-read in Story 4.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | updated — `user1LastReadAt`, `user2LastReadAt` on `MutualMatch` |
| `dating-api/prisma/migrations/..._add_mutual_match_read_tracking/` | created |
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `markAsRead`, `countUnreadForParticipant`, `getById` lastReadAt |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `PUT conversations/:id/read` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated (agent 2) |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_MARK_READ_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — types + `markConversationAsRead()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — mark-read effect |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. Extend `MutualMatch` — not a new table

```prisma
model MutualMatch {
  // ... existing fields ...
  user1LastReadAt DateTime?
  user2LastReadAt DateTime?
}
```

| Field | Maps to |
|-------|---------|
| `user1LastReadAt` | `userId1` last viewed conversation |
| `user2LastReadAt` | `userId2` last viewed conversation |

**Never** use `Math.min`/`Math.max` on user IDs for field selection — use `sessionUserId === userId1` → `user1LastReadAt`, else `user2LastReadAt`.

### 2. `null` last read = never opened (Story 5 semantics)

Unread count treats **missing** `lastReadAt` as “all peer messages are unread” (see §8). Do **not** backfill on migration.

### 3. `markAsRead` always sets server time

```typescript
await this.prisma.mutualMatch.update({
  where: { id: conversationId },
  data: { [field]: new Date() },
});
```

No request body. No client timestamp. Repeated PUTs **advance** timestamp (idempotent = no error, not “only if newer”).

### 4. HTTP status mapping (PUT)

| Condition | Status | Body |
|-----------|--------|------|
| No session | 401 | AuthGuard default |
| Missing row or `UNMATCHED` | 404 | `{ error: 'conversation_not_found', message: 'Conversation not found.' }` |
| Non-participant on ACTIVE row | 403 | `{ error: 'conversation_forbidden', message: 'You do not have access to this conversation.' }` |
| ACTIVE + participant | **200** | `{ lastReadAt: '<ISO>' }` |

**Order:** same as `assertActiveConversationParticipant` (404 → 403).

### 5. Success response: 200 with `lastReadAt`

Unlike DELETE unmatch (204), mark-read returns the updated value for tests and optional UI state. Shape:

```typescript
export interface MarkConversationReadResponseDto {
  lastReadAt: string; // ISO-8601 UTC
}
```

### 6. `getById` returns real `lastReadAt`

Update `ConversationDetailDto`:

```typescript
export interface ConversationDetailDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  status: 'ACTIVE';
  lastReadAt: string | null; // session user's column, ISO or null if never read
}
```

Load `user1LastReadAt` / `user2LastReadAt` in `assertActiveConversationParticipant` **or** extend its select in `getById` only (prefer extend select in `getById` query after assert to avoid widening assert return type for messages).

**Minimal approach:** In `getById`, after assert, `findUnique` select read columns + map:

```typescript
const lastReadAt =
  match.userId1 === sessionUserId
    ? row.user1LastReadAt?.toISOString() ?? null
    : row.user2LastReadAt?.toISOString() ?? null;
```

### 7. `list()` unchanged for `unreadCount`

Keep `unreadCount: 0` in Story 4. Story 5 replaces with `countUnreadForParticipant()` per row.

### 8. Unread count helper (Story 4 implements, Story 5 consumes)

```typescript
/**
 * Messages from the other user with createdAt strictly after session user's lastReadAt.
 * If lastReadAt is null, all SENT messages from the other user count as unread.
 */
async countUnreadForParticipant(
  sessionUserId: string,
  conversationId: string,
): Promise<number> {
  const match = await this.assertActiveConversationParticipant(
    sessionUserId,
    conversationId,
  );

  const lastReadAt =
    match.userId1 === sessionUserId
      ? await this.getUser1LastReadAt(conversationId) // or select in assert extension
      : await this.getUser2LastReadAt(conversationId);

  const otherUserId =
    match.userId1 === sessionUserId ? match.userId2 : match.userId1;

  return this.prisma.message.count({
    where: {
      conversationId,
      senderId: otherUserId,
      status: MessageStatus.SENT,
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}
```

**Prefer:** extend `assertActiveConversationParticipant` select to include `user1LastReadAt`, `user2LastReadAt` so count + mark share one fetch pattern (optional refactor — or second query in count only).

**Own messages never unread** — `senderId` must be the **other** user only.

### 9. Route registration

```typescript
@Put('conversations/:id/read')
@HttpCode(HttpStatus.OK)
markConversationRead(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
) {
  return this.conversations.markAsRead(user.id, id);
}
```

Place **after** `@Get('conversations/:id')` and **before** `@Get('conversations/:id/messages')` (order for readability; no Nest conflict).

**No** `@UsePipes` / body DTO.

### 10. Observability

```typescript
ErrorCodes.ME_CONVERSATIONS_MARK_READ_OK = 'ME_CONVERSATIONS_MARK_READ_OK';
```

Trace: `me conversations mark-read id=${conversationId} userId=${sessionUserId}`.

### 11. UI mark-read contract

| Trigger | Behavior |
|---------|----------|
| Detail page mount (`id` set, after shell load OK) | Call `markConversationAsRead(id)` once |
| `visibilitychange` → `visible` | Call if **≥ 5000 ms** since last successful mark-read for this `id` |
| Tab hidden | Do not call |
| Poll / send success | **Do not** call (Story 4 AC) |

**Errors:** silent (no banner). User can still read/send. Optional `console` in dev only — **no** user-facing mark-read error in Story 4.

**Debounce implementation:**

```typescript
const lastMarkReadAtRef = useRef(0);

async function tryMarkRead() {
  if (!id) return;
  try {
    await markConversationAsRead(id);
    lastMarkReadAtRef.current = Date.now();
  } catch {
    // silent
  }
}

// Mount: always
useEffect(() => {
  if (!id || loading) return;
  void tryMarkRead();
}, [id, loading]);

// Visibility: debounced
useEffect(() => {
  if (!id) return;
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastMarkReadAtRef.current < 5000) return;
    void tryMarkRead();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}, [id]);
```

Mount effect should run when conversation shell finishes loading (`!loading`), not only when messages load — user “viewing” includes empty thread.

### 12. `conversations-api.ts` client

```typescript
export interface MarkConversationReadResponseDto {
  lastReadAt: string;
}

export interface ConversationDetailDto {
  // ...
  lastReadAt: string | null;
}

export async function markConversationAsRead(
  conversationId: string,
): Promise<MarkConversationReadResponseDto> {
  const path = `/api/v1/me/conversations/${encodeURIComponent(conversationId)}/read`;
  // PUT, credentials, Accept: application/json
  // 404 → 'Conversation not found.'
  // 403 → 'You do not have access to this conversation.'
  // 200 → readJson
}
```

### 13. Story 5 boundary

| Story 4 | Story 5 |
|---------|---------|
| Schema + mark API + count helper | `list()` uses helper for `unreadCount` |
| Detail `lastReadAt` populated | List badge UI |
| Integration proves count 3 → 0 after PUT | List integration + badge tests |

### 14. Messages on UNMATCHED conversation

PUT after unmatch → **404** (assert rejects UNMATCHED). Same as GET messages.

---

## Prisma schema

```prisma
model MutualMatch {
  id                String            @id @default(cuid())
  userId1           String
  user1             User              @relation("MutualMatchUser1", fields: [userId1], references: [id], onDelete: Cascade)
  userId2           String
  user2             User              @relation("MutualMatchUser2", fields: [userId2], references: [id], onDelete: Cascade)
  createdAt         DateTime          @default(now())
  status            MutualMatchStatus @default(ACTIVE)
  unmatchedAt       DateTime?
  unmatchedByUserId String?
  user1LastReadAt   DateTime?
  user2LastReadAt   DateTime?
  messages          Message[]

  @@unique([userId1, userId2])
  @@index([userId1, status])
  @@index([userId2, status])
}
```

**No new indexes** required for Story 4 (message index `@@index([conversationId, createdAt])` supports unread count).

---

## Migration plan

| Step | Action |
|------|--------|
| Forward | `ALTER TABLE "MutualMatch" ADD COLUMN "user1LastReadAt" TIMESTAMP(3), ADD COLUMN "user2LastReadAt" TIMESTAMP(3);` |
| Backfill | None — leave `NULL` |
| Rollback | Drop columns in down migration |
| Local | `npx prisma migrate dev` (or `db push` if team uses that on Windows shadow DB issues) |

Suggested name: `20260601100000_add_mutual_match_read_tracking`

---

## API contract

### `PUT /api/v1/me/conversations/:id/read`

**Auth:** session cookie (`AuthGuard`).

**Params:** `id` = `MutualMatch.id` (cuid).

**Request body:** none.

**Response 200:**

```json
{
  "lastReadAt": "2026-06-01T18:30:00.123Z"
}
```

**Errors:** same envelope as GET detail / messages (`conversation_not_found`, `conversation_forbidden`).

---

### `GET /api/v1/me/conversations/:id` (update)

**Response 200 (excerpt):**

```json
{
  "id": "mutual_row_1",
  "otherUser": { "...": "..." },
  "matchedAt": "2026-05-31T10:00:00.000Z",
  "status": "ACTIVE",
  "lastReadAt": "2026-06-01T18:30:00.123Z"
}
```

Before first mark-read: `"lastReadAt": null`.

---

## Service signatures

```typescript
// me-conversations.service.ts

async markAsRead(
  sessionUserId: string,
  conversationId: string,
): Promise<MarkConversationReadResponseDto>;

async countUnreadForParticipant(
  sessionUserId: string,
  conversationId: string,
): Promise<number>;

// getById — return type lastReadAt: string | null
```

**Private helper (recommended):**

```typescript
function lastReadFieldForUser(
  userId1: string,
  sessionUserId: string,
): 'user1LastReadAt' | 'user2LastReadAt' {
  return userId1 === sessionUserId ? 'user1LastReadAt' : 'user2LastReadAt';
}

function lastReadAtForUser(
  match: {
    userId1: string;
    userId2: string;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  },
  sessionUserId: string,
): Date | null {
  return match.userId1 === sessionUserId
    ? match.user1LastReadAt
    : match.user2LastReadAt;
}
```

---

## Test plan (for Agent 2)

### Unit — `me-conversations.service.spec.ts`

| Case | Expected |
|------|----------|
| `markAsRead` — userId1 participant | updates `user1LastReadAt` |
| `markAsRead` — userId2 participant | updates `user2LastReadAt` |
| `markAsRead` — second call | updates again (new timestamp) |
| `markAsRead` — not found / UNMATCHED | `NotFoundException` |
| `markAsRead` — non-participant | `ForbiddenException` |
| `getById` — returns ISO `lastReadAt` after mark | matches DB |
| `getById` — never read | `lastReadAt: null` |
| `countUnreadForParticipant` — 3 peer messages, null lastRead | `3` |
| `countUnreadForParticipant` — after mark, same messages | `0` |
| `countUnreadForParticipant` — ignores own messages | only peer counted |

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 4: PUT .../conversations/:id/read`**

| Case | Expected |
|------|----------|
| PUT as recipient after 3 messages → 200 + `lastReadAt` | DB column set |
| GET detail → `lastReadAt` matches | 200 |
| `countUnreadForParticipant` via service or follow-up GET list prep | 0 unread after read (test via prisma message count or expose count in test module) |
| 401 / 403 / 404 | same as other conversation routes |
| PUT after unmatch | 404 |

**Unread proof pattern (integration):**

1. Seed ACTIVE mutual + 3 `Message` rows from user A.  
2. As user B: assert count helper === 3 (inject `MeConversationsService` in test app).  
3. `PUT .../read` as B.  
4. Assert count helper === 0.

### UI — `page.spec.tsx`

| Case | Expected |
|------|----------|
| Calls `markConversationAsRead` after shell load | on mount |
| Visibility visible → calls again | mock `visibilityState` |
| Visibility within 5s debounce | second call skipped (advance time or mock ref) |
| Mark-read failure | no error banner (silent) |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Mark read while polling only** — not required; unread may stay > 0 until visibility/mount until Story 5 list refresh. Acceptable for Story 4.
2. **List `unreadCount`** — Story 5 only.
3. **Mark read on conversation list page** — out of scope; detail page only.

---

## Next agent

```text
--agent 1 sprint 3 story 4
```

**Notes for next agent:**

1. Migration + schema fields on `MutualMatch`.
2. Implement `markAsRead`, `countUnreadForParticipant`, update `getById` `lastReadAt`.
3. Controller `PUT conversations/:id/read` + error code.
4. UI `markConversationAsRead` + mount/visibility effects with 5s debounce; silent errors.
5. Leave `list().unreadCount` at `0` — Story 5.
6. Do not add read receipts or per-message status.
