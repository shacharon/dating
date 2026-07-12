# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_raise_values_alignment_weight.md](../../STORY_04_raise_values_alignment_weight.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Change only the blend weights** in `engine/scoring.ts` `compatibility()` — **do not** modify `computeValuesAlignment()` or Tier 1 key list.
- **Locked formula:** `0.30·aToB + 0.30·bToA + 0.25·relationshipFit + 0.15·valuesAlignment` (sums to **1.0**).
- **Production path** uses `import { compatibility } from '../engine/scoring'` in `match-engine.ts` — **not** `matches/scoring.ts` (divergent legacy weights 0.20/0.10).
- **Expose `valuesAlignment`** on `CompareResultDto` so compare/explain responses show the component (AC: explain visibility).
- **Expected behavior change:** rankings shift when Tier 1 values diverge; PM must note in handoff. Re-run `npm run validate:golden-pairs` and widen/tighten ranges only if failures are principled.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/scoring.ts` | New weights + exported `COMPATIBILITY_BLEND_WEIGHTS`; update JSDoc |
| `dating-api/src/engine/engine.scoring.spec.ts` | Weight sum test; updated formula assertion; Tier1 vs Tier3 regression |
| `dating-api/src/matches/match-engine.ts` | Pass `valuesAlignment` into `buildFinalResultDto`; add field to `CompareResultDto` |
| `dating-api/src/matches/match.types.ts` | Mirror `valuesAlignment` if list DTO copies compare fields |
| `dating-api/docs/match-engine-overview.md` | §4 formula line |
| `dating-api/src/matches/scoring.ts` | **Comment only** — mark as non-production / divergent (do not change weights) |
| `data/golden-pairs.json` | Update `expectedFinalMin/Max` **only if** validate script fails after weight change |
| `handoffs/STORY_04_raise_values_alignment_weight/agent-1-dev.md` | created by agent 1 |

**Do not change:**

| Path | Reason |
|------|--------|
| `compatibility/compatibility-score.ts` | `computeValuesAlignment`, tiers, `(1−gap/10)²` out of scope |
| `match-engine.ts` `valuesAlignmentCap = 85` | Cap stays — limits double-count with directionals |
| `engine/tension-rules.ts` | Orthogonal friction |

---

## Decisions (do not reverse without discussion)

### 1. Final weights (locked)

| Component | Old | New |
|-----------|-----|-----|
| aToB | 0.35 | **0.30** |
| bToA | 0.35 | **0.30** |
| relationshipFit | 0.25 | **0.25** (unchanged) |
| valuesAlignment | 0.05 | **0.15** |

**Sum:** 1.0. Architect may **not** adjust ±0.05 without re-opening story — sprint README already locked 0.30/0.30/0.25/0.15.

**Max swing on compat (holding other inputs constant):** values term contributes up to **+10 points** extra vs old formula when `valuesAlignment = 100` (0.10 × 100 delta in weight).

### 2. Single source of truth — `engine/scoring.ts`

```typescript
/** Blend weights for compatibility(); must sum to 1. */
export const COMPATIBILITY_BLEND_WEIGHTS = {
  aToB: 0.3,
  bToA: 0.3,
  relationshipFit: 0.25,
  valuesAlignment: 0.15,
} as const;

export function compatibility(
  aToB: number,
  bToA: number,
  relationshipFit: number,
  valuesAlignment: number,
): number {
  const w = COMPATIBILITY_BLEND_WEIGHTS;
  return (
    w.aToB * aToB +
    w.bToA * bToA +
    w.relationshipFit * relationshipFit +
    w.valuesAlignment * valuesAlignment
  );
}
```

### 3. `matches/scoring.ts` — document drift, do not sync

`computeCompatibilityFromComponents` uses **0.20 / 0.10** and is **not** imported by `match-engine.ts`. Changing it would break `matches/scoring.spec.ts` without product benefit.

**Agent 1:** Add file-header comment:

```typescript
/** @deprecated Divergent legacy helper — production uses engine/scoring.compatibility(). */
```

### 4. Explain / API visibility

`CompareResultDto` today exposes `compatibility` (blended) but **not** raw `valuesAlignment`.

**Add:**

```typescript
// CompareResultDto
/** Tier-1 values alignment score (0–100) before compat cap; used in blend at 15% weight. */
valuesAlignment: number;
```

Populate from `step6.valuesAlignment` in `buildFinalResultDto` (use **uncapped** display value; blend still uses `valuesAlignmentForCompat` capped at 85).

No change to `buildMatchExplainability` required if top-level field is present — admin compare already returns full DTO.

### 5. valuesAlignmentCap stays at 85

`match-engine.ts` `valuesAlignmentForCompat = min(85, valuesAlignment)` remains — prevents vibe double-count inflation in the **blend input** while display field shows raw score.

---

## Regression test (required)

Add to `engine.scoring.spec.ts` (or `compatibility-score.spec.ts`):

**A. Weights sum to 1**

```typescript
expect(
  Object.values(COMPATIBILITY_BLEND_WEIGHTS).reduce((a, b) => a + b, 0),
).toBeCloseTo(1, 10);
```

**B. Tier 1 gap vs Tier 3 gap (story AC)**

Hold directional inputs constant; vary only `valuesAlignment` input to `compatibility()`:

```typescript
const rel = 60;
const dir = 70;
const tier1GapValues = computeValuesAlignment(
  fullMap({ spirituality: 2, traditionalism: 5, financialMindset: 5, relationshipClarity: 5, lifestylePace: 5, attachmentSecurity: 5 }),
  fullMap({ spirituality: 9, traditionalism: 5, financialMindset: 5, relationshipClarity: 5, lifestylePace: 5, attachmentSecurity: 5 }),
);
const tier3GapValues = computeValuesAlignment(
  fullMap({ spirituality: 5, traditionalism: 5, financialMindset: 5, relationshipClarity: 5, lifestylePace: 5, attachmentSecurity: 5, physicalPriority: 2 }),
  fullMap({ spirituality: 5, traditionalism: 5, financialMindset: 5, relationshipClarity: 5, lifestylePace: 5, attachmentSecurity: 5, physicalPriority: 9 }),
);
// Tier3-only gap: valuesAlignment unchanged (Tier3 ignored by computeValuesAlignment)
expect(tier3GapValues).toBeGreaterThan(tier1GapValues);
const compatTier1 = compatibility(dir, dir, rel, tier1GapValues);
const compatTier3 = compatibility(dir, dir, rel, tier3GapValues);
expect(compatTier1).toBeLessThan(compatTier3);
```

**C. Formula numeric spot-check**

```typescript
expect(compatibility(80, 80, 60, 70)).toBe(0.3 * 80 + 0.3 * 80 + 0.25 * 60 + 0.15 * 70);
// = 48 + 48 + 15 + 10.5 = 71.5
```

**D. Optional integration:** `compare()` two synthetic profiles — Tier1 spirituality 2 vs 9 ranks lower `compatibility` than Tier3 physicalPriority 2 vs 9 when directionals similar. Only if unit tests insufficient.

---

## Golden pairs / match-engine.spec

| Check | Action |
|-------|--------|
| `npm run validate:golden-pairs` | Run after weight change; update `data/golden-pairs.json` min/max if scores drift but judgment still valid |
| `match-engine.spec.ts` | No hard-coded compatibility blend literals found — likely no changes |
| `engine.scoring.spec.ts` | Update line 24–27 expected value **74.5 → 71.5** |

---

## Documentation

### `docs/match-engine-overview.md` §4

Replace:

```text
compat = 0.35·aToB + 0.35·bToA + 0.25·relationshipFit + 0.05·valuesAlignment
```

With:

```text
compat = 0.30·aToB + 0.30·bToA + 0.25·relationshipFit + 0.15·valuesAlignment
```

Note: `valuesAlignment` in blend uses `valuesAlignmentForCompat` (capped at 85 in `match-engine.ts`).

---

## Import / grep checkpoints

```bash
cd dating-api

# Production import path:
rg "from '../engine/scoring'|from \"../engine/scoring\"" src/matches/match-engine.ts

# No accidental 0.05 left in active blend:
rg "0\.05 \* valuesAlignment|0\.05\*values" src/engine/scoring.ts src/matches/match-engine.ts
# expect: no matches

# Weights sum:
# unit test COMPATIBILITY_BLEND_WEIGHTS
```

---

## Ordered implementation plan (agent 1)

1. Add `COMPATIBILITY_BLEND_WEIGHTS` + update `compatibility()` in `engine/scoring.ts`.
2. Update `engine.scoring.spec.ts` (formula, sum, Tier1 vs Tier3 regression).
3. Add `valuesAlignment` to `CompareResultDto` + wire in `buildFinalResultDto`.
4. Deprecation comment on `matches/scoring.ts` (no weight change).
5. Update `match-engine-overview.md`.
6. `npm test`; `npm run validate:golden-pairs` if script exists in package.json (add note in dev handoff if not wired).
7. Write `agent-1-dev.md` with sample compare delta (spirituality gap vs physicalPriority gap).

---

## Manual smoke (operator)

1. Admin/compare two synthetic pairs: (A) spirituality 2 vs 9, (B) physicalPriority 2 vs 9 — same directionals → **A lower `compatibility` and `finalScore`** after change.  
2. Identical profiles → `valuesAlignment` ≈ 100, scores still ~top of range (caps may still apply).

---

## Story AC mapping

| AC | How satisfied |
|----|----------------|
| Formula updated | `engine/scoring.ts` 0.30/0.30/0.25/0.15 |
| Weights sum 1.0 | Unit test on `COMPATIBILITY_BLEND_WEIGHTS` |
| Match engine tests | `engine.scoring.spec.ts` + golden if needed |
| Tier1 vs Tier3 regression | Test B above |
| match-engine-overview.md | Formula line |
| No computeValuesAlignment change | No edits to `compatibility-score.ts` logic |
| Explain shows valuesAlignment | `CompareResultDto.valuesAlignment` |

---

## Risks / PM notes

| Risk | Mitigation |
|------|------------|
| Ranking shifts globally | Expected; document in agent-3 PM handoff |
| Tier1 double-count (directionals + values) | Mitigated by 85 cap on blend input; weight increase is product intent |
| Stale docs (codex-audit, scoring-debug) | Update overview only; deep audit docs out of scope |
| `matches/scoring.ts` confusion | Deprecation header |

---

## Next agent

```text
--agent 1 sprint 6 story 4
```
