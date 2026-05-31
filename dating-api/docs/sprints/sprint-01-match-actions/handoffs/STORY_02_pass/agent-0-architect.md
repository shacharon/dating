# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_pass.md](../../STORY_02_pass.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Enable **PASS** on the existing `POST /api/v1/me/matches/:id/actions` endpoint — remove Story 1 LIKE-only gate; keep **BLOCK rejected** until Story 5.
- **No schema migration** — `MatchActionType.PASS` already exists from Story 1.
- Same upsert on `(actorUserId, targetUserId)` — PASS overwrites LIKE (and vice versa) on the same row.
- UI: **Pass button** on match detail alongside Like; reuse Story 3 read path (badges, persisted state, hide buttons when acted).
- **Out of scope:** hide passed profiles from list, undo (Story 4), block (Story 5).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-match-actions.service.ts` | Relax `createAction` gate: allow `LIKE` \| `PASS`; reject `BLOCK` |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | Update unit tests (PASS happy path; BLOCK still rejected) |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | PASS integration tests; update Story 1 gate test (agent 2) |
| `dating-ui/src/lib/me-profile-api.ts` | Add `passMatch()` (or shared `recordMatchAction`) |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | Pass button + handler + saving/error states |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | Pass flow UI tests (agent 2) |

**No changes expected:**

| Path | Reason |
|------|--------|
| `prisma/schema.prisma` | PASS enum + table already exist |
| `me-profile.controller.ts` | POST route unchanged |
| `me-matches.service.ts` | List/detail read path from Story 3 already supports `yourAction: 'PASS'` |
| `me-matches/page.tsx` | “Passed” badge already implemented (Story 3) |

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

**Request body — Story 2 accepts:**

```json
{ "action": "PASS" }
```

Also still accepts `{ "action": "LIKE" }` (Story 1 behavior unchanged).

**Response `201 Created` (PASS):**

```json
{
  "id": "cuid",
  "actorUserId": "user-id",
  "targetUserId": "other-user-id",
  "targetProfileIdSnapshot": "profile-id-from-path",
  "action": "PASS",
  "createdAt": "2026-05-31T12:00:00.000Z"
}
```

**Status codes:**

| Code | When |
|------|------|
| `201` | PASS (or LIKE) created or updated (upsert) |
| `400` | Invalid body; self-action; **`BLOCK` still rejected** (Story 5) |
- | `401` | No session |
| `404` | Same visibility as match detail (`assertMatchCandidateVisible`) |

**Story 2 validation gate (replace Story 1 gate):**

```typescript
const ALLOWED: MatchActionType[] = [MatchActionType.LIKE, MatchActionType.PASS];
if (!ALLOWED.includes(action)) {
  throw new BadRequestException(
    'Only LIKE and PASS are supported in this release',
  );
}
```

**Overwrite semantics (unchanged upsert):**

| Prior row | POST body | Result |
|-----------|-----------|--------|
| none | `PASS` | create PASS |
| `LIKE` | `PASS` | update → PASS (same row id) |
| `PASS` | `LIKE` | update → LIKE |
| `PASS` | `PASS` | idempotent upsert → PASS |

Always refresh `targetProfileIdSnapshot` and `action` on update.

**Read path (Story 3 — no changes):**

- `GET /api/v1/me/matches/:id/actions` → `{ action: "PASS", createdAt }` after pass
- List item `yourAction: "PASS"` + “Passed” badge

---

## 3. Service design

### `MeMatchActionsService.createAction` (delta only)

**Remove:**

```typescript
if (action !== MatchActionType.LIKE) {
  throw new BadRequestException('Only LIKE is supported in this release');
}
```

**Replace with Story 2 gate** (reject BLOCK only):

```typescript
if (action !== MatchActionType.LIKE && action !== MatchActionType.PASS) {
  throw new BadRequestException(
    'Only LIKE and PASS are supported in this release',
  );
}
```

**Keep unchanged:**

1. `assertMatchCandidateVisible(actorUserId, candidateProfileId)`
2. Self-action check → `400 Cannot act on yourself`
3. Upsert on `actorUserId_targetUserId`
4. Return full `MatchActionDto`

`getActionState()` — **no changes**.

---

## 4. Controller

**No route changes.** Existing:

```typescript
@Post('matches/:id/actions')
@HttpCode(HttpStatus.CREATED)
@UsePipes(MeProfileValidationPipe)
createMatchAction(...) {
  return this.matchActions.createAction(user.id, id, body.action);
}
```

`CreateMatchActionDto` already validates `@IsEnum(MatchActionType)` — PASS passes validation; service gate rejects BLOCK.

---

## 5. Frontend

### API client (`me-profile-api.ts`)

**Option A (recommended):** Extract shared helper, keep public wrappers:

```typescript
async function recordMatchAction(
  profileId: string,
  action: 'LIKE' | 'PASS',
): Promise<MatchActionDto> {
  // POST { action }, same error handling as likeMatch today
}

export async function likeMatch(profileId: string): Promise<MatchActionDto> {
  return recordMatchAction(profileId, 'LIKE');
}

export async function passMatch(profileId: string): Promise<MatchActionDto> {
  return recordMatchAction(profileId, 'PASS');
}
```

401 message for pass: `'You must be logged in to pass on a match.'` (or generic logged-in message).

### Match detail (`me-matches/[id]/page.tsx`)

Story 3 already provides:

- `fetchMatchAction` on mount → sets `yourAction`
- `actionStatusMessage('PASS')` → `"You passed on this person"`
- Footer hides action buttons when `yourAction != null`

**Story 2 adds — footer when `yourAction === null`:**

| Control | Style | Behavior |
|---------|-------|----------|
| **Like** | emerald primary (existing) | `recordMatchAction(id, 'LIKE')` → refetch `fetchMatchAction` |
| **Pass** | neutral secondary — zinc border, no red/error tone | `recordMatchAction(id, 'PASS')` → refetch `fetchMatchAction` |

Layout: horizontal row `flex gap-2` with both buttons.

**Saving state:**

- Shared `actionSaving: boolean` **or** separate `likeSaving` / `passSaving` — prefer **single `actionSaving`** so only one action in flight; disable both buttons while saving.
- Single `actionError` string for inline alert.

**After success:**

- Refetch `fetchMatchAction(id)` (same as Like today) → footer shows status message, buttons hidden.
- List badge appears on next visit (Story 3 `yourAction`).

**UI switch (LIKE ↔ PASS) when already acted:**

- **Not in Story 2 UI** — Story 3 rule: buttons hidden when action exists.
- Overwrite is **API behavior**; prove via integration tests.
- User-facing “change mind” → **Story 4 undo** (DELETE then re-act).

---

## 6. Tests (for agent 2)

### API integration (`POST /api/v1/me/matches/:id/actions`)

| Test | Expect |
|------|--------|
| Happy path PASS | 201, `action: 'PASS'`, correct user ids |
| Idempotent re-PASS | 201, single row |
| LIKE → PASS overwrite | POST LIKE then POST PASS → one row, `action: 'PASS'` |
| PASS → LIKE overwrite | POST PASS then POST LIKE → one row, `action: 'LIKE'` |
| `{ action: 'BLOCK' }` | 400, message mentions LIKE and PASS only |
| Update existing test `{ action: 'PASS' }` Story 1 gate | **Change** from 400 → 201 (or remove duplicate) |

Reuse `mockEligibleMatchDetail()` from Story 1/3 POST tests.

### Unit (`me-match-actions.service.spec.ts`)

| Test | Expect |
|------|--------|
| Accepts PASS upsert | resolves with `action: 'PASS'` |
| Rejects BLOCK | `BadRequestException` |
| Remove/update “rejects non-LIKE PASS” test | PASS should succeed |

### UI (`[id]/page.spec.tsx`)

| Test | Expect |
|------|--------|
| Pass button visible when `action: null` | Both Like and Pass |
| Click Pass → `passMatch` called | profile id |
| Success → “You passed on this person”, no action buttons |
| `fetchMatchAction` returns PASS on load | status message, no buttons |

List badge test for PASS optional — Story 3 already tests LIKE badge; one PASS badge test is nice-to-have.

---

## Decisions (do not reverse without discussion)

1. **No migration** — PASS enum existed since Story 1 by design.
2. **Same POST endpoint** — no new routes.
3. **BLOCK still rejected** until Story 5 (service gate, not DTO).
4. **Overwrite LIKE↔PASS** at API layer only; UI does not offer switch until Story 4 undo.
5. **Passed profiles stay in list** — Story 2 out of scope; badge only (Story 3).
6. **Pass tone is neutral** — zinc secondary button, not red/error styling.
7. **Story 3 read path unchanged** — Story 2 is write + Pass button only.

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

- **UI overwrite (manual smoke step 3):** “Like after pass” is verified via **API/integration test**, not UI — buttons stay hidden after first action until Story 4. Acceptable per Story 3 + Story 2 scope split.
- None blocking implementation.

---

## Next agent

```text
--agent 1 story 2
```

**Notes for next agent:**

1. Change service gate only — minimal backend diff.
2. Refactor `likeMatch` → shared `recordMatchAction` if it reduces duplication.
3. Pass button beside Like; single saving flag; refetch action after pass (mirror Like flow).
4. Story 3 already shows “Passed” / list badge — smoke pass → refresh detail → refresh list.
5. Update integration test that expected PASS → 400 (Story 1 gate).
