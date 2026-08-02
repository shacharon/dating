# Sprint 40 — Match Engine Stages + DB Ops (P1 Medium)

**Status:** 📋 Planned  
**Depends on:** Sprint 38 Done; Sprint 39 recommended (not hard-blocked for Story 01)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

---

## Goal

1. Refactor `match-engine.ts` (~800 LOC) into testable scoring stages with parity tests
2. Shrink / bulk `MatchListRank` persistence transactions
3. Add slow-query observability on Prisma

**Non-goals:** Changing product ranking weights for product reasons (constants already named in Sprint 38 Story 1), FE work, new match features.

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Match scoring stage pipeline](./STORY_01_match_scoring_stages.md) | P1 | 3d | **Done** |
| 02 | [MatchListRank persist transaction tighten](./STORY_02_rank_persist_bulk.md) | P1 | 1d | Planned |
| 03 | [Prisma slow-query observability](./STORY_03_slow_query_observability.md) | P1 | 1d | Planned |

**Order:** 01 → 02 → 03 (02/03 can parallel after Architect locks).

---

## Success metrics

| Metric | Target |
|--------|--------|
| Stage modules | Independently unit-testable |
| Score parity | Shadow/compare tests: no unexplained drift |
| Persist | Smaller txn / bulk-friendly path |
| Slow queries | >100ms logged; >1s escalated |

---

## After Sprint 40

Backlog (P2): more repositories, table partitioning strategy, OpenAPI — not scheduled here.
