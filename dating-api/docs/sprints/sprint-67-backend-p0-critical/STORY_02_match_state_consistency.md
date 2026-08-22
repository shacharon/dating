# Story 02 — Match State Consistency Fixes

**Sprint:** 67  
**Effort:** 2 days  
**Risk:** 🟡 LOW (transaction boundaries, data-only)  
**Status:** Planned

---

## Objective

Fix critical match state corruption bugs:
1. **PASS/BLOCK leaves conversations ACTIVE** (privacy breach)
2. **Rematch never reactivates UNMATCHED conversations** (broken dating loop)

**Deliverable:** Match actions and conversation status stay consistent; rematch flow works.

---

## SOLID/OOP/KISS Principles

### ✅ Single Responsibility (SRP)
- **DON'T:** Mix action logic with conversation state updates
- **DO:** Keep `upsertActionAndDetectMutual` focused on ONE transaction:
  1. Upsert action row
  2. Detect mutual → create/update MutualMatch
  3. Update conversation status (in SAME transaction)

### ✅ Transaction Boundaries (Data Consistency)
- **DON'T:** Separate DB calls that must be atomic
- **DO:** Use Prisma transactions for all related state changes:
  ```typescript
  return await this.prisma.$transaction(async (tx) => {
    // All updates in ONE atomic block
  });
  ```

### ✅ KISS
- **DON'T:** Build complex state machine with events/sagas
- **DO:** Simple synchronous state updates in same transaction

### ✅ No God Methods
- **Current:** `upsertActionAndDetectMutual` is 43 lines (acceptable)
- **Goal:** Keep it <60 lines after fix
- **Pattern:** Extract helpers if it grows (e.g., `shouldUnmatch()`, `shouldReactivate()`)

---

## Bug #1: PASS/BLOCK Leaves Conversations ACTIVE

### Current Behavior

```typescript
// User1 LIKES User2 → mutual match → conversation ACTIVE
// User1 BLOCKS User2
// Action updated: ✅ Blocked
// MutualMatch: ❌ Still ACTIVE
// Conversation: ❌ User1 can still message User2!
```

### Root Cause

```typescript:284-326:dating-api/src/me-profile/repositories/prisma-match.repository.ts
// File: prisma-match.repository.ts
async upsertActionAndDetectMutual(...) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Upsert action
    await tx.matchAction.upsert({ ... });
    
    // 2. Check if mutual
    const [forwardLike, reverseLike] = await Promise.all([
      tx.matchAction.findUnique({ where: { actorId_targetId: [actorId, targetId] } }),
      tx.matchAction.findUnique({ where: { actorId_targetId: [targetId, actorId] } }),
    ]);
    
    const isMutual = forwardLike?.action === 'LIKE' && reverseLike?.action === 'LIKE';
    
    if (isMutual) {
      // Create MutualMatch (or return existing)
      const mutualMatch = await this.findOrCreateMutualMatch(...);
      return { mutualMatch, created: true };
    }
    
    // ❌ MISSING: What if they were mutual but now PASS/BLOCK?
    // ❌ MISSING: Update MutualMatch status to UNMATCHED
    return { mutualMatch: null, created: false };
  });
}
```

### Fix

```typescript
async upsertActionAndDetectMutual(
  actorId: string,
  targetId: string,
  action: 'LIKE' | 'PASS' | 'BLOCK',
): Promise<{ mutualMatch: MutualMatch | null; created: boolean }> {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Upsert action
    await tx.matchAction.upsert({
      where: { actorId_targetId: { actorId, targetId } },
      create: { actorId, targetId, action },
      update: { action, updatedAt: new Date() },
    });

    // 2. Check current state
    const [forwardLike, reverseLike] = await Promise.all([
      tx.matchAction.findUnique({ where: { actorId_targetId: { actorId, targetId } } }),
      tx.matchAction.findUnique({ where: { actorId_targetId: { actorId: targetId, targetId: actorId } } }),
    ]);

    const isMutualNow = forwardLike?.action === 'LIKE' && reverseLike?.action === 'LIKE';

    // 3. Update MutualMatch accordingly
    if (isMutualNow) {
      // Create or reactivate
      const mutualMatch = await this.findOrCreateMutualMatch(tx, actorId, targetId);
      return { mutualMatch, created: true };
    } else {
      // Not mutual anymore (or never was) → UNMATCH if exists
      const [userId1, userId2] = [actorId, targetId].sort(); // Canonical order
      
      const updated = await tx.mutualMatch.updateMany({
        where: {
          OR: [
            { userId1, userId2 },
            { userId1: userId2, userId2: userId1 }, // Just in case
          ],
          status: 'ACTIVE', // Only update if currently active
        },
        data: {
          status: 'UNMATCHED',
          unmatchedAt: new Date(),
          unmatchedByUserId: actorId,
        },
      });

      if (updated.count > 0) {
        this.logger.log(`Unmatched conversation ${userId1}-${userId2} due to ${action}`);
      }

      return { mutualMatch: null, created: false };
    }
  });
}
```

**LOC:** +15 lines (still <60 total)

---

## Bug #2: Rematch Never Reactivates UNMATCHED Conversations

### Current Behavior

```typescript
// User1 LIKES User2 → mutual → conversation ACTIVE
// User1 BLOCKS User2 → (after Bug #1 fix) → conversation UNMATCHED
// User1 un-blocks, LIKES again
// User2's LIKE still exists
// Expected: Conversation reactivates
// Actual: ❌ findOrCreateMutualMatch returns UNMATCHED row, doesn't update
```

### Root Cause

```typescript:448-456:dating-api/src/me-profile/repositories/prisma-match.repository.ts
private async findOrCreateMutualMatch(
  tx: PrismaTransaction,
  userId1: string,
  userId2: string,
): Promise<MutualMatch> {
  const [sortedUserId1, sortedUserId2] = [userId1, userId2].sort();
  
  const existing = await tx.mutualMatch.findUnique({
    where: { userId1_userId2: { userId1: sortedUserId1, userId2: sortedUserId2 } },
  });
  
  if (existing) {
    return existing; // ❌ Returns UNMATCHED row as-is!
  }
  
  // Create new
  return await tx.mutualMatch.create({
    data: { userId1: sortedUserId1, userId2: sortedUserId2, status: 'ACTIVE' },
  });
}
```

**Problem:** Unique constraint on `(userId1, userId2)` prevents creation of new row. Existing UNMATCHED row is returned unchanged.

### Fix

```typescript
private async findOrCreateMutualMatch(
  tx: PrismaTransaction,
  userId1: string,
  userId2: string,
): Promise<MutualMatch> {
  const [sortedUserId1, sortedUserId2] = [userId1, userId2].sort();
  
  const existing = await tx.mutualMatch.findUnique({
    where: { userId1_userId2: { userId1: sortedUserId1, userId2: sortedUserId2 } },
  });
  
  if (existing) {
    // If UNMATCHED, reactivate
    if (existing.status === 'UNMATCHED') {
      return await tx.mutualMatch.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          unmatchedAt: null,
          unmatchedByUserId: null,
        },
      });
    }
    
    // Already ACTIVE, return as-is
    return existing;
  }
  
  // Create new match
  return await tx.mutualMatch.create({
    data: {
      userId1: sortedUserId1,
      userId2: sortedUserId2,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  });
}
```

**LOC:** +10 lines (still small helper)

---

## Side Effects to Handle

### Invalidate Caches

After match state changes, clear relevant caches:

```typescript
// After UNMATCH
await this.cacheService.del(`user:${actorId}:match-list`);
await this.cacheService.del(`user:${targetId}:match-list`);

// After REACTIVATE
// Same cache clears
```

### Enqueue Rank Rebuilds

```typescript
// In me-match-actions.service.ts
async handleAction(actorId: string, targetId: string, action: 'LIKE' | 'PASS' | 'BLOCK') {
  const result = await this.matchRepo.upsertActionAndDetectMutual(actorId, targetId, action);
  
  // Clear caches
  await this.invalidateMatchCaches(actorId, targetId);
  
  // Rebuild ranks (async via Bull)
  await this.matchRankQueue.add('rebuild', { userId: actorId });
  await this.matchRankQueue.add('rebuild', { userId: targetId });
  
  return result;
}
```

---

## Testing

### Unit Tests

**File:** `src/me-profile/repositories/prisma-match.repository.spec.ts`

```typescript
describe('PrismaMatchRepository - State Consistency', () => {
  it('BLOCK after mutual → conversation becomes UNMATCHED', async () => {
    // Setup: User1 LIKE User2, User2 LIKE User1 → mutual
    await repo.upsertActionAndDetectMutual('user1', 'user2', 'LIKE');
    await repo.upsertActionAndDetectMutual('user2', 'user1', 'LIKE');
    
    let mutualMatch = await prisma.mutualMatch.findFirst({
      where: { userId1: 'user1', userId2: 'user2' },
    });
    expect(mutualMatch.status).toBe('ACTIVE');
    
    // Act: User1 BLOCKS User2
    await repo.upsertActionAndDetectMutual('user1', 'user2', 'BLOCK');
    
    // Assert: MutualMatch becomes UNMATCHED
    mutualMatch = await prisma.mutualMatch.findFirst({
      where: { userId1: 'user1', userId2: 'user2' },
    });
    expect(mutualMatch.status).toBe('UNMATCHED');
    expect(mutualMatch.unmatchedByUserId).toBe('user1');
  });

  it('PASS after mutual → conversation becomes UNMATCHED', async () => {
    // Similar test for PASS
  });

  it('Rematch (reciprocal LIKE after UNMATCH) → conversation reactivates', async () => {
    // Setup: Mutual then BLOCK
    await repo.upsertActionAndDetectMutual('user1', 'user2', 'LIKE');
    await repo.upsertActionAndDetectMutual('user2', 'user1', 'LIKE');
    await repo.upsertActionAndDetectMutual('user1', 'user2', 'BLOCK');
    
    let mutualMatch = await prisma.mutualMatch.findFirst({
      where: { userId1: 'user1', userId2: 'user2' },
    });
    expect(mutualMatch.status).toBe('UNMATCHED');
    
    // Act: User1 un-blocks and LIKES again (User2's LIKE still exists)
    await repo.deleteAction('user1', 'user2'); // Remove BLOCK
    await repo.upsertActionAndDetectMutual('user1', 'user2', 'LIKE');
    
    // Assert: MutualMatch reactivates
    mutualMatch = await prisma.mutualMatch.findFirst({
      where: { userId1: 'user1', userId2: 'user2' },
    });
    expect(mutualMatch.status).toBe('ACTIVE');
    expect(mutualMatch.unmatchedAt).toBeNull();
  });
});
```

---

### Integration Tests

**File:** `src/me-profile/me-match-actions.integration.spec.ts`

```typescript
describe('Match Actions (e2e) - State Consistency', () => {
  it('Block user → conversation disappears from inbox', async () => {
    // Create mutual match
    const user1 = await helper.createUser('user1@example.com');
    const user2 = await helper.createUser('user2@example.com');
    await helper.mutualLike(user1.id, user2.id);
    
    // Verify conversation exists
    let inbox = await helper.getInbox(user1.id);
    expect(inbox).toHaveLength(1);
    
    // Block
    await request(app.getHttpServer())
      .post(`/api/v1/me/matches/${user2.id}/actions`)
      .set('Cookie', user1.authCookie)
      .send({ action: 'BLOCK' })
      .expect(200);
    
    // Verify conversation removed from inbox
    inbox = await helper.getInbox(user1.id);
    expect(inbox).toHaveLength(0);
  });

  it('Rematch flow → conversation reappears', async () => {
    // Mutual → Block → Unblock + Like again
    // Verify conversation reappears in inbox with ACTIVE status
  });
});
```

---

## SOLID/OOP/KISS Checklist

- [ ] Transaction boundaries correct (all related updates in ONE transaction)
- [ ] No leaked state (MutualMatch status always consistent with actions)
- [ ] Helper methods stay small (<30 lines each)
- [ ] No complex state machine (simple if/else logic)
- [ ] Cache invalidation not forgotten
- [ ] Tests cover all edge cases (mutual→block, mutual→pass, rematch)

---

## Files Changed

**Modified:**
- `src/me-profile/repositories/prisma-match.repository.ts` (+30 lines)
  - `upsertActionAndDetectMutual`: Add unmatch logic
  - `findOrCreateMutualMatch`: Add reactivate logic
- `src/me-profile/me-match-actions.service.ts` (+10 lines)
  - Add cache invalidation
  - Add rank rebuild queue

**New:**
- `src/me-profile/repositories/prisma-match.repository.spec.ts` (state tests)
- `src/me-profile/me-match-actions.integration.spec.ts` (e2e tests)

---

## Success Criteria

- [ ] Block user → conversation becomes UNMATCHED
- [ ] Pass after mutual → conversation becomes UNMATCHED
- [ ] Rematch → conversation reactivates to ACTIVE
- [ ] No orphaned ACTIVE conversations (blocked users can't message)
- [ ] Caches invalidated after state changes
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] End-to-end: Block on Android → conversation disappears immediately

---

## Effort Estimate

- Bug #1 fix: 3 hours
- Bug #2 fix: 2 hours
- Cache invalidation: 1 hour
- Unit tests: 4 hours
- Integration tests: 4 hours
- Manual testing: 2 hours

**Total:** 16 hours (~2 days)
