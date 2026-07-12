# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_unmatch.md](../../STORY_05_unmatch.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **No Prisma migration** — `MutualMatch` already has `status`, `unmatchedAt`, `unmatchedByUserId`.
- Add **`DELETE /api/v1/me/conversations/:id`** → soft-unmatch (`status = UNMATCHED`); **204** empty body.
- **`MeConversationsService.unmatch(sessionUserId, conversationId)`** — participant + ACTIVE only; missing / already UNMATCHED → **404**; non-participant on ACTIVE → **403**.
- **List/detail exclusion** — no query changes: Story 2 list filters `ACTIVE`; Story 3 `getById` already 404s UNMATCHED.
- **Story 4 badge** — `findActiveByUserPair` stops matching UNMATCHED → **You matched!** clears on next GET without extra work.
- UI: **Unmatch** on `/dating/conversations/[id]` with confirm dialog → DELETE → redirect **`/dating/conversations`**.
- **Re-match after unmatch** — out of scope (row stays UNMATCHED; Story 1 upsert `update: {}`).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A |
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `unmatch()` |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `DELETE conversations/:id` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — unmatch flow |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_UNMATCH_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `unmatchMyConversation()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — unmatch button + confirm |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

All fields exist from Story 1. Story 5 is HTTP + service update only.

### 2. Soft delete only — do not delete `MutualMatch` row

```typescript
await prisma.mutualMatch.update({
  where: { id: conversationId },
  data: {
    status: MutualMatchStatus.UNMATCHED,
    unmatchedAt: new Date(),
    unmatchedByUserId: sessionUserId,
  },
});
```

Preserve row for analytics / future moderation. Do **not** delete `MatchAction` rows in this story.

### 3. HTTP status mapping (DELETE)

| Condition | Status | Body |
|-----------|--------|------|
| No session | 401 | AuthGuard default |
| Row not found | 404 | `{ error: 'conversation_not_found', message: 'Conversation not found.' }` |
| `status = UNMATCHED` (incl. second DELETE) | 404 | same — idempotent hide |
| Session user not participant (ACTIVE row) | 403 | `{ error: 'conversation_forbidden', message: 'You do not have access to this conversation.' }` |
| ACTIVE + participant | 204 | empty |

**Order:** load row → **404** if missing or UNMATCHED → **403** if not participant → update → **204**.

Aligns with Story 3 GET (UNMATCHED = not found for participants too).

### 4. Success response: 204 No Content

Same pattern as `DELETE /api/v1/me/matches/:id/actions` (undo). No JSON body.

### 5. List + detail need no query changes

| Endpoint | Existing behavior after unmatch |
|----------|----------------------------------|
| `GET /conversations` | `where: { status: ACTIVE }` — row excluded |
| `GET /conversations/:id` | `getById` rejects non-ACTIVE → 404 |
| `GET .../matches/:id/actions` | `findActiveByUserPair` → null → `mutualMatch: false` |

### 6. Both users lose access symmetrically

Either participant may call DELETE. One unmatch hides conversation for **both** (status flip on shared row).

### 7. Re-match / undo LIKE after mutual — out of scope

| Case | Story 5 behavior |
|------|------------------|
| Re-like after UNMATCHED | Row stays UNMATCHED; `mutualMatch` stays false until future story |
| Undo LIKE while ACTIVE mutual | Badge may stay stale until unmatch (Story 4 deferral); **do not fix in Story 5** unless trivial |

### 8. UI confirm copy

Use story AC (adapt name from `conversationPrimaryLabel(data.otherUser)`):

> **Unmatch [Name]?** You'll no longer see their messages. This can't be undone.

Pattern: mirror **Block** confirm on `me-matches/[id]/page.tsx` — text link → inline confirm → primary destructive confirm button + Cancel.

Place **below** messaging placeholder section or in a footer under match card — visible but not competing with back link.

### 9. Redirect on success

`router.push('/dating/conversations')` — do not rely on list refetch from cache; user lands on list (row gone on next load).

### 10. No notification to other user

Out of scope per story.

---

## Prisma schema

**No changes.** Existing model:

```prisma
model MutualMatch {
  id                String            @id @default(cuid())
  userId1           String
  userId2           String
  createdAt         DateTime          @default(now())
  status            MutualMatchStatus @default(ACTIVE)
  unmatchedAt       DateTime?
  unmatchedByUserId String?
  @@unique([userId1, userId2])
}
```

---

## Migration plan

N/A.

---

## API contract

### `DELETE /api/v1/me/conversations/:id`

**Auth:** session cookie (`AuthGuard`).

**Params:** `id` = `MutualMatch.id` (same as GET detail).

**Response 204:** empty body.

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

**Response 401:** unauthenticated.

---

## Service signatures

### `MeConversationsService`

```typescript
async unmatch(
  sessionUserId: string,
  conversationId: string,
): Promise<void>;
```

**Logic sketch:**

```typescript
const match = await this.prisma.mutualMatch.findUnique({
  where: { id: conversationId },
  select: { id: true, userId1: true, userId2: true, status: true },
});

if (!match || match.status !== MutualMatchStatus.ACTIVE) {
  throw new NotFoundException({
    error: 'conversation_not_found',
    message: 'Conversation not found.',
  });
}

if (match.userId1 !== sessionUserId && match.userId2 !== sessionUserId) {
  throw new ForbiddenException({
    error: 'conversation_forbidden',
    message: 'You do not have access to this conversation.',
  });
}

await this.prisma.mutualMatch.update({
  where: { id: conversationId },
  data: {
    status: MutualMatchStatus.UNMATCHED,
    unmatchedAt: new Date(),
    unmatchedByUserId: sessionUserId,
  },
});

this.obs.trace(
  `me conversations unmatch id=${conversationId} userId=${sessionUserId}`,
  ErrorCodes.ME_CONVERSATIONS_UNMATCH_OK,
);
```

### Controller (`MeProfileController`)

```typescript
@Delete('conversations/:id')
@HttpCode(HttpStatus.NO_CONTENT)
async unmatchConversation(
  @CurrentUser() user: SessionUser,
  @Param('id') id: string,
): Promise<void> {
  return this.conversations.unmatch(user.id, id);
}
```

Register **after** or alongside existing `GET conversations/:id` — no route conflict.

---

## UI contract

### `conversations-api.ts`

```typescript
export async function unmatchMyConversation(id: string): Promise<void> {
  // DELETE /api/v1/me/conversations/:id
  // 401 → login message
  // 403 → 'You do not have access to this conversation.'
  // 404 → 'Conversation not found.'
  // 204 → resolve
}
```

### `conversations/[id]/page.tsx`

**State:**

```typescript
const [unmatchConfirmOpen, setUnmatchConfirmOpen] = useState(false);
const [unmatchSaving, setUnmatchSaving] = useState(false);
const [unmatchError, setUnmatchError] = useState<string | null>(null);
```

**Flow:**

1. **Unmatch** link/button → `setUnmatchConfirmOpen(true)`
2. Confirm panel with name in copy
3. Confirm → `await unmatchMyConversation(id)` → `router.push('/dating/conversations')`
4. Cancel → close panel, no API call

**Disable** unmatch control while `unmatchSaving` or initial `loading`.

---

## Test plan (for Agent 2)

### Unit — `me-conversations.service.spec.ts`

| Case | Expected |
|------|----------|
| ACTIVE + participant | `update` called with UNMATCHED fields |
| Missing row | `NotFoundException` |
| UNMATCHED row | `NotFoundException` |
| ACTIVE + non-participant | `ForbiddenException` |
| `unmatchedByUserId` | session user id |

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 2 Story 5: DELETE /api/v1/me/conversations/:id`**

| Case | Expected |
|------|----------|
| 401 no session | 401 |
| ACTIVE + participant | 204, `mutualMatch.update` with UNMATCHED |
| Non-participant | 403 |
| Missing id | 404 |
| Already UNMATCHED | 404 |
| Second DELETE after unmatch | 404 |
| GET list after unmatch | row excluded (mock `findMany` ACTIVE only — or verify update then list query) |

### UI — `conversations/[id]/page.spec.tsx`

| Case | Expected |
|------|----------|
| Unmatch button visible | on loaded detail |
| Click Unmatch | confirm copy with name |
| Cancel | no API call |
| Confirm | `unmatchMyConversation` called, redirect to list |
| API error | alert shown, stay on page |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Undo LIKE after mutual** — still deferred; unmatch is the explicit product path to hide conversation.
2. **Re-match** — future story must reset `UNMATCHED` → `ACTIVE` or create new row policy; not Story 5.
3. **BLOCK + ACTIVE mutual** — unmatch is explicit; BLOCK on match detail does not auto-unmatch (unchanged).

---

## Next agent

```text
--agent 1 sprint 2 story 5
```

**Notes for next agent:**

1. Implement `unmatch()` + controller DELETE; **204** on success.
2. UNMATCHED / missing / double-delete → **404** (same body as GET detail).
3. UI confirm + redirect; reuse block-confirm UX from match detail.
4. No migration; no `MatchAction` deletes.
5. Completes Sprint 2 (5/5 after PM close).
