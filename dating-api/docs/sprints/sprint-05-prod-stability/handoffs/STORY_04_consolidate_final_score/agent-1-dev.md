# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_consolidate_final_score.md](../../STORY_04_consolidate_final_score.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Canonical headline score:** `finalScore` only on engine output, persisted records, list/detail API, and UI.
- Removed duplicate **`overallScore`** from `CompareResultDto` and **`overall`** from `MatchRecordDto` / `MatchListItemDto` / `MatchIndexItemDto` on write.
- Added **`resolveEngineFinalScore()`** for legacy JSON read (`finalScore ?? overall`) — single internal fallback.
- Guard failures use **`finalScore: null`** (not `overall`).
- **1284/1284** tests pass; `npm run build` green.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/match-score.util.ts` | **New** — `resolveEngineFinalScore` |
| `src/matches/match-score.util.spec.ts` | **New** — legacy read tests |
| `src/matches/match-engine.ts` | Drop `overallScore`; guards → `finalScore: null` |
| `src/matches/match.types.ts` | Remove `overall`; `finalScore` required on records |
| `src/matches/matches.service.ts` | No `overall` writes; resolver on sort |
| `src/matches/matches-list.pipeline.ts` | No `overall` writes; list DTO `finalScore` only |
| `src/matches/*` (daemon, analytics, scan, mappers, API) | Resolver on read |
| `src/scripts/recompute-matches.ts`, `score-stats.ts`, `match-diagnostics.ts` | No `overall` writes; resolver on read |
| `scripts/review-explainability.ts`, `sample-recommendation-review.ts`, `validate-golden-pairs.ts`, etc. | Resolver on read |
| `dating-ui/.../matches-list.ts`, `children-unsure.ts` | `finalScore` only on API types |
| `dating-ui/.../matches-page-client.tsx`, `auto-matches/page.tsx` | Display `finalScore` only |
| `dating-ui/src/lib/matches-api-list-mapper.ts` | View model `finalScore` only |
| `docs/match-engine-overview.md` | §6 outputs updated |

**Unchanged (by design):** `computeCompatibility().overallScore`, `compatAB.overallScore`, evaluation/HG `overall*` fields.

---

## Breaking change

API/engine/match JSON responses **no longer include** `overall` or `overallScore` for headline score. Consumers must use **`finalScore`**.

---

## Verification

| Command | Result |
|---------|--------|
| `npx jest src/matches/match-score.util.spec.ts src/matches/match-engine.spec.ts` | pass |
| `npm test` | **1284/1284** |
| `npm run build` | pass |

---

## Grep hygiene

- `LOW_INFO` / profile-id hacks: N/A this story
- `overallScore` on `CompareResultDto`: removed
- `overall` on `match.types.ts` DTOs: removed
- `finalScore ?? overall` outside `match-score.util.ts`: migrated to resolver

---

## Next agent

```text
--agent 2 sprint 5 story 4
```
