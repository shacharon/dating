# Sprint 31 — Match list materialization cutover (ops)

**Story:** [STORY_05_cutover_deprecate_rebuild.md](./STORY_05_cutover_deprecate_rebuild.md)

## Goal

Default `GET /api/v1/me/matches` reads **`MatchListRank`** (DB cursor + page hydrate). Legacy Redis + request-path full rebuild is an **escape hatch** only.

## Deploy order

1. **Migrations** — Stories 1–4 schema already applied (`MatchListRank`).
2. **Deploy** Story 5 code — `MATCH_LIST_MATERIALIZED` **unset = on**.
3. **Backfill** ranks for existing ANALYZED viewers (below), or rely on Story 03 triggers + `list_empty` for active users.
4. **Verify** — list returns `ready` with ranks; traces show `source=materialized`.
5. **Escape hatch** — only if needed: set `MATCH_LIST_MATERIALIZED=0` (Redis + `buildFullRankedList` miss path).

## Env

| Variable | Meaning |
|----------|---------|
| `MATCH_LIST_MATERIALIZED` | Unset / anything except `0`/`false`/`no` → materialized. Off = legacy. |
| `MATCH_LIST_REBUILD_CANDIDATE_CAP` | Bounds who appears in ranks per rebuild (default 5000). Raise for fairness. |
| `MATCH_LIST_CANDIDATE_CAP` | **Legacy escape hatch only** (default 1000). Not browse fairness when materialized. |
| `MATCH_LIST_BACKFILL_DELAY_MS` | Delay between backfill enqueues (default 200). |
| `REDIS_URL` | Required for Bull rebuild queue + backfill script. |

## Backfill

```bash
# Preview
npm run match-list:backfill-ranks -- --dry-run

# Enqueue (concurrency 1 + delay)
npm run match-list:backfill-ranks
```

Script: `scripts/enqueue-match-list-rank-backfill.ts`  
Selects `ANALYZED` profiles with ≥1 `APPROVED` photo; enqueues `reason=backfill` with jobId `rebuild:{userId}` (coalesces).

A running API/worker process must consume the `match-list-rank` queue (same as production).

## Fairness note

Materialized browse membership = rows written by the last rebuild. That set is still capped by **`MATCH_LIST_REBUILD_CANDIDATE_CAP`**, not by the old list miss cap. Candidate→viewer fan-out remains deferred.

## Rollback

Set `MATCH_LIST_MATERIALIZED=0` and redeploy/restart. Do not drop `MatchListRank` table.
