# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_split_me_matches_service.md](../../STORY_03_split_me_matches_service.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Extract-then-delegate refactor. **Zero** HTTP/DTO/status-code / score / HG policy change. **No** feature flag. **Agent 4 required** (code ownership of eligibility + ranking moves; parity via E2E baselines).

**Depends on:** Sprint 45 Done (characterization, typed domain errors, response mapper). Story 02 ports (`MATCH_LIST_RANK_*`) already landed.

---

## Summary

Split `me-matches.service.ts` (~2025 LOC) into collaborators under `src/me-profile/matches/`, with `MeMatchesService` remaining the **only** Nest type injected by controller / actions / feedback / profile / workers (via `MATCH_LIST_RANK_REBUILD_PORT`). Prefer move + thin wrappers. Preserve materialized + legacy Redis paths, rebuild/persist, detail narrative, and photo file gate.

**Adjust vs story table:** Sprint 45 already owns HTTP DTO assembly in `me-matches-response.mapper.ts` — do **not** create a second “hydration DTO” service. Replace story’s `MatchHydrationService` with **`MatchDetailService`** (detail + narrative + photo file). List/detail cards still go through the existing mapper.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Public Nest API | Controllers / `MeMatchActionsService` / `MeMatchFeedbackService` / profile submit / worker rebuild inject **`MeMatchesService`** (or `MATCH_LIST_RANK_REBUILD_PORT` → same class) |
| HTTP | `GET /api/v1/me/matches`, `GET /api/v1/me/matches/:id`, photo file routes — **identical JSON + status** |
| Domain errors | Keep throwing `me-matches.errors.ts` types; filter mapping unchanged |
| Response DTOs | Stay in `dto/me-matches-response.dto.ts`; assembly via `me-matches-response.mapper.ts` |
| Materialized flag | `MATCH_LIST_MATERIALIZED` / `isMatchListMaterializedEnabled()` — default ON; legacy Redis when off |
| Ranking engine | Live `matchScore` order = `compareWithStatus` (V1). HG gates eligibility only |
| Ports | `MATCH_LIST_RANK_REBUILD_PORT` → `useExisting: MeMatchesService`; queue port injection unchanged |
| Characterization | Sprint 45 Story 01 matrix + V1 contract stay green |

---

## Artifacts (locked layout)

```text
dating-api/src/me-profile/
  me-matches.service.ts              # Thin facade (public Nest surface)
  me-matches.errors.ts               # unchanged (Story 45.2)
  me-matches-response.mapper.ts      # unchanged (Story 45.3)
  dto/me-matches-*.dto.ts            # unchanged
  matches/
    match-list.helpers.ts            # pure: matchActionToYourAction, pickApprovedPrimaryPhotoId, partnerGenderSourceForMeMatchesRow (if moved)
    match-list-cursor.ts             # pure: matchListRankAfterCursorWhere (+ re-export from facade if needed)
    match-list-query.service.ts
    match-eligibility.service.ts
    match-ranking.service.ts
    match-list-cache.service.ts
    match-detail.service.ts
  me-matches.test-harness.ts         # NEW — createMeMatchesServiceForTest(deps)
  me-profile.module.ts               # register collaborators; export facade + rebuild port only
```

Do **not** create `FEATURE_SPLIT_MATCH_SERVICE`.  
Do **not** move mapper / errors / DTOs into `matches/`.  
Do **not** change Prisma schema.

---

## Decisions (do not reverse without discussion)

### 1. LOC caps (locked)

| File | Max LOC (approx) |
|------|------------------|
| `me-matches.service.ts` (facade) | **≤ 250** |
| `match-list-query.service.ts` | **≤ 350** |
| `match-eligibility.service.ts` | **≤ 400** |
| `match-ranking.service.ts` | **≤ 700** |
| `match-list-cache.service.ts` | **≤ 200** |
| `match-detail.service.ts` | **≤ 500** |
| Pure helpers / cursor | no Nest; keep lean |

Former god ~2025 → facade ≤ 250 satisfies story “orchestrator slimmed under Architect LOC cap.”  
`match-ranking` may approach ~700 because `buildFullRankedList` is ~560 LOC today — extract eligibility branches into Eligibility; do **not** rewrite the scoring loop.

### 2. Ownership map (locked)

#### Pure helpers

| Symbol | File |
|--------|------|
| `matchListRankAfterCursorWhere` | `matches/match-list-cursor.ts` (re-export from `me-matches.service.ts` for existing imports) |
| `matchActionToYourAction`, `pickApprovedPrimaryPhotoId` | `matches/match-list.helpers.ts` |
| `MatchListRankSnapshot` type | Stay exported from facade file (or `matches/match-list-rank.types.ts` + re-export) |

#### `MatchListQueryService`

| Method / concern | Notes |
|------------------|--------|
| `resolveViewerListGate` | `not_ready` reasons unchanged |
| `fetchMatchListRankPage` | materialized cursor page |
| `matchCandidateBaseWhere` / `matchCandidatePhotoEligibleWhere` | |
| `candidateSelectList` / `candidateSelectDetail` | Prisma selects used by Ranking + Detail |
| Load helpers | e.g. fetch photo-eligible candidate rows for rebuild / page hydrate when called by Ranking |

Deps: `prisma`, `obs` (as today for gender-source logging).

#### `MatchEligibilityService`

| Method / concern | Notes |
|------------------|--------|
| `assertViewerHasNotBlockedTarget` | |
| `buildHardBlockedDto` | |
| `assertMatchCandidateVisible` | **public API** used by actions/feedback — facade delegates |
| Pair gates used inside list rebuild | reciprocal gender, HG hard-fail → exclude vs existing hard-block path, BLOCK filter — **behavior identical**; extract helpers the ranking loop already inlines |

Deps: `prisma`, `obs`, `mutualMatches` (as needed for existing hard-block).

Does **not** own `compareWithStatus` scoring.

#### `MatchRankingService`

| Method / concern | Notes |
|------------------|--------|
| `buildFullRankedList` | legacy rebuild + materialized **page hydrate** (`candidateProfileIds`) |
| `buildMatchListRankSnapshot` | |
| `persistMatchListRankSnapshot` | |
| Sort / thin rank rows | |

Calls: Query (load/where/select), Eligibility (gates + hardBlocked DTO), **mapper** (`toMeMatchListItem` / list ready envelope pieces as today).  
Deps: prisma, obs, analytics, Query, Eligibility, (photo URL helpers via existing `resolveMatchPrimaryPhotoUrl`).

#### `MatchListCacheService`

| Method / concern | Notes |
|------------------|--------|
| `invalidateMatchListCache` | public via facade |
| `getOrBuildRankedList` | Redis versioned payload |
| `maybeEnqueueListEmpty` | NX + `MATCH_LIST_RANK_QUEUE_PORT` |

Deps: `RedisCacheService`, Ranking (`buildFullRankedList`), queue port, obs/metrics as today.

#### `MatchDetailService`

| Method / concern | Notes |
|------------------|--------|
| `getById` | scoring + traits + narrative + `toMeMatchDetail` |
| `resolveMatchNarrative` | |
| `getPrimaryPhotoFileById` | + `assertCandidateHasApprovedPhotosInRow` / `readApprovedPrimaryPhotoFile` |

Calls: Eligibility for visibility/gates; mapper for DTO; narrative generator/cache.  
Deps: prisma, obs, photo storage, mutualMatches (if shared), Eligibility, narrative services.

#### `MeMatchesService` (facade)

Public method **signatures unchanged**:

| Method | Delegates to |
|--------|----------------|
| `list` | Materialized → Query gate/page + Ranking hydrate + mapper rebase; legacy → Cache `getOrBuildRankedList` + cursor slice (same as today) |
| `getById` | Detail |
| `getPrimaryPhotoFileById` | Detail |
| `assertMatchCandidateVisible` | Eligibility |
| `invalidateMatchListCache` | Cache |
| `buildMatchListRankSnapshot` | Ranking |
| `persistMatchListRankSnapshot` | Ranking |
| `rebuildMatchListRanks` | Ranking (+ Cache invalidate as today) |

Constructor: inject Query, Eligibility, Ranking, Cache, Detail (and any deps only the facade still needs for `list` routing / metrics). Prefer facade **does not** inject `prisma` if all paths delegate — allowed to keep thin `list` orchestration with flag check only.

Re-export DTO types + `matchListRankAfterCursorWhere` + `MatchListRankSnapshot` so existing imports keep working.

### 3. Dependency direction (locked — no cycles)

```text
MeMatchesService (facade)
  → MatchListQueryService
  → MatchEligibilityService
  → MatchRankingService
  → MatchListCacheService
  → MatchDetailService

MatchListCacheService → MatchRankingService
MatchRankingService   → MatchListQueryService, MatchEligibilityService
MatchDetailService    → MatchEligibilityService

Forbidden: Ranking → Cache; Query → Ranking; Eligibility → Ranking/Detail
```

### 4. Nest wiring (locked)

`MeProfileModule` **add** providers (do **not** export collaborators by default):

```ts
MatchListQueryService,
MatchEligibilityService,
MatchRankingService,
MatchListCacheService,
MatchDetailService,
MeMatchesService,
{ provide: MATCH_LIST_RANK_REBUILD_PORT, useExisting: MeMatchesService },
```

Exports stay: `MeMatchesService`, `MATCH_LIST_RANK_REBUILD_PORT`, … — **unchanged** public exports.

### 5. Side-effect matrix (locked — must preserve)

| Action | Side effects |
|--------|----------------|
| `list` materialized empty first page | `maybeEnqueueListEmpty` → NX → `enqueueRebuild(..., 'list_empty')` |
| `rebuildMatchListRanks` | build snapshot → persist → `invalidateMatchListCache` + metrics |
| `invalidateMatchListCache` | del list cache key + list-empty NX key |
| Legacy cache miss | `buildFullRankedList` then Redis set with `MATCH_LIST_CACHE_VERSION` |
| Detail narrative | generator + cache behavior unchanged |
| Analytics / HG dimension counters | same emit points inside ranking loop |

### 6. Migration style (locked)

1. Create `matches/` + harness; move code; facade delegates.
2. No parallel old/new implementations; no feature flag; no shadow path.
3. Do not change DTO JSON, status codes, domain error bodies, scores, or HG outcomes.
4. Prefer mechanical moves; keep Sprint 45 mapper call sites.

### 7. Testing strategy (locked)

1. Add `me-matches.test-harness.ts` → `createMeMatchesServiceForTest(deps)` wiring real collaborators from today’s ctor mocks.
2. Point `me-matches.service.spec.ts` + `me-matches-materialized-list.spec.ts` factories at the harness.
3. Keep HTTP integration green via Nest module (no controller change).
4. Characterization + V1 + mapper specs stay green.
5. Required commands (Agent 1):

```bash
cd dating-api
npx tsc --noEmit
npx jest --no-coverage src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches-materialized-list.spec.ts src/me-profile/me-matches.v1-contract.spec.ts src/me-profile/me-matches-response.mapper.spec.ts --runInBand
npm run smoke:me-profile
```

Focused unit specs for new services optional if extract leaves pure seams; not required for AC if harness + existing suites cover.

### 8. Out of scope

- PairMatchPolicy (46), UI contracts (47)
- Repository abstraction (39)
- Engine stage rewrite (40)
- Changing `MATCH_LIST_MATERIALIZED` default
- Fixing pre-existing HTTP harness gap (`prismaMock.matchListRank` when materialized on) — optional drive-by **only** if needed to green smoke; prefer separate follow-up

---

## HTTP contracts (unchanged)

```
GET /api/v1/me/matches
GET /api/v1/me/matches/:id
GET /api/v1/me/matches/:id/photos/:photoId   (or existing photo route)
```

Auth: `SessionGuard`. Bodies: Sprint 45 DTOs.

---

## Runtime topology

- N/A (no realtime / proxy / cookie change)

---

## E2E verification plan (Agent 4 required)

**Change class:** structural move of **eligibility gating** and **ranking/scoring orchestration** between Nest providers. Intended product effect: **none** (parity). Still an eligibility + ranking story because live `/api/v1/me/matches` path code relocates.

| Item | Plan |
|------|------|
| Affects eligibility? | Ownership moves (gates still decide include/exclude) — **behavior must not change** |
| Affects ranking/order? | Ownership of `compareWithStatus` loop / sort moves — **order must not change** |
| Baseline specs (must stay green, unmodified) | `me-new-model-e2e.integration.spec.ts`, `me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts`, plus sibling e2e: pagination, dealbreaker, dealbreaker-guardrails, hard-block-existing, match-narrative, photo-moderation |
| Harness | Keep using `me-matches-eligibility-harness.ts` — do not invent a new harness |
| New scenarios | **None required** if baselines prove parity. Optional Agent 4 add: one “split smoke” list+detail happy path only if baselines are insufficient in practice |
| Agent 4 command | `--agent 4 sprint 38 story 3` after CR |

---

## Agent 1 instructions

1. Create `matches/` collaborators + helpers/cursor per §2–§4.
2. Slim `MeMatchesService` to facade ≤ 250 LOC; preserve public signatures + rebuild port.
3. Add `me-matches.test-harness.ts`; update unit factories; Nest module providers.
4. Run locked Jest + `tsc` + `smoke:me-profile`; note any deferred HTTP mock follow-up.
5. Commit; write `agent-1-dev.md`.

Suggested commit:

```
refactor(me-matches): split god service into domain collaborators

Sprint 38 Story 3
```

---

## Agent 2 instructions

- [ ] Layout under `me-profile/matches/` + helpers; mapper/errors untouched
- [ ] Facade public signatures unchanged; rebuild port still `useExisting: MeMatchesService`
- [ ] LOC caps + dependency direction (no Ranking↔Cache cycle)
- [ ] Side-effect matrix preserved
- [ ] Characterization + V1 + unit/materialized green; no wire drift
- [ ] Flag Agent 4 next (do not skip)
- Write `agent-2-cr.md` → `--agent 4 sprint 38 story 3`

---

## Agent 4 instructions

- Run baseline e2e integration specs (eligibility + ranking + listed siblings) green.
- Report any parity break → send back to `--agent 1`.
- Write `agent-4-e2e.md` → `--agent 3`.

---

## Agent 3 instructions

- Accept only if CR approved **and** Agent 4 handoff exists with non-blocked verdict.
- Mark Story 03 Done; update Sprint 38 README (Story 03 Done; sprint may still have only 03 remaining if 01/02/04 Done → consider sprint Done).

---

## Open questions / blockers

- None. If Ranking exceeds 700 LOC after mechanical move, extract one pure helper file for the hard-block pending assembly — do not rewrite scoring.

---

## Next agent

```text
--agent 1 sprint 38 story 3
```

**Notes for next agent:**

- Extract-then-delegate only; Sprint 45 mapper stays the HTTP assembly edge.
- No feature flag; Agent 4 after CR.
