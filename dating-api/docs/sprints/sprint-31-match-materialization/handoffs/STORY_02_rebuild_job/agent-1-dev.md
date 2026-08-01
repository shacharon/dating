# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_rebuild_job.md](../../STORY_02_rebuild_job.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Added Bull queue **`match-list-rank`** (`MatchListRankQueueService`) with concurrency 1 and jobId coalesce. `MeMatchesService` exposes `buildMatchListRankSnapshot` / `persistMatchListRankSnapshot` / `rebuildMatchListRanks` (rebuild cap 5000, skip list analytics, upsert + delete stale, invalidate Redis). No list GET enqueue; no Story 03 triggers. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Queue `match-list-rank` / jobId / concurrency 1 | Pass |
| Snapshot extract (cap + no list analytics) | Pass |
| Rebuild cap ≠ list cap | Pass |
| Upsert + delete stale / not_ready clear | Pass |
| Invalidate Redis after write | Pass |
| Specs ready / not_ready / stale / inline enqueue | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `workers/match-list-rank.queue.ts` | Const + job type |
| `workers/match-list-rank.worker.ts` (+spec) | Queue service |
| `workers/worker.module.ts` | Register/export |
| `me-matches.service.ts` | Snapshot + persist + rebuild |
| `match-list-candidate-cap.ts` (+rebuild spec) | `MATCH_LIST_REBUILD_CANDIDATE_CAP` |
| `match-list-rank-persist.spec.ts` | Persist cases |
| `custom-metrics.ts` | `recordMatchListRankRebuildMs` |
| `.env.example` | Rebuild cap docs |

---

## Verification

- jest persist + rebuild-cap + candidate-cap + worker — **10 passed**
- jest `me-matches.service` `list()` — smoke after refactor
