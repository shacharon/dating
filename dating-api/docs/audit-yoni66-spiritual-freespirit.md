# Audit: Yoni S. #66 vs The Spiritual Free-Spirit #2 (scoring failure)

## Pair summary

**Yoni S. #66** (from seed data):  
- About me: *Consultant, travels, rational.*  
- About partner: *Independent, smart.*  
- About relationship: *Partners, trust, flexibility.*  
→ Extremely sparse, generic, rational. Few extractable signals.

**The Spiritual Free-Spirit #2**:  
- Highly specific: spiritual, anti-structure, anti-traditional, messy-house tolerance, solo retreats, non-marriage framing (from user description).  
→ Many signals; strong values on spirituality, lifestylePace, traditionalism, etc.

**Engine result:** A→B=96, B→A=96, Relationship=75, Coverage=50%, Friction=0, Compatibility=92.

**Human judgment:** Should be much lower; partial mismatch, not near-perfect.

---

## 1. Why sparse/generic profiles get near-perfect directional scores

**Root cause:** Directional scores (A→B, B→A) are the **weighted average over only the comparable signals** (where both profiles have a numeric value). Missing signals are **skipped**, not penalized.

**Mechanics for this pair:**  
- Yoni S. likely has few signals (e.g. directness, independence, relationshipClarity from “rational, independent, partners, trust, flexibility”).  
- Spiritual Free-Spirit has many.  
- **Only the intersection** is compared (e.g. 7/14 = 50% coverage).  
- If the extractor assigned **generic mid-range values** to Yoni on those 7 (e.g. independence 6, relationshipClarity 6), they can align with the other profile’s values on the same dimensions.  
- The **7 missing signals** (e.g. spirituality, traditionalism, lifestylePace) — where the other profile is highly specific and likely extreme — are **never compared** because Yoni has null there. So we never see the mismatch.  
- Result: high pairScores on the 7 shared signals → overallScore 96 → A→B and B→A 96.

**Exact code path:**  
- `src/compatibility/compatibility-score.ts`: `computeCompatibility()` (lines 169–184). Loop over `COMPATIBILITY_SIGNAL_KEYS`; `if (selfVal == null || partnerVal == null) continue;` → no penalty, no inclusion in denominator.  
- `match-engine.ts` (276–279): `aToB` / `bToA` = `clampTo100(toScale100(compatAB.overallScore))` — **no use of coverage**; no ceiling for sparse matches.

---

## 2. Missing signals ignored too softly

**Yes.**  
- Missing = **omitted** from the average. The denominator is only the **compared** count.  
- So “we have no evidence” is treated like “we have evidence and it matches.”  
- There is **no** penalty for missing keys (e.g. no “unknown = neutral at 5” or “missing = reduce max possible score”).  
- `coveragePenaltyApplied = 0` in `computeCompatibility` (line 207); coverage only affects the **later** pipeline (scoreCoverageFactor, sparse calibration), not the **directional** score itself.

**Code:** `compatibility-score.ts` lines 173–176, 198–208.

---

## 3. Trust/flexibility/independence over-expanded into emotional/spiritual compatibility?

**Partially.**  
- Yoni’s “Partners, trust, flexibility” likely maps to: **relationshipClarity**, **independence**, **attachmentSecurity**.  
- “Independent, smart” reinforces **independence** (and maybe directness).  
- If the Spiritual Free-Spirit also has high independence (solo retreats, anti-structure), those **few** dimensions align.  
- The engine does **not** separate “rational, low spirituality” from “spiritual free-spirit.” If Yoni has **null** spirituality, that dimension is **never compared** — so we never score “Yoni rational vs partner spiritual.”  
- So a **generic** “trust, flexibility, independent” cluster gets high pairScores on 2–3 signals and is **interpreted as broad compatibility**, while the large **spiritual / structure** gap is invisible because one side has no signal there.

**Code:** Same as above; no notion of “spiritual vs rational” or “structure vs anti-structure” beyond the numeric signals. Null on one side → dimension skipped.

---

## 4. Asymmetry (generic vs highly specific) penalized?

**No.**  
- Coverage = `numComparableSignals / totalSignals` (7/14 = 50%).  
- There is **no** term that uses “min(signals_A, signals_B)” or “asymmetry” (e.g. one profile has 5 signals, the other 14).  
- So a **generic 5-signal** profile vs a **14-signal** profile is treated like two 7-signal profiles: same 50% coverage, same formula.  
- The engine does **not** cap or penalize “one side is sparse, the other rich.”

**Code:** `engine/coverage.ts` `coveragePercent(numComparableSignals, totalSignals)`; `match-engine.ts` uses only that single coverage number. No per-profile signal count in the score.

---

## 5. Why friction = 0 despite lifestyle/traditional-structure mismatch risk?

**Root cause:** Tension rules require **both** profiles to have **numeric values** for the relevant signals. If Yoni has **null** for traditionalism, lifestylePace, spirituality, those rules **do not fire**.

**Examples:**  
- `stability_vs_nomadism`: needs traditionalism and lifestylePace on both sides; null on one → false.  
- `traditional_vs_high_pace`: same.  
- `emotional_depth_gap`, `independence_mismatch`, etc.: all use `getSignal(a, key)` / `getSignal(b, key)`; null → rule returns false.

So when the **sparse** profile is missing the very dimensions where the **specific** profile is extreme (anti-traditional, spiritual, non-nomad or nomad), **no tension is applied** → friction = 0.

**Code:** `src/engine/tension-rules.ts` (all rules use `getSignal`/`num`); `src/engine/compute-friction.ts` `computeFriction()` sums only firing rules. No “missing key = assume moderate and check partner extreme” logic.

---

## 6. Certainty ceilings when one side has very low evidence?

**Largely missing.**  
- **Sparse calibration** (match-engine.ts 334–338) applies only when **coveragePercentValue < 50**. At **exactly 50%** (7/14), the condition is **false** → **no** multiplier. So 50% slips through with no extra reduction.  
- **A→B and B→A** have **no** coverage-based ceiling; they can be 96 at 50% coverage.  
- **Compatibility** has no cap by coverage (only a later light scoreCoverageFactor 0.85–1.0).  
- There is **no** “minimum comparable signals” or “certainty ceiling” that forces a cap when e.g. one profile has &lt; 8 signals.

**Code:** `match-engine.ts` 334 (`if (coveragePercentValue < 50)`); no ceiling on `aToB`/`bToA` or `compatibilityValue` by coverage.

---

## Root cause (concise)

1. **Directional scores are an average over only comparable signals**, with **no penalty for missing** and **no coverage-based ceiling** → sparse profiles can reach 96 when the few shared dimensions align.  
2. **Asymmetry is ignored** → generic vs specific is not penalized.  
3. **Missing signals** on the sparse side **hide mismatches** (spiritual, traditionalism, lifestyle) and **prevent tension rules from firing** → friction = 0.  
4. **50% coverage** falls **outside** the sparse-calibration band (&lt; 50%) → no extra reduction.  
5. **No certainty ceiling** when one side has very low evidence.

---

## Exact code paths / functions

| Issue | File | Function / location |
|-------|------|---------------------|
| Directional score = avg over comparable only; no coverage cap | `compatibility-score.ts` | `computeCompatibility()` lines 169–184, 198–208 |
| A→B/B→A unbounded by coverage | `match-engine.ts` | 276–279 (`aToB`, `bToA`) |
| Missing = skip | `compatibility-score.ts` | 172–176 `if (selfVal == null \|\| partnerVal == null) continue` |
| No asymmetry term | `engine/coverage.ts`, `match-engine.ts` | `coveragePercent(compared, total)` only; no min(signalsA, signalsB) |
| Friction rules need both sides | `tension-rules.ts` | All rules: `getSignal(a, key)` etc.; null → no fire |
| Sparse calibration only &lt; 50% | `match-engine.ts` | 334 `if (coveragePercentValue < 50)` |
| No certainty ceiling | — | No cap on compatibility or directional score by coverage |

---

## Minimal fix proposal

**1. Cap compatibility (and/or directional scores) when coverage ≤ 50%**  
- **File:** `match-engine.ts`.  
- **Place:** After `compatibilityValue` is set (after the rawCompatibility block, ~line 300).  
- **Logic:** If `coveragePercentValue <= 50`, cap: `compatibilityValue = Math.min(compatibilityValue, 45 + coveragePercentValue)`. So at 50% max compatibility 95; at 30% max 75.  
- **Optional:** Also cap `aToB` and `bToA` the same way before the blend (e.g. `min(score, 45 + coveragePercentValue)`) so directional scores and compatibility both reflect uncertainty.

**2. Extend sparse calibration to coverage ≤ 55% (or 60%)**  
- **File:** `match-engine.ts` (334).  
- **Change:** Use `if (coveragePercentValue <= 55)` (or 60) and use a multiplier that reaches 1.0 at 55 (e.g. `0.92 + (coveragePercentValue / 55) * 0.08`). So 50% gets a small reduction and doesn’t sit just outside the band.

**3. Friction floor when coverage ≤ 50%**  
- **File:** `match-engine.ts` (after line 271).  
- **Logic:** `if (coveragePercentValue <= 50) friction = Math.max(friction, 1);`  
- So sparse matches cannot have friction 0; reduces over-confidence when many dimensions are missing.

---

## Guardrails to prevent 90+ on sparse + asymmetric pairs

1. **Coverage-based ceiling on compatibility and/or A→B/B→A**  
   - When coverage ≤ 50% (or 55%), cap: e.g. `min(score, 45 + coveragePercent)`.  
   - Prevents 92 compatibility and 96/96 directional when half the dimensions are unknown.

2. **Sparse calibration band**  
   - Apply the gentle multiplier for coverage ≤ 55% (or 60%), not only &lt; 50%, so 50% is no longer “full score.”

3. **Friction floor for low coverage**  
   - e.g. `friction >= 1` when coverage ≤ 50%, so we don’t show “no tensions” when many signals are missing and tensions can’t fire.

4. **(Optional) Asymmetry penalty**  
   - If you later have access to per-profile signal counts (e.g. from evaluation), cap or reduce score when `min(signalsA, signalsB) <= 7` or when the ratio max/min is large. Not in current codebase; would require passing signal counts into the engine.

---

## Summary

| Check | Result |
|-------|--------|
| Why sparse gets near-perfect directional | Only comparable signals averaged; missing skipped; no coverage cap on A→B/B→A. |
| Missing signals too soft? | Yes; no penalty, no “unknown = limit max.” |
| Trust/flexibility over-expanded? | Generic alignment on 2–3 signals; spiritual/structure gap hidden by null on sparse side. |
| Asymmetry penalized? | No. |
| Friction=0 despite mismatch risk? | Rules need both sides; null on sparse side → no rule fires. |
| Certainty ceilings? | Missing; sparse calibration only &lt; 50%; 50% gets no reduction. |

**Minimal fix (no broad refactor):**  
(1) Cap compatibility and optionally A→B/B→A when coverage ≤ 50% (e.g. max 45 + coveragePercent).  
(2) Extend sparse calibration to coverage ≤ 55% so 50% is not unscaled.  
(3) Friction floor when coverage ≤ 50%.
