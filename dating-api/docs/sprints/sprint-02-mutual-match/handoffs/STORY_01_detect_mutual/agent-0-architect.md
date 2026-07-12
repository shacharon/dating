# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_detect_mutual.md](../../STORY_01_detect_mutual.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Add `MutualMatch` + `MutualMatchStatus` to Prisma; one row per user pair with lexicographically sorted `userId1` / `userId2`.
- New `MutualMatchesService` in `me-profile` module; called from `MeMatchActionsService.createAction()` **only after a successful `LIKE` upsert**.
- Detection is **idempotent** (`upsert` with empty `update` on existing ACTIVE row); no new public HTTP endpoints in this story.
- Run action write + mutual detection in a **single Prisma transaction** so partial state cannot occur.
- **No API response changes yet** — `mutualMatch` / `conversationId` fields deferred to Story 4.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | Add `MutualMatchStatus`, `MutualMatch`; optional `User` relations |
| `dating-api/prisma/migrations/<timestamp>_add_mutual_match/migration.sql` | created (via `prisma migrate`) |
| `dating-api/src/me-profile/mutual-matches.service.ts` | created |
| `dating-api/src/me-profile/me-match-actions.service.ts` | updated — call detection after LIKE |
| `dating-api/src/me-profile/me-profile.module.ts` | updated — register `MutualMatchesService` |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. User pair canonical ordering

Sort `[actorUserId, targetUserId]` **lexicographically** (JavaScript `Array.sort()` on cuid strings):

```typescript
function sortUserPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
```

Store lower ID as `userId1`, higher as `userId2`. Enforced by `@@unique([userId1, userId2])`.

### 2. Dedicated service, not inline logic

Create `MutualMatchesService` rather than bloating `MeMatchActionsService`. Keeps conversation domain separate for Stories 2–5.

### 3. Detection trigger — LIKE only, both directions must be LIKE

After `MatchAction` upsert with `action === LIKE`:

1. Load reverse row: `(actorUserId = targetUserId, targetUserId = actorUserId)`.
2. If reverse exists **and** `reverse.action === LIKE` → upsert `MutualMatch`.
3. Otherwise → no-op (includes reverse `PASS`, `BLOCK`, or missing).

`PASS` / `BLOCK` actions **never** invoke detection.

### 4. Idempotent upsert

```typescript
await prisma.mutualMatch.upsert({
  where: { userId1_userId2: { userId1, userId2 } },
  create: { userId1, userId2, status: MutualMatchStatus.ACTIVE },
  update: {}, // existing row unchanged — preserves createdAt, status
});
```

If row exists with `status = UNMATCHED`, upsert `update: {}` leaves it UNMATCHED. **Re-matching after unmatch is out of scope** (Story 5); acceptable for Story 1.

### 5. Transaction boundary

Wrap in `prisma.$transaction`:

1. Upsert `MatchAction`
2. If `LIKE`, run `detectAndCreateMutualMatch(actorUserId, targetUserId, tx)`

Ensures action and mutual row are atomic.

### 6. No new HTTP endpoints (Story 1)

This story is **backend-only**. Existing endpoint unchanged:

```
POST /api/v1/me/matches/:profileId/actions
Request:  { "action": "LIKE" }
Response: MatchActionDto (unchanged — no mutualMatch field yet)
```

Story 4 will extend `MatchActionDto` with `mutualMatch: boolean` and optional `conversationId`.

### 7. Undo / block side effects — deferred

| Scenario | Story 1 behavior |
|----------|------------------|
| User undoes LIKE after mutual exists | **No change** to `MutualMatch` in Story 1. Flag as follow-up: should set `UNMATCHED` or delete row when either LIKE is removed. |
| User BLOCKs after mutual exists | **No auto-unmatch** in Story 1. Story 5 handles explicit unmatch. |
| Existing UNMATCHED + reciprocal LIKE again | Row stays UNMATCHED (`update: {}`). Re-match deferred. |

Document these in tests as **known limitations** or add minimal guard in Story 1 if trivial (architect recommends **defer** to keep scope tight).

### 8. Foreign keys on User

Add optional relations on `User` for query ergonomics (Stories 2–3):

```prisma
mutualMatchesAsUser1 MutualMatch[] @relation("MutualMatchUser1")
mutualMatchesAsUser2 MutualMatch[] @relation("MutualMatchUser2")
```

---

## Prisma schema

```prisma
enum MutualMatchStatus {
  ACTIVE
  UNMATCHED
}

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

  @@unique([userId1, userId2])
  @@index([userId1, status])
  @@index([userId2, status])
}
```

**User model additions:**

```prisma
mutualMatchesAsUser1 MutualMatch[] @relation("MutualMatchUser1")
mutualMatchesAsUser2 MutualMatch[] @relation("MutualMatchUser2")
```

---

## Migration plan

### Forward

```bash
cd dating-api
npx prisma migrate dev --name add_mutual_match
```

- Creates `MutualMatchStatus` enum + `MutualMatch` table.
- No backfill needed (no historical mutual likes to infer).

### Rollback

Drop table + enum in reverse migration, or `prisma migrate reset` in dev.

---

## Service signatures

### `MutualMatchesService` (`mutual-matches.service.ts`)

```typescript
@Injectable()
export class MutualMatchesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Canonical [lowerId, higherId] for unique constraint. */
  sortUserPair(userA: string, userB: string): [string, string];

  /**
   * If both users have LIKE actions, ensure ACTIVE MutualMatch exists.
   * Idempotent. Returns the row if mutual, null if not yet mutual.
   * @param tx — optional transaction client from createAction
   */
  detectAndCreateMutualMatch(
    actorUserId: string,
    targetUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<MutualMatch | null>;

  /** Lookup active mutual match for a pair (used by Story 4). */
  findActiveByUserPair(
    userA: string,
    userB: string,
  ): Promise<MutualMatch | null>;
}
```

### `detectAndCreateMutualMatch` logic

```typescript
async detectAndCreateMutualMatch(actorUserId, targetUserId, tx?) {
  const db = tx ?? this.prisma;

  const reverse = await db.matchAction.findUnique({
    where: {
      actorUserId_targetUserId: {
        actorUserId: targetUserId,
        targetUserId: actorUserId,
      },
    },
    select: { action: true },
  });

  if (reverse?.action !== MatchActionType.LIKE) {
    return null;
  }

  const [userId1, userId2] = this.sortUserPair(actorUserId, targetUserId);

  return db.mutualMatch.upsert({
    where: { userId1_userId2: { userId1, userId2 } },
    create: { userId1, userId2, status: MutualMatchStatus.ACTIVE },
    update: {},
  });
}
```

### `MeMatchActionsService.createAction` — integration sketch

```typescript
async createAction(actorUserId, candidateProfileId, action): Promise<MatchActionDto> {
  // ... existing visibility + self checks ...

  const row = await this.prisma.$transaction(async (tx) => {
    const upserted = await tx.matchAction.upsert({ /* existing */ });

    if (action === MatchActionType.LIKE) {
      await this.mutualMatches.detectAndCreateMutualMatch(
        actorUserId,
        targetUserId,
        tx,
      );
    }

    return upserted;
  });

  return { /* existing DTO — no mutualMatch yet */ };
}
```

Inject `MutualMatchesService` into `MeMatchActionsService` constructor.

---

## API contract (unchanged — reference only)

```
POST /api/v1/me/matches/:profileId/actions
Auth: Session cookie (AuthGuard)
Request:  { "action": "LIKE" | "PASS" | "BLOCK" }
Response: 201
{
  "id": "...",
  "actorUserId": "...",
  "targetUserId": "...",
  "targetProfileIdSnapshot": "...",
  "action": "LIKE",
  "createdAt": "2026-05-31T..."
}
```

**Side effect (Story 1):** When `action = LIKE` and reverse LIKE exists → `MutualMatch` row created in DB. Not exposed in response until Story 4.

---

## Test plan (for Agent 2)

### Unit — `mutual-matches.service.spec.ts`

| Case | Expected |
|------|----------|
| Reverse LIKE exists | `MutualMatch` upserted, `userId1 < userId2` |
| Reverse missing | returns `null`, no row |
| Reverse PASS | returns `null` |
| Reverse BLOCK | returns `null` |
| Already ACTIVE mutual | upsert no-op, no error |
| `sortUserPair` | consistent ordering regardless of arg order |

### Unit — `me-match-actions.service.spec.ts`

| Case | Expected |
|------|----------|
| LIKE calls `detectAndCreateMutualMatch` | mock verified |
| PASS / BLOCK do not call detection | mock not called |

### Integration — `me-profile-http.integration.spec.ts`

| Case | Expected |
|------|----------|
| A likes B, then B likes A | 1 `MutualMatch` row, ACTIVE, sorted IDs |
| A likes B only | no `MutualMatch` |
| A likes B, B likes A, A likes again | still 1 row, no error |
| A likes B, B likes A, then A BLOCKs B | `MutualMatch` still exists (deferred behavior) |
| A likes B, B PASSes A | no `MutualMatch` |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Undo LIKE after mutual** — Should DELETE action auto-set `MutualMatch.status = UNMATCHED`? Recommend addressing in Story 4 or a small Story 1.5 if product requires it before launch.
2. **BLOCK after mutual** — Should BLOCK hide conversation automatically? Currently Story 5 is explicit unmatch; BLOCK only hides from match list (Sprint 1). No blocker for Story 1.

---

## Next agent

```text
--agent 1 sprint 2 story 1
```

**Notes for next agent:**

1. Run migration first; verify `MutualMatch` table in DB.
2. Create `MutualMatchesService` + wire into module and `MeMatchActionsService`.
3. Use `$transaction` as specified — do not detect outside transaction.
4. Do **not** add `mutualMatch` to API response yet (Story 4).
5. Follow existing patterns: `@Injectable()`, `PrismaService`, specs mirror Sprint 1 style.
6. After implementation, run `npm test` in `dating-api` for affected specs.
