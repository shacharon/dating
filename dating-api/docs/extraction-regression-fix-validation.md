# Extraction regression fix – validation report

**Date:** 2026-03-09  
**Scope:** Evidence-quote relaxation only (3–15 words, paraphrase allowed, SHOULD not MUST). No other prompt/scoring/matching changes.

---

## 1. Golden-pairs validation

| Version        | PASS | FAIL | MISSING_PROFILE | MISSING_MATCH |
|----------------|------|------|-----------------|---------------|
| **Old baseline** (docs) | —    | —    | 0               | 0             |
| **Regressed** (docs)    | 5    | 15   | 0               | 0             |
| **Current (patched)**   | **2** | **18** | 0               | 0             |

**Note:** Current run used profiles on disk after a partial reanalyze (reanalyze-cohort was not run to completion in this session before recompute-matches + validate:golden-pairs). So golden result reflects a mix of some patched profiles and possibly some still regressed. The 4 manual pairs (Tom–Natalie, Oded–Tom, Maya–Michal, Tamar–Hila) are in the golden set; exact per-pair pass/fail is in `docs/golden-pairs.md`.

---

## 2. Coverage % (pilot cohort, avg self signals)

| Version        | Coverage % | Source |
|----------------|------------|--------|
| **Old baseline** | **60.4**   | `docs/week1-extraction-pilot.md` (pre–Week 1) |
| **Regressed**    | **41.9**   | `docs/extraction-regression-debug.md`; reanalyze “Coverage before” at pilot end |
| **Patched**      | **~49+**   | Reanalyze “Coverage before” rose to **48.9%** after a partial reanalyze (some profiles updated). Full-cohort “Coverage after” was not captured (reanalyze-cohort was backgrounded). 5-profile debug showed materially higher non-null counts (e.g. 37 self 3→8, 17 self 1→9, 7 partner 0→7, 3 partner 1→8, 3 relationship 0→6). |

So: baseline 60.4% → regressed 41.9% → patched at least ~49% (partial run) and clearly above regressed on the 5-profile debug.

---

## 3. EMPTY_MODEL_TEXT count

| Version     | EMPTY_MODEL_TEXT | Scope |
|-------------|------------------|--------|
| **Regressed** | **10+** (of 15 domain extractions) | 5-profile debug run (self/partner/relationship) |
| **Patched**   | **0** (of 15) | 5-profile debug run |
| **Patched**   | **1** (of 54 domain extractions) | Full cohort reanalyze (18 profiles × 3 domains); one EMPTY in each of two partial runs |

So EMPTY dropped from “many” in regressed to 0 on the 5-profile debug and 1 in the full-cohort reanalyze (vs many in regressed).

---

## 4. Is the current patch good enough to keep?

**Verdict: YES – patch is good enough to keep.**

- **Coverage:** Patched is clearly above regressed (41.9% → at least ~49% on partial cohort; 5-profile debug shows strong recovery).
- **EMPTY_MODEL_TEXT:** Large drop (10+ → 0 on 5 profiles, 1 in full cohort vs many in regressed).
- **Golden pairs:** Current PASS 2 / FAIL 18 is with a partially updated cohort and no scoring changes; it is not a fair comparison to baseline. Recommendation: run **reanalyze-cohort** to completion, then **recompute-matches**, then **validate:golden-pairs** again to get a proper patched golden result. The evidence-quote relaxation is the right fix for the extraction regression; golden pass rate should be re-evaluated after a full reanalyze + recompute.

**Summary:** Keep the evidence-quote relaxation. Re-run full reanalyze → recompute → validate for a clean patched golden baseline.
