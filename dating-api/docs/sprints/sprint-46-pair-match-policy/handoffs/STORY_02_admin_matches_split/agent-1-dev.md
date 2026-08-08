# Handoff: Agent 1 — Senior Dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_admin_matches_split.md](../../STORY_02_admin_matches_split.md)  
**Sprint:** sprint-46-pair-match-policy  
**Date:** 2026-08-08  
**Status:** complete  

---

## Summary

- Admin compare hub (`runCompareOnLoadedBundle`) now goes through `AdminPairMatchEvaluator` → `PAIR_MATCH_POLICY`.
- HG-first neutral-signal retry remains admin-only inside the evaluator (outside the policy).
- List pairwise, HG diagnostic, admission gates, and product me-matches paths untouched.
- `MatchesModule` imports leaf `MatchingPolicyModule` only (no MeProfile cycle).

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/admin-pair-match.evaluator.ts` | created — policy + DTO recovery + HG-first retry |
| `src/matches/admin-pair-match.evaluator.spec.ts` | created — READY path, HG-first retry, no-retry when HG null |
| `src/matches/matches.module.ts` | imports `MatchingPolicyModule`; provides evaluator |
| `src/matches/matches.service.ts` | injects evaluator; compare hub delegates |
| `src/matches/matches.service.spec.ts` | constructor wiring updated |

---

## Decisions (do not reverse without discussion)

- **DTO recovery double-compare:** `policy.evaluate` already runs `compareWithStatus` (slim score port). Evaluator calls `compareWithStatus` again to recover full READY / guard envelopes for admin HTTP assembly. Documented on the evaluator.
- **List pairwise** stays on direct `compareWithStatus` (Architect §1).
- **compareHgDiagnostic** still uses live `evaluateHolyGrailPairDirections` only.

---

## Runtime topology

- N/A (no REST/socket/cookie change)

---

## Tests / verification

- [x] Unit: `npx tsc --noEmit`
- [x] Unit: `npx jest --no-coverage src/matches/matches.service.spec.ts src/matches/admin-pair-match.evaluator.spec.ts src/matches/compare-hg-first-helpers.spec.ts src/matching-policy --runInBand` → **13 passed**
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: N/A (no transport change)
- [x] Socket transport: N/A

---

## E2E verification (agent 4)

- Agent 4 required (shared gate+score path for admin compare).
- Product baselines: do not require fixing Story 01 materialized empty-list gap unless Agent 4 is asked to re-run product suites.

---

## Open questions / blockers

- None for this implement pass.

---

## Next agent

```text
--agent 2 sprint 46 story 2
```

**Notes for next agent:**

- Confirm compare hub uses `PAIR_MATCH_POLICY` via evaluator; retry still admin-only.
- Flag Agent 4 after CR approve (not Agent 3 first).
