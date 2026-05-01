# Match Round 3 results

**Baseline:** `docs/match-audit-top15-after-guardrails.md` (Round 2 state).  
**Implementation:** `docs/match-subscore-calibration-round3.md` (directional cap 90, values cap 85, nuance penalty).

---

## Recompute execution

**Recompute was actually executed.**  
**Exact command run:**  
`npm run recompute-matches`  
(from repo root `src/find/dating/dating-api`: `nest build && node dist/scripts/recompute-matches.js`)

**Run outcome:** 210 matches computed, 521 profiles loaded, average finalScore **48.43** (Round 2 was 49.24). P90 70, P95 72, P99 77. Top finalScore **78** (was 80 after Round 2).

---

## 1. Top 15 matches after Round 3

| # | matchId | Pair (names) | A→B | B→A | Compat | finalScore | Fric | Cov% |
|---|---------|--------------|-----|-----|--------|------------|------|------|
| 1 | 18__21 | Straight shooter ↔ הישיר/ה | 92 | 92 | 87 | **78** | 1 | 50 |
| 2 | 16__18 | Cynical romantic ↔ Straight shooter | 88 | 88 | 85 | 77 | 1 | 50 |
| 3 | 17__2 | Zen Yoga Teacher ↔ Spiritual Free-Spirit | 87 | 87 | 85 | 77 | 1 | 50 |
| 4 | 14__17 | Quiet team ↔ Zen Yoga Teacher | 84 | 84 | 82 | 77 | 0 | 57 |
| 5 | 14__3 | Quiet team ↔ Traditional Nerd | 82 | 82 | 81 | 76 | 0 | 57 |
| 6 | 16__21 | Cynical romantic ↔ הישיר/ה | 85 | 85 | 83 | 75 | 1 | 50 |
| 7 | 12__14 | SIMPLE ↔ Quiet team | 81 | 81 | 80 | 75 | 0 | 57 |
| 8 | 18__8 | Straight shooter ↔ Romantic boundaries | 83 | 83 | 82 | 74 | 1 | 50 |
| 9 | 6__7 | Flirt analytic ↔ Radical Activist | 83 | 83 | 81 | 73 | 1 | 50 |
|10 | 14__9 | Quiet team ↔ Intellectual Academic | 83 | 83 | 82 | 72 | 1 | 43 |
|11 | 14__2 | Quiet team ↔ Spiritual Free-Spirit | 83 | 83 | 84 | 71 | 1 | 36 |
|12 | 21__8 | הישיר/ה ↔ Romantic boundaries | 80 | 80 | 80 | 72 | 1 | 50 |
|13 | 16__7 | Cynical romantic ↔ Radical Activist | 85 | 85 | 82 | 72 | 1 | 43 |
|14 | 11__12 | Security/Military Hard-Liner ↔ SIMPLE | 78 | 78 | 77 | 72 | 0 | 57 |
|15 | 16__6 | Cynical romantic ↔ Flirt analytic | 85 | 85 | 82 | 72 | 1 | 50 |

(Displayed A→B/B→A are unchanged by Round 3; compatibility is the internal value after directional cap, values cap, and nuance penalty.)

---

## 2. Before vs after for manually reviewed problematic pairs

The four pairs below were **not present** in this recompute run. This run uses profiles with numeric ids from the local analyzed set (e.g. 1–21); the manual review refers to profiles **Tom #37, Natalie #merged_14, Oded #26, Maya #merged_1, Michal #merged_12, Tamar #merged_5, Hila #25**, which use ids such as `37`, `merged_14`, `26`, `merged_1`, `merged_12`, `merged_5`, `25`. No match files with those ids exist in `data/matches` for this run.

| Pair | Present this run? | Before (Round 2) | After (Round 3) | Δ A→B | Δ B→A | Δ Compat | Δ finalScore |
|------|-------------------|------------------|-----------------|-------|-------|----------|--------------|
| Tom #37 ↔ Natalie #merged_14 | No | — | — | — | — | — | — |
| Oded #26 ↔ Tom #37 | No | — | — | — | — | — | — |
| Maya #merged_1 ↔ Michal #merged_12 | No | — | — | — | — | — | — |
| Tamar #merged_5 ↔ Hila #25 | No | — | — | — | — | — | — |

**Note:** To get before/after for these pairs, run recompute in the environment where profiles 37, merged_14, 26, merged_1, merged_12, merged_5, 25 exist and are analyzed.

---

## 3. Changes in A→B, B→A, Compatibility, final score (baseline top pairs)

Round 2 → Round 3 for the **same** top pairs that appear in both runs. Displayed A→B/B→A do not change (Round 3 only caps the values used inside the compatibility formula). Compatibility and finalScore can drop.

| matchId | Pair | R2 A→B | R2 B→A | R2 Compat | R2 final | R3 A→B | R3 B→A | R3 Compat | R3 final | Δ Compat | Δ final |
|---------|------|--------|--------|-----------|----------|--------|--------|-----------|----------|----------|---------|
| 18__21 | Straight ↔ הישיר/ה | 92 | 92 | 89 | 80 | 92 | 92 | **87** | **78** | −2 | −2 |
| 16__18 | Cynical ↔ Straight | 88 | 88 | 85 | 77 | 88 | 88 | 85 | 77 | 0 | 0 |
| 17__2 | Zen ↔ Spiritual | 87 | 87 | 85 | 77 | 87 | 87 | 85 | 77 | 0 | 0 |
| 14__17 | Quiet ↔ Zen | 84 | 84 | 82 | 77 | 84 | 84 | 82 | 77 | 0 | 0 |
| 16__21 | Cynical ↔ הישיר/ה | 85 | 85 | 83 | 75 | 85 | 85 | 83 | 75 | 0 | 0 |
| 18__8 | Straight ↔ Romantic | 83 | 83 | 83 | 75 | 83 | 83 | **82** | **74** | −1 | −1 |
| 6__7 | Flirt ↔ Activist | 83 | 83 | 82 | 74 | 83 | 83 | **81** | **73** | −1 | −1 |
| 12__14 | SIMPLE ↔ Quiet | 81 | 81 | 80 | 75 | 81 | 81 | 80 | 75 | 0 | 0 |

**Summary:** The pair with the highest directionals (18__21, 92/92) and high values alignment lost 2 compatibility points and 2 finalScore. Two other 50%-coverage pairs (18__8, 6__7) lost 1 compat and 1 final (directional cap 90 and/or values cap 85). Others unchanged.

---

## 4. Pairs that still look inflated

- **18__21 (78):** Still the top score. A→B/B→A remain 92/92 (displayed); compatibility dropped 89→87, final 80→78. Same-archetype double-count is partially addressed; score is more defensible but still the single highest.
- **12__14 SIMPLE ↔ Quiet (75):** Unchanged. Generic-vs-specific asymmetry still not triggered (57% cov; both sides likely ≥9 signals). Still marginally inflated.
- **16__18, 17__2 (77):** Displayed 88/88 and 87/87; compatibility 85. Arguably still high for 50% coverage but now below 90; friction 1. Acceptable for this round.
- **14__17, 14__3 (77, 76):** 57% coverage, no friction floor; FAIR in audit. Not inflated.

---

## 5. Score band counts after Round 3

From the recompute run (**210 matches**; distribution derived from match files):

| Band | Count |
|------|-------|
| finalScore ≥ 90 | 0 |
| 80–89 | 0 |
| 70–79 | 21 |
| 60–69 | 34 |
| 50–59 | 36 |
| 40–49 | 26 |
| 30–39 | 24 |
| 0–29 | 69 |

**Total:** 210. **Average finalScore:** 48.43. **P90:** 70, **P95:** 72, **P99:** 77. **Top score:** 78 (no pair in 80–89 after Round 3).

---

## 6. Exact command that was run

```bash
cd c:\dev\front\new\bondit_webapp\src\find\dating\dating-api
npm run recompute-matches
```

Which runs: `nest build && node dist/scripts/recompute-matches.js`.

---

## 7. Explicit note on recompute execution

**Recompute was actually executed.** The command completed successfully; 210 matches were written to `data/matches` and the console report (Total matches, Average finalScore, P90/P95/P99, top 5) was produced. This report reflects the state of the match files after that run.
