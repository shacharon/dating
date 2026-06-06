# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_raise_values_alignment_weight.md](../../STORY_04_raise_values_alignment_weight.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

Raised `valuesAlignment` blend weight from **5% → 15%** (directionals **35% → 30%** each) in `engine/scoring.ts`. Exposed uncapped `valuesAlignment` on compare DTOs. **1270/1270** tests pass.

---

## Changes

| Path | Change |
|------|--------|
| `src/engine/scoring.ts` | `COMPATIBILITY_BLEND_WEIGHTS` + updated `compatibility()` |
| `src/engine/engine.scoring.spec.ts` | Weight sum, formula, Tier1 vs Tier3 regression, case expectations |
| `src/matches/match-engine.ts` | `CompareResultDto.valuesAlignment`; wired through `buildFinalResultDto` |
| `src/matches/match.types.ts` | `valuesAlignment?` on `MatchRecordDto` |
| `src/matches/matches.service.ts` | Persist `valuesAlignment` on recompute |
| `src/matches/matches-list.pipeline.ts` | Same |
| `src/matches/scoring.ts` | `@deprecated` header (legacy 0.20/0.10 — not production) |
| `src/matches/match-engine.spec.ts` | Low-directional compat ceiling 40 (values weight) |
| `docs/match-engine-overview.md` | Formula + values blend note |

**Unchanged:** `computeValuesAlignment()`, `valuesAlignmentCap = 85` for blend input.

---

## Formula (locked)

```text
compat = 0.30·aToB + 0.30·bToA + 0.25·relationshipFit + 0.15·valuesAlignment
```

Spot-check `compatibility(80, 80, 60, 70)` → **73.5** (was 74.5 at old weights).

---

## Sample delta (blend only, same directionals/relFit)

Holding `aToB = bToA = 70`, `relationshipFit = 60`:

| valuesAlignment | Old compat (5%) | New compat (15%) | Δ |
|-----------------|-----------------|------------------|---|
| 100 (aligned) | 70.0 | 73.0 | +3.0 |
| 25 (Tier1 gap) | 69.25 | 68.75 | −0.5 |
| 0 | 69.0 | 67.5 | −1.5 |

Tier1 spirituality **2 vs 9** (`computeValuesAlignment` ≈ 25) vs Tier3-only **physicalPriority 2 vs 9** (values ≈ 100): new formula ranks spirituality-gap pair **lower** on `compatibility` when directionals are held equal.

---

## Verification

```text
npx jest src/engine/engine.scoring.spec.ts  → pass
npm test                                    → 1270/1270 pass
```

`validate:golden-pairs` not wired in `package.json` — not run.

---

## Next agent

```text
--agent 2 sprint 6 story 4
```
