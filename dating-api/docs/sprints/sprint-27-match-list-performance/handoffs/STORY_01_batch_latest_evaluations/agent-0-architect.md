# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_batch_latest_evaluations.md](../../STORY_01_batch_latest_evaluations.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Greenfield implementation (current code still does N sequential `findFirst`s). Skip Agent 4 (unit/integration specs sufficient; no HTTP contract change).

---

## Summary

- Replace the **per-id sequential await loop** in `latestEvaluationsForProfileIds` with Postgres **`DISTINCT ON ("profileId")`** via Prisma `$queryRaw` + `Prisma.sql` (safe param binding).
- Preserve return type `Map<string, LatestEvaluationForMatchPick>` and “missing eval → omit” semantics.
- Keep `latestEvaluationForProfile` for **single-id** callers unchanged.
- Chunk profile id lists (default **500**) so large pools stay O(chunks), not O(N) round-trips.
- Update specs: assert **`$queryRaw`** (or chunked raw), **not** N× `findFirst`.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-profile-analysis.service.ts` | Implement batch `latestEvaluationsForProfileIds` |
| `dating-api/src/me-profile/me-profile-analysis.service.spec.ts` | Rewrite `describe('latestEvaluationsForProfileIds')` for batch |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | Only if mocks assume N× `findFirst` for this helper — update to `$queryRaw` |
| Prisma schema / migrations | **No change** — index `(profileId, createdAt DESC)` already exists |
| API DTOs / UI | **No change** |

---

## Decisions (do not reverse without discussion)

### 1. Query shape (locked)

```sql
SELECT DISTINCT ON ("profileId")
  "profileId",
  "evaluationJson",
  "createdAt",
  "version"
FROM "UserProfileEvaluation"
WHERE "profileId" IN (/* bound ids */)
ORDER BY "profileId", "createdAt" DESC
```

- Uses existing `@@index([profileId, createdAt(sort: Desc)])`.
- **Forbidden:** naive `findMany` of all historical rows then pick-latest in Node for unbounded history.
- **Forbidden:** string-concatenating IDs into SQL — use `Prisma.sql` / `Prisma.join`.

### 2. Chunking

- Constant e.g. `LATEST_EVAL_BATCH_SIZE = 500` (module-local; not required as env).
- Empty `profileIds` → empty `Map`, **zero** queries.
- Deduplicate ids before chunking (same as today).

### 3. Return type (locked)

```ts
export type LatestEvaluationForMatchPick = {
  profileId: string;
  evaluationJson: Prisma.JsonValue;
  createdAt: Date;
  version: string;
};
```

- Map keys = `profileId`.
- Profiles with no evaluation row: **omit** (do not insert null).
- Coerce `createdAt` to `Date` if driver returns string.

### 4. Single-id helper

- Keep `latestEvaluationForProfile` as `findFirst` for one-off callers.
- Batch function must **not** call it in a loop anymore.

### 5. Callers

- `MeMatchesService.buildFullRankedList` already uses `latestEvaluationsForProfileIds` — benefits automatically; no API change.
- Grep for other callers; update mocks only.

### 6. Tests (Agent 1)

- Empty ids → empty map, no `$queryRaw`.
- Deduped ids → one chunk query with unique set.
- Mock `$queryRaw` returns two rows → map has both with correct fields.
- Assert **no** sequential `findFirst` loop for the batch path (findFirst call count 0 on batch helper).
- Optional: two chunks when >500 ids (mock called twice) — nice-to-have.

### 7. Agent 4

- **Skip.** No HTTP surface change.

---

## Out of scope

- SQL gender/age prefilter (Story 02)
- Slim select / pool cap / metrics (Stories 03–05)
- Materialized pair scores / async rebuild

---

## Agent 1 instructions

1. Implement batch fetch per §1–4 in `me-profile-analysis.service.ts`.
2. Update specs; run `npm test -- --testPathPattern=me-profile-analysis --runInBand` and me-matches specs if needed.
3. `npm run build` in `dating-api`.
4. Commit with story message template.
5. Write `handoffs/STORY_01_batch_latest_evaluations/agent-1-dev.md`.

Suggested commit message:

```
perf(matches): batch latest evaluation loads for match list

Replace N sequential latest-eval queries with chunked DISTINCT ON
via Prisma.sql for buildFullRankedList.

Sprint 27 Story 1
```

---

## Agent 2 instructions

- [ ] No per-id await loop remains in `latestEvaluationsForProfileIds`
- [ ] `Prisma.sql` / bound params only
- [ ] Return semantics unchanged; empty input short-circuit
- [ ] Specs assert batch/`$queryRaw` behavior
- [ ] Index-friendly `ORDER BY "profileId", "createdAt" DESC`
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. `$queryRaw` Json typing — map `evaluationJson` carefully (Prisma.JsonValue).
2. Very large IN lists — chunking mitigates.
3. Tie on identical `createdAt` — `DISTINCT ON` + `ORDER BY createdAt DESC` is deterministic enough; optional tie-break `id DESC` **not required** this story unless CR finds flaky tests.
