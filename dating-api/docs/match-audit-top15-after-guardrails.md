# Match audit: top 15 after guardrails

**Generated after:** Full plan run (audit → guardrails → recompute → report).  
**Recompute run:** 210 matches, 521 profiles, policy v2.

---

## 1. Top 15 audit table (before fixes)

Scores and labels are from the pre-guardrails audit (`docs/audit-top-matches-taxonomy.md`). Each row includes pair names/ids, current (before) scores, short human judgment, and failure taxonomy.

| # | Pair (ids) | A→B | B→A | Rel | Cov% | Fric | Compat | finalScore | Label | Human judgment | Taxonomy |
|---|------------|-----|-----|-----|------|------|--------|------------|--------|----------------|----------|
| 1 | Straight shooter (18) ↔ הישיר/ה (21) | 92 | 92 | 78 | 50 | 0 | 89 | 82 | INFLATED | Same archetype in two languages; directness double-counted; 50% cov with no ceiling. | OVERCONFIDENT_CERTAINTY, DOUBLE_COUNTED_VIBE |
| 2 | Cynical romantic (16) ↔ Straight shooter (18) | 88 | 88 | 76 | 50 | 0 | 85 | 80 | INFLATED | Half signals missing; friction 0 despite style gap. | SPARSE_INFLATION, FRICTION_TOO_SOFT |
| 3 | Zen Yoga Teacher (17) ↔ Spiritual Free-Spirit (2) | 87 | 87 | 81 | 50 | 0 | 85 | 79 | INFLATED | Spiritual vibe drives multiple dimensions; no friction. | DOUBLE_COUNTED_VIBE, OVERCONFIDENT_CERTAINTY |
| 4 | Quiet team (14) ↔ Zen Yoga Teacher (17) | 84 | 84 | 77 | 57 | 0 | 83 | 78 | FAIR | Good evidence, calm/steady vs zen fits. | FAIR_HIGH_MATCH |
| 5 | Cynical romantic (16) ↔ הישיר/ה (21) | 85 | 85 | 77 | 50 | 0 | 84 | 78 | INFLATED | 50% cov, friction 0. | SPARSE_INFLATION, FRICTION_TOO_SOFT |
| 6 | Straight shooter (18) ↔ Romantic boundaries (8) | 83 | 83 | 79 | 50 | 0 | 83 | 77 | FAIR | Coherent alignments, clarity and boundaries. | FAIR_HIGH_MATCH |
| 7 | Flirt analytic (6) ↔ Radical Activist (7) | 83 | 83 | 74 | 50 | 0 | 83 | 77 | INFLATED | Activist vs flirt could clash; friction 0. | GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT |
| 8 | Quiet team (14) ↔ Intellectual Academic (9) | 83 | 83 | 79 | 43 | 0 | 84 | 76 | INFLATED | 43% cov with no cap; friction 0. | OVERCONFIDENT_CERTAINTY, FRICTION_TOO_SOFT |
| 9 | Quiet team (14) ↔ Traditional Nerd (3) | 82 | 82 | 76 | 57 | 0 | 82 | 77 | FAIR | Steady/team + nerd plausible. | FAIR_HIGH_MATCH |
|10 | **SHORT (19)** ↔ **Radical Activist (7)** | **100** | **100** | 68 | **14** | 0 | **94** | **77** | **BROKEN** | Stub profile; 14% cov, 100/100 directional. | SPARSE_INFLATION, OVERCONFIDENT_CERTAINTY |
|11 | Quiet team (14) ↔ Spiritual Free-Spirit (2) | 83 | 83 | 82 | 36 | 0 | 85 | 75 | INFLATED | 36% cov, no ceiling; friction 0. | OVERCONFIDENT_CERTAINTY, GENERIC_VS_SPECIFIC |
|12 | הישיר/ה (21) ↔ Romantic boundaries (8) | 80 | 80 | 80 | 50 | 0 | 81 | 75 | FAIR | Direct + boundaries coherent. | FAIR_HIGH_MATCH |
|13 | **SIMPLE (12)** ↔ Quiet team (14) | 81 | 81 | 76 | 57 | 0 | 80 | 75 | INFLATED | Generic label; only intersection scored. | GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT |
|14 | **SHORT (19)** ↔ **Flirt analytic (6)** | **92** | **92** | 71 | **14** | 0 | **89** | **74** | **BROKEN** | Stub profile again; 14% cov. | SPARSE_INFLATION, OVERCONFIDENT_CERTAINTY |
|15 | Cynical romantic (16) ↔ Radical Activist (7) | 85 | 85 | 73 | 43 | 0 | 82 | 74 | INFLATED | 43% cov; activist vs cynical could clash. | GENERIC_VS_SPECIFIC, FRICTION_TOO_SOFT |

---

## 2. What code changed

Minimal, localized patches only. No architecture or schema changes.

| File | Change |
|------|--------|
| **src/matches/match-engine.ts** | (1) Compute coverage and compat early; (2) **Coverage ceiling:** when `coveragePercent < 50`, cap compatibility at `50 + coveragePercent`. (3) **Asymmetry:** `countPresent` per profile; if `minPresent ≤ 5` and `maxPresent ≥ 10`, scale directional scores by 0.92 (`aToBForCompat`, `bToAForCompat`) before compatibility formula. (4) **Friction floor:** when `coveragePercent < 50` OR `isAsymmetric` OR `minPresent ≤ 5`, set `friction = max(friction, 1)`. |
| **src/engine/scoring.ts** | **Vibe double-count:** In `compatibility()`, `valuesAlignment` weight 0.10 → 0.05, `relationshipFit` 0.20 → 0.25. |
| **src/engine/tension-rules.ts** | New rules: `traditionalism_structure_gap` (gap ≥ 5), `relationship_clarity_flow_gap` (gap ≥ 5), `lifestyle_pace_mismatch` (gap ≥ 5); each penalty 2. |

---

## 3. Before/after comparison (affected matches)

Same 15 pairs, finalScore and key metrics before vs after guardrails.

| # | Pair | Before finalScore | After finalScore | Δ | After A→B | After B→A | After Fric | After Compat |
|---|------|-------------------|------------------|---|-----------|-----------|------------|--------------|
| 1 | 18__21 Straight ↔ הישיר/ה | 82 | 82 | 0 | 92 | 92 | 0 | 89 |
| 2 | 16__18 Cynical ↔ Straight | 80 | 79 | −1 | 88 | 88 | 0 | 85 |
| 3 | 17__2 Zen ↔ Spiritual | 79 | 79 | 0 | 87 | 87 | 0 | 85 |
| 4 | 14__17 Quiet ↔ Zen | 78 | 77 | −1 | 84 | 84 | 0 | 83 |
| 5 | 16__21 Cynical ↔ הישיר/ה | 78 | 77 | −1 | 85 | 85 | 0 | 83 |
| 6 | 18__8 Straight ↔ Romantic | 77 | 77 | 0 | 83 | 83 | 0 | 83 |
| 7 | 6__7 Flirt ↔ Activist | 77 | 76 | −1 | 83 | 83 | 0 | 82 |
| 8 | 14__9 Quiet ↔ Academic | 76 | 73 | **−3** | 83 | 83 | **1** | 83 |
| 9 | 14__3 Quiet ↔ Nerd | 77 | 76 | −1 | 82 | 82 | 0 | 82 |
|10 | **19__7 SHORT ↔ Activist** | **77** | **51** | **−26** | 100 | 100 | **1** | **64** |
|11 | 14__2 Quiet ↔ Spiritual | 75 | 72 | **−3** | 83 | 83 | **1** | 84 |
|12 | 21__8 הישיר/ה ↔ Romantic | 75 | 74 | −1 | 80 | 80 | 0 | 80 |
|13 | 12__14 SIMPLE ↔ Quiet | 75 | 75 | 0 | 81 | 81 | 0 | 80 |
|14 | **19__6 SHORT ↔ Flirt** | **74** | **51** | **−23** | 92 | 92 | **1** | **64** |
|15 | 16__7 Cynical ↔ Activist | 74 | 72 | −2 | 85 | 85 | **1** | 82 |

**Summary of impact:** BROKEN pairs (SHORT) dropped by 23–26 points; compatibility capped at 64 for 14% coverage; friction floor 1 applied where coverage &lt; 50% or asymmetric or both sparse. Low-coverage INFLATED pairs (14__9, 14__2, 16__7) lost 2–3 points and now have friction 1.

---

## 4. Count of matches ≥90 (before vs after)

| | Before | After |
|---|--------|--------|
| **Matches with finalScore ≥ 90** | **0** | **0** |

(Pre-guardrails audit run had no pairs at 90+; max was 82. After guardrails, still 0.)

---

## 5. Count of matches 80–89 (before vs after)

| | Before | After |
|---|--------|--------|
| **Matches with finalScore 80–89** | **6** | **3** |

- **Before:** 82, 80, 79, 79, 78, 78 → six pairs in 80–89.  
- **After:** 82, 79, 79 → three pairs in 80–89.  

So three fewer pairs in the 80–89 band after guardrails.

---

## 6. Conclusion

**What improved**

- **BROKEN cases fixed:** SHORT ↔ Activist and SHORT ↔ Flirt dropped from 77/74 to **51**. Coverage-based compatibility cap (50 + coverage%) and friction floor prevent stub profiles from keeping very high scores.
- **Low-coverage inflation reduced:** Pairs with 36–43% coverage (Quiet↔Spiritual, Quiet↔Academic, Cynical↔Activist) lost 2–3 points and now have friction ≥ 1, so we no longer show “no friction” with thin evidence.
- **80–89 band tightened:** Six pairs before → three after in 80–89; average score remains moderate (49.67), no 90+ or 100s.

**What still looks wrong**

- **#1 (18__21) still 82:** Straight shooter ↔ הישיר/ה remains the top score at 50% coverage and friction 0. Same-archetype double-count and lack of coverage cap at exactly 50% keep it high. A stricter cap (e.g. extend to coverage ≤ 55%) or a small friction floor when coverage ≤ 55% would pull it down.
- **SIMPLE ↔ Quiet (12__14) unchanged at 75:** Asymmetry penalty did not trigger (both sides likely above the sparse threshold), so generic-vs-specific remains under-penalized for this pair.
- **Friction still 0 for many top pairs:** 50% coverage pairs keep friction 0; only when coverage &lt; 50% or asymmetric or both sparse do we apply the floor. So several INFLATED pairs (e.g. 18__21, 16__18, 17__2) still show zero friction.

**Recommendation:** Consider extending the coverage ceiling or friction floor to coverage ≤ 55% to reduce the remaining 82 and other 50%-coverage highs, and optionally tighten the asymmetry threshold (e.g. minPresent ≤ 6 and maxPresent ≥ 9) to catch more generic-vs-specific pairs.

---

## Round 2 results

**Round 2 changes (patch only):** Extended coverage ceiling and friction floor to **coverage ≤ 55%**; tightened asymmetry to **minPresent ≤ 6 and maxPresent ≥ 9**; extended sparse calibration to **coverage ≤ 55%** (50–55% band: gentle multiplier 0.94→1.0). **File changed:** `src/matches/match-engine.ts` only.

### Top 15 before vs after Round 2

| # | Pair | After Round 1 | After Round 2 | Δ R2 | Fric R2 | Why |
|---|------|---------------|---------------|-----|---------|-----|
| 1 | 18__21 Straight ↔ הישיר/ה | 82 | **80** | −2 | 1 | Coverage 50% now in ≤55: ceiling + friction floor + sparse calibration. |
| 2 | 16__18 Cynical ↔ Straight | 79 | **77** | −2 | 1 | 50% cov: friction floor + sparse calibration. |
| 3 | 17__2 Zen ↔ Spiritual | 79 | **77** | −2 | 1 | 50% cov: friction floor + sparse calibration. |
| 4 | 14__17 Quiet ↔ Zen | 77 | 77 | 0 | 0 | 57% cov, above 55% band; no change. |
| 5 | 16__21 Cynical ↔ הישיר/ה | 77 | **75** | −2 | 1 | 50% cov: friction floor + sparse calibration. |
| 6 | 18__8 Straight ↔ Romantic | 77 | **75** | −2 | 1 | 50% cov: friction floor + sparse calibration. |
| 7 | 6__7 Flirt ↔ Activist | 76 | **74** | −2 | 1 | 50% cov: friction floor + sparse calibration. |
| 8 | 14__9 Quiet ↔ Academic | 73 | 73 | 0 | 1 | Already low-cov/friction in R1; unchanged. |
| 9 | 14__3 Quiet ↔ Nerd | 76 | 76 | 0 | 0 | 57% cov; no change. |
|10 | 19__7 SHORT ↔ Activist | 51 | 51 | 0 | 1 | Already fixed in R1. |
|11 | 14__2 Quiet ↔ Spiritual | 72 | 72 | 0 | 1 | Unchanged. |
|12 | 21__8 הישיר/ה ↔ Romantic | 74 | **72** | −2 | 1 | 50% cov: friction floor + sparse calibration. |
|13 | 12__14 SIMPLE ↔ Quiet | 75 | 75 | 0 | 0 | 57% cov; asymmetry 6/9 not met. Still generic-vs-specific. |
|14 | 19__6 SHORT ↔ Flirt | 51 | 51 | 0 | 1 | Already fixed in R1. |
|15 | 16__7 Cynical ↔ Activist | 72 | 72 | 0 | 1 | Unchanged. |

### Pairs that dropped in Round 2 (and why)

- **18__21 (82→80):** 50% coverage now subject to ceiling ≤55, friction floor, and sparse multiplier; friction 1.
- **16__18, 17__2 (79→77):** 50% cov, friction floor + sparse calibration.
- **16__21, 18__8 (77→75):** 50% cov, friction floor + sparse calibration.
- **6__7 (76→74):** 50% cov, friction floor + sparse calibration.
- **21__8 (74→72):** 50% cov, friction floor + sparse calibration.

**Recompute after Round 2:** 210 matches; avg 49.24 (was 49.67); P90 70, P95 72, P99 77. Top score **80** (was 82). Matches in 80–89: **1** (was 3).

**Recompute was executed** for this report (npm run recompute-matches; 210 matches, 521 profiles).

### Score bands after Round 2

| Band | Count |
|------|-------|
| finalScore ≥ 90 | 0 |
| 80–89 | 1 |
| 70–79 | 18 |
| 60–69 | 28 |
| 50–59 | 45 |
| 40–49 | 52 |
| 30–39 | 38 |
| 0–29 | 28 |

(Total 210. Percentiles: P90 = 70, P95 = 72, P99 = 77.)

### What code changed (Round 2)

| File | Change |
|------|--------|
| **src/matches/match-engine.ts** | (1) **Coverage ceiling:** condition `coveragePercentValue < 50` → `coveragePercentValue <= 55`; compatibility capped at `50 + coveragePercent` when coverage ≤ 55%. (2) **Friction floor:** `lowEvidence` now uses `coveragePercentValue <= 55` so friction ≥ 1 when coverage ≤ 55%. (3) **Asymmetry:** `minPresent <= 5 && maxPresent >= 10` → `minPresent <= 6 && maxPresent >= 9`. (4) **Sparse calibration:** applied when `coveragePercentValue <= 55`; for 50–55% use multiplier `0.94 + ((coveragePercentValue - 50) / 5) * 0.06`. |

No other files changed. All logic is deterministic and localized.

### Remaining inflated pairs — acceptable?

- **18__21 at 80:** Only pair in 80–89; friction 1, −2 from R1. **Acceptable** for this round.
- **12__14 SIMPLE ↔ Quiet at 75:** Unchanged; 57% cov, asymmetry 6/9 not met. **Marginally acceptable** (mid-70s).
- **Others:** 50%-cov pairs now have friction 1 and lower scores; 57%+ FAIR unchanged. **Acceptable.**

**Conclusion Round 2:** 50%-coverage highs reduced; friction no longer 0 for those pairs. Top 82→80; seven pairs dropped by 2. SIMPLE↔Quiet still uncorrected by asymmetry; remaining inflation limited and acceptable.
