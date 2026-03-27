# Scoring debug: 6 biggest golden-pair misses

**Source:** `docs/golden-pairs.md` (current validation run).  
**Note:** `rawScore`, `scoreCoverageFactor`, `frictionPenalty`, `dealbreakers`, and `finalScoreBeforeSparseCalibration` are not persisted in match JSON by the current recompute script; approximate values are derived from engine formulas where stated.

---

## 1. Per-pair breakdown

**Formula recap:**  
`compatibility` = 0.35·aToB + 0.35·bToA + 0.25·relationshipStyle + 0.05·valuesAlignment (table “Compat” is this value).  
`scoreCoverageFactor` = 0.85 + 0.15·(coveragePercent/100).  
`rawScore` ≈ compatibility × scoreCoverageFactor − (frictionPenalty × 0.7).  
When coveragePercent ≤ 55, sparse calibration multiplies score by 0.92–1.0 before rounding.

---

### Pair 13 — Quiet team (#14) ↔ Traditional Nerd (#3)  
*Expected 74–78 (mid 76), finalScore 47, miss 29 — **under-scored***

| Field | Value |
|-------|--------|
| aToB | 67 |
| bToA | 67 |
| relationshipStyle | 40 |
| coveragePercent | 36 |
| friction | 1 |
| compatibility | 55 |
| rawScore (approx) | 55 × 0.904 − 0.7 ≈ 49.0 |
| scoreCoverageFactor (approx) | 0.85 + 0.15×0.36 = 0.904 |
| frictionPenalty (approx) | 1 × 0.7 = 0.7 |
| dealbreakers | not persisted |
| finalScoreBeforeSparseCalibration (approx) | ~49 (sparse applies: cov ≤ 55) |
| finalScore | 47 |

**Stage that hurts most:** Low **compatibility** (55) plus **coverage factor** (36% → 0.904) pulls raw into the high 40s; **sparse calibration** (cov 36% ≤ 55) then trims a couple of points. So the main drop is from **low compatibility** and **low-coverage weighting**; sparse is a small extra.

---

### Pair 7 — Zen Yoga Teacher (#17) ↔ Spiritual Free-Spirit (#2)  
*Expected 75–79 (mid 77), finalScore 49, miss 28 — **under-scored***

| Field | Value |
|-------|--------|
| aToB | 79 |
| bToA | 79 |
| relationshipStyle | 73 |
| coveragePercent | 50 |
| friction | 4 |
| compatibility | 78 |
| rawScore (approx) | 78 × 0.925 − (frictionPenalty×0.7); friction 4 → penalty large |
| scoreCoverageFactor (approx) | 0.85 + 0.15×0.5 = 0.925 |
| frictionPenalty (approx) | high (friction=4) |
| dealbreakers | not persisted |
| finalScoreBeforeSparseCalibration (approx) | at boundary cov=50; sparse may apply slightly |
| finalScore | 49 |

**Stage that hurts most:** **Friction** (4) is high → large **friction penalty**; that is the dominant drop. Compatibility (78) and coverage (50%) are decent; the score is pulled down mainly by **friction penalty**.

---

### Pair 6 — Cynical romantic (#16) ↔ Straight shooter (#18)  
*Expected 75–79 (mid 77), finalScore 58, miss 19 — **under-scored***

| Field | Value |
|-------|--------|
| aToB | 75 |
| bToA | 75 |
| relationshipStyle | 46 |
| coveragePercent | 36 |
| friction | 1 |
| compatibility | 68 |
| rawScore (approx) | 68 × 0.904 − 0.7 ≈ 60.8 |
| scoreCoverageFactor (approx) | 0.904 |
| frictionPenalty (approx) | 0.7 |
| dealbreakers | not persisted |
| finalScoreBeforeSparseCalibration (approx) | ~61 then sparse (cov 36) |
| finalScore | 58 |

**Stage that hurts most:** **Low coverage** (36%) → scoreCoverageFactor 0.904 and sparse calibration; **relationshipStyle** (46) also keeps compatibility (68) from being higher. Main drivers: **coverage factor** and **sparse calibration**; relationship fit is secondary.

---

### Pair 18 — SHORT (#19) ↔ Flirt analytic (#6)  
*Expected 49–53 (mid 51), finalScore 70, miss 19 — **over-scored***

| Field | Value |
|-------|--------|
| aToB | 73 |
| bToA | 73 |
| relationshipStyle | 78 |
| coveragePercent | 57 |
| friction | 0 |
| compatibility | 75 |
| rawScore (approx) | 75 × 0.936 ≈ 70.2 |
| scoreCoverageFactor (approx) | 0.85 + 0.15×0.57 = 0.936 |
| frictionPenalty | 0 |
| dealbreakers | not persisted |
| finalScoreBeforeSparseCalibration | N/A (cov > 55) |
| finalScore | 70 |

**Stage that inflates:** No friction and **decent compatibility** (75) and **relationshipStyle** (78); coverage 57% avoids sparse calibration. The band expects a “BROKEN” pair (~51); the engine sees good alignment and no friction, so it **over-scores** relative to human judgment. So the “stage” is **no penalty for what humans treat as broken** (e.g. SHORT profile); i.e. **missing or weak treatment of profile quality / BROKEN expectation**.

---

### Pair 4 — Hila (#25) ↔ Tamar (#merged_5)  
*Expected 78–82 (mid 80), finalScore 62, miss 18 — **under-scored***

| Field | Value |
|-------|--------|
| aToB | 83 |
| bToA | 83 |
| relationshipStyle | 49 |
| coveragePercent | 57 |
| friction | 4 |
| compatibility | 75 |
| rawScore (approx) | 75 × 0.936 − large friction penalty |
| scoreCoverageFactor (approx) | 0.936 |
| frictionPenalty (approx) | high (friction=4) |
| dealbreakers | not persisted |
| finalScoreBeforeSparseCalibration | N/A (cov > 55) |
| finalScore | 62 |

**Stage that hurts most:** **Friction** (4) again → large **friction penalty**; aToB/bToA are high (83) but relationshipStyle (49) and friction pull compatibility to 75 and then the penalty down to 62. So the main drop is **friction penalty**; relationship fit contributes somewhat.

---

### Pair 19 — Cynical romantic (#16) ↔ Radical Activist (#7)  
*Expected 70–74 (mid 72), finalScore 56, miss 16 — **under-scored***

| Field | Value |
|-------|--------|
| aToB | 81 |
| bToA | 81 |
| relationshipStyle | 42 |
| coveragePercent | 29 |
| friction | 1 |
| compatibility | 67 |
| rawScore (approx) | 67 × 0.894 − 0.7 ≈ 59.2 |
| scoreCoverageFactor (approx) | 0.85 + 0.15×0.29 = 0.894 |
| frictionPenalty (approx) | 0.7 |
| dealbreakers | not persisted |
| finalScoreBeforeSparseCalibration (approx) | ~59 then sparse (cov 29) |
| finalScore | 56 |

**Stage that hurts most:** **Very low coverage** (29%) → lowest scoreCoverageFactor (0.894) and strongest **sparse calibration** among these six. So the main drop is **coverage factor + sparse calibration**; friction is small.

---

## 2. Which stage caused the biggest drop or inflation?

| Pair | Main stage | Effect |
|------|------------|--------|
| 13 (Quiet ↔ Nerd) | Low compatibility + coverage factor + sparse | Under-score: raw pulled to ~49, sparse to 47 |
| 7 (Zen ↔ Spiritual) | **Friction penalty** (friction=4) | Under-score: compatibility 78, penalty dominates |
| 6 (Cynical ↔ Straight) | Coverage factor + sparse calibration | Under-score: cov 36%, raw ~61 → 58 |
| 18 (SHORT ↔ Flirt) | **No penalty for BROKEN expectation** | Over-score: engine sees 70, band expects ~51 |
| 4 (Hila ↔ Tamar) | **Friction penalty** (friction=4) | Under-score: compatibility 75, penalty to 62 |
| 19 (Cynical ↔ Activist) | **Coverage factor + sparse** (cov 29%) | Under-score: lowest cov, strong sparse trim |

---

## 3. Under-scored vs over-scored

| Pair | finalScore | Expected mid | Verdict |
|------|------------|--------------|---------|
| 13 | 47 | 76 | **Under-scored** |
| 7 | 49 | 77 | **Under-scored** |
| 6 | 58 | 77 | **Under-scored** |
| 18 | 70 | 51 | **Over-scored** |
| 4 | 62 | 80 | **Under-scored** |
| 19 | 56 | 72 | **Under-scored** |

**5 under-scored, 1 over-scored.**

---

## 4. Repeated patterns across the 6 pairs

1. **Low coverage (≤50%) in 5 of 6**  
   Pairs 13, 6, 7, 19 have coverage 29–50%; only 18 has 57%. So **low coverage** (and thus **scoreCoverageFactor** and **sparse calibration**) is a repeated driver of **under-scoring**.

2. **High friction (4) in 2 pairs**  
   Pairs 7 and 4 both have friction 4 and large drops vs expected. So **high friction penalty** is a repeated driver of **under-scoring** when compatibility is otherwise decent.

3. **Low relationshipStyle in under-scored pairs**  
   Pairs 13 (40), 6 (46), 19 (42), 4 (49) have relationshipStyle 40–49 while aToB/bToA are often 67–83. So **relationship-style term** (25% of compatibility) often restrains compatibility and contributes to under-scoring.

4. **Single over-score (pair 18)**  
   SHORT ↔ Flirt has high alignment, no friction, and cov 57%; the band is BROKEN (expected ~51). So **BROKEN / low-quality expectations** are not reflected in the current scoring (no extra cap or penalty for such pairs).

**Summary:** Under-scoring is repeatedly driven by **low coverage** (scoreCoverageFactor + sparse calibration) and **high friction**; **relationshipStyle** often limits compatibility. Over-scoring appears once and is tied to **missing handling of BROKEN / profile-quality expectations**.
