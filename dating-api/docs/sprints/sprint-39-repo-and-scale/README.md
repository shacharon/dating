# Sprint 39 — Repository Pattern + Scale Hardening (P1 High)

**Status:** 📋 Planned  
**Depends on:** Sprint 38 Done (god service split)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md) · Prior: [Sprint 28 scale hardening](../sprint-28-backend-scale-hardening/README.md) · [Sprint 31 materialization](../sprint-31-match-materialization/README.md)

---

## Goal

Improve testability and operational scale on the post-split services:

1. Introduce `IUserProfileRepository` (Prisma impl + test double)
2. Harden rebuild time-bounds / checkpoints on top of Sprint 31 materialization
3. Add cache hit/miss/latency metrics (fail-open stays, but visibility improves)
4. Verify/extend Prisma pool ops (Sprint 28 already documented — this story closes gaps + metrics)

**Non-goals:** Full engine pipeline rewrite (Sprint 40), PgBouncer, extracting workers to separate process, FE changes.

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [UserProfile repository port](./STORY_01_user_profile_repository.md) | P1 | 2d | **Done** |
| 02 | [Match list rebuild time-bounds](./STORY_02_rebuild_time_bounds.md) | P1 | 2d | **Done** |
| 03 | [Redis cache metrics](./STORY_03_cache_metrics.md) | P1 | 1d | **Done** |
| 04 | [Prisma pool verify + connection metrics](./STORY_04_prisma_pool_verify_metrics.md) | P1 | 0.5–1d | Planned |

**Order:** 01 → 02 → 03 → 04 (or 03/04 parallel after 01).

---

## Success metrics

| Metric | Target |
|--------|--------|
| Profile CRUD path | Uses repository port in split services |
| Rebuild | Soft time cap + resume/checkpoint or documented equivalent |
| Cache | Hit/miss/latency observable (logs and/or custom metrics) |
| Pool | Confirmed vs Sprint 28 docs; gap closed if any |

---

## Roadmap

| Next | Focus |
|------|--------|
| **40** | [Match engine stages + txn/query ops](../sprint-40-match-engine-stages/README.md) |
