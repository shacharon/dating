# Handoff: Agent 2 — Code review — Story 5

**Agent:** 2 code-review  
**Story:** [STORY_05_block.md](../../STORY_05_block.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Reviewed Story 5 implementation against architect handoff — **approved** (no production code changes).
- Added **API integration tests**: BLOCK overwrite (LIKE/PASS), list exclusion, detail/actions/photo 404 when blocked, DELETE-on-blocked regression.
- Added **4 unit tests** in `me-matches.service.spec.ts` (list skip, getById, assertMatchCandidateVisible, LIKE still listed).
- Added **5 UI tests** on match detail (Block confirm flow + redirect); **1 list test** (server-filtered exclusion).
- Detail page: **14 tests**; full me-matches UI: **22 tests**.

---

## Review verdict

**Approved**

### Issues found & fixed

| Severity | Issue | Fix |
|----------|-------|-----|
| — | None in production code | Tests only |

### Notes (no change required)

- **One-way block** — `assertViewerHasNotBlockedTarget` only checks viewer→target; correct for MVP.
- **404 not 403** on blocked detail/DELETE — visibility guard runs first; intentional per architect.
- **List excludes BLOCK rows** — `yourAction: 'BLOCK'` badge path on list page is now unreachable in normal flow (acceptable).
- **BLOCK overwrites LIKE/PASS** via upsert — confirmed in integration tests.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | +7 block integration tests; list exclusion test |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | +4 block visibility unit tests; `findUnique` mock |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | +5 Block UI tests |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | +1 list exclusion test |

---

## Decisions (do not reverse without discussion)

- DELETE on blocked match expects **404** (not Story 4’s 403) — visibility hides match before undo guard.
- List UI test mocks **server-filtered** response (blocked id absent) — matches API contract.
- Service unit `assertMatchCandidateVisible` covered in dedicated describe (first coverage for this method).

---

## Tests / verification

- [x] `npx jest me-match-actions.service.spec.ts` — **10 passed**
- [x] `npx jest me-profile-http.integration.spec.ts -t "actions"` — **35 passed**
- [x] `npx jest me-profile-http.integration.spec.ts -t "BLOCK|blocked|block"` — **8 passed**
- [x] `npx jest me-matches.service.spec.ts -t "BLOCK|assertMatchCandidateVisible"` — **4 passed**
- [x] `npx vitest run src/app/dating/me-matches` — **22 passed**

---

## Open questions / blockers

- None for Story 5 close.

---

## Next agent

```text
--agent 3 story 5
```

**Notes for next agent:**

1. Mark Story 5 DoD in `STORY_05_block.md` and sprint README (final sprint story).
2. Mark epic Match Actions complete in sprint README if all 5 stories done.
3. Manual smoke: block → list row gone → direct detail URL → not found.
4. Phase 2 note: two-way block visibility deferred — document in README if helpful.
