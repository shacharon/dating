# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_rank_persist_bulk.md](../../STORY_02_rank_persist_bulk.md)  
**Sprint:** sprint-40-match-engine-stages  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Tighten `persistMatchListRankSnapshot` so rebuilds no longer hold **one** interactive transaction across all sequential upserts. Preserve delete-stale + upsert semantics. **No** schema / list API / Redis invalidate order changes. Skip Agent 4.

---

## Summary

Replace the current single `$transaction { deleteMany(notIn); for each row upsert }` with **upsert-first in short chunked transactions**, then a **separate** `deleteMany(notIn)`. Same viewer rebuilds remain serialized by Bull (jobId coalesce + concurrency 1). Implement on current `MeMatchesService` (Sprint 38 Story 03 MeMatches split **still not done**).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Persist | `MeMatchesService.persistMatchListRankSnapshot` |
| Today | One interactive txn: `deleteMany(notIn)` then sequential `upsert` (outer slice 100, still awaited one-by-one **inside same txn**) |
| Unique key | `@@unique([viewerUserId, candidateProfileId])` |
| Rebuild | Snapshot → persist → `invalidateMatchListCache` (Sprint 39 budget skip unchanged) |
| Queue | `rebuild:{viewerUserId}` coalesce; worker concurrency **1** |
| Sprint 38 Story 03 | **Not done** — do **not** wait for MeMatches split |
| Specs | `match-list-rank-persist.spec.ts` |

---

## Decisions (do not reverse without discussion)

### 1. Approach (locked) — chunked upserts, then delete stale

| Choice | Lock |
|--------|------|
| Keep one txn for all upserts | **No** |
| Raw SQL `INSERT … ON CONFLICT` bulk | **Out of scope** this story (faster, but more test surface) |
| `createMany` + separate updates | **No** — awkward for score updates |
| Chunked short txns + upsert-before-delete | **Yes** |

**Algorithm for `status === 'ready'` and `rows.length > 0`:**

1. `builtAt = new Date()` (one timestamp for the whole snapshot — unchanged).  
2. Chunk `snapshot.rows` by `MATCH_LIST_RANK_PERSIST_CHUNK` (default **100**).  
3. For each chunk:  
   `await prisma.$transaction(async (tx) => { await Promise.all(chunk.map(row => tx.matchListRank.upsert(...))) }, { timeout, maxWait })`  
   - Same upsert create/update fields as today (`matchScore`, `hardBlocked`, `builtAt`).  
   - Prefer `Promise.all` **within** the chunk (≤100 concurrent statements in one short txn).  
4. After **all** chunks succeed:  
   `deleteMany({ where: { viewerUserId, candidateProfileId: { notIn: ids } } })` — **not** inside the upsert txns.  
5. Return `{ rowsWritten: rows.length, rowsDeleted: del.count }`.

**Why upsert-before-delete:** If the process dies mid-write, viewers may temporarily keep **extra** stale candidates, but intended rows are not wiped first. Opposite of today’s delete-first (which can leave a hole if upserts fail mid-txn).

### 2. Unchanged paths (locked)

| Snapshot | Behavior |
|----------|----------|
| `budget_exceeded` | No-op (Sprint 39) |
| `not_ready` or `rows.length === 0` | Single `deleteMany({ viewerUserId })` outside multi-upsert (as today) |

`rebuildMatchListRanks`: still persist then invalidate Redis — **do not** change that order.

### 3. Chunk constant (locked)

| Item | Value |
|------|--------|
| Name | `MATCH_LIST_RANK_PERSIST_CHUNK` |
| Default | **100** (same as today’s slice size) |
| Location | New small module e.g. `me-profile/match-list-rank-persist.constants.ts` **or** top of persist helper — **not** `matching-algorithm.constants.ts` (Sprint 38 explicitly kept upsert batch out of scoring constants) |
| Env override | **Optional** — only if cheap; default hardcode 100 is enough |

### 4. Transaction options (locked)

Per upsert chunk interactive txn:

```ts
{ timeout: 20_000, maxWait: 10_000 }
```

Document in Agent 1 handoff: if chunk upserts time out, rebuild job fails/retries per existing Bull/inline behavior — do **not** invent partial resume.

Do **not** wrap the final `deleteMany` in a long interactive txn (single statement is enough).

### 5. Concurrency assumptions (locked)

| Assumption | Detail |
|------------|--------|
| Same viewer | Bull coalesce + concurrency 1 → one rebuild active; chunked persist is safe |
| Different viewers | Different `viewerUserId` partitions — no cross-lock concern for this design |
| Inline / no Redis | Same persist code; still one rebuild call stack at a time per enqueue |

Do **not** add advisory locks this story.

### 6. Tests (locked)

Update `match-list-rank-persist.spec.ts`:

1. Ready path: upserts still called with same create/update shapes; `rowsWritten` / `rowsDeleted` correct.  
2. Assert **deleteMany(notIn) runs after upserts** (call order / separate from upsert txn).  
3. Multi-chunk: e.g. 101 rows → **2** `$transaction` calls for upserts (+ deleteMany on prisma root).  
4. Existing not_ready / empty / budget_exceeded cases stay green.  
5. Rebuild invalidate order unchanged (existing budget_exceeded rebuild test).

```bash
cd dating-api
npx jest src/me-profile/match-list-rank-persist.spec.ts --runInBand
npm run typecheck
```

### 7. Out of scope

- MatchListRank schema changes  
- List cursor / HTTP contract  
- Raw SQL bulk upsert  
- Extracting persist into a new Nest service (optional only if it helps tests — default: keep method on `MeMatchesService`)  
- Sprint 38 Story 03 MeMatches split  

### 8. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Implement upsert-chunk-then-delete on `persistMatchListRankSnapshot` per §1–§4.  
2. Extract chunk constant (not scoring constants file).  
3. Update persist specs for ordering + multi-chunk.  
4. Note timeout / failure behavior in `agent-1-dev.md`. Do not commit.

Suggested commit:

```
perf(match-list): tighten MatchListRank persist transactions

Sprint 40 Story 2
```

---

## Agent 2 CR checklist

- [ ] No single txn spanning all sequential upserts for large snapshots  
- [ ] Upsert-before-delete; semantics (scores / hardBlocked / builtAt) unchanged  
- [ ] budget_exceeded / not_ready / empty paths unchanged  
- [ ] Redis invalidate still after successful persist in rebuild  
- [ ] Persist specs + typecheck green  

---

## Next command

```text
--agent 1 sprint 40 story 2
```
