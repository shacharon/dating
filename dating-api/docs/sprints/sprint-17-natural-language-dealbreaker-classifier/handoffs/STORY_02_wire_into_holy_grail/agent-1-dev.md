# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_wire_into_holy_grail.md](../../STORY_02_wire_into_holy_grail.md)  
**Sprint:** sprint-17-natural-language-dealbreaker-classifier  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Wired Story 1 classifier into **live HG eligibility** via extract-at-read + `dealbreakerDimensions` with **`NEVER_BLOCKS`**.
- Soft ranking **not** implemented (architect Option **C**).
- No Prisma migration. Baseline E2E untouched and still green.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/holy-grail-matching/dealbreaker-eligibility.ts` | created |
| `dating-api/src/holy-grail-matching/dealbreaker-eligibility.spec.ts` | created |
| `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` | updated — dealbreakerDimensions + fold |
| `dating-api/src/canonical/matching-canonical.types.ts` | updated — MatchingDealbreakerSignal, prefs/facts fields |
| `dating-api/src/holy-grail-matching/profile-sources.types.ts` | updated — mapping input fields |
| `dating-api/src/holy-grail-matching/profile-to-canonical.mapper.ts` | updated — map signals/selfFacts |
| `dating-api/src/holy-grail-matching/retrieval/holy-grail-structured-db-json.ts` | updated — extract-at-read |
| `dating-api/src/matches/children-unsure-profile-row.types.ts` | updated — aboutRelationship |
| `dating-api/src/me-profile/me-profile-engine.mapper.ts` | updated — pass aboutRelationship |
| `dating-api/src/holy-grail-matching/index.ts` | updated — exports |
| Specs touching `HolyGrailDirectionalEvaluationResult` | updated — empty `dealbreakerDimensions` |
| Soft ranking / compareWithStatus / five-signal | **untouched** |

---

## Decisions (do not reverse without discussion)

- Extract-at-read in `buildHolyGrailProfileMappingInputFromDbRow` (same place as personality/lifestyle/interest).
- Column facts win; self-fact hints fill gaps via `dealbreakerSelfFacts`.
- Option C: no soft rank overlay.

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest src/holy-grail-matching --runInBand` → **237 passed**
- [x] `npx jest --no-coverage "me-new-model-e2e" src/me-profile/me-profile-engine.mapper.spec.ts --runInBand` → **40 passed** (baseline E2E green)
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser Network smoke: **N/A**
- [x] Socket transport: **N/A**

---

## E2E verification (agent 4)

Agent 4 **required**. New HTTP scenarios (harness):

1. Searcher “don’t want smokers” + counterparty “I smoke” → excluded  
2. Same searcher + silent counterparty → included  
3. “only smokers” + “I don’t smoke” → excluded  
4. “don’t care about smoking” + smoker → included  

Baseline specs must stay unmodified.

---

## Deferred

- Soft ranking (Option C follow-up)
- Persist signals to DB (Story 3 / later)
- Full dealbreaker E2E file (Agent 4)

---

## Next agent

```text
--agent 2 sprint 17 story 2
```

**Notes for next agent:**

- Confirm NEVER_BLOCKS + extract-at-read path; no soft ranking.
- After CR → `--agent 4 sprint 17 story 2` (required).
