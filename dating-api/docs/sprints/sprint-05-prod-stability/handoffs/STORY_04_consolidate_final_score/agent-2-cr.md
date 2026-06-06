# Handoff: Agent 2 — Code review — Story 4

**Agent:** 2 code-review  
**Story:** [STORY_04_consolidate_final_score.md](../../STORY_04_consolidate_final_score.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved (fixed)

---

## Summary

- Reviewed hard removal of `overallScore` / `overall` duplicate fields on match headline scores.
- `resolveEngineFinalScore()` correctly centralizes legacy read fallback.
- **1284/1284** tests pass; build green (per dev handoff).
- **Fixed:** root `scripts/match-diagnostics.ts` still used inline `finalScore ?? overall` (duplicate of `src/scripts/match-diagnostics.ts`).

---

## Review findings

| Severity | Finding | Resolution |
|----------|---------|------------|
| Minor | `dating-api/scripts/match-diagnostics.ts` not migrated to resolver | **Fixed** — aligned with `src/scripts/match-diagnostics.ts` |
| Accepted | Duplicate `scripts/` vs `src/scripts/` diagnostics entrypoints | Both now use resolver |
| Accepted | No OpenAPI spec update | No OpenAPI in repo; docs updated in `match-engine-overview.md` |
| Accepted | Archived scripts still reference `overall` / HG fields | Out of scope |

---

## Acceptance criteria

| AC | Status |
|----|--------|
| Match result type — `finalScore` canonical, no `overallScore` on compare | ✅ `CompareResultDto` |
| API DTOs — `finalScore` only on list/detail | ✅ `MatchListItemDto`, `MatchesApiItemDto`, guards |
| UI — `finalScore` only | ✅ `matches-list.ts`, matches page, auto-matches |
| Preserve `computeCompatibility().overallScore` | ✅ `compatAB.overallScore` unchanged |
| Tests updated | ✅ engine + `match-score.util` + service smoke |
| Scripts updated | ✅ recompute, review-explainability, validate-golden-pairs, diagnostics |
| No silent behavior change | ✅ field rename only; resolver preserves legacy read |

---

## Definition of done

| Item | Status |
|------|--------|
| Grep: match-result `overallScore` only in compat layer | ✅ |
| `match.types.ts` no `overall` field | ✅ |
| UI displays `finalScore` | ✅ |
| Tests pass | ✅ **1284/1284** |
| Release note (PM) | Pending agent 3 |

---

## Grep verification

- `CompareResultDto` — no `overallScore` in `match-engine.ts` return
- `match.types.ts` — no `overall` on record/list/index DTOs
- `finalScore ?? overall` in `src/` — only `match-score.util.ts` (+ CR fix in root `scripts/match-diagnostics.ts`)

---

## Tests / verification

| Command | Result |
|---------|--------|
| `npx jest src/matches/match-score.util.spec.ts src/matches/match-engine.spec.ts` | pass |
| `npm test` | **1284/1284** pass |

---

## Open questions / blockers

- None blocking Agent 3.
- **Breaking:** external consumers of `overall` / `overallScore` on match payloads must switch to `finalScore` (PM release note).

---

## Next agent

```text
--agent 3 sprint 5 story 4
```
