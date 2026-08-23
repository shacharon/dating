# Story 03 — Match List Caching

**Sprint:** 68  
**Effort:** ~2 days  
**Risk:** 🟡 MEDIUM (JSON cache + rollout fallback)  
**Status:** Done  
**GO_LIVE:** Sprint 68 goal #3 (performance)

**Handoffs:** [architect](./handoffs/STORY_03_match_list_caching/agent-0-architect.md) · [dev](./handoffs/STORY_03_match_list_caching/agent-1-dev.md) · [CR](./handoffs/STORY_03_match_list_caching/agent-2-cr.md) · [PM](./handoffs/STORY_03_match_list_caching/agent-3-pm.md)

---

## Objective

Eliminate per-page match re-scoring on the default materialized list path — rebuild already computes explainability but discarded it; each scroll re-ran `pairMatchPolicy.evaluate()` × page size.

**Deliverable:** Persist versioned presentation JSON on `MatchListRank`; materialized page hydrate loads profiles + actions only; no live scoring on cache hit.

---

## Problem (before)

```typescript
// Paginated MatchListRank in SQL, then re-scored every page for explainability
const hydrated = await ranking.buildFullRankedList(userId, {
  candidateProfileIds: pageIds, // → pairMatchPolicy.evaluate × ~20
});
```

Rebuild snapshot stored only `matchScore` + `hardBlocked`; explainability/recommendation thrown away.

---

## Solution

- **`MatchListRank.presentationJson`** nullable `Json` — `{ v: 1, explainability, recommendation, hardBlockedDetail? }`
- **Rebuild snapshot** captures presentation JSON alongside score/hardBlocked
- **`hydrateMatchListPageFromRanks`** — profile-only assembly; no `pairMatchPolicy.evaluate`
- **Rollout fallback:** any row with null JSON → whole-page `buildFullRankedList(pageIds)` (pre-backfill)
- **Detail path unchanged** — `GET /api/v1/me/matches/:id` still live-scores
- **Legacy Redis path unchanged** — `MATCH_LIST_MATERIALIZED=0` out of scope

---

## API

**No HTTP change.** `GET /api/v1/me/matches` response shape identical (`MeMatchItemDto`).

| Field (cache hit) | Source |
|-------------------|--------|
| `matchScore` / tier | `MatchListRank.matchScore` (rebase) |
| `explainability` | `presentationJson.explainability` |
| `recommendation` | `presentationJson.recommendation` |
| `hardBlocked` | `presentationJson.hardBlockedDetail` |
| Profile/photo/action | DB hydrate (unchanged) |

---

## Success criteria

- [x] `presentationJson` column + migration on `MatchListRank`
- [x] Rebuild persists explainability + recommendation (+ hard-block detail)
- [x] Materialized page hydrate skips live scoring on cache hit
- [x] Null JSON fallback preserves correctness during rollout
- [x] Unit + integration tests (64 tests in story scope)
- [x] Agent 2 CR approved

---

## Deploy note

```bash
cd dating-api
npx prisma migrate deploy

# Backfill presentation JSON for existing rank rows
npx ts-node --project tsconfig.json scripts/enqueue-match-list-rank-backfill.ts --dry-run
npx ts-node --project tsconfig.json scripts/enqueue-match-list-rank-backfill.ts
```

Until backfill completes, list requests use live page scoring fallback (correct but slower).

---

## Deferred (not blocking Done)

| Item | Notes |
|------|-------|
| Strict mode (no fallback when JSON null) | After backfill complete |
| Staging perf smoke (cache-hit latency) | Ops / manual |
| Legacy Redis path caching | Out of scope (`MATCH_LIST_MATERIALIZED=0`) |

---

## Files changed

**New:**
- `prisma/migrations/20260823130000_match_list_rank_presentation_json/migration.sql`
- `src/me-profile/matches/match-list-rank-presentation.types.ts`
- `src/me-profile/matches/match-list-page-hydrate.ts`
- `src/me-profile/matches/match-list-rank-presentation.types.spec.ts`
- `src/me-profile/matches/match-list-page-hydrate.spec.ts`
- `src/me-profile/matches/match-ranking-presentation-cache.spec.ts`

**Modified:**
- `prisma/schema.prisma`
- `src/me-profile/matches/match-list-rank.types.ts`
- `src/me-profile/repositories/match.repository.types.ts`
- `src/me-profile/repositories/prisma-match.repository.ts`
- `src/me-profile/matches/match-ranking.service.ts`
- `src/me-profile/matches/match-list-materialized.ts`
- `src/me-profile/matches/match-list-query.service.ts`
- `src/me-profile/match-list-rank.schema.spec.ts`
- `src/me-profile/match-list-rank-persist.spec.ts`
- `src/me-profile/repositories/prisma-match.repository.spec.ts`
- `src/me-profile/me-matches-materialized-list.spec.ts`
- `scripts/enqueue-match-list-rank-backfill.ts`

---

## Branch

`feature/sprint-68-story-3` — ready for PR/merge
