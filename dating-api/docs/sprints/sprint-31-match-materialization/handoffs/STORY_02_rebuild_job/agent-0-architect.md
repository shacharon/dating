# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_rebuild_job.md](../../STORY_02_rebuild_job.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Add Bull queue + processor that rebuilds `MatchListRank` for one `viewerUserId`. Reuse scoring/prefilter logic via a **thin extract** from `MeMatchesService` (do not call private `buildFullRankedList` as-is). No list GET cutover (Story 04). No Story 03 trigger wiring required beyond exporting `enqueueOrRunInline` for later. Skip Agent 4 if worker + rank-write specs land.

---

## Summary

Story 01 landed empty `MatchListRank`. This story is the **write path**: async job scores a viewer’s pool and upserts thin rank rows (delete stale). Redis `match:list:{userId}` stays list SoT until Story 04 — after a successful rebuild, **invalidate** that cache so the next GET refreshes Redis from today’s rebuild path (same pattern as profile-analysis).

---

## Inventory (current)

| Piece | Notes |
|-------|--------|
| Bull pattern | `profile-analysis` / `photo-moderation`: Queue const + `*QueueService` + `enqueueOrRunInline` + inline if no Redis |
| Rank build | Private `MeMatchesService.buildFullRankedList` → full HTTP DTO + analytics side effects |
| Cap | `MATCH_LIST_CANDIDATE_CAP` (default 1000) on list miss hydrate only |
| Score encode | `toStoredMatchListScore` (−1 unscored) |
| Cache invalidate | `MeMatchesService.invalidateMatchListCache` |

---

## Decisions (do not reverse without discussion)

### 1. Queue + files (locked)

| Item | Lock |
|------|------|
| Queue name | **`match-list-rank`** |
| Const | `MATCH_LIST_RANK_QUEUE = 'match-list-rank'` |
| Files | `src/workers/match-list-rank.queue.ts`, `src/workers/match-list-rank.worker.ts` → **`MatchListRankQueueService`** |
| Module | Register in `worker.module.ts` (export service) |

Mirror profile-analysis: `OnModuleInit` / destroy, `REDIS_URL` gate, `attempts: 3`, exponential backoff **`60_000`**, `removeOnComplete: 100`, `removeOnFail: 200`.

### 2. Job payload (locked)

```ts
type MatchListRankRebuildJobData = {
  viewerUserId: string;
  /** Free-form for logs (Story 03 will pass reasons). Optional this story. */
  reason?: string;
};
```

- Reject / no-op if `viewerUserId` missing/blank (log + return).  
- **Do not** accept `candidateProfileId`-only incremental updates this story (full viewer rebuild only).

### 3. Idempotency / coalesce (locked)

When enqueueing via Bull:

```ts
await queue.add(data, {
  jobId: `rebuild:${viewerUserId}`,
});
```

- One pending/active rebuild per viewer (Bull jobId). If add fails because jobId exists, treat as success (coalesced) — log at debug/trace.  
- Inline mode: no jobId; still OK to run sequentially.

Story 03 debounce can build on this.

### 4. Concurrency (locked)

- `queue.process(1, handler)` — **concurrency 1** on this queue (avoid multi-viewer DB stampedes on small boxes).  
- Scaling out multiple API tasks each with concurrency 1 is OK later.

### 5. Scoring extract (locked) — do not call `buildFullRankedList` as-is

Add a package-visible method on `MeMatchesService`, e.g.:

```ts
buildMatchListRankSnapshot(viewerUserId: string): Promise<{
  status: 'ready' | 'not_ready';
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  rows: Array<{
    candidateProfileId: string;
    matchScore: number; // already via toStoredMatchListScore
    hardBlocked: boolean;
  }>;
}>;
```

| Rule | Lock |
|------|------|
| Reuse | Same eligibility / SQL prefilter / HG / score / sort buckets as list |
| Cap | Use **`MATCH_LIST_REBUILD_CANDIDATE_CAP`** (see §6), **not** `MATCH_LIST_CANDIDATE_CAP` |
| Side effects | **No** `MATCH_LIST_VIEWED` analytics; miss-path list metrics optional — prefer rebuild-specific logs/metrics only |
| DTO | Do **not** require photo URL / explainability assembly for rank rows (skip work where cheap; if shared loop still builds them, OK but do not persist) |

Agent 1 may refactor shared private helpers out of `buildFullRankedList` + snapshot method; keep list behavior unchanged.

### 6. Job-internal candidate cap (locked)

| Env | Behavior |
|-----|----------|
| `MATCH_LIST_REBUILD_CANDIDATE_CAP` | Hydrate `take` for rebuild snapshot; default **`5000`**; invalid / `< 1` → **5000** |
| Order | Same as list: `analyzedAt DESC NULLS LAST`, `id ASC` |

Document in `.env.example`: **≠** browse fairness / list miss cap; temporary bound on job work until higher/unlimited policy in Story 05.

Helper: `resolveMatchListRebuildCandidateCap()` next to existing cap helper (or same file with clear names).

### 7. Persist strategy (locked)

On `status === 'ready'`:

1. `builtAt = new Date()` once per job.  
2. In a **transaction**:
   - `deleteMany({ viewerUserId, candidateProfileId: { notIn: rowIds } })` when `rowIds.length > 0`; if **zero rows**, `deleteMany({ viewerUserId })` (clear all).  
   - Upsert each row on `@@unique([viewerUserId, candidateProfileId])` with `matchScore`, `hardBlocked`, `builtAt`.  
3. Batch upserts reasonably (e.g. chunks of 100) if needed — Agent 1 choice.

On `status === 'not_ready'`:

- `deleteMany({ viewerUserId })` (viewer should not have stale ranks).  
- Job succeeds (not a hard failure).

**No soft-delete column.** No `sourceJobId` schema change (log Bull job id only).

### 8. Redis after rebuild (locked)

After successful persist (ready or not_ready clear):

- Call `invalidateMatchListCache(viewerUserId)`.

Do **not** write Redis list payload from this job (Story 04+).

### 9. Enqueue API (locked)

`MatchListRankQueueService.enqueueRebuild(viewerUserId, reason?: string): Promise<string>`  
→ Bull job id or `inline:…` (same spirit as analysis).

**This story:** wire module + export; **optional** internal/dev-only call from a unit test.  
**Do not** hook analysis/prefs/block triggers (Story 03).  
**Do not** call from `GET /me/matches`.

### 10. Observability (locked)

Structured log (and optional custom metrics mirroring list style):

| Field | Meaning |
|-------|---------|
| `rebuildMs` | Wall time for snapshot + persist |
| `candidatesScored` / `rowsWritten` | Row count upserted |
| `rowsDeleted` | Count removed as stale (best-effort) |
| `reason` | Job payload reason |
| `status` | `ready` \| `not_ready` |

Add `recordMatchListRankRebuildMs` (and optionally rows written) in `custom-metrics.ts` if cheap; otherwise log-only is Acceptable if Architect checklist notes it — **prefer at least one metric** for rebuild duration.

### 11. Tests (locked)

| Case | Expect |
|------|--------|
| Processor ready path | Upserts rows; scores use −1 encoding; deletes stale id not in new set |
| `not_ready` | Deletes all ranks for viewer; no throw |
| Empty eligible pool (`ready` + `rows: []`) | Clears ranks |
| Queue service | `enqueueOrRunInline` / `enqueueRebuild` invokes processor when Bull disabled (inline) |
| List GET | Unchanged — no enqueue spy required if code search shows no call |

Mock Prisma + snapshot method; no Agent 4 HTTP.

### 12. Agent 4

- **Skip** if §11 specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `workers/match-list-rank.queue.ts` | Const + job type |
| `workers/match-list-rank.worker.ts` | `MatchListRankQueueService` |
| `workers/worker.module.ts` | Register/export |
| `me-matches.service.ts` (+spec) | `buildMatchListRankSnapshot` + rebuild cap |
| `match-list-candidate-cap.ts` or sibling | `MATCH_LIST_REBUILD_CANDIDATE_CAP` |
| `match-list-rank-score.ts` | Reuse |
| `custom-metrics.ts` | Rebuild duration (preferred) |
| `.env.example` | Document rebuild cap |
| Specs | Worker + snapshot/persist |

---

## Out of scope

- Story 03 triggers (analysis/prefs/block enqueue)  
- Story 04 list read from table / feature flag  
- Changing HG / compare math  
- Schema columns `sourceJobId` / `rebuildGeneration`  
- Raising fairness to full population (document cap as job bound)

---

## Agent 1 instructions

1. Add queue/worker per §1–4, §8–9; wire `WorkerModule`.  
2. Extract `buildMatchListRankSnapshot` + rebuild cap (§5–6).  
3. Persist upsert + delete stale (§7); invalidate Redis (§8).  
4. Specs §11; `.env.example` rebuild cap.  
5. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(matches): add Bull job to rebuild materialized ranks

Sprint 31 Story 2
```

---

## Agent 2 instructions

- [ ] Queue name / payload / jobId coalesce / concurrency match locks  
- [ ] Snapshot extract (not raw `buildFullRankedList` HTTP path)  
- [ ] Rebuild cap ≠ list cap  
- [ ] Upsert + delete stale; not_ready clears  
- [ ] No list GET enqueue; Redis invalidate after write  
- [ ] Specs cover ready / not_ready / stale delete  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 3 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Rebuild cap 5000 still unfair vs full pool — accepted until Story 05; better than list’s 1000 for materialization fill.  
2. Dual SoT until Story 04: table fills while GET still uses Redis rebuild — expected.  
3. Heavy job on small Redis/Postgres — concurrency 1 mitigates.
