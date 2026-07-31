# Sprint 27 — Match List Performance

**Status:** ✅ **COMPLETE** — Stories 01–05 Done  
**Depends on:** Current match-list path (`MeMatchesService.buildFullRankedList`); Sprint 19 cache/pagination already shipped  
**Companion:** [`SCALE_READINESS_CR.md`](../../SCALE_READINESS_CR.md) · [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

---

## Goal

Make match-list **cache misses** safe at thousands of analyzed users: kill N+1 evaluation loads, push gender/age into SQL, slim hydrated rows, cap the pool, instrument the miss path.

**Non-goal:** Full async materialization / pair-score table (follow-up).

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Batch latest evaluations](./STORY_01_batch_latest_evaluations.md) | **Done** |
| 02 | [SQL gender/age prefilter](./STORY_02_sql_gender_age_prefilter.md) | **Done** |
| 03 | [Slim candidate select](./STORY_03_slim_candidate_select.md) | **Done** |
| 04 | [Cap candidate pool](./STORY_04_cap_candidate_pool.md) | **Done** |
| 05 | [Miss-path observability](./STORY_05_miss_path_observability.md) | **Done** |

**Order:** 01 → 02 → 03 → 04 → 05 (4 agents each: `--agent 0..3 sprint 27 story N`).

---

## Success metrics (Story 5)

On cache-miss → ready rebuild (log + custom metrics): `candidates_loaded`, `candidates_eligible`, `candidate_load_ms`, `eval_query_ms`, `score_cpu_ms`, `cache_set_ms`, plus existing `match.list.load_time` / `cache.hit_rate`.
