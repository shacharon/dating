# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [README.md — STORY 5: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Added **9** `compare()` E2E tests for Expansion-06 (tension, positive chip, alignments exclusion, invariance, Exp-05 non-regression, interest coexistence, distinction).
- Created live LLM fixtures (6) + `validate:expansion-06-extraction` script.
- UI: tension chip passthrough `Novelty vs routine`; 10 expansion product chips asserted in `CHIP_EVIDENCE_KEYS`.
- Shadow scoring unchanged. No evaluate-layer duplication.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion06Shadow` + Expansion-06 E2E describe |
| `dating-api/data/expansion-06-extraction-fixtures.json` | **Created** — 3 high / 3 low novelty texts |
| `dating-api/scripts/validate-expansion-06-extraction.ts` | **Created** — optional live LLM validator |
| `dating-api/package.json` | `validate:expansion-06-extraction` |
| `dating-ui/.../match-why-section.spec.tsx` | Expansion-06 tension chip passthrough |
| `dating-ui/.../chip-evidence.spec.ts` | 10 expansion product chips presence assert |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | This handoff |

---

## Tests / verification

- [x] `match-engine.spec.ts` -t Expansion-06 — **9/9 pass**
- [x] `match-engine.spec.ts` -t Expansion-05 — **12/12 pass** (non-regression)
- [x] Expansion-06 unit filter (explainability/friction/extraction) — **13/13 pass**
- [x] `npm run typecheck` — **pass**
- [x] UI chip-evidence + match-why — **25/25 assertions pass** (vitest teardown `window` noise → exit 1 non-blocking)
- [x] `npm run validate:expansion-06-extraction` — **100%** (5/5 scored fixtures; ≥85% threshold). One fixture returned null (not counted in scored).
- [ ] `validate:golden-pairs` — **SKIP** (not run / no DB assumed)
- [ ] Browse visual QA — **SKIP** (manual operator checklist)

### Manual browse checklist (operator)

1. Re-analyze 2 profiles with novelty/routine `aboutMe`.
2. Confirm `Adventure & novelty` / `Novelty vs routine` when values warrant.
3. Confirm busy-tempo-only / travel-tag-only texts do not falsely drive high novelty.
4. Switch HE/ES — evidence localized.

---

## Open questions / blockers

- None blocking agent 2 CR.
- Live LLM: 1/6 null on this run — still above threshold; operator may expand fixtures before promote.

---

## Next agent

```text
--agent 2 expansion 06 story 5
```

**Notes:** Story 5 closes Expansion-06 engineering gate. Promote to scored keys is a future explicit story — keep shadow lock.
