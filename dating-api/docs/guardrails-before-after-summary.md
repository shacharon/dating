# Guardrails plan: before/after summary

End-to-end execution: audit → minimal guardrails → recompute → summary.

---

## Step 1: Audit (recurring inflation patterns)

**Source:** `docs/audit-top-matches-taxonomy.md`

**Top 15 before guardrails (by finalScore):**

| # | Pair | Score | Cov% | Fric | Label |
|---|------|-------|------|------|--------|
| 1 | Straight shooter ↔ הישיר/ה (direct) | 82 | 50 | 0 | INFLATED |
| 2 | Cynical romantic ↔ Straight shooter | 80 | 50 | 0 | INFLATED |
| 3 | Zen Yoga Teacher ↔ Spiritual Free-Spirit | 79 | 50 | 0 | INFLATED |
| 4 | Quiet team ↔ Zen Yoga Teacher | 78 | 57 | 0 | FAIR |
| 5 | Cynical romantic ↔ הישיר/ה | 78 | 50 | 0 | INFLATED |
| 6 | Straight shooter ↔ Romantic with boundaries | 77 | 50 | 0 | FAIR |
| 7 | Flirt analytic ↔ Radical Activist | 77 | 50 | 0 | INFLATED |
| 8 | Quiet team ↔ Intellectual Academic | 76 | 43 | 0 | INFLATED |
| 9 | Quiet team ↔ Traditional Nerd | 77 | 57 | 0 | FAIR |
|10 | **SHORT** ↔ Radical Activist | **77** | **14** | 0 | **BROKEN** |
|11 | Quiet team ↔ Spiritual Free-Spirit | 75 | 36 | 0 | INFLATED |
|12 | הישיר/ה ↔ Romantic with boundaries | 75 | 50 | 0 | FAIR |
|13 | **SIMPLE** ↔ Quiet team | 75 | 57 | 0 | INFLATED |
|14 | **SHORT** ↔ Flirt analytic | **74** | **14** | 0 | **BROKEN** |
|15 | Cynical romantic ↔ Radical Activist | 74 | 43 | 0 | INFLATED |

**Recurring patterns:** OVERCONFIDENT_CERTAINTY (no coverage ceiling), SPARSE_INFLATION (minimal profiles), FRICTION_TOO_SOFT (friction=0 too often), GENERIC_VS_SPECIFIC (asymmetry), DOUBLE_COUNTED_VIBE (valuesAlignment overweight).

---

## Step 2: Minimal guardrails implemented

1. **Low evidence/coverage ceilings**  
   When `coveragePercent < 50`, cap compatibility at `50 + coveragePercent`.  
   **File:** `src/matches/match-engine.ts` (after compatibilityValue set).

2. **Generic-vs-specific asymmetry penalty**  
   When one profile has ≤5 present signals and the other ≥10, scale directional scores by 0.92 before the compatibility formula (`aToBForCompat`, `bToAForCompat`).  
   **File:** `src/matches/match-engine.ts` (countPresent, isAsymmetric, asymmetryScale).

3. **Friction floor**  
   When `coveragePercent < 50` OR `isAsymmetric` OR `minPresent <= 5`, set `friction = max(friction, 1)`.  
   **File:** `src/matches/match-engine.ts` (lowEvidence block).  
   Additional tension rules: `traditionalism_structure_gap`, `relationship_clarity_flow_gap`, `lifestyle_pace_mismatch` in `src/engine/tension-rules.ts`.

4. **Reduced double-counting of vibe overlap**  
   Compatibility formula: `valuesAlignment` weight 0.10 → 0.05, `relationshipFit` 0.20 → 0.25.  
   **File:** `src/engine/scoring.ts` (`compatibility()`).

---

## Step 3: Recompute

**Command:** `npm run recompute-matches` (from dating-api root).

**Result (this run):**
- Profiles loaded: 521 (analyzed subset used for pairs)
- Matches computed: 210
- Average finalScore (new): **49.67**
- Average finalScore (old, from existing files): **32.26** (prior run had different policy)
- Count of 100s: **0**
- Count of 90+: **0**
- P90: **71**, P95: **73**, P99: **79**

---

## Step 4: Before/after

### Top matches after guardrails

| Pair | Before | After | Δ | Note |
|------|--------|-------|---|------|
| Straight shooter ↔ הישיר/ה | 82 | 82 | 0 | 50% cov, no cap; valuesAlignment down slightly |
| Cynical romantic ↔ Straight shooter | 80 | 79 | −1 | |
| Zen Yoga Teacher ↔ Spiritual Free-Spirit | 79 | 79 | 0 | |
| Quiet team ↔ Zen Yoga Teacher | 78 | 77 | −1 | |
| Cynical romantic ↔ הישיר/ה | 78 | 77 | −1 | |
| Straight shooter ↔ Romantic boundaries | 77 | 77 | 0 | FAIR |
| Flirt analytic ↔ Radical Activist | 77 | 76 | −1 | |
| Quiet team ↔ Intellectual Academic | 76 | 73 | **−3** | Cov 43%, friction floor 1 |
| Quiet team ↔ Traditional Nerd | 77 | 76 | −1 | FAIR |
| **SHORT ↔ Radical Activist** | **77** | **51** | **−26** | **FIXED** (cap + friction floor) |
| Quiet team ↔ Spiritual Free-Spirit | 75 | 72 | **−3** | Cov 36%, friction floor 1 |
| הישיר/ה ↔ Romantic boundaries | 75 | 74 | −1 | FAIR |
| SIMPLE ↔ Quiet team | 75 | 75 | 0 | 57% cov, not asymmetric by threshold |
| **SHORT ↔ Flirt analytic** | **74** | **51** | **−23** | **FIXED** (cap + friction floor) |
| Cynical romantic ↔ Radical Activist | 74 | 72 | −2 | Cov 43%, friction floor 1 |

### Distribution changes

| Metric | Before (audit run) | After (this recompute) |
|--------|--------------------|-------------------------|
| Top score | 82 | 82 |
| Count 90+ | 0 (post-stretch) | 0 |
| Count 100 | 0 | 0 |
| P99 | — | 79 |
| P95 | — | 73 |
| P90 | — | 71 |
| Avg (this dataset) | — | 49.67 |

### Inflated cases that were fixed

- **SHORT ↔ Radical Activist:** 77 → **51**. Coverage 14%, compatibility capped at 64; friction floor 1. No more near-perfect score on stub profile.
- **SHORT ↔ Flirt analytic:** 74 → **51**. Same mechanism.
- **Quiet team ↔ Intellectual Academic (43% cov):** 76 → 73; friction 1.
- **Quiet team ↔ Spiritual Free-Spirit (36% cov):** 75 → 72; friction 1.
- **Cynical romantic ↔ Radical Activist (43% cov):** 74 → 72; friction 1.

### Exact files changed (patch-only)

| File | Change |
|------|--------|
| `src/matches/match-engine.ts` | Coverage/compat computed early; coverage cap on compatibility when cov < 50%; countPresent, isAsymmetric, aToBForCompat/bToAForCompat; lowEvidence friction floor (cov < 50 \|\| isAsymmetric \|\| minPresent ≤ 5). |
| `src/engine/scoring.ts` | `compatibility()`: relationshipFit 0.25, valuesAlignment 0.05. |
| `src/engine/tension-rules.ts` | New rules: `traditionalism_structure_gap`, `relationship_clarity_flow_gap`, `lifestyle_pace_mismatch`. |

No new subsystems, no schema changes, no architecture rewrite. All changes are localized and deterministic.
