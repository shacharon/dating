# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_split_me_matches_service.md](../../STORY_03_split_me_matches_service.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-08  
**Status:** complete  

---

## Summary

- Split `MeMatchesService` into `matches/` collaborators (Query, Eligibility, Ranking, Cache, Detail) + pure helpers.
- Facade ≤250 LOC; public signatures + `MATCH_LIST_RANK_REBUILD_PORT` unchanged.
- Test harness wires real collaborators; locked characterization/V1 suites green.
- No feature flag; no wire/score/HG change.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/me-profile/me-matches.service.ts` | facade (219 LOC) |
| `src/me-profile/matches/match-list-cursor.ts` | created |
| `src/me-profile/matches/match-list.helpers.ts` | created |
| `src/me-profile/matches/match-list-rank.types.ts` | created |
| `src/me-profile/matches/match-list-query.service.ts` | created (239) |
| `src/me-profile/matches/match-eligibility.service.ts` | created (222) |
| `src/me-profile/matches/match-ranking.service.ts` | created (679) |
| `src/me-profile/matches/match-list-cache.service.ts` | created (127) |
| `src/me-profile/matches/match-detail.service.ts` | created (438) |
| `src/me-profile/matches/match-list-materialized.ts` | created (pure; materialized list on Cache) |
| `src/me-profile/matches/match-list-hard-block-pending.ts` | created (pure; Ranking LOC) |
| `src/me-profile/matches/match-detail-narrative.ts` | created (pure; Detail LOC) |
| `src/me-profile/me-matches.test-harness.ts` | created |
| `src/me-profile/me-profile.module.ts` | register 5 collaborators |
| Specs | harness: service / materialized / v1 / persist; policy updated |

---

## Decisions (do not reverse without discussion)

- Materialized `listFromMaterializedRanks` lives on Cache (uses Ranking) via pure helper — keeps facade thin; Cache→Ranking allowed.
- Extra pure files for hard-block pending + narrative to hold Nest LOC caps.
- Facade does not inject Query (list routes via Cache); Nest still provides Query for Ranking/Detail/Eligibility.

---

## Runtime topology

- N/A

---

## Tests / verification

- [x] `npx tsc --noEmit` → pass
- [x] Locked Jest (mapper + service + materialized + V1) → **122 passed**
- [x] `match-list-rank-persist` + `me-matches-read-model-policy` → **9 passed**
- [x] `npm run smoke:me-profile` → **188 passed / 10 failed** — pre-existing HTTP `prismaMock.matchListRank` when materialized ON (architect follow-up; not introduced by split)
- [x] Result: pass (story suites)
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: N/A
- [x] Socket transport: N/A

---

## E2E verification

- Deferred to **Agent 4** (baselines after CR).

---

## Open questions / blockers

- None for Agent 2. Optional follow-up: mock `matchListRank` in HTTP harness.

---

## Next agent

```text
--agent 2 sprint 38 story 3
```

**Notes for next agent:**

- Confirm LOC caps + dependency direction; Agent 4 required next (do not skip).
- Smoke HTTP failures are known pre-existing materialized mock gap.
