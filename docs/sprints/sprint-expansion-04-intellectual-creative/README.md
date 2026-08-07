# Sprint Expansion-04: Intellectual & Creative Expression

**Duration:** 2 weeks  
**Goal:** Add `intellectualCuriosity` and `creativeExpression` compatibility signals  
**Depends on:** Phase 1 complete (Sprints 01–03)  
**Phase:** 2 — Activity-Style signals begin

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `intellectualCuriosity` | 1.3 | Tier 2 | intellectual | Mental stimulation |
| `creativeExpression` | 1.0 | Tier 3 | creative | Creative expression |

**Note:** These are orthogonal to interest tags (`books_reading`, `art_visual`). Tags = binary hobby presence. Signals = scored need/intensity for compatibility.

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — shadow allowlist only; see `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md`

**As-built (architect override vs README):**
- **`creativeExpression`** added to `SHADOW_SIGNAL_KEYS` only
- **`intellectualCuriosity`** already shadow — left in place (no duplicate)
- `MAX_EVIDENCE_ITEMS` 31 → **32** (13 shadow / 28 total)
- Weights / tiers / domains / chips — **deferred** to promote story (documented promotion-ready)
- Files: `extracted-signals.interface.ts` + specs — **not** `compatibility-score.ts` / `match-explainability.ts` in Story 1

**Tasks (README → as-built):**
1. ~~Add both signal keys to type system~~ → add `creativeExpression`; `intellectualCuriosity` already present
2. Weights / domains / tiers — promotion-ready docs only (Story 1)

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 8  
**Owner:** Backend + Prompt Engineer  
**Status:** Done (2026-08-07) — see `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md`

**As-built (architect override vs README):**
- Semantic definitions in **`expansion-04-signal-definitions.ts`** → `SELF_EXTRACTOR_PROMPT` (not `evaluate-llm-prompts.ts`)
- Single `completeJSON` call per self-domain extract — no parallel per-signal calls
- Scale **1–10 or null** (not 0–10); sparsity via existing 15-word shutdown
- **`intellectualCuriosity`** — refined relationship-need framing (already in allowlists; not re-added)
- **`creativeExpression`** — new to self ALLOWED KEYS + `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (20 keys)
- Partner allowlist unchanged — no `creativeExpression` on partner
- Interest tags orthogonal — PROTECTED in prompt (no keyword/tag scoring)

**Files modified (as-built):**
- `dating-api/src/extraction/expansion-04-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

**`intellectualCuriosity` (1–10)** — relationship need for mental stimulation (not merely "I'm smart")

**`creativeExpression` (1–10)** — need for creative outlets / identity (not merely job title or hobby tag)

**Acceptance Criteria:**
- ✅ NO keyword matching (e.g. "artist" alone ≠ high creativeExpression)
- ✅ Semantic inference only
- ✅ Null when unclear / out-of-range stripped

---

### STORY 3: Tension Rules ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — see `handoffs/STORY_03_tension_rules/agent-3-pm.md`

**As-built:**
- `intellectual_gap` — penalty **4**, chip `Different mental stimulation needs` (≥8 vs ≤3)
- `creative_mismatch` — penalty **2**, chip `Creative drive mismatch` (≥8 vs ≤2)
- Null guard on both sides; `EnrichedSignals` extended with both Expansion-04 keys
- Friction affects `finalScore` when rules fire; compatibility scoring unchanged (shadow)
- Note: `creative_mismatch` alone does not surface `tensionChip` (friction gate ≥3)

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
- Shadow overlay via **`expansion-04-explainability.ts`** — not `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- Merge concat with Expansion-01/02/03 in `assemble-result.ts` for chip picker only
- Domains: `intellectualCuriosity` → **`intellectual`**; `creativeExpression` → **`creative`**

**Chip labels (locked):**
- `intellectualCuriosity` → **Mental stimulation**
- `creativeExpression` → **Creative expression**

**Files modified:**
- `dating-api/src/matches/expansion-04-explainability.ts` (+ spec)
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts` (+ spec)
- `dating-api/src/matches/match-explainability.spec.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx`

**Evidence (reference):**
- EN Mental: "You both value ideas, learning, and intellectual growth"
- HE Mental: "שניכם מעריכים רעיונות, למידה וצמיחה אינטלקטואלית"
- ES Mental: "Ambos valoran ideas, aprendizaje y crecimiento intelectual"
- EN Creative: "You both value creativity and making things"
- HE Creative: "שניכם מעריכים יצירתיות ויצירה"
- ES Creative: "Ambos valoran la creatividad y crear cosas"

**Acceptance Criteria:**
- ✅ Positive chips via shadow overlay + unit tests
- ✅ i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` (21 keys)
- ⏭️ Browse UI visual QA — Story 5

---

### STORY 5: Testing & Validation ✅ Done
**Points:** 5  
**Owner:** QA + Backend  
**Status:** Done (2026-08-07) — engineering gate; see `handoffs/STORY_05_testing_validation/agent-3-pm.md`

**As-built (architect override vs README):**
- Unit high/low extraction — **already Story 2**; Story 5 = `compare()` E2E + live fixture script
- Integration — **11** match-engine E2E tests (tension, positive chips, alignments exclusion, compatibility invariance, Expansion-03 non-regression, interest coexistence)
- Live LLM — `validate:expansion-04-extraction` (≥12 fixtures, 85% threshold, skip without API key); run recorded **100%** (11/11 scored)
- Interest tags unchanged; tags ≠ Expansion-04 signal keys (asserted)
- 50-profile human study + browse visual QA — **deferred operator** (not engineering block)
- No Phase 1 EQ gate (Expansion-03 only); no scoring promote

**Acceptance Criteria:**
- ✅ Match-engine Expansion-04 integration via `compare()`
- ✅ Interest-tag coexistence regression
- ✅ UI tension chip passthrough (`Different mental stimulation needs`)
- ✅ Optional live LLM script present
- ⏭️ 50-profile human rating — operator follow-up
- ⏭️ Browse visual QA — operator follow-up after re-analyze

---

## Definition of Done

- [x] All 5 stories completed (engineering gate; shadow mode)
- [x] NO hardcoded patterns (LLM-first extraction; fixture script uses real extraction path)
- [x] Signals distinct from interest tag overlap (taxonomy + compare coexistence asserts)

**Promote note:** Weights / tiers / `COMPATIBILITY_SIGNAL_KEYS` remain future — Expansion-04 ships extract + friction + chips + validation only.

---

## Next Sprint

**Sprint Expansion-05:** Physical Activity & Domestic Comfort

```text
--agent 0 expansion 05 story 1
```
