# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_remove_low_info_profile_ids.md](../../STORY_03_remove_low_info_profile_ids.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Delete** `LOW_INFO_PROFILE_IDS` and profile-id-based `applyLowInfoCap` from `match-engine.ts`.
- **Replace** with a **coverage-based finalScore cap** in `coverage-policy.ts`, reusing the same thresholds already used for `LOW_COVERAGE` info flags and `lowEvidence` friction floor.
- **Locked policy:** when `coveragePercent < 50` **or** `minPresent <= 5` → `finalScore = min(finalScore, 55)` (after dealbreaker cap and `min(90, …)`).
- **Profile `19` (SHORT)** is covered by low pair coverage (~14–29% in golden pairs) — no id list needed.
- **Do not** change `scoreCoverageFactor` / `coverageFactor` formulas, compatibility ceiling (`50 + coveragePercent` when cov ≤ 55), or friction curves.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/matches/coverage-policy.ts` | Export thresholds + `shouldApplySparseFinalScoreCap` + `applySparseFinalScoreCap`; single source for `LOW_COVERAGE` percent check |
| `dating-api/src/matches/match-engine.ts` | Remove `LOW_INFO_*` constants; call sparse cap with `coveragePercentValue`, `minPresent` from step 3 |
| `dating-api/src/matches/coverage-policy.spec.ts` | **New** — unit tests for cap trigger and cap value |
| `dating-api/src/matches/match-engine.spec.ts` | Add integration cap tests; remove any profile-`19` assertions if present |
| `dating-api/docs/match-engine-overview.md` | Replace § low-info / principle 5 with sparse coverage cap rule |
| `handoffs/STORY_03_remove_low_info_profile_ids/agent-1-dev.md` | created by agent 1 |

**Do not change (this story):**

| Path | Reason |
|------|--------|
| `engine/coverage.ts` | Formula unchanged per AC |
| `computeCompatibilityAndNuancePenalties` coverage ceiling | Orthogonal layer (caps compat before friction) |
| `extraction-sparse-profile-patch.ts` / `sparse-profile-patch.ts` | Extraction `SPARSE_PATCH_PROFILE_IDS` — different concern; out of scope |
| `STORY_04_consolidate_final_score.md` | Separate story; avoid DTO rename in same PR unless trivial |

---

## Decisions (do not reverse without discussion)

### 1. Cap trigger (locked)

Apply sparse final cap when **either**:

| Condition | Rationale |
|-----------|-----------|
| `coveragePercent < 50` | Aligns with `LOW_COVERAGE` info flag and `MIN_COVERAGE_FOR_CONFIDENT_SCORE = 0.5` in `compatibility-score.ts` (50% scale) |
| `minPresent <= 5` | Mirrors existing `lowEvidence` in `computeCoverageAsymmetryLowEvidenceAdjustments`; catches **per-profile sparsity** when pair coverage is borderline (historical over-score on SHORT ↔ Flirt ~57% cov in old audits) |

**Not** using profile ids. **Not** using `scoreCoverageFactor` as cap input — it no longer multiplies `raw` (`rawScore(compat, 1, friction)`).

### 2. Cap value (locked)

| Constant | Value |
|----------|-------|
| `SPARSE_FINAL_SCORE_CAP` | **55** |

Preserves golden BROKEN pairs (SHORT #19 ↔ *): expected **48–56**, observed **55** in `docs/golden-pairs.md`.

### 3. Cap position in pipeline (unchanged order)

```text
preCapFinalScore → applyDealbreakerCap → min(90, …) → applySparseFinalScoreCap → DTO
```

Same slot as today’s `applyLowInfoCap` (line ~772 in `match-engine.ts`).

### 4. Single source of truth — `coverage-policy.ts`

```typescript
/** Pair coverage % below which we flag LOW_COVERAGE and may apply sparse final cap. */
export const LOW_COVERAGE_PERCENT_THRESHOLD = 50;

/** Min numeric self-signals on the sparser profile (of 14 keys) for sparse final cap. */
export const SPARSE_MIN_PRESENT_SIGNALS = 5;

/** Max finalScore when sparse cap applies (after dealbreakers and hard 90 cap). */
export const SPARSE_FINAL_SCORE_CAP = 55;

export function shouldApplySparseFinalScoreCap(
  coveragePercent: number,
  minPresent: number,
): boolean {
  return (
    coveragePercent < LOW_COVERAGE_PERCENT_THRESHOLD ||
    minPresent <= SPARSE_MIN_PRESENT_SIGNALS
  );
}

export function applySparseFinalScoreCap(
  finalScoreClamped: number,
  coveragePercent: number,
  minPresent: number,
): number {
  if (!shouldApplySparseFinalScoreCap(coveragePercent, minPresent)) {
    return finalScoreClamped;
  }
  return Math.min(finalScoreClamped, SPARSE_FINAL_SCORE_CAP);
}
```

**Refactor** `computeConfidenceAndInfoFlags` to use `LOW_COVERAGE_PERCENT_THRESHOLD` instead of magic `50`:

```typescript
if (coveragePercentValue < LOW_COVERAGE_PERCENT_THRESHOLD) infoFlags.push('LOW_COVERAGE');
```

### 5. `compare()` wiring

In `compare()` (or extracted helper), replace:

```typescript
finalScoreClamped = applyLowInfoCap(finalScoreClamped, profileA.id, profileB.id);
```

with:

```typescript
finalScoreClamped = applySparseFinalScoreCap(
  finalScoreClamped,
  step3.coveragePercentValue,
  step3.minPresent,
);
```

Add provenance in `buildFinalResultDto` when cap applied:

```typescript
if (finalScoreClamped < Math.min(90, finalScoreAfterDealbreakers)) {
  // or track explicit flag from caps state
  provenance.push('sparse_final_cap');
}
```

Prefer passing a boolean `sparseFinalCapApplied` via `CapsCalibrationState` if cleaner than inferring from score diff.

### 6. Grep / hygiene (required for AC)

Agent 1 must confirm **zero** remaining in `src/matches/`:

- `LOW_INFO_PROFILE_IDS`
- `applyLowInfoCap`
- Hardcoded profile id sets used for **scoring** caps

**Expected remaining id sets (OK, document in dev handoff):**

- `SPARSE_PATCH_PROFILE_IDS` in extraction (signal patch, not match score)
- HG / evaluate tooling profile lists

---

## Regression tests (required)

### `coverage-policy.spec.ts` (new)

| Case | Expect |
|------|--------|
| cov 49%, minPresent 10 | cap applies → `min(80, 55) === 55` |
| cov 60%, minPresent 5 | cap applies (minPresent branch) |
| cov 60%, minPresent 6 | no cap → score unchanged |
| cov 49%, minPresent 6 | cap applies (coverage branch) |

### `match-engine.spec.ts` (add)

| Case | Expect |
|------|--------|
| Low coverage synthetic pair (6/14 keys, aligned signals) | `finalScore <= 55`, `infoFlags` contains `LOW_COVERAGE` |
| Full 14-key pair, high scores | `finalScore` **unchanged** vs pre-change baseline (snapshot or explicit `>= 70` fixture) |
| **No test** referencing profile id `'19'` | Use synthetic `makeProfile` only |

### Golden pairs (optional but recommended)

```bash
npm run validate:golden-pairs
```

Pairs **14** and **18** (SHORT) must remain **PASS** in expected 48–56 band. If fail, adjust fixtures only if principled — **do not** reintroduce profile id hack.

---

## Documentation (`match-engine-overview.md`)

Replace step 5 / principle 5:

**Old:** `LOW_INFO_PROFILE_IDS` / profile `19` → cap 55  

**New:**

```text
5. Sparse final cap: if coveragePercent < 50 OR minPresent <= 5
   → finalScore = min(finalScore, 55)
```

Clarify this is **in addition to** (not a replacement for):

- compatibility ceiling when `coveragePercent <= 55`
- `LOW_COVERAGE` / `LOW_CONFIDENCE` info flags
- confidence override when `coveragePercent < 25`

---

## Backward compatibility

| Scenario | Expected |
|----------|----------|
| High-coverage pairs (cov ≥ 50%, minPresent ≥ 6) | **Identical** `finalScore` |
| SHORT-style sparse pairs | Still capped at **55** (was id-based; now coverage-based) |
| Stored DB match rows | Unchanged until recompute — same as any engine tweak |

---

## Interaction with Sprint 5 Story 4

Story 4 removes duplicate `overallScore` on match **DTOs** only — no formula change. Safe to implement Story 3 first; if same PR touches `CompareResultDto`, keep scope to cap + provenance only.

---

## Verification commands

```bash
cd dating-api
npx jest src/matches/coverage-policy.spec.ts src/matches/match-engine.spec.ts
npm test
npm run build
rg "LOW_INFO_PROFILE_IDS|applyLowInfoCap" src/
```

---

## Open questions / blockers

- None for Agent 1.
- **Operator:** recompute matches optional after deploy (not blocking engineering gate).

---

## Next agent

```text
--agent 1 sprint 5 story 3
```
