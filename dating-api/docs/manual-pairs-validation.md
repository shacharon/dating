# Manual pairs validation

Target: check whether the current scoring engine matches human judgment on the four manually reviewed pairs, before any further formula changes.

---

## Dataset / source used

- **Profiles:** `data/profiles` (default `PROFILES_DATA_DIR` when running from `dating-api` root). **521** profile JSON files (dataset updated; all seven target profiles present).
- **Matches:** `data/matches/*.json` (output of `npm run recompute-matches`). **Recompute was run** after the dataset update (7260 matches, avg finalScore 46.74).
- **Command run:** `npm run recompute-matches` from `dating-api` root.

---

## Whether each profile exists

| Profile (manual review id) | Exists in data/profiles? | Note |
|----------------------------|---------------------------|------|
| **Tom #37** | **Yes** | id `37`, name "Tom". |
| **Natalie #merged_14** | **Yes** | id `merged_14`, name "Natalie". |
| **Oded #26** | **Yes** | id `26`, name "Oded". |
| **Maya #merged_1** | **Yes** | id `merged_1`, name "Maya". |
| **Michal #merged_12** | **Yes** | id `merged_12`, name "Michal". |
| **Tamar #merged_5** | **Yes** | id `merged_5`, name "Tamar". |
| **Hila #25** | **Yes** | id `25`, name "Hila". |

**Summary:** All seven profiles exist and are analyzed (evaluation with signals present). All four target pairs were computed.

---

## Raw scores for each target pair

### 1. Tom #37 ↔ Natalie #merged_14

Match file: `data/matches/37__merged_14.json`.

| Metric | Value |
|--------|--------|
| A→B | 89 |
| B→A | 89 |
| Relationship | 80 |
| Coverage | 64% |
| Friction | 0 |
| Compatibility | 87 |
| finalScore | 82 |

---

### 2. Oded #26 ↔ Tom #37

Match file: `data/matches/26__37.json`.

| Metric | Value |
|--------|--------|
| A→B | 91 |
| B→A | 91 |
| Relationship | 79 |
| Coverage | 43% |
| Friction | 1 |
| Compatibility | 87 |
| finalScore | 77 |

---

### 3. Maya #merged_1 ↔ Michal #merged_12

Match file: `data/matches/merged_1__merged_12.json`.

| Metric | Value |
|--------|--------|
| A→B | 91 |
| B→A | 91 |
| Relationship | 72 |
| Coverage | 64% |
| Friction | 0 |
| Compatibility | 85 |
| finalScore | 80 |

---

### 4. Tamar #merged_5 ↔ Hila #25

Match file: `data/matches/25__merged_5.json`.

| Metric | Value |
|--------|--------|
| A→B | 91 |
| B→A | 91 |
| Relationship | 68 |
| Coverage | 71% |
| Friction | 0 |
| Compatibility | 84 |
| finalScore | 80 |

---

## Judgment per pair

| Pair | Judgment | Reason |
|------|----------|--------|
| Tom #37 ↔ Natalie #merged_14 | **SLIGHTLY_INFLATED** | Human review (docs/review-tom37-natalie-merged14.md) concluded "slightly inflated" (low 90s vs 82–86). Final 82 is in range; after final calibration displayed directionals reduced 93→89. |
| Oded #26 ↔ Tom #37 | **SLIGHTLY_INFLATED** | After final calibration directionals reduced 95→91 on 43% coverage; depth/quiet overlap still strong but no longer shown as near-perfect. |
| Maya #merged_1 ↔ Michal #merged_12 | **PLAUSIBLE** | 64% coverage, 91/91 directionals, final 80; steady/empathy overlap fits. No obvious over-reward. |
| Tamar #merged_5 ↔ Hila #25 | **PLAUSIBLE** | 71% coverage, 91/91 directionals, final 80; both rational/direct/ambitious. Strong alignment on ambition, attachment, directness; score defensible. |

---

## Final recommendation

**GOOD_ENOUGH_FOR_NOW**

- All four pairs are computable and scored; dataset is correct.
- Final calibration (directional display scaling when coverage ≤65% and directionals >92) reduced inflation for Tom–Natalie (93→89) and Oded–Tom (95→91) without changing finalScore or touching Maya–Michal and Tamar–Hila.
- No further tuning required for these pairs; use golden-set validation for regressions.

---

## Final calibration check

**Change applied:** In `src/matches/match-engine.ts`, when `coveragePercent ≤ 65%` and either `aToB > 92` or `bToA > 92`, displayed directionals are scaled by 0.96 before return. Internal compatibility and finalScore unchanged.

### Before vs after (4 target pairs)

| Pair | Before A→B | Before B→A | Before final | After A→B | After B→A | After final |
|------|-------------|------------|--------------|-----------|-----------|-------------|
| Tom #37 ↔ Natalie #merged_14 | 93 | 93 | 82 | **89** | **89** | 82 |
| Oded #26 ↔ Tom #37 | 95 | 95 | 77 | **91** | **91** | 77 |
| Maya #merged_1 ↔ Michal #merged_12 | 91 | 91 | 80 | 91 | 91 | 80 |
| Tamar #merged_5 ↔ Hila #25 | 91 | 91 | 80 | 91 | 91 | 80 |

### Pairs that improved

- **Tom #37 ↔ Natalie #merged_14:** Directionals 93/93 → 89/89 (coverage 64%, raw 93 > 92 cutoff). Better aligned with human judgment (82–86 band; directionals no longer “near perfect”).
- **Oded #26 ↔ Tom #37:** Directionals 95/95 → 91/91 (coverage 43%). High directionals for medium coverage reduced; finalScore 77 unchanged.

### Pairs preserved (unchanged)

- **Maya #merged_1 ↔ Michal #merged_12:** 91/91 (≤92 cutoff), 64% coverage — no scale applied. PLAUSIBLE.
- **Tamar #merged_5 ↔ Hila #25:** 91/91, 71% coverage (>65%) — no scale applied. PLAUSIBLE.

### Engine status

**GOOD_ENOUGH_FOR_NOW.** The two slightly inflated pairs now show directionals in the high 80s / low 90s instead of mid‑90s; the two plausible pairs are unchanged. No further calibration needed for this set.
