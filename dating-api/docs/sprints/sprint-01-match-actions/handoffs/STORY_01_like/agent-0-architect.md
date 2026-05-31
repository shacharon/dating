# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_like.md](../../STORY_01_like.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Introduce `MatchAction` table — user-to-user identity (`actorUserId`, `targetUserId`) with profile snapshot.
- Add `POST /api/v1/me/matches/:id/actions` on existing `MeProfileController` (matches already live under `/api/v1/me`).
- New `MeMatchActionsService` in `me-profile` module; reuse `AuthGuard` + `@CurrentUser()` (not `SessionGuard` — that name is not used in this codebase).
- Resolve `:id` (`UserProfile.id`) → `targetUserId` + `targetProfileIdSnapshot`; upsert on `(actorUserId, targetUserId)`.
- Story 1 UI: Like button on match detail; after success show “You liked this person” (neutral, disabled control).
- **Out of scope this story:** GET action state (Story 3), pass/block/undo, mutual match, list badges.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | Add `MatchActionType` enum + `MatchAction` model |
| `dating-api/prisma/migrations/*` | New migration (dev runs `npx prisma migrate dev`) |
| `dating-api/src/me-profile/me-match-actions.service.ts` | **create** — business logic |
| `dating-api/src/me-profile/me-match-actions.dto.ts` | **create** — request/response DTOs |
| `dating-api/src/me-profile/me-profile.controller.ts` | **update** — add POST route |
| `dating-api/src/me-profile/me-profile.module.ts` | **update** — register service |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | **update** — API tests (agent 2) |
| `dating-ui/src/lib/me-profile-api.ts` | **update** — `likeMatch()` + DTO |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | **update** — Like button + states |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | **create** — UI test (agent 2) |

---

## 1. Prisma schema

Add to `dating-api/prisma/schema.prisma`:

```prisma
enum MatchActionType {
  LIKE
  PASS
  BLOCK
}

model MatchAction {
  id                      String          @id @default(cuid())
  actorUserId             String
  actor                   User            @relation("MatchActionsByActor", fields: [actorUserId], references: [id], onDelete: Cascade)
  targetUserId            String
  target                  User            @relation("MatchActionsByTarget", fields: [targetUserId], references: [id], onDelete: Cascade)
  targetProfileIdSnapshot String
  action                  MatchActionType
  createdAt               DateTime        @default(now())

  @@unique([actorUserId, targetUserId])
  @@index([actorUserId, action])
  @@index([targetUserId, action])
}
```

Add to `User` model:

```prisma
  matchActionsAsActor  MatchAction[] @relation("MatchActionsByActor")
  matchActionsAsTarget MatchAction[] @relation("MatchActionsByTarget")
```

### Migration notes

- **Forward:** empty table, no backfill.
- **Rollback:** drop `MatchAction` table + enum (only if no production data).
- **Prisma compound unique name:** `actorUserId_targetUserId` for upsert `where`.

---

## 2. API contract

### `POST /api/v1/me/matches/:id/actions`

| | |
|---|---|
| **Auth** | `@UseGuards(AuthGuard)` on controller (existing) |
| **Actor** | `@CurrentUser().id` → `actorUserId` |
| **Path param** | `:id` = candidate `UserProfile.id` (same as `GET /api/v1/me/matches/:id`) |

**Request body:**

```json
{ "action": "LIKE" }
```

**Response `201 Created`:**

```json
{
  "id": "cuid",
  "actorUserId": "user-id",
  "targetUserId": "other-user-id",
  "targetProfileIdSnapshot": "profile-id-from-path",
  "action": "LIKE",
  "createdAt": "2026-05-31T12:00:00.000Z"
}
```

**Status codes:**

| Code | When |
|------|------|
| `201` | Action created or updated (upsert) |
| `400` | Invalid body; `action` not in enum; **self-action** (`profile.userId === actorUserId`) |
| `401` | No session / invalid session |
| `404` | Viewer not match-ready; candidate profile missing, not analyzed, or gender-ineligible (mirror `MeMatchesService.getById` rules) |

**Story 1 validation:** Accept only `{ action: 'LIKE' }` in the request body for now. Return `400` for `PASS` / `BLOCK` with a clear message — Stories 2 and 5 will enable those values on the same endpoint.

**Idempotency:** Second `LIKE` on same pair → upsert updates `action` to `LIKE`, refreshes `targetProfileIdSnapshot`, returns `201` (same row, no duplicate).

---

## 3. Service design

**File:** `dating-api/src/me-profile/me-match-actions.service.ts`

```typescript
export interface MatchActionDto {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetProfileIdSnapshot: string;
  action: 'LIKE' | 'PASS' | 'BLOCK';
  createdAt: string; // ISO 8601
}

@Injectable()
export class MeMatchActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meMatches: MeMatchesService, // optional: reuse eligibility helper
  ) {}

  /**
   * Record a match action from the authenticated user toward a candidate profile.
   * Resolves profileId → targetUserId; upserts on (actorUserId, targetUserId).
   */
  async createAction(
    actorUserId: string,
    candidateProfileId: string,
    action: MatchActionType,
  ): Promise<MatchActionDto>;
}
```

### Logic (ordered)

1. **Story 1 gate:** if `action !== 'LIKE'` → `BadRequestException('Only LIKE is supported in this release')`.
2. Load candidate `UserProfile` by `candidateProfileId`.
3. If missing or `status !== ANALYZED` → `NotFoundException('Match not found.')`.
4. If `candidate.userId === actorUserId` → `BadRequestException('Cannot act on yourself')`.
5. **Match eligibility (recommended):** Reuse the same gender / viewer-readiness checks as `MeMatchesService.getById`. Simplest approach: extract a package-private `assertMatchCandidateVisible(actorUserId, candidateProfileId)` on `MeMatchesService`, or call `getById` first and catch `NotFoundException`. Do **not** allow acting on profiles the user cannot see on match detail.
6. Upsert:

```typescript
await prisma.matchAction.upsert({
  where: {
    actorUserId_targetUserId: {
      actorUserId,
      targetUserId: candidate.userId,
    },
  },
  create: {
    actorUserId,
    targetUserId: candidate.userId,
    targetProfileIdSnapshot: candidate.id,
    action,
  },
  update: {
    action,
    targetProfileIdSnapshot: candidate.id,
  },
});
```

7. Map to `MatchActionDto` with `createdAt.toISOString()`.

---

## 4. Controller

Add to `MeProfileController` (after existing `GET matches/:id`):

```typescript
@Post('matches/:id/actions')
@HttpCode(HttpStatus.CREATED)
createMatchAction(
  @CurrentUser() user: AuthMeResponseDto,
  @Param('id') id: string,
  @Body() body: CreateMatchActionDto,
) {
  return this.matchActions.createAction(user.id, id, body.action);
}
```

**DTO** (`me-match-actions.dto.ts`):

```typescript
import { IsEnum } from 'class-validator';
import { MatchActionType } from '@prisma/client';

export class CreateMatchActionDto {
  @IsEnum(MatchActionType)
  action!: MatchActionType;
}
```

Use existing validation pipe pattern from me-profile if class-validator is already wired globally; otherwise add `@UsePipes(new ValidationPipe({ whitelist: true }))` on the route.

---

## 5. Frontend

### API client (`me-profile-api.ts`)

```typescript
export interface MatchActionDto {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetProfileIdSnapshot: string;
  action: 'LIKE';
  createdAt: string;
}

export async function likeMatch(profileId: string): Promise<MatchActionDto> {
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/actions`;
  // POST { action: 'LIKE' }, credentials: 'include'
  // throw on !res.ok with status-aware messages
}
```

### Match detail page (`me-matches/[id]/page.tsx`)

Add below match content (footer area):

- **Default:** “Like” button (primary style, emerald accent).
- **In flight:** disable button, show “Saving…” (`role="status"`).
- **Success:** replace with neutral text “You liked this person” (no second click).
- **Error:** inline alert (`role="alert"`), re-enable button.

**Story 1 persistence UX:** On page load, action state is **not** fetched (GET is Story 3). After refresh, Like button reappears until Story 3 ships. Document this gap in dev handoff; acceptable for Story 1 per out-of-scope list.

---

## 6. Tests (for agent 2)

### API integration (`me-profile-http.integration.spec.ts`)

New `describe('POST /api/v1/me/matches/:id/actions')`:

| Test | Expect |
|------|--------|
| Happy path LIKE | 201, body shape, DB row with correct user ids |
| Idempotent re-LIKE | 201, single row |
| No session | 401 |
| Unknown profile id | 404 |
| Self (actor owns candidate profile) | 400 |
| Body `{ action: 'PASS' }` | 400 (Story 1 gate) |
| Invalid action string | 400 |

Use same session cookie setup as existing match GET tests.

### UI (`page.spec.tsx`)

- Mock `fetchMyMatchById` + `likeMatch`
- Click Like → `likeMatch` called with profile id
- Success → “You liked this person” visible, button gone/disabled

---

## Decisions (do not reverse without discussion)

1. **Extend `me-profile` module** — do not create a separate top-level `match-actions` module; matches API already lives on `MeProfileController`.
2. **Auth = `AuthGuard`** — matches existing me endpoints; ignore “SessionGuard” wording in older docs.
3. **User-to-user uniqueness** — `@@unique([actorUserId, targetUserId])`; profile id is snapshot only.
4. **404 = same visibility as match detail** — cannot like someone you cannot view on match detail.
5. **Story 1 rejects PASS/BLOCK** on POST — same endpoint, stricter validation until Stories 2/5.
6. **No GET in Story 1** — UI success state is session-local until Story 3; refresh resets button (known gap).

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

- None. Ready for implementation.

---

## Next agent

```text
--agent 1 story 1
```

**Notes for next agent:**

1. Run migration first: `cd dating-api && npx prisma migrate dev --name add_match_action`
2. Wire `MeMatchActionsService` in module; inject into controller.
3. Consider extracting `assertMatchCandidateVisible` from `MeMatchesService.getById` to avoid duplicating ~40 lines of eligibility logic.
4. Manual smoke per story file: like → refresh → confirm POST in network tab (UI will not show liked state after refresh until Story 3).
5. Enum `MatchActionType` includes PASS/BLOCK in schema now so Stories 2/5 need no migration.
