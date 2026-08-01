# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_extract_matching_constants.md](../../STORY_01_extract_matching_constants.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Pure refactor — extract named constants; **zero score drift**. Skip Agent 4.

---

## Summary

Create `dating-api/src/matches/matching-algorithm.constants.ts` and replace the audited magic numbers inside `match-engine.ts` stage helpers with imports. Do **not** change formulas, caps’ numeric values, or HTTP/DTOs. Do **not** relocate weights already owned by `engine/scoring.ts` (`COMPATIBILITY_BLEND_WEIGHTS`). Leave `MATCH_RANK_UPSERT_BATCH_SIZE` for Sprint 38 Story 3.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/matching-algorithm.constants.ts` | **New** — named constants + JSDoc (locked list below) |
| `dating-api/src/matches/match-engine.ts` | Import constants; replace literals in stage helpers / `compare` |
| `dating-api/src/matches/matching-algorithm.constants.spec.ts` | Optional light export/smoke (not required if Agent 1 prefers only existing engine specs) |
| Existing specs | Must stay green **without** expectation edits that change scores |

**Do not change this story:**

| Path | Reason |
|------|--------|
| `src/engine/scoring.ts` | Already exports `COMPATIBILITY_BLEND_WEIGHTS` + `FRICTION_SCALE` |
| `src/matches/scoring.ts` | **Deprecated** divergent helper — leave alone (do not “fix” weights) |
| `src/matches/coverage-policy.ts` | Already has `LOW_COVERAGE_PERCENT_THRESHOLD` / sparse caps |
| `src/matches/friction-policy.ts` | Keep `HIGH_FRICTION_RELIEF` / top-band literals for Story 40 or a follow-up |
| `src/matches/display-policy.ts` | Keep file-local display inflation constants (already named) |
| `src/matches/calibration-policy.ts` | Leave `<= 55` sparse multiplier path alone this story (see §3) |
| `me-matches.service.ts` upsert `100` | Sprint 38 Story 3 |

---

## Decisions (do not reverse without discussion)

### 1. Module path (locked)

```text
dating-api/src/matches/matching-algorithm.constants.ts
```

Not under `engine/` — these constants are **match-engine pipeline** knobs, not the blend formula (which lives in `engine/scoring.ts`).

### 2. Constant catalog (locked names + values)

Export **exactly** these (values must match today’s literals):

```ts
/** Asymmetry: sparser profile present-signal count ≤ this AND fuller ≥ ASYMMETRY_MAX_PRESENT → scale directionals. */
export const ASYMMETRY_MIN_PRESENT = 6;

/** Asymmetry: fuller profile present-signal count ≥ this (paired with ASYMMETRY_MIN_PRESENT). */
export const ASYMMETRY_MAX_PRESENT = 9;

/** Multiplier applied to A→B / B→A when asymmetric signal coverage detected. */
export const ASYMMETRY_SCALE = 0.92;

/**
 * Cap on directional scores used as compatibility blend inputs (and finalScore hard clamp in compare()).
 * Same numeric gate as `Math.min(90, …)` on finalScore — one constant, two call sites.
 */
export const HARD_SCORE_CAP_90 = 90;

/** Coverage % at/below which low-evidence friction floor applies (with asymmetry / minPresent). */
export const LOW_EVIDENCE_COVERAGE_PERCENT = 55;

/** minPresent at/below which low-evidence friction floor applies. */
export const LOW_EVIDENCE_MIN_PRESENT = 5;

/** Minimum friction when low-evidence path triggers. */
export const LOW_EVIDENCE_FRICTION_FLOOR = 1;

/** Friction → frictionRisk display: risk = min(100, round(friction * this)). */
export const FRICTION_RISK_SCALE = 10;

/** Balance ratio below which relationshipFit is penalized / friction minimum elevated. */
export const BALANCE_RATIO_LOW = 2;

/** Balance ratio below which mid friction minimum applies (and ≥ BALANCE_RATIO_LOW). */
export const BALANCE_RATIO_MID = 4;

/** Friction minimum when balance.ratio < BALANCE_RATIO_LOW and baseFriction > 0. */
export const FRICTION_MIN_WHEN_BALANCE_LOW = 4;

/** Friction minimum when BALANCE_RATIO_LOW ≤ balance.ratio < BALANCE_RATIO_MID. */
export const FRICTION_MIN_WHEN_BALANCE_MID = 2;

/** relationshipFit bonus when balance.ratio ≥ BALANCE_RATIO_MID (green tier). */
export const RELATIONSHIP_FIT_GREEN_BOOST = 8;

/** relationshipFit penalty when balance.ratio < BALANCE_RATIO_LOW. */
export const RELATIONSHIP_FIT_LOW_BALANCE_PENALTY = 10;

/** Cap on valuesAlignment before it enters compatibility() blend. */
export const VALUES_ALIGNMENT_FOR_COMPAT_CAP = 85;

/**
 * When coverage ≤ LOW_EVIDENCE_COVERAGE_PERCENT, compatibility is min(compat, this + coveragePercent).
 * (Today: `50 + coveragePercentValue`.)
 */
export const COVERAGE_COMPAT_CEILING_BASE = 50;

/** Signal gap band for nuance penalty (inclusive). */
export const NUANCE_GAP_MIN = 3;
export const NUANCE_GAP_MAX = 5;

/** Flat compatibility penalty when clarity or pace gap in nuance band. */
export const NUANCE_PENALTY = 2;

/** Confidence upper bound when coveragePercent < this. */
export const VERY_LOW_COVERAGE_PERCENT = 25;

/** Confidence min() ceiling under very low coverage. */
export const VERY_LOW_COVERAGE_CONFIDENCE_CAP = 0.75;

/** Breakdown entries with pairScore ≥ this become alignment chips (top N). */
export const ALIGNMENT_CHIP_MIN_PAIR_SCORE = 8;

/** Max alignment / tension chips returned. */
export const EXPLAIN_CHIP_LIMIT = 3;

/** Edge boost: friction ≤ this AND compat in [EDGE_BOOST_COMPAT_MIN, EDGE_BOOST_COMPAT_MAX]. */
export const EDGE_BOOST_MAX_FRICTION = 1;
export const EDGE_BOOST_COMPAT_MIN = 70;
export const EDGE_BOOST_COMPAT_MAX = 75;
export const EDGE_BOOST_RAW_DELTA = 2;

/** MATCH_DEBUG log budget (first N matches only). */
export const MATCH_DEBUG_LOG_LIMIT = 50;
```

**Clamp `0`/`100` helpers** stay as literals inside `clampTo100` — do **not** invent `SCORE_MIN`/`SCORE_MAX` unless Agent 1 wants a single shared helper; not required for AC.

### 3. What NOT to “unify” this story (locked)

| Literal | Location | Decision |
|---------|----------|----------|
| `0.28/0.28/0.24/0.12/0.08` | `engine/scoring.ts` `COMPATIBILITY_BLEND_WEIGHTS` | **Already extracted** — import from there if match-engine ever inlined weights (it doesn’t). Do **not** duplicate into `matching-algorithm.constants.ts`. |
| `0.35/0.35/0.2/0.1` | deprecated `matches/scoring.ts` | **Ignore** |
| `LOW_COVERAGE_PERCENT_THRESHOLD = 50` | `coverage-policy.ts` | Different semantic from `LOW_EVIDENCE_COVERAGE_PERCENT = 55` — **do not merge** |
| `<= 55` in `calibration-policy.ts` | sparse multiplier path | Out of scope; optional later ticket to import `LOW_EVIDENCE_COVERAGE_PERCENT` |
| Display inflation `65/92/0.96` | `display-policy.ts` | Already named file-locally — leave |

### 4. Call-site mapping in `match-engine.ts` (locked)

| Current code | Use constant |
|--------------|--------------|
| `balance.ratio < 2` / `>= 2` / `< 4` / `>= 4` | `BALANCE_RATIO_LOW` / `BALANCE_RATIO_MID` |
| friction mins `4` / `2` | `FRICTION_MIN_WHEN_BALANCE_LOW` / `_MID` |
| `minPresent <= 6 && maxPresent >= 9` | `ASYMMETRY_MIN_PRESENT` / `ASYMMETRY_MAX_PRESENT` |
| `0.92` | `ASYMMETRY_SCALE` |
| `directionalCap = 90` and `Math.min(90, …)` final | **`HARD_SCORE_CAP_90` both places** |
| `coveragePercentValue <= 55` (low evidence + compat ceiling gate) | `LOW_EVIDENCE_COVERAGE_PERCENT` |
| `minPresent <= 5` (low evidence) | `LOW_EVIDENCE_MIN_PRESENT` |
| `friction = Math.max(friction, 1)` | `LOW_EVIDENCE_FRICTION_FLOOR` |
| `friction * 10` | `FRICTION_RISK_SCALE` |
| `+ 8` / `- 10` relationshipFit | `RELATIONSHIP_FIT_GREEN_BOOST` / `RELATIONSHIP_FIT_LOW_BALANCE_PENALTY` |
| `valuesAlignmentCap = 85` | `VALUES_ALIGNMENT_FOR_COMPAT_CAP` |
| `50 + coveragePercentValue` | `COVERAGE_COMPAT_CEILING_BASE + coveragePercentValue` |
| nuance gap `3..5`, penalty `2` | `NUANCE_GAP_*` / `NUANCE_PENALTY` |
| `coveragePercentValue < 25` / `0.75` | `VERY_LOW_COVERAGE_*` |
| `pairScore >= 8`, `.slice(0, 3)` | `ALIGNMENT_CHIP_MIN_PAIR_SCORE` / `EXPLAIN_CHIP_LIMIT` |
| edge boost `friction <= 1`, compat `70..75`, `+= 2` | `EDGE_BOOST_*` |
| `matchDebugLogCount >= 50` | `MATCH_DEBUG_LOG_LIMIT` |
| debug bonus amount `8` | `RELATIONSHIP_FIT_GREEN_BOOST` (same value) |

### 5. Behavior / parity (locked)

- **No numeric value changes.** If a test fails, Agent 1 fixed a wrong constant — do not “tune” scores.
- Prefer mechanical replace: `const x = 90` → `HARD_SCORE_CAP_90`.
- Do not rename public exports of `compare` / `compareWithStatus`.
- Do not add feature flags.

### 6. Tests (locked)

Required:

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts src/engine/engine.scoring.spec.ts src/compatibility/compatibility-score.spec.ts --runInBand
```

Also run any other match scoring specs Agent 1 touches.  
`npm run smoke:matches` — run if env allows; if blocked by missing infra, note in `agent-1-dev.md` (AC allows documented skip).

### 7. Agent 4

- **Skip.**

---

## Out of scope

- Sprint 40 stage file split  
- Changing product ranking / weights  
- Unifying deprecated `matches/scoring.ts` with production blend  
- `MATCH_RANK_UPSERT_BATCH_SIZE`  
- UI / API / Prisma  

---

## Agent 1 instructions

1. Add `matching-algorithm.constants.ts` with §2 exports + JSDoc.
2. Update `match-engine.ts` per §4 only.
3. Run locked Jest set; ensure **zero** intentional expectation changes for scores.
4. Write `agent-1-dev.md` with files touched + test commands + smoke note.
5. Do **not** commit unless Agent 3 / user asks (follow repo commit rules).

Suggested commit message (for Agent 3):

```
refactor(matches): extract matching algorithm constants

Sprint 38 Story 1
```

---

## Agent 2 CR checklist

- [ ] New constants file under `src/matches/matching-algorithm.constants.ts`
- [ ] Audited literals from §4 replaced in `match-engine.ts`
- [ ] No duplicate `COMPATIBILITY_BLEND_WEIGHTS` in the new file
- [ ] Deprecated `matches/scoring.ts` untouched
- [ ] `HARD_SCORE_CAP_90` used for both directional input cap and final clamp
- [ ] No score formula / DTO changes
- [ ] Specs green without score-expectation rewrites

---

## Agent 3 PM checklist

- [ ] Story AC checkboxes satisfied
- [ ] Handoffs 0–2 present
- [ ] Commit with suggested message when user requests
- [ ] Next: `--agent 0 sprint 38 story 2`

---

## Next command

```text
--agent 1 sprint 38 story 1
```
