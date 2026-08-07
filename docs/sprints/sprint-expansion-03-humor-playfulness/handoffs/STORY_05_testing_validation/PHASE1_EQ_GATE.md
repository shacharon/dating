# Phase 1 EQ Gate — Results

**Sprint:** Expansion-03 (closes Phase 1 EQ engineering gate)  
**Date:** 2026-08-07  
**Run by:** Agent 1 dev  
**Sign-off:** **Agent 3 PM — accepted (PARTIAL)** — 2026-08-07  
**CR:** Agent 2 approved (no code changes)

---

## Extraction agreement (≥85% per signal)

| Check | Target | Result | Pass |
|-------|--------|--------|------|
| Expansion-01 — `empathyCompassion` | ≥85% | **75.0%** (3/4 scored) | ❌ |
| Expansion-01 — `vulnerabilityOpenness` | ≥85% | **60.0%** (3/5 scored) | ❌ |
| Expansion-02 — `emotionalRegulation` | ≥85% | **100.0%** (6/6) | ✅ |
| Expansion-02 — `physicalAffectionStyle` | ≥85% | **100.0%** (6/6) | ✅ |
| Expansion-03 — `humorPlayfulness` | ≥85% | **91.7%** (11/12) | ✅ |
| **Overall (orchestrator)** | ≥85% aggregate | **87.9%** (29/33) | ⚠️ per-signal fails |

**Command:** `npm run validate:phase1-eq-extraction`  
**Note:** Orchestrator exits **1** when any per-signal agreement is below 85%, even if aggregate exceeds threshold.

**Expansion-03 standalone:** `npm run validate:expansion-03-extraction` returned **83.3%** (10/12) on an isolated run — two high-band fixtures scored 6 (`humor_high_01`, `humor_high_06`). LLM variance; re-run in orchestrator passed 11/12.

---

## Correlation review (|r|>0.85)

| Check | Target | Result | Pass |
|-------|--------|--------|------|
| EQ shadow pairwise correlation | Review flagged pairs | **No pairs flagged** — sparse n on 15 semantic fixtures (many texts extract only one EQ key) | ✅ (review) |
| Watch: `humorPlayfulness` vs `noveltyVsRoutine` | Flag if \|r\|>0.85 | n/a (insufficient paired scores) | — |
| Watch: `humorPlayfulness` vs `socialBattery` | Flag if \|r\|>0.85 | n/a (insufficient paired scores) | — |

**Command:** `npm run report:phase1-eq-correlation` — exit 0 (report-only)

**Operator follow-up:** Re-run correlation on a larger re-analyzed profile sample when available for meaningful pairwise n.

---

## Engineering checks

| Check | Target | Result | Pass |
|-------|--------|--------|------|
| Chip diversity test | Multi-domain incl. `connection` | Unit test pass (`match-explainability.spec.ts`) | ✅ |
| Shadow mode intact | No promote | `COMPATIBILITY_SIGNAL_KEYS.length === 15`; all 5 EQ keys shadow-only | ✅ |
| Expansion-03 E2E integration | ≥8 tests | 8/8 pass | ✅ |
| Performance P95 batch extraction | Acceptable | **Deferred** — manual / future benchmark | — |

---

## Promote recommendation

| Decision | Rationale |
|----------|-----------|
| **PARTIAL — NO-GO for full EQ promote** | Expansion-01 signals below 85%; Expansion-02/03 pass per-signal in orchestrator run |
| **Expansion-03 shadow ship** | ✅ Engineering gate satisfied — extract, friction, chips, tests complete in shadow mode |
| **Before scoring promote** | Tune Expansion-01 prompts/fixtures; confirm Expansion-03 standalone ≥85% on repeat runs; golden-pairs re-run; explicit promote sprint |

---

## Deferred operator tasks

- 50 real profiles human-rated validation
- Re-analyze production profiles after promote decision
- Golden-pairs regression (`npm run validate:golden-pairs`) when DB available
- P95 batch extraction benchmark
