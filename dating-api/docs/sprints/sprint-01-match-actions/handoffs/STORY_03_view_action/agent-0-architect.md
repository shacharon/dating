# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_view_action.md](../../STORY_03_view_action.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Add **read path** for match actions: `GET /api/v1/me/matches/:id/actions` and **`yourAction`** on list items.
- **No schema migration** — reuse `MatchAction` from Story 1.
- List: one batch query for viewer’s actions (no N+1); map by `targetUserId` → candidate profile row.
- Detail: fetch action state on page load (fixes Story 1 refresh gap); hide Like when action exists.
- List: subtle badge (“Liked” / “Passed” / “Blocked”) per row.
- **Out of scope:** undo (Story 4), Pass button (Story 2), “they liked you” (Phase 2).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-match-actions.dto.ts` | Add `MatchActionStateDto` |
| `dating-api/src/me-profile/me-match-actions.service.ts` | Add `getActionState()` |
| `dating-api/src/me-profile/me-matches.service.ts` | Extend `MeMatchItemDto` + batch join in `list()` |
| `dating-api/src/me-profile/me-profile.controller.ts` | Add `GET matches/:id/actions` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | GET + list `yourAction` tests (agent 2) |
| `dating-ui/src/lib/me-profile-api.ts` | `fetchMatchAction()`, extend `MeMatchItemDto` |
| `dating-ui/src/app/dating/me-matches/page.tsx` | List badges |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | Load action on mount; hide Like when acted |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | Badge tests (agent 2) |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | Reload/state tests (agent 2) |

---

## 1. Prisma / schema

**No changes.** Use existing `MatchAction` + `MatchActionType`.

---

## 2. API contracts

### `GET /api/v1/me/matches/:id/actions`

| | |
|---|---|
| **Auth** | `AuthGuard` (existing on controller) |
| **Actor** | `@CurrentUser().id` |
| **Path param** | `:id` = candidate `UserProfile.id` |

**Response `200 OK` — action exists:**

```json
{
  "action": "LIKE",
  "createdAt": "2026-05-31T12:00:00.000Z"
}
```

**Response `200 OK` — no action:**

```json
{
  "action": null
}
```

(`createdAt` omitted when `action` is null.)

**Status codes:**

| Code | When |
|------|------|
| `200` | Match visible; returns action or null |
| `401` | No session |
| `404` | Same visibility as `GET /api/v1/me/matches/:id` (viewer not ready, candidate missing/ineligible) |

**Do not** return 404 when match is visible but user has not acted — return `{ action: null }`.

---

### `GET /api/v1/me/matches` (list) — extended item shape

Add to each `MeMatchItemDto`:

```typescript
yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
```

Only present when `status === 'ready'`. Default `null` when viewer has no row for that candidate’s **user id**.

**Do not** expose `targetUserId` or internal ids in list DTO.

---

## 3. Service design

### `MeMatchActionsService.getActionState`

```typescript
export interface MatchActionStateDto {
  action: MatchActionType | null;
  createdAt?: string; // ISO 8601; present only when action !== null
}

async getActionState(
  actorUserId: string,
  candidateProfileId: string,
): Promise<MatchActionStateDto>;
```

**Logic:**

1. **Visibility** — same rules as `createAction` (reuse `MeMatchesService.getById(actorUserId, candidateProfileId)` for consistency, or extract shared `assertMatchCandidateVisible` — prefer extract to avoid double full detail assembly on GET).
2. Resolve `candidateProfileId` → `targetUserId` via `userProfile.findUnique({ select: { userId: true } })`.
3. `matchAction.findUnique({ where: { actorUserId_targetUserId: { actorUserId, targetUserId } } })`.
4. If no row → `{ action: null }`.
5. If row → `{ action: row.action, createdAt: row.createdAt.toISOString() }`.

**Do not** expose `actorUserId` / `targetUserId` on GET state DTO (read-only UX shape).

---

### `MeMatchesService.list` — batch join (no N+1)

**Problem:** Actions keyed by `(actorUserId, targetUserId)`; list rows keyed by `UserProfile.id`.

**Steps:**

1. Add `userId: true` to `candidateSelect` (internal; not exposed in DTO except via mapping).
2. After gender/HG filtering, before or while building `matches[]`, collect `targetUserIds` for eligible candidates.
3. **Single query:**

```typescript
const actionRows = await this.prisma.matchAction.findMany({
  where: {
    actorUserId: userId,
    targetUserId: { in: eligibleTargetUserIds },
  },
  select: { targetUserId: true, action: true },
});
const actionByTargetUserId = new Map(
  actionRows.map((r) => [r.targetUserId, r.action]),
);
```

4. When pushing each `MeMatchItemDto`:

```typescript
yourAction: actionByTargetUserId.get(row.userId) ?? null,
```

**Performance:** 1 extra query per list request; index `@@index([actorUserId, action])` supports this.

**Optional later:** hide blocked profiles from list (Story 5 scope); Story 3 **shows** `yourAction: 'BLOCK'` badge but still lists them unless Story 5 says otherwise.

---

## 4. Controller

Add **before** `POST matches/:id/actions` (read before write):

```typescript
@Get('matches/:id/actions')
getMatchAction(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
) {
  return this.matchActions.getActionState(user.id, id);
}
```

Route order: keep `matches/:id/photos/...` more specific paths registered as today.

---

## 5. Frontend

### API client (`me-profile-api.ts`)

```typescript
export interface MatchActionStateDto {
  action: 'LIKE' | 'PASS' | 'BLOCK' | null;
  createdAt?: string;
}

export async function fetchMatchAction(profileId: string): Promise<MatchActionStateDto>;

// Extend MeMatchItemDto:
yourAction?: 'LIKE' | 'PASS' | 'BLOCK' | null;
```

### Match list (`me-matches/page.tsx`)

For each row where `m.yourAction != null`, show a subtle pill next to the score:

| `yourAction` | Label | Style hint |
|--------------|-------|------------|
| `LIKE` | Liked | emerald muted pill |
| `PASS` | Passed | zinc muted pill |
| `BLOCK` | Blocked | red/zinc muted pill |

Use `aria-label` e.g. `You liked this match`.

### Match detail (`me-matches/[id]/page.tsx`)

**On mount** (parallel with `fetchMyMatchById`):

```typescript
Promise.all([fetchMyMatchById(id), fetchMatchAction(id)])
```

**Initial state from server:**

| `action` | UI |
|----------|-----|
| `null` | Show Like button (Story 1 behavior) |
| `LIKE` | “You liked this person” — **no Like button** |
| `PASS` | “You passed on this person” — no action buttons (Pass button = Story 2) |
| `BLOCK` | “You blocked this person” — no buttons |

**After successful POST like:** set local state from POST response **or** refetch `fetchMatchAction` — prefer refetch for single source of truth.

**Story 3 rule:** When `yourAction != null`, hide Like (and Pass when Story 2 adds it). No undo until Story 4.

---

## 6. Shared visibility helper (recommended)

Extract from `MeMatchesService.getById` + `MeMatchActionsService.createAction`:

```typescript
// MeMatchesService
async assertMatchCandidateVisible(
  viewerUserId: string,
  candidateProfileId: string,
): Promise<{ candidateProfileId: string; targetUserId: string }>;
```

Use in `createAction`, `getActionState`, and future Story 4 `deleteAction`.

---

## 7. Tests (for agent 2)

### API integration

**`GET /api/v1/me/matches/:id/actions`**

| Test | Expect |
|------|--------|
| No session | 401 |
| Unknown / ineligible candidate | 404 |
| Visible, no action row | 200 `{ action: null }` |
| Visible, LIKE row | 200 `{ action: 'LIKE', createdAt }` |

**`GET /api/v1/me/matches` (list)**

| Test | Expect |
|------|--------|
| Viewer with LIKE on one candidate | That item has `yourAction: 'LIKE'`, others `null` |
| No actions | all `yourAction: null` |

### UI

| Test | Expect |
|------|--------|
| List row with `yourAction: 'LIKE'` | “Liked” badge visible |
| Detail: `fetchMatchAction` returns LIKE | No Like button; confirmation text |
| Detail: `action: null` | Like button shown |

---

## Decisions (do not reverse without discussion)

1. **No new migration** — read-only on existing table.
2. **GET returns minimal shape** — `{ action, createdAt? }`, not full `MatchActionDto`.
3. **List join by `targetUserId`** — add `userId` to internal candidate select only.
4. **404 on GET** = match not visible, not “no action”.
5. **Detail loads action via GET** — do not require extending `MeMatchDetailDto` (optional optimization later).
6. **Action exists → hide buttons** until Story 4 undo (not disabled-with-undo).
7. **Display all action types** in UI copy even though only LIKE can be created until Stories 2/5.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

- None. Depends on Story 1 (`MatchAction` + POST) — **done**.

---

## Next agent

```text
--agent 1 story 3
```

**Notes for next agent:**

1. Implement `assertMatchCandidateVisible` (or reuse `getById`) before GET/list join.
2. Wire GET route on controller; extend list DTO + `MeMatchesService.list`.
3. Detail page: parallel fetch on mount — fixes refresh UX gap from Story 1.
4. After POST like, refetch action state or merge POST result into UI state.
5. No undo UI/API in this story.
