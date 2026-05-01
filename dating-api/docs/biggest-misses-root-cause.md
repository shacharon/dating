# Root cause: two biggest-miss pairs

**Date:** 2026-03-10  
**Scope:** Debug only. No broad tuning. Patch/report only.

---

## Pair 1: 25__merged_5 (Hila ↔ Tamar)

**Observed:** relationshipStyle 50, friction 4, frictionPenalty 12, tensions [], tensionMatrix [], finalScore 53 (expected 78–82). A→B/B→A 88, compatibility 78, alignments strong (Ambition 10, Health 10, Attachment 10).

### Why relationshipStyle is only 50

- relationshipStyle is the **relationshipFit** value from the match engine.
- It is computed as the average of the two profiles’ `evaluation.productScores.relationshipFitScore`: Hila 58, Tamar 62 → raw average 60.
- Then **balance tier** is applied: if tier is RED, relationshipFit is reduced by 10 → 60 − 10 = **50** (then clamped/scaled).
- So the low 50 is **entirely due to RED tier**, not low product scores.

### Why friction = 4 and frictionPenalty = 12

- **Tension rules contributed 0:** no rule fires for this pair’s self signals (emotionalDepth 3 vs 2 → gap 1; no fusion/boundaries, etc.). So `baseFriction = 0`, `tensionMatrix = []`.
- In `computeCoverageAsymmetryLowEvidenceAdjustments`, **friction has a tier-based floor:**  
  `frictionMinimum = balance.tier === 'RED' ? 4 : …`  
  So `friction = Math.max(baseFriction, frictionMinimum) = max(0, 4) = 4`.
- `frictionPenalty(4) = min(25, 4*3) = 12`. So friction 4 and penalty 12 come **only from the RED friction floor**, not from any tension rule.

### Why friction is high even though tensions = [] and tensionMatrix = []

- **By design:** when balance tier is RED, the engine sets a **minimum friction of 4** regardless of tension rules. So high friction here is **not** from tension matrix; it is from **relationship balance policy** (RED → friction floor 4).

### Is friction/relationship logic inconsistent with alignments and compatibility?

- **Yes, in outcome:** directional compatibility is high (88, 88), compatibility 78, alignments 10/10/10. So the **compatibility formula** sees a strong, aligned pair.
- **Mechanism:** balance tier is RED because of **EMOTIONAL_DEPTH_FLOOR** dealbreaker (both Hila and Tamar have self emotionalDepth ≤ 3). That dealbreaker (STRONG_FLAG) drives `negativeScore` up in `computeRelationshipBalance`, so ratio drops below 2 → RED. RED then:
  - reduces relationshipFit by 10 → relationshipStyle 50, and  
  - forces friction ≥ 4 → frictionPenalty 12.
- So the **same pair** is scored as highly compatible on directionals but heavily penalized on relationship/friction because of balance tier RED driven by “both low emotional depth.”

### Root cause (pair 1)

**Classification:** RELATIONSHIP_SCORING_PROBLEM (balance tier drives both relationshipFit and friction floor; friction policy is correct but fed by RED tier).

- Balance tier RED is triggered by EMOTIONAL_DEPTH_FLOOR (both emotionalDepth ≤ 3).
- RED forces: (1) relationshipFit −10 → relationshipStyle 50, (2) friction floor 4 → frictionPenalty 12.
- Tension rules themselves contribute 0; the only “friction” is the policy floor.

### Minimal fix proposal (pair 1)

- **Option A (recommended):** Do **not** apply the RED **friction floor** when `baseFriction === 0` (no tension rule fired). So RED still reduces relationshipStyle, but friction stays 0 when no tensions fire. Small, localized change in `computeCoverageAsymmetryLowEvidenceAdjustments`: e.g. `frictionMinimum = (balance.tier === 'RED' && baseFriction > 0) ? 4 : …` or only set floor when tier is RED **and** there is at least one tension.
- **Option B:** Downgrade EMOTIONAL_DEPTH_FLOOR from STRONG_FLAG to WARNING so this pair does not go RED (balance stays YELLOW or GREEN). Broader impact on other pairs.
- **Option C:** Pair-level: when the only dealbreaker is EMOTIONAL_DEPTH_FLOOR and both directionals are high (e.g. ≥ 85), do not apply RED friction floor. More special-case.

---

## Pair 2: 14__3 (Quiet team ↔ Traditional Nerd)

**Observed:** coverage 36%, A→B 56, B→A 56, relationshipStyle 68, friction 3, tensionMatrix [emotional_depth_gap (MED), penalty 3], finalScore 43 (expected 74–78).

### Why coverage is only 36

- Coverage = `numComparableSignals / totalSignals` (14 keys). Both must have a non-null value for a key to count.
- **Profile 14 (Quiet team)** self signals: only **6** non-null (socialBattery, emotionalDepth, attachmentSecurity, independence, relationshipClarity, lifestylePace). ambition, healthBodyConsciousness, directness, traditionalism, financialMindset, spirituality, physicalPriority, statusOrientation are **null**.
- **Profile 3 (Traditional Nerd)** self: 10 non-null.
- **Overlap:** only **5** keys are comparable → 5/14 ≈ **36%**. So low coverage is **directly from sparse self extraction on profile 14**, not from the scoring formula.

### Why A→B / B→A are only 56

- Directional scores come from `computeCompatibility(signalsA, signalsB)` (and reversed). With only 5 comparable keys, the weighted average is driven by those 5.
- Among them: **emotionalDepth 7 vs 3** (gap 4), **lifestylePace 3 vs 6** (gap 3), independence 8 vs 5, attachment 7 vs 7, socialBattery 4 vs 7. The large emotionalDepth and lifestylePace gaps pull pair scores down, so overallScore on 0–10 scale is ~5.6 → scaled to 100 ≈ 56. So low A→B/B→A are a **consequence of low overlap plus a few large gaps**, not a bug in the compatibility formula.

### Is the problem missing extraction, sparse partner/relationship, or one gap dominating?

- **Primary:** **Sparse self extraction on profile 14.** Six self signals and five comparable keys cap coverage at 36% and limit how high A→B/B→A can go.
- Partner/relationship extraction on 14 is also sparse (partner: 3 non-null; relationship: 7) but the **match score** uses **self vs self** for compatibility and coverage, so the main driver is **self sparsity**.
- **Secondary:** Among the 5 comparable keys, **emotionalDepth 7 vs 3** (gap 4) is one of the largest gaps and has high weight (1.5), so it contributes a lot to the low compatibility and also triggers the emotional_depth_gap tension rule.

### Is emotional_depth_gap alone dragging the result too far?

- **Partially.** emotional_depth_gap adds **friction 3** (one tension, penalty 3). So friction = 3, frictionPenalty = 9. That is a meaningful but not overwhelming penalty.
- The **larger** drag is: (1) **low coverage (36%)** → coverage ceiling and sparse multiplier reduce finalScore, and (2) **low base compatibility (56)** from few signals and large gaps. So emotional_depth_gap is **one** contributor; the main structural issue is **low coverage from sparse extraction** and the resulting low directional scores.

### Root cause (pair 2)

**Classification:** COVERAGE_PROBLEM (driven by EXTRACTION_PROBLEM). Not FRICTION_POLICY_PROBLEM (emotional_depth_gap is consistent with the gap; the main issue is sparse extraction → low coverage).

- **Coverage 36%:** profile 14 has only 6 self signals → 5 comparable with profile 3 → 5/14 ≈ 36%.
- **Low A→B/B→A (56):** few comparable keys + emotionalDepth gap 4 + lifestylePace gap 3 (and others) produce a moderate compatibility score.
- **emotional_depth_gap:** adds friction 3; it is consistent with the data (7 vs 3) but amplifies the already low score. The dominant issue is extraction/coverage, not this single rule.

### Minimal fix proposal (pair 2)

- **Option A (recommended):** **EXTRACTION:** Improve self-signal extraction for **sparse profiles** like 14 (e.g. stronger retry or inference for “calm, grounded, consistent” so ambition, directness, healthBodyConsciousness, etc. get filled when hints exist). Goal: raise comparable keys so coverage moves toward 50%+ and A→B/B→A can rise. No change to compatibility or friction formula.
- **Option B:** **COVERAGE policy only:** For pairs with very low coverage (e.g. &lt; 40%) and only one tension (e.g. emotional_depth_gap), cap the friction penalty so one gap does not compound the coverage penalty. Small, localized change. Does not fix the underlying sparse extraction.
- **Option C:** Accept current behavior for this pair and do not change formulas; document as “low coverage pair, improve extraction in Week 2.”

---

## Summary table

| Pair            | Root cause category           | Primary driver |
|----------------|-------------------------------|----------------|
| 25__merged_5   | RELATIONSHIP_SCORING_PROBLEM  | RED balance tier (EMOTIONAL_DEPTH_FLOOR) → relationshipStyle −10 and friction floor 4 despite 0 tensions. |
| 14__3          | COVERAGE_PROBLEM / EXTRACTION | Sparse self extraction on profile 14 → 36% coverage, low A→B/B→A; emotional_depth_gap adds friction 3. |

---

## Recommended next step (one only)

**PATCH_PAIR_CLASS_LOGIC**

- **Rationale:** Pair 1 has a clear, localized policy bug: RED tier forces friction = 4 even when **no** tension rule fired (tensions = [], tensionMatrix = []). Fixing “do not apply RED friction floor when baseFriction === 0” is a minimal, reversible change that fixes Hila–Tamar without broad tuning. Pair 2 is structurally an extraction/coverage issue; improving extraction is a separate track (Week 2 or extraction-only patch). So the **single** recommended next step is: **patch the RED friction floor** so it does not apply when there are no tension-derived penalties (pair-class logic only).
