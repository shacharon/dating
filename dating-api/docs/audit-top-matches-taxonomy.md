# Audit: Top dating matches — labels and failure taxonomy

**Scope:** Top 15 pairs by `finalScore` in current `data/matches` (POC run).  
**Goal:** Label each pair (FAIR / INFLATED / BROKEN), assign failure taxonomy, brief explanation, and summarize recurring patterns. No code changes — inspection only.

---

## Compact table

| # | Pair (A ↔ B) | Score | Cov% | Fric | Label | Taxonomy |
|---|----------------|-------|------|------|--------|----------|
| 1 | Straight shooter ↔ הישיר/ה (direct) | 82 | 50 | 0 | INFLATED | OVERCONFIDENT_CERTAINTY, DOUBLE_COUNTED_VIBE |
| 2 | Cynical romantic ↔ Straight shooter | 80 | 50 | 0 | INFLATED | SPARSE_INFLATION, FRICTION_TOO_SOFT |
| 3 | Zen Yoga Teacher ↔ Spiritual Free-Spirit | 79 | 50 | 0 | INFLATED | DOUBLE_COUNTED_VIBE, OVERCONFIDENT_CERTAINTY |
| 4 | Quiet team mindset ↔ Zen Yoga Teacher | 78 | 57 | 0 | FAIR | FAIR_HIGH_MATCH |
| 5 | Cynical romantic ↔ הישיר/ה (direct) | 78 | 50 | 0 | INFLATED | SPARSE_INFLATION, FRICTION_TOO_SOFT |
| 6 | Straight shooter ↔ Romantic with boundaries | 77 | 50 | 0 | FAIR | FAIR_HIGH_MATCH |
| 7 | Flirt analytic ↔ Radical Activist | 77 | 50 | 0 | INFLATED | GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT |
| 8 | Quiet team ↔ Intellectual Academic | 76 | 43 | 0 | INFLATED | OVERCONFIDENT_CERTAINTY, FRICTION_TOO_SOFT |
| 9 | Quiet team ↔ Traditional Nerd | 77 | 57 | 0 | FAIR | FAIR_HIGH_MATCH |
|10 | **SHORT** ↔ Radical Activist | 77 | **14** | 0 | **BROKEN** | SPARSE_INFLATION, OVERCONFIDENT_CERTAINTY |
|11 | Quiet team ↔ Spiritual Free-Spirit | 75 | 36 | 0 | INFLATED | OVERCONFIDENT_CERTAINTY, GENERIC_VS_SPECIFIC |
|12 | הישיר/ה ↔ Romantic with boundaries | 75 | 50 | 0 | FAIR | FAIR_HIGH_MATCH |
|13 | **SIMPLE** ↔ Quiet team | 75 | 57 | 0 | INFLATED | GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT |
|14 | **SHORT** ↔ Flirt analytic | 74 | **14** | 0 | **BROKEN** | SPARSE_INFLATION, OVERCONFIDENT_CERTAINTY |
|15 | Cynical romantic ↔ Radical Activist | 74 | 43 | 0 | INFLATED | GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT |

---

## Per-pair notes

**1. Straight shooter ↔ הישיר/ה (82)**  
- **Correct:** Both profiles are “direct”; alignment on Directness, Emotional Depth, Attachment is plausible.  
- **Inflated:** Same archetype in two languages; “direct” drives multiple signals + valuesAlignment → double-counted. 50% coverage with no ceiling lets compatibility reach 89.  
- **Pattern:** OVERCONFIDENT_CERTAINTY (no cap at 50% coverage), DOUBLE_COUNTED_VIBE (directness everywhere).

**2. Cynical romantic ↔ Straight shooter (80)**  
- **Correct:** Both can value directness and emotional depth.  
- **Inflated:** Only 50% coverage; friction 0 despite potential style gap (cynical vs straight). Score not capped by coverage.  
- **Pattern:** SPARSE_INFLATION (half signals missing), FRICTION_TOO_SOFT (no rule for cynical/romantic nuance).

**3. Zen Yoga Teacher ↔ Spiritual Free-Spirit (79)**  
- **Correct:** Shared “spiritual / calm” vibe; Emotional Depth, Independence, Ambition align.  
- **Inflated:** “Spiritual” vibe drives multiple dimensions; 50% coverage still yields 85–87 directional; no friction.  
- **Pattern:** DOUBLE_COUNTED_VIBE (spirituality in values + signals), OVERCONFIDENT_CERTAINTY.

**4. Quiet team mindset ↔ Zen Yoga Teacher (78)**  
- **Correct:** Social Battery, Attachment, Directness all 10; 57% coverage; calm/steady vs zen fits.  
- **Verdict:** FAIR — good evidence, no obvious double-count or sparse artifact.  
- **Pattern:** FAIR_HIGH_MATCH.

**5. Cynical romantic ↔ הישיר/ה (78)**  
- **Correct:** Directness and depth can align.  
- **Inflated:** 50% coverage, friction 0; same as pair #2.  
- **Pattern:** SPARSE_INFLATION, FRICTION_TOO_SOFT.

**6. Straight shooter ↔ Romantic with boundaries (77)**  
- **Correct:** Attachment 10, Lifestyle Pace 10, Social Battery ~8; both value clarity and boundaries.  
- **Verdict:** FAIR — 50% but alignments are coherent; no minimal profile.  
- **Pattern:** FAIR_HIGH_MATCH.

**7. Flirt analytic ↔ Radical Activist (77)**  
- **Correct:** Emotional Depth, Lifestyle Pace, Ambition align on paper.  
- **Inflated:** Lifestyle/politics (activist) vs “flirt analytic” could create friction; friction 0. One profile more specific than the other.  
- **Pattern:** GENERIC_VS_SPECIFIC (asymmetry), FRICTION_TOO_SOFT.

**8. Quiet team ↔ Intellectual Academic (76)**  
- **Correct:** Independence, Lifestyle Pace, Emotional Depth align; introvert-friendly.  
- **Inflated:** 43% coverage with compatibility 84 and no cap; friction 0.  
- **Pattern:** OVERCONFIDENT_CERTAINTY, FRICTION_TOO_SOFT.

**9. Quiet team ↔ Traditional Nerd (77)**  
- **Correct:** Attachment, Independence, Lifestyle Pace all 10; 57% coverage.  
- **Verdict:** FAIR — steady/team + nerd is a plausible high match.  
- **Pattern:** FAIR_HIGH_MATCH.

**10. SHORT ↔ Radical Activist (77)** — **BROKEN**  
- **Correct:** Almost nothing — “SHORT” is a minimal/stub profile (name only).  
- **Broken:** Coverage **14%**; A→B=100, B→A=100, compatibility=94. Only 2 alignments (Social Battery, Lifestyle Pace); missing signals never penalized; friction 0.  
- **Pattern:** SPARSE_INFLATION (extreme), OVERCONFIDENT_CERTAINTY (no ceiling at 14% coverage).

**11. Quiet team ↔ Spiritual Free-Spirit (75)**  
- **Correct:** Lifestyle Pace, Social Battery, Emotional Depth align.  
- **Inflated:** 36% coverage with compatibility 85; no ceiling; friction 0.  
- **Pattern:** OVERCONFIDENT_CERTAINTY, GENERIC_VS_SPECIFIC (quiet vs “free-spirit” could have style friction).

**12. הישיר/ה ↔ Romantic with boundaries (75)**  
- **Correct:** Attachment, Emotional Depth, Directness; direct + boundaries is coherent.  
- **Verdict:** FAIR.  
- **Pattern:** FAIR_HIGH_MATCH.

**13. SIMPLE ↔ Quiet team (75)**  
- **Correct:** “Simple” and “quiet, team” can overlap on low drama, clarity.  
- **Inflated:** “SIMPLE” is a generic/minimal label; only intersection scored; asymmetry not penalized; friction 0.  
- **Pattern:** GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT.

**14. SHORT ↔ Flirt analytic (74)** — **BROKEN**  
- **Correct:** Almost none — stub profile again.  
- **Broken:** Coverage **14%**; A→B=92, B→A=92, compatibility=89; 2 alignments; friction 0.  
- **Pattern:** SPARSE_INFLATION, OVERCONFIDENT_CERTAINTY.

**15. Cynical romantic ↔ Radical Activist (74)**  
- **Correct:** Emotional Depth, Directness, Social Battery align.  
- **Inflated:** 43% coverage; activist vs “cynical romantic” might clash in values; friction 0.  
- **Pattern:** GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT.

---

## Summary: top recurring failure patterns

1. **SPARSE_INFLATION / OVERCONFIDENT_CERTAINTY (most critical)**  
   Pairs with **low coverage** (14–50%) still get **high compatibility** (80–94) and **A→B/B→A up to 100** because: (a) only comparable signals are averaged, (b) there is **no coverage-based ceiling** on compatibility or directional scores, (c) sparse calibration only mildly reduces finalScore. **SHORT** (and other minimal profiles) are the clearest failure: 14% coverage → 77 and 74 finalScore with 100/100 directional. Fix: cap compatibility (and optionally A→B/B→A) when coverage &lt; 50%; consider extending sparse calibration or a harder cap for coverage ≤ 55%.

2. **GENERIC_VS_SPECIFIC**  
   **SIMPLE** and other generic/minimal profiles vs detailed ones: only the **intersection** is scored; the detailed side’s extra signals never reduce the score, and **asymmetry is not penalized**. So “SIMPLE” can land in the top 15 with 75 (12__14) and 73 (12__3). Fix: asymmetry penalty or cap when one side has very few signals.

3. **DOUBLE_COUNTED_VIBE**  
   When one “vibe” (e.g. direct, spiritual, simple) drives **multiple signals and valuesAlignment**, the same theme is rewarded several times. Examples: Straight shooter ↔ הישיר/ה (direct everywhere); Zen ↔ Spiritual Free-Spirit. Fix: reduce valuesAlignment weight or deduplicate conceptually overlapping signals (already suggested in review-tom37-natalie-merged14.md).

4. **FRICTION_TOO_SOFT**  
   **Friction = 0** on almost all top pairs, including ones where style or values could conflict (cynical vs straight, activist vs flirt, simple vs detailed). Tension rules often need both sides to have a value; with nulls they don’t fire. Fix: friction floor when coverage &lt; 50% (as in scoring-audit-low-coverage.md); consider rules for “vibe” mismatches.

5. **FAIR_HIGH_MATCH (4 pairs)**  
   Quiet team ↔ Zen (78), Straight shooter ↔ Romantic boundaries (77), Quiet team ↔ Nerd (77), הישיר/ה ↔ Romantic boundaries (75) have **coherent alignments**, **no minimal profile**, and scores that feel plausible. These are the ones to preserve when tightening the pipeline.

---

## Counts

| Label | Count |
|-------|-------|
| FAIR | 4 |
| INFLATED | 9 |
| BROKEN | 2 |

| Taxonomy | Occurrences (in top 15) |
|----------|-------------------------|
| OVERCONFIDENT_CERTAINTY | 6 |
| SPARSE_INFLATION | 5 |
| FRICTION_TOO_SOFT | 7 |
| GENERIC_VS_SPECIFIC | 4 |
| DOUBLE_COUNTED_VIBE | 2 |
| FAIR_HIGH_MATCH | 4 |

No refactors were made; this doc is inspection-only and can inform the next scoring guardrails (coverage cap, friction floor, asymmetry, values weight).
