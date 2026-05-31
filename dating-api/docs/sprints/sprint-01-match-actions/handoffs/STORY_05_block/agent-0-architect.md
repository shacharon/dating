# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_block.md](../../STORY_05_block.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Enable **BLOCK** on existing `POST /api/v1/me/matches/:id/actions` — remove Story 2 LIKE/PASS-only gate.
- **No schema migration** — `MatchActionType.BLOCK` already exists from Story 1.
- **Hide blocked matches** — viewer-initiated BLOCK removes candidate from list and detail (404, same semantics as ineligible match).
- **One-way block (MVP):** only hide when **viewer blocked target** (`actorUserId = viewer`, `action = BLOCK`). Do **not** hide when target blocked viewer (out of scope; document for Phase 2).
- **No undo** — Story 4 DELETE guard remains; after Story 5 blocked profiles are not visible so DELETE typically returns **404** before reaching the 403 BLOCK guard.
- UI: **Block** button on match detail (available even when liked/passed), **inline confirm** (“Are you sure? This can’t be undone.”), then **redirect to list**.
- **Out of scope:** moderation/reporting, mutual/two-way block visibility, list-row block without opening detail.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-match-actions.service.ts` | Allow `BLOCK` in `createAction` |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | BLOCK happy path; remove Story 5 gate test |
| `dating-api/src/me-profile/me-matches.service.ts` | Exclude BLOCK from list; block guard in `getById`, `assertMatchCandidateVisible`, `getPrimaryPhotoFileById` |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | List exclusion + detail 404 tests (agent 2) |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | BLOCK POST + list/detail hide tests (agent 2) |
| `dating-ui/src/lib/me-profile-api.ts` | Add `blockMatch()`; extend `recordMatchAction` or parallel helper for `BLOCK` |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | Block button, confirm step, redirect on success |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | Block + confirm + redirect tests (agent 2) |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | Blocked row absent from list (agent 2) |

**No changes expected:**

| Path | Reason |
|------|--------|
| `prisma/schema.prisma` | BLOCK enum + table already exist |
| `me-profile.controller.ts` | POST route unchanged |
| `me-match-actions.service.ts` `deleteAction` | BLOCK guard already shipped (Story 4) |

**Optional cleanup (not required for DoD):**

| Path | Reason |
|------|--------|
| `dating-ui/src/app/dating/me-matches/page.tsx` | `BLOCK` badge branch becomes unreachable once list excludes blocked rows |

---

## 1. Prisma / schema

**No changes.** Reuse `MatchAction` + `MatchActionType` (`LIKE`, `PASS`, `BLOCK`).

---

## 2. API contracts

### `POST /api/v1/me/matches/:id/actions` (updated behavior)

| | |
|---|---|
| **Auth** | `AuthGuard` (existing on controller) |
| **Actor** | `@CurrentUser().id` |
| **Path param** | `:id` = candidate `UserProfile.id` |

**Request body — Story 5 accepts:**

```json
{ "action": "BLOCK" }
```

Also still accepts `{ "action": "LIKE" }` and `{ "action": "PASS" }`.

**Response `201 Created` (BLOCK):**

```json
{
  "id": "cuid",
  "actorUserId": "user-id",
  "targetUserId": "other-user-id",
  "targetProfileIdSnapshot": "profile-id-from-path",
  "action": "BLOCK",
  "createdAt": "2026-05-31T12:00:00.000Z"
}
```

**Status codes:**

| Code | When |
|------|------|
| `201` | BLOCK created or updated (upsert overwrites LIKE/PASS) |
| `400` | Self-action; invalid body |
| `401` | No session |
| `404` | Match not visible (viewer not ready, candidate ineligible, **or viewer already blocked this target**) |

**Overwrite semantics:**

| Existing row | POST BLOCK |
|--------------|------------|
| none | create BLOCK |
| LIKE | update to BLOCK |
| PASS | update to BLOCK |
| BLOCK | **404** — match no longer visible after first block (cannot re-block via API without undo; undo forbidden) |

**Idempotency note:** First POST BLOCK succeeds while match is visible. Subsequent POST/GET/DELETE on same pair after block → **404** via visibility guard (acceptable MVP).

---

### `GET /api/v1/me/matches` (list) — behavior change

Blocked candidates are **excluded from `matches[]`**, not returned with `yourAction: 'BLOCK'`.

| Before Story 5 | After Story 5 |
|----------------|---------------|
| Row present, `yourAction: 'BLOCK'`, “Blocked” badge | Row **absent** from list |

`yourAction` on remaining rows unchanged (`LIKE`, `PASS`, or `null`).

---

### `GET /api/v1/me/matches/:id` (detail) — behavior change

Returns **404** `"Match not found."` when viewer has `BLOCK` row toward candidate’s user id.

Same for:

- `GET /api/v1/me/matches/:id/actions`
- `GET /api/v1/me/matches/:id/photos/:photoId/file`
- `DELETE /api/v1/me/matches/:id/actions` (404 before Story 4’s 403 BLOCK guard in normal flow)

---

## 3. Service design

### 3a. `MeMatchActionsService.createAction`

**Change:** Remove LIKE/PASS-only gate:

```typescript
// DELETE this block:
if (action !== MatchActionType.LIKE && action !== MatchActionType.PASS) {
  throw new BadRequestException('Only LIKE and PASS are supported in this release');
}
```

Keep existing flow: `assertMatchCandidateVisible` → upsert on `(actorUserId, targetUserId)` → return DTO.

BLOCK uses same upsert — overwrites LIKE/PASS on the same row.

---

### 3b. Block visibility helper (`MeMatchesService`)

Add a **private** method to centralize the rule:

```typescript
private async assertViewerHasNotBlockedTarget(
  viewerUserId: string,
  targetUserId: string,
): Promise<void> {
  const row = await this.prisma.matchAction.findUnique({
    where: {
      actorUserId_targetUserId: { actorUserId: viewerUserId, targetUserId },
    },
    select: { action: true },
  });
  if (row?.action === MatchActionType.BLOCK) {
    throw new NotFoundException('Match not found.');
  }
}
```

Import `MatchActionType` from `@prisma/client`.

**Call sites (ordered):**

1. **`assertMatchCandidateVisible`** — after eligibility + eval checks, before return:

   ```typescript
   await this.assertViewerHasNotBlockedTarget(viewerUserId, candidate.userId);
   return { candidateProfileId: candidate.id, targetUserId: candidate.userId };
   ```

   This covers GET actions, POST (post-block retry → 404), DELETE.

2. **`getById`** — after candidate loaded and eligible, before scoring:

   ```typescript
   await this.assertViewerHasNotBlockedTarget(userId, candidate.userId);
   ```

   (`getById` does not call `assertMatchCandidateVisible` today — duplicate check required here.)

3. **`getPrimaryPhotoFileById`** — after gender eligibility, before photo lookup:

   ```typescript
   await this.assertViewerHasNotBlockedTarget(userId, candidate.userId);
   ```

4. **`list`** — inside candidate loop, after gender/HG gates, **before** scoring (save work):

   ```typescript
   if (actionByTargetUserId.get(row.userId) === MatchActionType.BLOCK) {
     continue;
   }
   ```

   Reuse existing `actionByTargetUserId` map — no extra query per row.

**Do not** hide when **target blocked viewer** (`actorUserId = candidate.userId`, `targetUserId = viewer`). That requires a reverse lookup — defer to Phase 2.

---

## 4. Controller

**No route changes.** Existing POST/GET/DELETE on `matches/:id/actions` pick up BLOCK via service changes.

---

## 5. Frontend

### API client (`me-profile-api.ts`)

Add:

```typescript
export async function blockMatch(profileId: string): Promise<MatchActionDto> {
  // POST { action: 'BLOCK' }, credentials: 'include'
  // 401 → 'You must be logged in to block a match.'
  // 404 → 'Match not found.'
  // 201 → MatchActionDto
}
```

Either extend `recordMatchAction` to accept `'BLOCK'` or duplicate fetch with BLOCK-specific error copy (match `likeMatch` / `passMatch` pattern).

Update `MatchActionDto.action` type if still narrowed to `'LIKE' | 'PASS'`.

---

### Match detail (`me-matches/[id]/page.tsx`)

**Block control — always visible** when match detail loaded (not loading/error), including when `yourAction` is `LIKE` or `PASS`. Hidden only while `actionSaving`.

**Two-step confirm (no `window.confirm` — none used elsewhere):**

1. **Default:** muted destructive text button **“Block”** below action footer (separate from Like/Pass row).
2. **Click Block:** show inline confirm panel:
   - Copy: **“Are you sure? This can’t be undone.”**
   - Buttons: **Cancel** (secondary) | **Block permanently** (destructive — red border/text, not emerald primary).
3. **Cancel:** hide panel, no API call.
4. **Confirm:** call `blockMatch(id)` → `router.push('/dating/me-matches')` on success.

**Handler `handleBlockConfirm`:**

1. Guard: `id`, not `actionSaving`.
2. `setActionSaving(true)`; clear errors.
3. `await blockMatch(id)`.
4. `router.push('/dating/me-matches')` — do **not** refetch action state (detail will 404 anyway).
5. On error: inline alert; keep confirm panel open or reset to Block button (dev choice; prefer reset to single Block button + error).

**Layout sketch:**

```
[Like] [Pass]                    ← when yourAction null
[You liked…] [Undo]              ← when LIKE/PASS
[Block]                          ← always (when not saving)
```

When confirm open, replace Block button with confirm panel.

**After block:** user lands on list; blocked row absent.

**Direct URL to blocked detail:** existing error UI shows API message (“Match not found.”) — acceptable per story smoke.

---

## 6. Tests (for agent 2)

### API integration (`me-profile-http.integration.spec.ts`)

**POST BLOCK**

| Test | Expect |
|------|--------|
| No session | 401 |
| Happy path BLOCK | 201, body `action: 'BLOCK'`, DB row |
| BLOCK overwrites LIKE | 201; single row, action BLOCK |
| BLOCK overwrites PASS | 201 |
| Unknown profile | 404 |
| Self-action | 400 |

**Replace** existing `returns 400 for BLOCK (Story 5 gate)` with happy-path tests.

**List filter**

| Test | Expect |
|------|--------|
| Viewer BLOCK toward candidate | candidate **not** in `matches[]` |
| Viewer LIKE toward candidate | candidate still in list |

**Detail guard**

| Test | Expect |
|------|--------|
| After BLOCK, GET detail | 404 |
| After BLOCK, GET actions | 404 |
| After BLOCK, GET photo file | 404 |

**Undo guard (regression)**

| Test | Expect |
|------|--------|
| After BLOCK, DELETE actions | 404 (visibility) — row still in DB |

Optional: keep existing unit test `returns 403 when action is BLOCK` with mock that bypasses visibility (documents Story 4 guard if match were still “visible”).

### Unit (`me-match-actions.service.spec.ts`)

| Test | Expect |
|------|--------|
| `rejects BLOCK until Story 5` | **Remove** — replace with BLOCK creates row |
| BLOCK upsert overwrites LIKE | update path |

### Unit (`me-matches.service.spec.ts`)

| Test | Expect |
|------|--------|
| List skips BLOCK target | excluded from output |
| getById when BLOCK row | `NotFoundException` |
| assertMatchCandidateVisible when BLOCK | `NotFoundException` |

### UI (`[id]/page.spec.tsx`)

| Test | Expect |
|------|--------|
| Block button visible on load | present |
| Click Block → confirm copy shown | “Are you sure? This can’t be undone.” |
| Cancel hides confirm | no API call |
| Confirm Block | `blockMatch` called; `router.push('/dating/me-matches')` |
| Block visible when LIKE loaded | Block still shown alongside Undo |

Mock `useRouter` from `next/navigation`.

### UI (`page.spec.tsx`)

| Test | Expect |
|------|--------|
| List mock with one BLOCK row excluded server-side | row not rendered (API returns filtered list — mock empty or without blocked id) |

---

## Decisions (do not reverse without discussion)

1. **One-way block only (MVP)** — hide when viewer blocked target; **not** when target blocked viewer.
2. **404 for hidden blocked matches** — same message as ineligible match; do not leak block state.
3. **Exclude from list** — do not show `yourAction: 'BLOCK'` badge on list (row gone).
4. **BLOCK overwrites LIKE/PASS** — same upsert row; no separate history.
5. **No undo** — Story 4 DELETE + visibility 404; never expose Undo for BLOCK in UI.
6. **Inline confirm** — not native `window.confirm`; matches app styling.
7. **Redirect after block** — `router.push('/dating/me-matches')`; no success toast required for MVP.
8. **Block available when liked/passed** — safety action overrides prior LIKE/PASS without undo first.
9. **No migration** — reuse Story 1 schema.
10. **`assertViewerHasNotBlockedTarget` in `MeMatchesService`** — single source for list + detail + photo + actions visibility.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

- None. Stories 1–4 provide POST/GET/list/undo foundation; BLOCK enum exists; DELETE guard exists.

**Phase 2 note:** If product later requires “hide me from people I blocked” or “hide if they blocked me”, add reverse lookups and document in a new story — do not half-implement in Story 5.

---

## Next agent

```text
--agent 1 story 5
```

**Notes for next agent:**

1. Remove LIKE/PASS-only gate in `createAction`; add `assertViewerHasNotBlockedTarget` + wire all call sites.
2. Add `blockMatch()` client; Block + inline confirm + redirect on detail page.
3. Update integration test that expected 400 for BLOCK.
4. Manual smoke: block → list row gone → direct detail URL → not found.
5. Final story in sprint — after agent 3, sprint README should mark Story 5 Done and epic complete.
