# Match engine — final product overview

**Status:** Production baseline (version cut).  
**Entry point:** `src/matches/match-engine.ts` — `compare()` / `compareWithStatus()`.

Deterministic, framework-free scoring from two analyzed profile JSON payloads. Used by `MatchesService`, recompute scripts, and daemon rebuilds.

---

## 1. Purpose

- Produce a **single match quality score** (`finalScore`, 0–90 typical cap) plus **explainability** (directionals, friction, coverage, alignments, tensions, dealbreakers, debug).
- **Separate “how good it looks on paper” (compatibility + friction path)** from **“how much we trust the data” (confidence / flags)** — coverage no longer multiplies the headline score.

---

## 2. Entry & guards

### `compareWithStatus(profileA, profileB)`

| Outcome | When |
|--------|------|
| **`NOT_ANALYZED`** | Either profile has `evaluationStatus` set and **≠ `'DONE'`** (analysis still running / not ready). |
| **`INSUFFICIENT_DATA`** | Both are “ready” for evaluation flow, but either side has **no numeric `evaluation.self.signals`**. |
| **`CompareResultDto`** | Both sides have pending analysis cleared **and** at least one finite numeric signal per profile. |

### `hasAnalyzedSignals(profile)`

`true` only when **not** pending **and** numeric self signals exist — used for cohort filtering / recompute eligibility.

### `compare(profileA, profileB)`

Assumes both profiles are scoreable (callers that skip guards must ensure this). No HTTP.

---

## 3. Pipeline (high level)

Stages are applied in order:

1. **Contexts & enriched signals** — keyword triggers on texts; raw + enriched signal maps.
2. **Dealbreakers & relationship balance** — `computeDealbreakers`, `computeRelationshipBalance` (positive/negative score and **ratio**).
3. **Directional compatibility** — `computeCompatibility` each direction → `aToB`, `bToA`; **coverage %** = comparable signal keys / total keys.
4. **Asymmetry / low-evidence friction floor** — scales directionals when asymmetric profiles; may raise friction floor from **balance ratio** (thresholds 4 / 2) or low coverage; builds **tension matrix** from `computeFriction`.
5. **Relationship fit & values alignment** — from product scores + signals; **balance ratio** can nudge relationship fit (same thresholds).
6. **Blended compatibility** — weighted formula + **coverage ceiling on compatibility** when coverage ≤ 55% (`min(compat, 50 + coverage%)`) + small nuance penalties (e.g. clarity/pace gap bands).
7. **Confidence & flags** — from coverage only (`coverageFactor`, `scoreCoverageFactor` for **display/metadata**, `LOW_COVERAGE` / `LOW_CONFIDENCE`). **Extra rule:** if **coverage &lt; 25%**, **confidence is capped at 0.75** for the response.
8. **Friction penalty & pre-raw score** — see §4.
9. **Edge boost** — if **friction ≤ 1** and **compatibility ∈ [70, 75]** → **+2** on raw before clamps.
10. **Clamp 0–100** → **dealbreaker cap** → **hard cap 90** → **low-info profile cap** → DTO assembly (directional display calibration for **display** `aToB`/`bToA` only).

**Removed from final score path (vs older builds):** multiplying the score by `scoreCoverageFactor`, score stretch, top-end boost, and sparse-match score multipliers. Those concepts do **not** apply to `finalScore` anymore.

---

## 4. Core score math (final product)

### Compatibility (blended)

\[
\text{compat} = 0.35\cdot aToB + 0.35\cdot bToA + 0.25\cdot relationshipFit + 0.05\cdot valuesAlignment
\]

(clamped / shaped by coverage ceiling and nuance steps in code.)

### Friction penalty (unchanged formula family)

- Base: `frictionPenalty(friction) = min(25, friction × 3)`, with a **0.9** factor when **friction ≥ 4** (`engine/friction.ts`).
- **Top-band multiplier** on penalty: lower penalty when compatibility is high (linear 70→85).
- **High-friction relief:** when **friction ≥ 3**, penalty × **0.70** (`friction-policy.ts`).
- Scaled by **`FRICTION_SCALE = 0.7`** in `rawScore()`.

### Raw score (no coverage on score)

\[
\text{raw} = \text{compat} \times 1 - (\text{adjustedFrictionPenalty} \times 0.7)
\]

i.e. **`rawScore(compatibility, 1, adjustedFrictionPenalty)`** — the second argument is **fixed at 1**, so **coverage does not multiply** the match score.

### After raw

1. **Edge:** `if friction ≤ 1 && compat in [70,75]` → `raw += 2`.
2. **`preCapFinalScore`** = round clamp to **[0, 100]**.
3. **`applyDealbreakerCap`** — HARD caps, PENALTY/WARNING deductions (`domain/dealbreakers.ts`).
4. **`finalScore`** = `min(90, clamp 0–100)`.
5. **Low-info cap:** if either profile id is in **`LOW_INFO_PROFILE_IDS`** (currently **`19`** / SHORT stub) → `finalScore = min(finalScore, 55)`.

### `rawScore` field on DTO

Value **after** friction subtraction and **after** the +2 edge boost, **before** dealbreaker / 90 / low-info caps — useful for debugging.

---

## 5. Coverage & confidence (score vs trust)

| Field | Role |
|-------|------|
| **`coverage` / `coveragePercent`** | % of compatibility signal keys comparable on both sides. |
| **`coverageFactor`** | **Confidence weighting** (≈ 0.7–1.0 from coverage). Also drives **`confidence`** in the base policy. |
| **`scoreCoverageFactor`** | Still computed for **API continuity / analytics**; **does not** multiply `finalScore`. |
| **`infoFlags`** | `LOW_COVERAGE` if coverage &lt; 50%; `LOW_CONFIDENCE` if confidence &lt; 0.8; plus **coverage &lt; 25% → confidence ≤ 75%** override. |

---

## 6. Outputs (`CompareResultDto`)

- **Scores:** `finalScore`, `overallScore` (= `finalScore`), `rawScore`, `compatibility`.
- **Directionals:** `aToB`, `bToA` (may be display-calibrated for UX; core math uses internal directionals earlier).
- **Risk / structure:** `friction`, `frictionPenalty`, `frictionRisk`, `tensionMatrix`, `tensions`, `alignments`.
- **Meta:** `coverage`, `coveragePercent`, `confidence`, `scoreCoverageFactor`, `coverageFactor`, `infoFlags`, `relationshipStyle`.
- **Domain:** `dealbreakers`, `balance`, `derived` (per-profile context).
- **Debug:** `debug` (penalties, bonuses, provenance strings, etc.).
- **`explainability`:** deterministic UI copy only — `positiveChips` (≤3), optional `tensionChip` if `friction >= 3`, `reasonShort` (one sentence). Built in `match-explainability.ts`; **does not** affect scoring.
- **`finalScoreBeforeSparseCalibration`:** **unused** in this version (undefined) — kept optional on type for older clients.

---

## 7. Design principles (frozen)

1. **Headline score** = compatibility minus (tuned) friction, then policy caps — **not** “compatibility × coverage factor”.
2. **Sparse or partial data** lowers **confidence** and sets **flags**, rather than silently crushing the score with a coverage multiplier.
3. **Friction** uses a **fixed, documented** penalty curve + relief rules; not re-derived from coverage.
4. **Dealbreakers** remain a **hard/soft cap layer** after the continuous score.
5. **Global ceiling 90** on normal matches; **stub profile 19** capped at **55** to avoid fake highs.
6. **Deterministic** — same inputs → same outputs; no LLM inside the engine.

---

## 8. Related files

| Area | Path |
|------|------|
| Engine core | `match-engine.ts` |
| Explainability (chips + short reason) | `match-explainability.ts` |
| Explainability QA (deterministic report) | `scripts/review-explainability.ts`, `explainability-review-heuristics.ts`, `npm run review:explainability` → `data/reports/explainability-quality-review.md` |
| Friction tuning | `friction-policy.ts`, `engine/friction.ts`, `engine/scoring.ts` |
| Confidence / flags | `coverage-policy.ts`, `engine/coverage.ts` |
| Dealbreakers | `domain/dealbreakers.ts` |
| Balance | `domain/relationshipBalance.ts` |
| Compatibility / signals | `compatibility/compatibility-score.ts` |
| Display directionals | `display-policy.ts` |
| Golden regression | `data/golden-pairs.json`, `npm run validate:golden-pairs` |

---

## 9. Operational commands

- **Recompute all pairwise matches:** `npm run recompute-matches`
- **Golden set check:** `npm run validate:golden-pairs` → `docs/golden-pairs.md`
- **Diagnostics:** `npm run match-diagnostics`

---

*Last aligned with production `match-engine.ts` scoring path: compat − friction (+ edge), dealbreakers, cap 90, low-info cap, coverage → confidence only.*
