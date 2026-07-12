# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_undo.md](../../STORY_04_undo.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Add **DELETE** `/api/v1/me/matches/:id/actions` to remove LIKE or PASS rows (clear decision, enable Like/Pass again).
- **No schema migration** — delete row from existing `MatchAction` table.
- Reuse **`assertMatchCandidateVisible`** for same 404 semantics as GET/POST.
- **BLOCK guard:** if row exists with `action: BLOCK` → **403** (cannot undo); if no row → **404**.
- UI: **Undo** control on match detail when `yourAction` is LIKE or PASS; refetch action state after delete; list badge clears on next list load.
- **Out of scope:** undo block, notifications, list auto-refresh without navigation.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-match-actions.service.ts` | Add `deleteAction()` |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | Unit tests (agent 2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | Add `DELETE matches/:id/actions` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | DELETE tests (agent 2) |
| `dating-ui/src/lib/me-profile-api.ts` | Add `undoMatchAction()` |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | Undo button + handler |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | Undo flow tests (agent 2) |

**No changes expected:**

| Path | Reason |
|------|--------|
| `prisma/schema.prisma` | Delete row only |
| `me-matches.service.ts` | List already returns `yourAction: null` when no row |
| `me-matches/page.tsx` | Badge driven by API; clears after undo + list revisit |

---

## 1. Prisma / schema

**No changes.**

---

## 2. API contracts

### `DELETE /api/v1/me/matches/:id/actions`

| | |
|---|---|
| **Auth** | `AuthGuard` (existing on controller) |
| **Actor** | `@CurrentUser().id` |
| **Path param** | `:id` = candidate `UserProfile.id` |

**Request body:** none

**Response `204 No Content`** — LIKE or PASS row deleted successfully.

(No response body. Client refetches `GET .../actions` or assumes `{ action: null }`.)

**Status codes:**

| Code | When |
|------|------|
| `204` | LIKE or PASS row deleted |
| `401` | No session |
| `403` | Row exists with `action: BLOCK` — cannot undo |
| `404` | Match not visible (`assertMatchCandidateVisible`), **or** visible but no action row |

**404 vs 403:**

| Situation | Code |
|-----------|------|
| Candidate not visible | `404` (same as GET detail) |
| Visible, never acted | `404` — `"No action to undo"` |
| Visible, LIKE or PASS row | `204` on DELETE |
| Visible, BLOCK row | `403` — `"Blocked matches cannot be undone"` |

Story 5 may hide blocked profiles from list/detail; Story 4 still implements the guard so DELETE never removes BLOCK rows.

---

## 3. Service design

### `MeMatchActionsService.deleteAction`

```typescript
async deleteAction(
  actorUserId: string,
  candidateProfileId: string,
): Promise<void>;
```

**Logic (ordered):**

1. `assertMatchCandidateVisible(actorUserId, candidateProfileId)` → `{ targetUserId }`.
2. `findUnique` on `(actorUserId, targetUserId)` — select `{ action: true }`.
3. If no row → `NotFoundException('No action to undo')`.
4. If `row.action === BLOCK` → `ForbiddenException('Blocked matches cannot be undone')`.
5. `delete({ where: { actorUserId_targetUserId: { actorUserId, targetUserId } } })`.
6. Return void (controller sends 204).

**Do not** delete without visibility check — prevents acting on profiles user cannot see.

**Do not** allow DELETE to “clear” BLOCK — Story 5 depends on this guard.

---

## 4. Controller

Add after POST route (group read/write/delete on same path):

```typescript
@Delete('matches/:id/actions')
@HttpCode(HttpStatus.NO_CONTENT)
deleteMatchAction(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
) {
  return this.matchActions.deleteAction(user.id, id);
}
```

NestJS: `deleteAction` returns `Promise<void>` → empty 204 body.

---

## 5. Frontend

### API client (`me-profile-api.ts`)

```typescript
export async function undoMatchAction(profileId: string): Promise<void> {
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/actions`;
  // DELETE, credentials: 'include'
  // 401 → logged-in message
  // 403 → surface server message (block guard)
  // 404 → match not found / no action
  // 204 → success (no JSON body)
}
```

### Match detail (`me-matches/[id]/page.tsx`)

**When `yourAction` is `LIKE` or `PASS`:**

Current footer shows status message only. **Extend:**

```
[You liked this person]     or     [You passed on this person]
[Undo]  ← text button, zinc/muted link style — not primary emerald
[Back to matches]
```

**When `yourAction` is `BLOCK` (Story 5 future):**

Status message only — **no Undo** (DELETE would 403 anyway).

**Handler `handleUndo`:**

1. Guard: `yourAction` must be LIKE or PASS; not already saving.
2. `setActionSaving(true)` (reuse shared flag).
3. `await undoMatchAction(id)`.
4. Refetch `fetchMatchAction(id)` → expect `{ action: null }`.
5. `setYourAction(null)` → Like/Pass buttons reappear.
6. On error: inline alert; keep status message + Undo visible.

**List badge:** User navigates back to list → existing `fetchMyMatches()` returns `yourAction: null` for that row. No client-side cache invalidation required for MVP (optional: router refresh later).

**Copy:** Button label **"Undo"** (aria-label e.g. `Undo your like on this match` / `Undo your pass on this match`).

---

## 6. Tests (for agent 2)

### API integration

**`DELETE /api/v1/me/matches/:id/actions`**

| Test | Expect |
|------|--------|
| No session | 401 |
| Unknown / ineligible candidate | 404 |
| Visible, no action row | 404 |
| Visible, LIKE row → DELETE | 204; subsequent GET `{ action: null }` |
| Visible, PASS row → DELETE | 204 |
| Visible, BLOCK row → DELETE | 403; row not deleted |
| After DELETE, POST LIKE works again | 201 |

Reuse `mockEligibleMatchDetail()` from POST tests; mock `matchAction.findUnique` + `delete`.

### Unit (`me-match-actions.service.spec.ts`)

| Test | Expect |
|------|--------|
| Deletes LIKE row | `prisma.matchAction.delete` called |
| No row | `NotFoundException` |
| BLOCK row | `ForbiddenException` |
| Visibility failure | propagates from `assertMatchCandidateVisible` |

### UI (`[id]/page.spec.tsx`)

| Test | Expect |
|------|--------|
| LIKE on load | Undo visible; Like/Pass hidden |
| Click Undo | `undoMatchAction` called; Like/Pass reappear |
| PASS on load + undo | same pattern |
| BLOCK on load (mock) | no Undo button (optional until Story 5) |

---

## Decisions (do not reverse without discussion)

1. **No migration** — hard delete row; no soft-delete / history table.
2. **204 No Content** on success — client refetches GET state.
3. **403 for BLOCK** — not 404 (action exists but forbidden).
4. **404 when no row** — distinct from “match not visible” message optional; same 404 class is fine.
5. **Undo only on detail** — no list-row undo in Story 4 (keep scope small).
6. **Reuse `assertMatchCandidateVisible`** — same as create/get.
7. **BLOCK UI:** no Undo button when `yourAction === 'BLOCK'` (Story 5).

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

- None. Stories 1, 2, 3 provide POST/GET/list foundation; BLOCK rows unlikely until Story 5 but guard must ship in Story 4.

---

## Next agent

```text
--agent 1 story 4
```

**Notes for next agent:**

1. Implement `deleteAction` + controller DELETE route.
2. Add `undoMatchAction()` client; Undo button in footer when LIKE/PASS.
3. Reuse `actionSaving` / `actionError` for undo in-flight state.
4. Manual smoke: like → undo → like again; pass → undo → pass again.
5. No list page changes required for DoD (badge clears on reload).
