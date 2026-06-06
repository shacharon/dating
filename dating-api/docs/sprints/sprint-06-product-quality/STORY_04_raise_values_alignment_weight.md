# Story 4: Raise valuesAlignment weight

**Sprint:** 6  
**Status:** **Done** (engineering gate — 2026-06-03)  
**Closeout order:** 4  
**Depends on:** Story 2 (optional — can run in parallel)

---

## Why

The final compatibility formula weighted `valuesAlignment` at only **5%**. Tier 1 values signals are among the most predictive for long-term compatibility but barely moved the blended compatibility score.

---

## What

**As a** user seeking values-aligned matches  
**I want** core values differences to meaningfully affect my match score  
**So that** spiritually or financially mismatched pairs rank lower

### Acceptance criteria

- [x] **Formula updated** in `engine/scoring.ts`: `0.30·aToB + 0.30·bToA + 0.25·relationshipFit + 0.15·valuesAlignment`
- [x] **Weights sum to 1.0** — `COMPATIBILITY_BLEND_WEIGHTS` unit test
- [x] **Match engine tests updated** — `engine.scoring.spec.ts`, `match-engine.spec.ts`
- [x] **Regression test** — Tier1 spirituality gap lowers `compatibility` vs Tier3-only gap
- [x] **Document in match-engine-overview.md** — formula + values blend note
- [x] **No change to computeValuesAlignment()** — blend weight only
- [x] **Explain output** — `CompareResultDto.valuesAlignment` on compare/recompute

### Out of scope (this story)

- Changing Tier 1 key list
- Changing pair score curve `(1−gap/10)²`
- A/B test infrastructure
- Recomputing all stored match records (operator)

---

## Shipped (engineering)

| Deliverable | Detail |
|-------------|--------|
| `COMPATIBILITY_BLEND_WEIGHTS` | 0.30 / 0.30 / 0.25 / 0.15 |
| `CompareResultDto.valuesAlignment` | Uncapped display; blend uses cap 85 |
| Legacy `matches/scoring.ts` | Marked deprecated (not production) |

---

## Definition of done

- [x] New weights in `scoring.ts`
- [x] `engine.scoring.spec.ts` + `match-engine.spec.ts` pass
- [x] Documentation updated
- [x] Sample compare delta in PM handoff (`agent-3-pm.md`)

---

## Agent run

```text
--agent 0 sprint 6 story 4   ✅
--agent 1 sprint 6 story 4   ✅
--agent 2 sprint 6 story 4   ✅
--agent 3 sprint 6 story 4   ✅
```

Handoffs: `handoffs/STORY_04_raise_values_alignment_weight/agent-*.md`

---

## Manual smoke

1. Compare two pairs: (A) spirituality 2 vs 9, (B) physicalPriority 2 vs 9 → A lower `compatibility` / `valuesAlignment`  
2. Identical profiles → `valuesAlignment` ≈ 100

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Data-driven weight calibration | Sprint 7 funnel / analytics |
| Bulk match recompute after weight change | Operator |
