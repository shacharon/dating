# Full Dataset Evaluation Summary

**Generated:** 2026-03-21  
**Dataset:** 200 profiles, ~7,260 matches  
**Full report:** `docs/full-evaluation-report.txt`

---

## Executive Summary

This report evaluates the complete match scoring system across the full dataset. The analysis reveals a well-calibrated system with clear patterns, though some edge cases suggest opportunities for refinement.

---

## Score Distribution

| Metric | Value |
|--------|-------|
| **Total matches** | 7,260 |
| **Average score** | 50.29 |
| **Median (p50)** | 51 |
| **p90** | 65 |
| **p95** | 71 |
| **Max score** | 88 |
| **Min score** | 0 |

### Distribution by Range

- **0-19:** 89 matches (1.2%) - Very poor matches
- **20-39:** 1,069 matches (14.7%) - Poor matches
- **40-49:** 2,054 matches (28.3%) - Below average
- **50-59:** 2,853 matches (39.3%) - **Most common range** (median)
- **60-69:** 703 matches (9.7%) - Good matches
- **70-74:** 270 matches (3.7%) - Very good matches
- **75-79:** 154 matches (2.1%) - Excellent matches
- **80-84:** 61 matches (0.8%) - Outstanding matches
- **85-89:** 7 matches (0.1%) - Exceptional matches
- **90+:** 0 matches (0.0%) - None (by design)

**Key insight:** The distribution is well-centered around 50, with a natural bell curve. The system successfully avoids over-scoring (no 90+ scores).

---

## Top 20 Matches (Highest Scores)

### Characteristics of High-Scoring Matches

1. **Oded ↔ Maya** (88): Exceptional compatibility (91), zero friction, 57% coverage
2. **The Spiritual Free-Spirit ↔ Maya** (87): Exceptional compatibility (92), minimal friction (1), 50% coverage
3. **Maya ↔ Michal** (87): Exceptional compatibility (92), minimal friction (1), 50% coverage

**Common patterns in top 20:**
- **Compatibility:** 84-92 (very high to exceptional)
- **Friction:** 0-1 (minimal to none)
- **Coverage:** 43-71% (limited to good, but not perfect)
- **Profile "Maya"** appears in 7 of top 20 matches (35%)

---

## Bottom 20 Matches (Lowest Scores)

### Characteristics of Low-Scoring Matches

1. **SHORT ↔ Rachel** (0): Very low compatibility (20), moderate friction (4), sparse data (7%)
2. **Rachel ↔ Hagit** (0): Very low compatibility (22), moderate friction (4), sparse data (7%)
3. **The High-Society Socialite ↔ Rachel** (0): Low compatibility (32), moderate friction (4), sparse data (14%)

**Common patterns in bottom 20:**
- **Compatibility:** 17-41 (very low to low)
- **Friction:** 1-7 (minor to high)
- **Coverage:** 0-50% (sparse to limited)
- **Profile "Rachel"** appears in 3 of bottom 20 (15%)
- **Profile "SHORT"** (known low-info stub) appears in 5 of bottom 20 (25%)

---

## Representative Sample (Random 10)

Selected from different score ranges to show system behavior:

1. **Score 37:** Inbar ↔ David - Low compatibility (49), moderate friction (4), sparse data (7%)
2. **Score 49:** Doron ↔ Roi - Low compatibility (58), high friction (5), limited coverage (50%)
3. **Score 54:** Or ↔ Guy - Fair compatibility (61), minor friction (2), sparse data (43%)
4. **Score 64:** Barak ↔ Guy - Fair compatibility (69), minor friction (1), limited coverage (50%)
5. **Score 70:** Barak ↔ Shani - Good compatibility (75), minor friction (1), limited coverage (50%)
6. **Score 83:** Ruti ↔ Lihi - Very high compatibility (86), zero friction, limited coverage (57%)

**Observation:** Scores correlate strongly with compatibility, with friction and coverage acting as modifiers.

---

## Pattern Analysis

### ✓ 3 Strongest Patterns (Look Correct)

#### 1. High Compatibility + Low Friction → High Scores
- **64 matches (0.9%)** with compatibility ≥85 and friction ≤2
- **Average finalScore: 80.9**
- **Why this is correct:** The system correctly rewards exceptional compatibility when there's minimal friction. These are the "golden pairs" that should score highest.

#### 2. Coverage Strongly Affects Scores (Calibration Working)
- **High coverage (≥70%):** 57 matches, avg score 63.2
- **Low coverage (<50%):** 6,049 matches, avg score 48.5
- **Difference:** ~15 points
- **Why this is correct:** The sparse-data calibration successfully prevents over-confidence in matches with limited signal. This is a critical safety feature.

#### 3. Score Distribution is Well-Centered
- **Median: 51, Average: 50.29**
- **No scores above 88** (system cap working)
- **Natural bell curve** around median
- **Why this is correct:** The scoring system avoids inflation and maintains a realistic distribution. Most matches are "okay" (50s), with truly exceptional matches being rare (80s).

---

### ✗ 3 Biggest Concerns (Look Wrong)

#### 1. Sparse Data Calibration May Be Too Aggressive
- **6,049 matches (83.3%)** have coverage <50%
- **235 sparse matches** have compatibility ≥75 but avg score only 71.0
- **Problem:** Even when compatibility signals are strong, sparse data penalty may be too harsh
- **Example:** A match with 75 compatibility and 45% coverage might score only 65-70, even though the available signals strongly agree
- **Recommendation:** Consider softening the sparse calibration for matches where available signals show strong agreement (e.g., if compatibility ≥75 and friction ≤2, reduce sparse penalty by 20%)

#### 2. High Friction (≥5) Severely Penalizes All Matches
- **411 matches (5.7%)** have friction ≥5
- **Average finalScore: 41.0** (below median)
- **0 matches** with both friction ≥5 and compatibility ≥80
- **Problem:** High friction appears to be a near-absolute disqualifier, even when compatibility might be salvageable
- **Observation:** In real relationships, some friction can be healthy if core compatibility is strong. The current system may be too friction-averse.
- **Recommendation:** Consider a friction cap or diminishing returns (e.g., friction penalty maxes out at 7-8 points rather than scaling linearly)

#### 3. Relationship Balance Tiers (GREEN/YELLOW/RED) Not Visible in Data
- **0 GREEN tier matches** in dataset
- **0 RED tier matches** in dataset
- **Problem:** Either the tier logic isn't being computed/stored, or the dataset doesn't have the required signals
- **Impact:** Cannot validate whether tier-based bonuses/penalties are working correctly
- **Recommendation:** 
  - Verify that `balance.tier` is being computed and saved in match records
  - If tiers are not being computed, this represents a missing validation dimension
  - If computed but all matches are YELLOW/UNKNOWN, the tier thresholds may need adjustment

---

## Additional Observations

### Coverage Distribution
- **83.3%** of matches have <50% coverage (sparse data)
- Only **0.8%** have ≥70% coverage (high confidence)
- **Implication:** Most matches are operating in "limited information" mode, which is realistic for early-stage dating profiles

### Friction Distribution
- **Most matches (94.3%)** have friction <5
- **5.7%** have friction ≥5 (severe friction)
- **Implication:** Friction is relatively rare, suggesting most profiles don't have major red flags

### Profile-Specific Patterns
- **"Maya"** appears disproportionately in top matches (7 of 20)
- **"SHORT"** (low-info stub) appears in bottom matches as expected
- **"Rachel"** appears in multiple bottom matches, suggesting potential data quality issues

---

## Recommendations for Calibration

### High Priority
1. **Soften sparse-data penalty** for high-agreement matches (compatibility ≥75, friction ≤2)
2. **Investigate relationship balance tier computation** - verify it's working and visible in data
3. **Add friction penalty cap** to prevent total disqualification of otherwise compatible pairs

### Medium Priority
4. **Review profile "Rachel"** for data quality issues (appears in multiple zero-score matches)
5. **Consider coverage-weighted friction** - high friction matters more when coverage is high
6. **Add tier-based validation** once tier data is available

### Low Priority
7. **Monitor "Maya" profile** - unusually high performance might indicate overfitting or exceptional profile
8. **Document expected score ranges** by tier for future validation

---

## Conclusion

The scoring system demonstrates **strong fundamentals**:
- Well-calibrated score distribution (centered at 50)
- Clear correlation between compatibility and final score
- Effective sparse-data handling prevents over-confidence
- No score inflation (max 88, no 90+ scores)

**Key strengths:**
1. High compatibility + low friction reliably produces high scores
2. Coverage calibration successfully prevents over-scoring on limited data
3. Score distribution is realistic and well-centered

**Key concerns:**
1. Sparse-data penalty may be too aggressive for high-quality limited signals
2. High friction acts as near-absolute disqualifier (may be too harsh)
3. Relationship balance tier validation is missing from current data

**Overall assessment:** The system is production-ready with strong fundamentals, but would benefit from fine-tuning the sparse-data and friction penalties to better handle edge cases.
