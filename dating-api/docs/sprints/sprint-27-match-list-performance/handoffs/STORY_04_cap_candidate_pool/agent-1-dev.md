# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_cap_candidate_pool.md](../../STORY_04_cap_candidate_pool.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

List rebuild hydrates at most `MATCH_LIST_CANDIDATE_CAP` (default **1000**) after photo + Story 2 prefilter, ordered by `analyzedAt DESC NULLS LAST`, `id ASC`. Parallel uncapped eligible `count` keeps `filteredNoPhotoCandidates` from absorbing cap truncation. Trace logs `candidatesHydrated` / `candidatesEligible` / `cap`.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Default 1000; `0`/invalid → 1000 | Pass |
| Cap after photo + prefilter; `take` + orderBy | Pass |
| Nulls last on analyzedAt | Pass |
| `filteredNoPhoto = baseCount - eligibleUncapped` | Pass |
| `totalCandidatesBeforeFilter` = hydrated length | Pass |
| `.env.example` stopgap note | Pass |
| No detail / product-sort change | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `match-list-candidate-cap.ts` (+ spec) | Env resolve + orderBy constant |
| `me-matches.service.ts` | Wire cap, eligible count, logs |
| `.env.example` | Document env |
| `me-matches.service.spec.ts` | Cap take/orderBy + telemetry assert |
| `me-matches-eligibility-harness.ts` | Count honors photo/gender/age where |
| `me-profile-http.integration.spec.ts` | Dual count mock for photo exclusion |

---

## Verification ran

| Check | Result |
|-------|--------|
| cap + me-matches specs | **97 passed** |
| eligibility e2e | **5 passed** |
| `npm run build` | **OK** |

---

## Agent 2 note

- Confirm eligible count shares the same where object as findMany (no take).
- Confirm product sort after scoring unchanged.

---

## Commit

`perf(matches): cap match-list candidate hydrate on cache miss` — Sprint 27 Story 4.
