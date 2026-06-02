# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_conversation_shell.md](../../STORY_03_conversation_shell.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **No Prisma migration** — read `MutualMatch` by `id`; same profile display rules as Story 2 list.
- Extend **`MeConversationsService`** with **`getById(sessionUserId, conversationId)`**; add **`GET /api/v1/me/conversations/:id`** on `MeProfileController`.
- **Access:** participant → 200; non-participant → **403**; missing / `UNMATCHED` → **404**.
- **Display:** reuse Story 2 **`ConversationOtherUserDto`** (nickname + meta, `profileId`, `photoUrl`). Story draft `firstName` / `bio` — **do not expose raw profile text**; omit optional bio in this story.
- Replace Story 2 **stub** at `/dating/conversations/[id]` with match card + messaging placeholder + back link.
- **`lastReadAt: null`** placeholder (Sprint 3 read tracking).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A |
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `getById`, shared `buildOtherUserDto` helper |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `GET conversations/:id` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — detail endpoint tests |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_DETAIL_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `fetchMyConversationById`, detail DTO |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — replace stub with shell |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | created (agent 2) |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | updated — `formatMatchedOnDate` for detail header |

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Story 3 is read-only over existing `MutualMatch` + `UserProfile` + photos.

### 2. Extend `MeConversationsService` — do not split module

Same service owns list + detail. Extract private helper to DRY list/detail other-user mapping:

```typescript
private buildOtherUserDto(
  profile: ProfileRow | undefined,
  otherUserId: string,
  asOf: Date,
): ConversationOtherUserDto
```

### 3. Display fields — same as Story 2 (nickname, not firstName)

| Field | Source |
|-------|--------|
| `otherUser.nickname` | `UserProfile.nickname` |
| `gender`, `ageYears`, `locationLabel` | profile + `deriveAgeYears` |
| `profileId`, `photoUrl` | same photo URL pattern as list |

**No `aboutMe` / bio** — matches product rule: raw profile text not exposed on conversation endpoints (optional story `bio` deferred).

### 4. HTTP status mapping

| Condition | Status | Body |
|-----------|--------|------|
| No session | 401 | AuthGuard default |
| Row not found | 404 | `{ error: 'conversation_not_found', message: 'Conversation not found.' }` |
| `status = UNMATCHED` | 404 | same as not found (hide unmatched from UI) |
| Session user not `userId1` or `userId2` | 403 | `{ error: 'conversation_forbidden', message: 'You do not have access to this conversation.' }` |
| ACTIVE + participant | 200 | `ConversationDetailDto` |

Check **404 before 403** when row missing. When row exists but user not participant → 403.

### 5. Detail response includes `status` but only ACTIVE is returned on 200

Story DTO lists `ACTIVE | UNMATCHED`. In practice **200 only when ACTIVE**; UNMATCHED always 404. Field included for forward compatibility (Story 5 unmatch, Sprint 3 messaging).

### 6. Viewer profile gate — session only

Same as Story 2 list: **no ANALYZED requirement** for viewer to open conversation detail.

### 7. Photo URLs — no change

Reuse `/api/v1/me/matches/:profileId/photos/:photoId/file`; mutual-match photo bypass from Story 2 already applies.

### 8. UI replaces stub, not parallel route

Overwrite `dating-ui/src/app/dating/conversations/[id]/page.tsx` (remove Story 2 placeholder copy).

Layout:
- Back link → `/dating/conversations`
- Match card: avatar, primary label, secondary meta, **"Matched on [date]"** (medium date, not relative)
- Messaging area: disabled `<textarea>` or static banner **"Messaging coming soon"** (Sprint 3)

### 9. `lastReadAt`

Always `null` in API until Sprint 3 Story 4 (read tracking).

---

## Prisma schema

**No changes.**

```typescript
const match = await prisma.mutualMatch.findUnique({
  where: { id: conversationId },
  select: {
    id: true,
    userId1: true,
    userId2: true,
    createdAt: true,
    status: true,
  },
});
```

Profile load (single other user):

```typescript
await prisma.userProfile.findUnique({
  where: { userId: otherUserId },
  select: profileSelect, // same as Story 2 list
});
```

---

## Migration plan

N/A.

---

## API contract

### `GET /api/v1/me/conversations/:id`

```
Auth: Session cookie (AuthGuard)
Path param: id = MutualMatch.id (cuid)

Response 200:
{
  "id": "clx...",
  "otherUser": {
    "id": "clu...",
    "profileId": "clp...",
    "nickname": "Noa",
    "gender": "FEMALE",
    "ageYears": 32,
    "locationLabel": "Tel Aviv",
    "photoUrl": "/api/v1/me/matches/clp.../photos/photo_.../file"
  },
  "matchedAt": "2026-05-31T14:00:00.000Z",
  "status": "ACTIVE",
  "lastReadAt": null
}
```

**Status codes:**

| Code | When |
|------|------|
| 200 | ACTIVE mutual match; session user is participant |
| 401 | No session |
| 403 | Row exists; session user not participant |
| 404 | Row missing or `UNMATCHED` |

**Not in Story 3:** send message, message history, DELETE unmatch (Story 5).

---

## DTOs (copy-paste)

```typescript
export interface ConversationDetailDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  status: 'ACTIVE';
  lastReadAt: null;
}
```

Reuse `ConversationOtherUserDto` from Story 2 (already in `me-conversations.service.ts` — export for controller/tests).

---

## Service signatures

### `MeConversationsService`

```typescript
async getById(
  sessionUserId: string,
  conversationId: string,
): Promise<ConversationDetailDto>;
```

### `getById` logic sketch

```typescript
async getById(sessionUserId: string, conversationId: string) {
  const match = await this.prisma.mutualMatch.findUnique({
    where: { id: conversationId },
    select: { id: true, userId1: true, userId2: true, createdAt: true, status: true },
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

  const otherUserId =
    match.userId1 === sessionUserId ? match.userId2 : match.userId1;

  const profile = await this.prisma.userProfile.findUnique({
    where: { userId: otherUserId },
    select: profileSelect,
  });

  const asOf = new Date();

  this.obs.trace(
    `me conversations detail id=${conversationId} userId=${sessionUserId}`,
    ErrorCodes.ME_CONVERSATIONS_DETAIL_OK,
  );

  return {
    id: match.id,
    otherUser: this.buildOtherUserDto(profile ?? undefined, otherUserId, asOf),
    matchedAt: match.createdAt.toISOString(),
    status: 'ACTIVE',
    lastReadAt: null,
  };
}
```

Refactor `list()` to call `buildOtherUserDto` per row.

### Controller addition

```typescript
@Get('conversations/:id')
getConversationById(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
) {
  return this.conversations.getById(user.id, id);
}
```

Register route **after** `@Get('conversations')` (already present). No conflict with other `:id` routes under `me/`.

---

## UI contract

### API client — extend `conversations-api.ts`

```typescript
export interface ConversationDetailDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  status: 'ACTIVE';
  lastReadAt: null;
}

export async function fetchMyConversationById(
  id: string,
): Promise<ConversationDetailDto>;
```

- 404 → throw `Error('Conversation not found.')` (or parse `error` field)
- 403 → throw `Error('You do not have access to this conversation.')`

Mirror `fetchMyMatchById` error handling pattern.

### Page — `conversations/[id]/page.tsx`

- `useParams().id` → `fetchMyConversationById(id)` on mount
- Loading / error (404 message) / success states
- Match card using `conversationPrimaryLabel`, `conversationSecondaryMeta`, `conversationPhotoSrc`
- Subtitle: **`formatMatchedOnDate(matchedAt)`** → e.g. `"Matched on May 31, 2026"`
- Placeholder: disabled input + helper text **"Messaging coming soon"**
- Back link to `/dating/conversations`

### Display helper — `conversation-display.ts`

```typescript
export function formatMatchedOnDate(matchedAt: string): string {
  const date = new Date(matchedAt);
  if (Number.isNaN(date.getTime())) return matchedAt;
  return `Matched on ${date.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
}
```

Keep `formatMatchedAt` (relative) for **list** rows; use `formatMatchedOnDate` on **detail** only.

---

## Test plan (for Agent 2)

### Unit — `me-conversations.service.spec.ts`

| Case | Expected |
|------|----------|
| ACTIVE + participant | returns detail DTO |
| Row not found | `NotFoundException` |
| UNMATCHED row | `NotFoundException` |
| Third user (not participant) | `ForbiddenException` |
| Other user = userId2 when session = userId1 | correct `otherUser.id` |
| Missing other profile | empty profileId, null photo, fallback fields |

### Integration — `me-profile-http.integration.spec.ts`

| Case | Expected |
|------|----------|
| No session | 401 |
| GET valid conversation as participant | 200, `otherUser`, `matchedAt`, `status: ACTIVE` |
| GET as non-participant | 403 |
| GET unknown id | 404 |
| GET UNMATCHED row | 404 |

### UI — `conversations/[id]/page.spec.tsx`

| Case | Expected |
|------|----------|
| Renders match card (name, matched date) | visible |
| Messaging placeholder | visible |
| Back link | `href="/dating/conversations"` |
| 404 error state | message shown |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Bio / evaluation summary on shell** — omitted to avoid exposing raw profile text; can add curated `evaluationSummary` in a follow-up if product wants parity with match detail.
2. **Link to match profile** — not in AC; defer (conversation is separate from `/dating/me-matches/:profileId`).

---

## Next agent

```text
--agent 1 sprint 2 story 3
```

**Notes for next agent:**

1. Refactor `buildOtherUserDto` from list logic — keep list behavior unchanged.
2. Replace stub `[id]/page.tsx`; add `fetchMyConversationById`.
3. Use **nickname** display; ignore story `firstName` / `bio`.
4. **403 vs 404** per table above — integration tests must assert both.
5. Photo bypass from Story 2 — no changes needed.
6. Manual smoke: list → click row → see match card + placeholder.
