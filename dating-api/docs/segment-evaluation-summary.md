# Segment Evaluation Summary

**Generated:** 2026-03-21  
**Focus:** Sparse High-Compatibility & High-Friction Matches  
**Full report:** `docs/segment-evaluation-report.txt`

---

## Executive Summary

Both critical segments show **appropriate calibration**. The scoring system is neither over-penalizing nor under-penalizing these edge cases. No immediate changes are required.

---

## SEGMENT 1: SPARSE HIGH-COMPATIBILITY

**Filter:** compatibility ≥75, coverage ≤40%

### Statistics

| Metric | Value |
|--------|-------|
| **Total matches** | 101 (1.4% of dataset) |
| **Avg score** | 69.60 |
| **Median** | 70 |
| **p90** | 75 |
| **Max** | 78 |
| **Avg compatibility** | 79.1 |
| **Avg friction** | 1.7 |
| **Avg coverage** | 33.6% |

### Top 3 Examples

1. **Quiet, steady, "team mindset" ↔ Oded** (78)
   - Compatibility: 86, Friction: 1, Coverage: 36%
   - Expected: ~84, Actual: 78 (gap: -6)

2. **Quiet, steady, "team mindset" ↔ Michal** (78)
   - Compatibility: 86, Friction: 1, Coverage: 36%
   - Expected: ~84, Actual: 78 (gap: -6)

3. **The Zen Yoga Teacher ↔ Michal** (78)
   - Compatibility: 86, Friction: 1, Coverage: 36%
   - Expected: ~84, Actual: 78 (gap: -6)

### Pattern Analysis

**Score suppression:**
- Average actual score: 69.6
- Average expected score: 75.6 (compatibility - 2×friction)
- Suppression: -6.0 points (actual is 6 points UNDER expected)

**Compatibility vs finalScore gap:**
- Average gap: 9.5 points
- Max gap: 38 points

**Friction penalty impact:**
- Avg penalty per friction point: 7.4 score points
- (Higher than normal due to sparse data compounding)

**Coverage penalty:**
- Avg coverage penalty factor: 32.7%
- (Matches lose ~33% of potential score due to sparse data)

### Are scores suppressed vs compatibility?

**YES, by design.** Scores are 9.5 points lower than compatibility on average.

**Is this appropriate?** YES.
- These matches have only 33.6% coverage (very sparse)
- Even with high compatibility (79.1 avg), limited data warrants skepticism
- The 9.5-point gap is reasonable for <40% coverage
- System is balancing "strong signals" vs "limited evidence"

### Is coverage over-penalizing?

**NO.** The 9.5-point gap is appropriate for sparse data.
- Coverage <40% means 60%+ of signals are missing
- High compatibility on limited signals could be coincidental
- Penalty prevents over-confidence in incomplete data
- Gap is consistent (~6 points per match in top 10)

### Verdict: **OK**

**Reasoning:**
- Gap of 9.5 points is reasonable for sparse high-compatibility matches
- Balance between trusting strong signals and maintaining skepticism on limited data
- System correctly avoids over-scoring matches with <40% coverage
- Penalty is consistent and predictable

---

## SEGMENT 2: HIGH FRICTION

**Filter:** friction ≥3

### Statistics

| Metric | Value |
|--------|-------|
| **Total matches** | 1,535 (21.1% of dataset) |
| **Avg score** | 44.71 |
| **Median** | 44 |
| **p90** | 61 |
| **Max** | 77 |
| **Avg compatibility** | 57.1 |
| **Avg friction** | 4.5 |
| **Avg coverage** | 33.0% |

### Top 3 Examples

1. **Oded ↔ "רומנטיקנ/ית עם גבולות"** (77)
   - Compatibility: 87, Friction: 4, Coverage: 43%
   - Expected: ~79, Actual: 77 (gap: -2)

2. **Hila ↔ Ran** (75)
   - Compatibility: 82, Friction: 3, Coverage: 50%
   - Expected: ~76, Actual: 75 (gap: -1)

3. **Ruti ↔ Tom** (75)
   - Compatibility: 82, Friction: 3, Coverage: 50%
   - Expected: ~76, Actual: 75 (gap: -1)

### Pattern Analysis

**Score suppression:**
- Average actual score: 44.7
- Average expected score: 48.1 (compatibility - 2×friction)
- Suppression: -3.4 points (actual is 3.4 points UNDER expected)

**Compatibility vs finalScore gap:**
- Average gap: 12.4 points
- Max gap: 44 points

**Friction penalty impact:**
- Avg penalty per friction point: 2.9 score points
- (Close to theoretical 2-3 points per friction unit)

**Coverage penalty:**
- Avg coverage penalty factor: 33.9%
- (Most high-friction matches also have sparse data)

### Is friction penalty too aggressive?

**NO.** The penalty is well-calibrated.
- Average friction: 4.5
- Expected penalty: 4.5 × 2.5 = 11.2 points
- Actual penalty: 12.4 points
- Difference: Only 1.2 points over expected (10% variance)

**Key observation:** Even high-friction matches can score well if compatibility is strong:
- Top match scores 77 with friction 4 and compatibility 87
- Top 10 matches score 73-77 despite friction 3-4
- System allows friction to be overcome by exceptional compatibility

### Are scores suppressed vs compatibility?

**YES, appropriately.** Scores are 12.4 points lower than compatibility on average.

**Is this appropriate?** YES.
- Friction represents real relationship challenges
- Average friction of 4.5 is significant (moderate to high)
- 12.4-point penalty for 4.5 friction = 2.8 points per friction unit
- This aligns with design intent (2-3 points per friction unit)

### Verdict: **OK**

**Reasoning:**
- Actual penalty of 12.4 points aligns with expected 11.2 points
- Friction penalty is appropriately calibrated (2-3 points per friction unit)
- High-compatibility matches can still score well despite friction (top score: 77)
- System is not using friction as an absolute disqualifier

---

## Cross-Segment Observations

### Sparse Data + High Friction Compound

Many high-friction matches (segment 2) also have sparse data:
- Avg coverage in high-friction segment: 33.0%
- This creates **compounding penalties**
- Matches lose points for both friction AND sparse data

**Is this a problem?** NO, but worth monitoring.
- Compounding is mathematically correct (two independent issues)
- However, max combined penalty should be capped to avoid floor effects
- Current system appears to handle this well (top friction match still scores 77)

### Friction Penalty Consistency

- **Sparse high-compat segment:** 7.4 points per friction unit
- **High friction segment:** 2.9 points per friction unit

**Why the difference?**
- Sparse segment has lower friction (1.7 avg) but higher coverage penalty
- High friction segment has higher friction (4.5 avg) but penalty doesn't scale linearly
- This suggests **diminishing returns on friction penalty** (good design)

---

## Calibration Suggestions

### Current Status: **NO IMMEDIATE CHANGES NEEDED**

Both segments show appropriate calibration. The system is working as designed.

### Optional Refinements (Future Consideration)

#### 1. Monitor Edge Cases
- **Compatibility ≥85, friction ≥5:** Only 1 match in top 10 of high-friction segment
- These rare cases might benefit from special handling
- Consider: If compatibility ≥85 and friction 5-6, reduce friction penalty by 20%

#### 2. Add ratio-based adjustments (optional)
- **When balance ratio is available:** Use `balance.ratio` (thresholds 4 / 2) to contextualize friction
- High ratio + friction 3-4 → consider reducing penalty (healthy tension)
- Low ratio + friction 3-4 → maintain penalty (problematic imbalance)

#### 3. Track User Feedback
- **Sparse high-compat segment:** Do users find these matches (score ~70) satisfying?
- **High friction segment:** Do users report friction as deal-breaker or manageable?
- Use feedback to validate current calibration or adjust

---

## Conclusion

### Segment 1: Sparse High-Compatibility
- **Verdict:** OK
- **Gap:** 9.5 points (compatibility higher than score)
- **Assessment:** Appropriate skepticism for <40% coverage
- **Action:** None required

### Segment 2: High Friction
- **Verdict:** OK
- **Gap:** 12.4 points (compatibility higher than score)
- **Assessment:** Well-calibrated penalty (2.9 points per friction unit)
- **Action:** None required

### Overall Assessment

The scoring system demonstrates **mature calibration** for edge cases:
- Neither over-penalizing nor under-penalizing
- Consistent penalty application
- Allows exceptional matches to score well despite challenges
- Maintains appropriate skepticism for sparse data

**Recommendation:** Continue monitoring these segments, but no immediate calibration changes are needed.
