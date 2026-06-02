# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_match_notification.md](../../STORY_04_match_notification.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **No Prisma migration** — expose existing `MutualMatch` in HTTP responses.
- Extend **`MatchActionDto`** (POST LIKE/PASS/BLOCK) with **`mutualMatch: boolean`** and optional **`conversationId`** (`MutualMatch.id` when mutual + ACTIVE).
- Extend **`MatchActionStateDto`** (GET actions) with same fields for **persistent "You matched!" badge** on match detail page load.
- **`mutualMatch: true`** only when ACTIVE mutual exists **after** the write (second liker gets `true`; first liker gets `false`; re-LIKE when already mutual → `true`).
- UI: **celebration modal** on POST response when `mutualMatch`; **badge** on `/dating/me-matches/[id]` from GET action state; CTA → `/dating/conversations/:conversationId`.
- Modal content uses **match detail already on page** (photo, nickname) — no new API for candidate display in modal.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A |
| `dating-api/src/me-profile/me-match-actions.dto.ts` | updated — extend DTOs |
| `dating-api/src/me-profile/me-match-actions.service.ts` | updated — populate mutual fields |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — reciprocal LIKE returns flag |
| `dating-ui/src/lib/me-profile-api.ts` | updated — DTO types |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | updated — modal + badge |
| `dating-ui/src/components/match-celebration-modal.tsx` | created — optional extracted component |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Story 4 is response + UI only. Mutual row already created by Story 1 detection.

### 2. Use `detectAndCreateMutualMatch` return value — avoid extra query on POST

After LIKE inside transaction, `detectAndCreateMutualMatch` returns `MutualMatch | null`:

| Case | Return | `mutualMatch` | `conversationId` |
|------|--------|---------------|------------------|
| First-sided LIKE | `null` | `false` | omit / `null` |
| Second LIKE creates mutual | row, `ACTIVE` | `true` | `row.id` |
| Re-LIKE, already ACTIVE | row (upsert no-op) | `true` | `row.id` |
| Row exists `UNMATCHED` | row stays UNMATCHED | `false` | omit / `null` |

For PASS/BLOCK: always `mutualMatch: false`, no `conversationId`.

**Do not use `Math.min`/`Math.max` on user IDs** — story draft is wrong. Use existing `MutualMatchesService.sortUserPair` / `findActiveByUserPair`.

### 3. ACTIVE-only counts as mutual

`mutualMatch: true` requires `status === ACTIVE`. UNMATCHED rows (Story 5) → `false`.

### 4. Extend GET action state for persistent badge

Story AC: badge on match detail **on page load**, not only right after Like.

Extend **`GET /api/v1/me/matches/:id/actions`** response:

```typescript
interface MatchActionStateDto {
  action: 'LIKE' | 'PASS' | 'BLOCK' | null;
  createdAt?: string;
  mutualMatch: boolean;           // NEW
  conversationId?: string | null; // NEW — MutualMatch.id when mutualMatch
}
```

Implementation: after loading action row, call `findActiveByUserPair(actorUserId, targetUserId)`.

Do **not** extend `MeMatchDetailDto` (keeps match engine detail separate from actions domain).

### 5. POST response — full MatchActionDto preserved

Add fields to existing shape; do **not** remove `id`, `actorUserId`, etc.

```typescript
interface MatchActionDto {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetProfileIdSnapshot: string;
  action: 'LIKE' | 'PASS' | 'BLOCK';
  createdAt: string;
  mutualMatch: boolean;          // NEW — always present
  conversationId?: string | null; // NEW — only meaningful when mutualMatch
}
```

### 6. Who sees the modal?

Only the user who **just** POSTed LIKE and received `mutualMatch: true` (typically the second liker). User A (first like) does not get a modal retroactively — they see badge on return to detail page.

Push/email out of scope.

### 7. Modal UX (minimal)

- **Trigger:** `likeMatch()` resolves with `mutualMatch === true`
- **Content:** "It's a match!", candidate photo (`data.primaryPhotoUrl`), name (`matchDetailTitle(data)`)
- **Primary CTA:** "Send a message" → `router.push(/dating/conversations/${conversationId})`
- **Dismiss:** X button + click backdrop (optional) — closes modal, stay on match detail
- **No confetti/sound** (story out of scope)

Extract `MatchCelebrationModal` if page grows; inline OK for agent 1.

### 8. Badge UX

When `fetchMatchAction` returns `mutualMatch: true`, show badge near action status:

- Text: **"You matched!"** (or emerald pill matching existing Liked badge style)
- Optional link to conversation using `conversationId`

Show even when `yourAction === 'LIKE'` and user landed on page without just liking.

### 9. Photo URL in modal

Use `MeMatchDetailDto.primaryPhotoUrl` + `getApiBase()` prefix (same as conversations list).

---

## Prisma schema

**No changes.**

---

## Migration plan

N/A.

---

## API contract

### `POST /api/v1/me/matches/:profileId/actions`

Existing auth/validation unchanged.

**Response 201 (LIKE, mutual just became active):**

```json
{
  "id": "action_...",
  "actorUserId": "user_b",
  "targetUserId": "user_a",
  "targetProfileIdSnapshot": "prof_a",
  "action": "LIKE",
  "createdAt": "2026-05-31T15:00:00.000Z",
  "mutualMatch": true,
  "conversationId": "mutual_row_1"
}
```

**Response 201 (LIKE, one-sided):**

```json
{
  "...": "...",
  "action": "LIKE",
  "mutualMatch": false,
  "conversationId": null
}
```

**Response 201 (PASS/BLOCK):**

```json
{
  "...": "...",
  "action": "PASS",
  "mutualMatch": false,
  "conversationId": null
}
```

### `GET /api/v1/me/matches/:profileId/actions`

**Response 200:**

```json
{
  "action": "LIKE",
  "createdAt": "2026-05-31T14:00:00.000Z",
  "mutualMatch": true,
  "conversationId": "mutual_row_1"
}
```

When no action: `{ "action": null, "mutualMatch": false, "conversationId": null }`  
(Mutual without viewer action shouldn't happen in product, but `mutualMatch` reflects pair state regardless.)

---

## Service signatures

### Helper — `MeMatchActionsService` (private)

```typescript
private async mutualFieldsForPair(
  actorUserId: string,
  targetUserId: string,
): Promise<{ mutualMatch: boolean; conversationId: string | null }>;
```

Uses `MutualMatchesService.findActiveByUserPair`.

### `createAction` — after transaction

```typescript
const mutualFields =
  action === MatchActionType.LIKE
    ? this.mutualFieldsFromDetectResult(
        await this.mutualMatches.detectAndCreateMutualMatch(...) // already in tx — refactor to capture return
      )
    : { mutualMatch: false, conversationId: null };

return {
  ...existingFields,
  mutualMatch: mutualFields.mutualMatch,
  conversationId: mutualFields.conversationId,
};
```

**Refactor note:** Today `createAction` ignores `detectAndCreateMutualMatch` return inside `$transaction`. Capture return value from detection call; map ACTIVE row → `{ mutualMatch: true, conversationId: row.id }`, else false.

Alternative post-tx: `findActiveByUserPair` — simpler but extra query; **prefer capture return** from detection inside same transaction flow (detection already ran).

### `getActionState` — add mutual lookup

```typescript
const mutual = await this.mutualMatches.findActiveByUserPair(
  actorUserId,
  targetUserId,
);
return {
  action: row?.action ?? null,
  createdAt: row?.createdAt.toISOString(),
  mutualMatch: !!mutual,
  conversationId: mutual?.id ?? null,
};
```

---

## UI contract

### Types — `me-profile-api.ts`

Mirror API fields on `MatchActionDto` and `MatchActionStateDto` (or shared `MatchMutualInfo` snippet).

### `me-matches/[id]/page.tsx`

**State:**

```typescript
const [celebration, setCelebration] = useState<{
  conversationId: string;
} | null>(null);
const [mutualMatch, setMutualMatch] = useState(false);
const [conversationId, setConversationId] = useState<string | null>(null);
```

**On mount** (`fetchMatchAction`): set `mutualMatch` + `conversationId` from response.

**On Like:**

```typescript
const result = await likeMatch(id);
if (result.mutualMatch && result.conversationId) {
  setCelebration({ conversationId: result.conversationId });
  setMutualMatch(true);
  setConversationId(result.conversationId);
}
```

**Badge:** render when `mutualMatch === true`.

**Modal:** render when `celebration != null && data != null`.

### Component sketch — `MatchCelebrationModal`

```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  photoUrl: string | null;
  conversationId: string;
  onSendMessage: () => void;
}
```

Use fixed overlay + centered card; zinc/emerald palette consistent with app.

---

## Test plan (for Agent 2)

### Unit — `me-match-actions.service.spec.ts`

| Case | Expected |
|------|----------|
| LIKE, detection returns null | `mutualMatch: false` |
| LIKE, detection returns ACTIVE row | `mutualMatch: true`, `conversationId` set |
| PASS | `mutualMatch: false` |
| getActionState, ACTIVE mutual exists | `mutualMatch: true` |
| getActionState, no mutual | `mutualMatch: false` |

### Integration — `me-profile-http.integration.spec.ts`

| Case | Expected |
|------|----------|
| A likes B | 201, `mutualMatch: false` |
| B likes A | 201, `mutualMatch: true`, `conversationId` present |
| GET actions as B after mutual | `mutualMatch: true` |

### UI — `me-matches/[id]/page.spec.tsx`

| Case | Expected |
|------|----------|
| likeMatch returns `mutualMatch: true` | modal visible, "It's a match!" |
| fetchMatchAction returns mutual | badge "You matched!" |
| CTA click | navigates to `/dating/conversations/:id` |
| Close modal | modal hidden |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **User A never sees modal** — only badge on revisit; acceptable per AC (second liker gets celebration). Optional future: notify first liker via push.
2. **Undo LIKE after mutual** — Story 1 deferred; badge may stay wrong until Story 5/follow-up. Document, don't fix in Story 4.

---

## Next agent

```text
--agent 1 sprint 2 story 4
```

**Notes for next agent:**

1. Capture `detectAndCreateMutualMatch` return in `createAction` for POST fields.
2. Extend `getActionState` for badge on page load.
3. Always send `mutualMatch` boolean (never omit).
4. Modal only on POST response `mutualMatch: true`, not on page load alone.
5. CTA uses `conversationId` → Story 3 conversation shell route.
