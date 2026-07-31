# Story 01 — Batch latest evaluations

**Sprint 27 · Status: PLANNED** (Agent 0 architect lock complete)  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Agent:** `generalPurpose` (4-agent pipeline: 0→1→2→3)  
**Dependencies:** None (do first)

**Handoffs:** [architect](./handoffs/STORY_01_batch_latest_evaluations/agent-0-architect.md)

---

## Objective

Replace the **N sequential** latest-evaluation queries in `latestEvaluationsForProfileIds` with a **single batch query** (or fixed-size chunks), preserving the same `Map<profileId, LatestEvaluationForMatchPick>` return shape.

## Why

This is the dominant latency cost on match-list cache miss. At N candidates the miss path issues ~N `findFirst ORDER BY createdAt DESC` round-trips.

## Scope / tasks

1. Read `dating-api/src/me-profile/me-profile-analysis.service.ts` — `latestEvaluationsForProfileIds` and `latestEvaluationForProfile`.
2. Implement batch latest-eval fetch for Postgres via `$queryRaw` + `DISTINCT ON ("profileId") ... ORDER BY "profileId", "createdAt" DESC` (`Prisma.sql`).
3. Keep `LatestEvaluationForMatchPick` fields: `profileId`, `evaluationJson`, `createdAt`, `version`.
4. Empty / missing evals: omit from map (same as today).
5. Chunk IDs (e.g. 500) if needed — still O(N/chunk) not O(N) sequential awaits.
6. Update `me-profile-analysis.service.spec.ts` for batch behavior.
7. Grep callers; `MeMatchesService.buildFullRankedList` benefits automatically.

## Acceptance criteria

- [ ] No per-id sequential `await` loop for latest evals on the match-list path
- [ ] Return type and semantics unchanged (latest by `createdAt` per profile)
- [ ] Unit/integration specs updated and green
- [ ] `npm run build` in `dating-api` succeeds
- [ ] No product API contract change

## Notes / gotchas

- Prefer `DISTINCT ON` — index `(profileId, createdAt DESC)` already exists.
- Do **not** load all historical rows into Node then pick latest naively.
- Prisma `$queryRaw` must use tagged template / `Prisma.sql` (no string-concat IDs).

## Deliverables

Updated `me-profile-analysis.service.ts` (+ specs). Follow architect handoff.

## Commit message

```
perf(matches): batch latest evaluation loads for match list

Replace N sequential latest-eval queries with a single DISTINCT ON
(or equivalent) batch fetch used by buildFullRankedList.

Sprint 27 Story 1
```
