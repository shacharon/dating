# Agent 1 — Dev Handoff: Expansion-07 Story 4 (Chips & i18n)

**Story:** User-Facing Chips, i18n & Interest Overlap  
**Sprint:** Expansion-07 Profile Gap Signals  
**Date:** 2026-08-07  
**Status:** Complete — ready for Agent 2 (Code Review)

---

## Summary

Display-only Expansion-07 shadow chips: **3 standalone** + **2 pair-level** (synthetic breakdown) + **`interestOverlapTags`** (max 2, distinct UI). EN/HE/ES evidence. **No** scoring promote.

---

## Files Changed

### Backend

| File | Change |
|------|--------|
| `src/matches/expansion-07-explainability.ts` | **Created** — chip maps, breakdown + pair predicates, `pickInterestOverlapTags` |
| `src/matches/expansion-07-explainability.spec.ts` | **Created** |
| `src/matches/match-explainability.ts` | Exp-07 resolution; `interestOverlapTags` on DTO |
| `src/matches/compare-stages/assemble-result.ts` | Concat Exp-07 shadow breakdown |
| `src/matches/match-explanation-traits.ts` | 5 `CHIP_TO_TRAIT` entries |
| Specs | Exp-07 chip + traits + interestOverlapTags |
| `src/application/dto/match-list-row.dto.ts` | Optional `interestOverlapTags` / `sharedInterestNote` |

### Frontend

| File | Change |
|------|--------|
| `chip-evidence.ts` | 5 labels (**24 → 29**) |
| `me-matches-api.ts` | `interestOverlapTags?: string[]` |
| `i18n/en.ts` / `he.ts` / `es.ts` | chipEvidence ×5 + `interestOverlap` map |
| `i18n/types.ts` | `interestOverlap` type |
| `match-why-section.tsx` | Distinct interest chips (`match-why-interest-chips`) |
| Specs | Exp-07 chip evidence + interest chip render |

---

## Chip Labels

| Kind | Label |
|------|-------|
| Standalone | Intimacy expectations, Support & arrangement style, Religious practice |
| Pair | Financial support alignment, Non-transactional match |

---

## Verification

```text
cd dating-api
npx jest src/matches/expansion-07-explainability.spec.ts --runInBand
→ 11/11 pass
npx jest … -t "Expansion-07|…" → pass
npx tsc --noEmit → exit 0

cd dating-ui
npx vitest run chip-evidence.spec.ts → 8/8
npx vitest run match-why-section.spec.tsx → 20/20 (post-teardown window noise pre-existing)
```

---

## Explicit Non-Goals

- No `COMPATIBILITY_SIGNAL_KEYS` / official `POSITIVE_CHIP_BY_SIGNAL`
- No provider/recipient standalone chips
- No tension i18n / admin panel / live fixtures
- No Exp-01–06 explainability map edits

---

## Next Agent

**Agent 2 (Code Review)** — verify shadow-only overlay, pair predicates, interest tags max 2, i18n, no scoring drift.

Then: `--agent 3 expansion 07 story 4`
