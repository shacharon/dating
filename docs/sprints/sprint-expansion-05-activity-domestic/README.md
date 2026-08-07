# Sprint Expansion-05: Physical Activity & Domestic Comfort

**Duration:** 2 weeks  
**Goal:** Add `physicalActivityLevel` and `domesticComfort` compatibility signals  
**Depends on:** Sprint Expansion-04

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `physicalActivityLevel` | 1.2 | Tier 3 | lifestyle | Activity level match |
| `domesticComfort` | 1.1 | Tier 3 | lifestyle | Home/out balance |

**Distinction from existing signals:**
- `physicalActivityLevel` ≠ `healthBodyConsciousness` (Wellness focus) — wellness = values health; activity = actual behavior/energy level
- `domesticComfort` ≠ `socialBattery` — social battery = intro/extro energy; domestic = prefers home vs going out

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — shadow allowlist only; see `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md`

**As-built (architect override vs README):**
- Both **`physicalActivityLevel`** + **`domesticComfort`** added to `SHADOW_SIGNAL_KEYS` only
- Distinction comments vs `healthBodyConsciousness`, `physicalPriority`, `socialBattery`, `lifestylePace`
- `MAX_EVIDENCE_ITEMS` 32 → **34** (15 shadow / 30 total)
- Weights / tiers / domains / chips — **deferred** to promote story (documented promotion-ready: 1.2 / 1.1, Tier 3, `lifestyle`)
- Files: `extracted-signals.interface.ts` + specs — **not** `compatibility-score.ts` / `match-explainability.ts` in Story 1

**Tasks (README → as-built):**
1. ~~Add signal keys, weights, Tier 3, domain~~ → shadow allowlist + distinction comments; weights deferred
2. ✅ Document distinction from existing signals in code comments

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 8  
**Owner:** Backend + Prompt Engineer  
**Status:** Done (2026-08-07) — see `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md`

**As-built (architect override vs README):**
- Semantic definitions in **`expansion-05-signal-definitions.ts`** → `SELF_EXTRACTOR_PROMPT` (not evaluate-layer)
- Single `completeJSON` call per self-domain extract — no parallel per-signal calls
- Scale **1–10 or null** (not 0–10); sparsity via existing 15-word shutdown
- Both keys added to self ALLOWED KEYS + `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**22** keys)
- SIGNAL RULES upgraded for `healthBodyConsciousness` + `lifestylePace` to reduce conflation
- Partner/relationship allowlists unchanged — Expansion-05 self-only

**Files modified (as-built):**
- `dating-api/src/extraction/expansion-05-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

**`physicalActivityLevel` (1–10)** — daily athletic/activity behavior (not wellness values)

**`domesticComfort` (1–10)** — homebody vs always-out preference (not socialBattery / lifestylePace alone)

**Acceptance Criteria:**
- ✅ LLM semantic only — NO keyword / gym / homebody heuristics
- ✅ Not conflated with socialBattery or lifestylePace (PROTECTED + SIGNAL RULES)
- ✅ Also distinct from healthBodyConsciousness / physicalPriority
- ⏭️ Live LLM quality — Story 5

---

### STORY 3: Tension Rules ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — see `handoffs/STORY_03_tension_rules/agent-3-pm.md`

**As-built:**
- `activity_level_gap` — penalty **3**, chip `Different activity levels` (≥8 vs ≤3)
- `domestic_out_mismatch` — penalty **3**, chip `Home vs out mismatch` (≥8 vs ≤3)
- Null guard on both sides; `EnrichedSignals` extended with both Expansion-05 keys
- Friction affects `finalScore` when rules fire; compatibility scoring unchanged (shadow)
- Note: each rule alone surfaces `tensionChip` (penalty 3 ≥ friction gate)

**Files modified:**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

**Acceptance Criteria:**
- ✅ Tension fires at thresholds (9 friction unit tests)
- ✅ Chip labels via `explainability.tensionChip` (English API)
- ⏭️ Positive chips / i18n — Story 4

---

### STORY 4: User-Facing Chips & i18n ✅ Done
**Points:** 5  
**Owner:** Frontend + i18n  
**Status:** Done (2026-08-07) — see `handoffs/STORY_04_chips_i18n/agent-3-pm.md`

**As-built (architect override vs README):**
- Shadow overlay via **`expansion-05-explainability.ts`** — not `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- Merge concat with Expansion-01–04 in `assemble-result.ts` for chip picker only
- Domains: both → **`lifestyle`**

**Chip labels (locked):**
- `physicalActivityLevel` → **Activity level match**
- `domesticComfort` → **Home/out balance**

**Files modified:**
- `dating-api/src/matches/expansion-05-explainability.ts` (+ spec)
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts` (+ spec)
- `dating-api/src/matches/match-explainability.spec.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx`

**Evidence (reference):**
- EN Activity: "Your physical activity levels and fitness priorities align"
- HE Activity: "רמות הפעילות הגופנית והעדפות הכושר שלכם מתאימות"
- ES Activity: "Sus niveles de actividad física y prioridades de fitness están alineados"
- EN Home/out: "You're aligned on spending time at home vs going out"
- HE Home/out: "אתם מיושרים על זמן בבית מול יציאה"
- ES Home/out: "Están alineados en pasar tiempo en casa vs salir"

**Acceptance Criteria:**
- ✅ Positive chips via shadow overlay + unit tests
- ✅ i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` (23 keys)
- ⏭️ Browse UI visual QA — Story 5

---

### STORY 5: Testing & Validation ✅ Done
**Points:** 5  
**Owner:** QA + Backend  
**Status:** Done (2026-08-07) — engineering gate; see `handoffs/STORY_05_testing_validation/agent-3-pm.md`

**As-built (architect override vs README):**
- Unit high/low extraction — **already Story 2**; Story 5 = `compare()` E2E + live fixture script
- Integration — **11** match-engine E2E tests (both tension chips, positive chips, alignments, invariance, Expansion-04 non-regression, adjacent distinction, interest coexistence)
- Live LLM — `validate:expansion-05-extraction` (12 fixtures, 85% threshold, skip without API key); run recorded **100%** (12/12)
- Adjacent distinction vs wellness / socialBattery / lifestylePace (asserts + fixture wording)
- 50-profile human study + browse visual QA — **deferred operator** (not engineering block)
- No Phase 1 EQ gate; no scoring promote

**Acceptance Criteria:**
- ✅ Match-engine Expansion-05 integration via `compare()`
- ✅ Adjacent-signal distinction regression
- ✅ UI tension chip passthrough (`Different activity levels`)
- ✅ Optional live LLM script present (≥85%)
- ⏭️ 50-profile human rating — operator follow-up
- ⏭️ Browse visual QA — operator follow-up after re-analyze

---

## Definition of Done

- [x] All 5 stories completed (engineering gate; shadow mode)
- [x] Documented distinction from existing lifestyle signals (Story 1 comments + Story 2 PROTECTED + Story 5 asserts/fixtures)
- [x] NO hardcoded patterns (LLM-first extraction; fixture script uses real extraction path)

**Promote note:** Weights / tiers / `COMPATIBILITY_SIGNAL_KEYS` remain future — Expansion-05 ships extract + friction + chips + validation only.

---

## Next Sprint

**Sprint Expansion-06:** Adventure & Novelty (final signal — 25 total)

```text
--agent 0 expansion 06 story 1
```
