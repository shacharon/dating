# Story 1: Detect mutual match

**Sprint:** 2  
**Status:** Done  
**Depends on:** Sprint 1 (LIKE action must exist)

---

## Why

When both users like each other, the system needs to recognize this and create a persistent mutual match record. This is the foundation for conversations and messaging.

---

## What

**As a** user who has liked someone  
**I want** the system to detect when they like me back  
**So that** we can start a conversation

### Acceptance criteria

- [x] **Mutual detection on LIKE** — When user A posts `LIKE` for user B, check if B has already `LIKE`d A
- [x] **Create MutualMatch** — If both have `LIKE` actions, create one `MutualMatch` record linking both users
- [x] **Idempotent** — If `MutualMatch` already exists with `status = ACTIVE`, do nothing (no duplicate error)
- [x] **User ordering** — Store `userId1` (lower ID) and `userId2` (higher ID) to avoid duplicate rows
- [x] **Timestamp** — Record `createdAt` when mutual match is first detected
- [x] **Validation** — Only detect on `LIKE` actions (not `PASS` or `BLOCK`)
- [x] **No false positives** — Detection requires reverse `LIKE`; PASS/BLOCK never trigger creation *(invalidation of existing mutual on pass/block deferred — see notes)*
- [x] **Tests** — Unit + integration tests for detection, idempotency, user ordering, non-mutual cases

### Out of scope (this story)

- UI changes (handled in Story 4)
- Conversation list/detail (Stories 2-3)
- Messaging
- Notifications (email, push)

---

## Technical notes (guidance, not prescriptive)

```prisma
model MutualMatch {
  id               String   @id @default(cuid())
  userId1          String   // lower user ID
  userId2          String   // higher user ID
  createdAt        DateTime @default(now())
  status           MutualMatchStatus @default(ACTIVE)
  unmatchedAt      DateTime?
  unmatchedByUserId String?

  @@unique([userId1, userId2])
  @@index([userId1, status])
  @@index([userId2, status])
}

enum MutualMatchStatus {
  ACTIVE
  UNMATCHED
}
```

### Detection logic (pseudocode)

```typescript
// In MeMatchActionsService.createAction(), after persisting LIKE:

if (action === MatchActionType.LIKE) {
  const reverseAction = await prisma.matchAction.findUnique({
    where: { actorUserId_targetUserId: { actorUserId: targetUserId, targetUserId: actorUserId } }
  });

  if (reverseAction?.action === MatchActionType.LIKE) {
    // Both users have LIKE → create mutual match
    const [user1, user2] = [actorUserId, targetUserId].sort();
    await prisma.mutualMatch.upsert({
      where: { userId1_userId2: { userId1: user1, userId2: user2 } },
      create: { userId1: user1, userId2: user2, status: MutualMatchStatus.ACTIVE },
      update: {}, // already exists, do nothing
    });
  }
}
```

### Service structure

- New service: `MutualMatchesService` or extend `MeMatchActionsService`
- Method: `detectAndCreateMutualMatch(actorUserId, targetUserId)`
- Call from `MeMatchActionsService.createAction()` after successful LIKE persistence

---

## Definition of done

- [x] Prisma schema + migration applied locally (`MutualMatch` table with unique constraint)
- [x] Detection logic integrated into LIKE action flow
- [x] Unit tests: mutual detection, idempotency, user ordering (lower ID first)
- [x] Integration tests: POST LIKE twice (both directions) → `MutualMatch` created
- [x] Integration test: POST LIKE then BLOCK → no `MutualMatch` created *(BLOCK does not invoke detection)*
- [x] Integration test: existing `MutualMatch` → LIKE again → no error
- [ ] Manual smoke: DB query shows `MutualMatch` after reciprocal likes — **pending user verification**

---

## Manual smoke

1. User A (ID `user-aaa`) likes User B (ID `user-bbb`) → `MatchAction` created  
2. User B likes User A → second `MatchAction` created  
3. Query DB: `SELECT * FROM MutualMatch WHERE (userId1 = 'user-aaa' AND userId2 = 'user-bbb') OR (userId1 = 'user-bbb' AND userId2 = 'user-aaa')`  
4. Expect: 1 row with `status = ACTIVE`, `userId1` is lower ID, `createdAt` populated  
5. User A likes B again → no error, `MutualMatch` unchanged  

---

## Shipped notes

- **Backend-only** — no API response change yet (`mutualMatch` flag in Story 4).
- **Deferred:** undo LIKE and BLOCK after mutual do not invalidate existing `MutualMatch` row.
