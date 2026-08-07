# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [README.md — STORY 5: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Added **11** `compare()` integration tests in `Expansion-05 shadow E2E via compare` (tension, positive chips, alignments, invariance, Exp-04 non-regression, adjacent distinction, interest coexistence).
- Created **12** live LLM fixtures + `validate-expansion-05-extraction.ts` + npm script (behavior/preference wording).
- Added Expansion-05 **tension chip** UI test (`Different activity levels`).
- Live LLM: **100%** agreement (12/12 scored).
- Shadow mode unchanged — no scoring promote. Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion05Shadow` + Expansion-05 E2E describe |
| `dating-api/data/expansion-05-extraction-fixtures.json` | **Created** — 12 fixtures (6 activity / 6 domestic) |
| `dating-api/scripts/validate-expansion-05-extraction.ts` | **Created** — live LLM validation |
| `dating-api/package.json` | `validate:expansion-05-extraction` |
| `dating-ui/.../match-why-section.spec.tsx` | Expansion-05 tension chip passthrough |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | This handoff |

---

## Integration test matrix (as-built)

| Test | Result |
|------|--------|
| Shadow keys ∉ `COMPATIBILITY_SIGNAL_KEYS` (length 15) | ✅ |
| Distinct from interest tags + adjacent official keys | ✅ |
| Activity gap → `Different activity levels` + friction ≥ 3 | ✅ |
| Domestic mismatch → `Home vs out mismatch` + friction ≥ 3 | ✅ |
| High activity → `Activity level match` | ✅ |
| High domestic → `Home/out balance` | ✅ |
| Shadow absent from `alignments` | ✅ |
| Null shadow → no chip / no rule | ✅ |
| Compatibility invariance | ✅ |
| Expansion-04 intellectual non-regression | ✅ |
| Interest coexistence (`gym`/`hiking` + Activity level match) | ✅ |

---

## Live LLM validation

```bash
npm run validate:expansion-05-extraction
```

| Run | Result |
|-----|--------|
| `validate:expansion-05-extraction` | **100.0%** (12/12 scored); exit **0** |
| Without API key | Script exits 0 with `SKIP: no OPENAI_API_KEY` |

---

## Tests / verification

- [x] `npx jest match-engine.spec.ts -t "Expansion-05"` — **11/11 pass**
- [x] `npx jest match-engine.spec.ts -t "Expansion-04 shadow E2E"` — **11/11 pass**
- [x] `npx jest … -t "Expansion-05"` (explainability/friction/extraction) — **20 pass**
- [x] `npm run typecheck` — **pass**
- [x] UI `match-why-section` + `chip-evidence` — **21/21 pass** (vitest teardown warnings — pre-existing)
- [x] Live LLM script — **100%**
- [ ] `validate:golden-pairs` — **SKIP** (not run; no DB in env)

---

## E2E verification

Manual browse smoke **deferred / SKIP** — requires re-analyzed profiles in running app.

Checklist for operator:

1. Re-analyze 2 test profiles with activity/domestic `aboutMe` text.
2. Compare or browse — confirm positive/tension chips when values warrant.
3. Confirm wellness-only / introvert-only text does not falsely drive Expansion-05 chips.
4. Switch locale HE/ES — evidence localized.

---

## Open questions / blockers

- None blocking Story 5 CR.

---

## Next agent

```text
--agent 2 expansion 05 story 5
```

**Notes for next agent:** Verify both solo tensionChips (penalty 3), adjacent distinction asserts, fixture wording, shadow mode preserved, no Phase 1 EQ gate.
