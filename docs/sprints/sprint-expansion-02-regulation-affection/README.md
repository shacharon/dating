# Sprint Expansion-02: Emotional Regulation & Physical Affection

**Duration:** 2 weeks  
**Goal:** Add `emotionalRegulation` and `physicalAffectionStyle` compatibility signals  
**Depends on:** Sprint Expansion-01 (schema pattern established)

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `emotionalRegulation` | 1.4 | Tier 2 | emotional | Emotional balance |
| `physicalAffectionStyle` | 1.3 | Tier 2 | intimacy | Affection rhythm match |

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — shadow allowlist only; see `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md`

**As-built (architect override vs README):**
- Keys added to **`SHADOW_SIGNAL_KEYS`** only — **not** `SignalKey` / `COMPATIBILITY_SIGNAL_KEYS`
- Weights (1.4 / 1.3), tiers, domains, chips — deferred to promote / Stories 3–4
- `EnrichedSignals` — Story 3 (Expansion-01 pattern)
- `MAX_EVIDENCE_ITEMS` 28 → **30** (15 official + 11 shadow + 4 buffer)

**Tasks:**
1. Add keys to type system ✅ (`SHADOW_SIGNAL_KEYS`)
2. Update arrays and weights ⏭️ deferred — shadow mode
3. Tier/domain assignments ⏭️ deferred — Story 4 / promote
4. Extend `EnrichedSignals` ⏭️ Story 3
5. DB migration ✅ N/A

**Files modified (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`

**Acceptance Criteria:**
- ✅ Types compile; official 15 + Expansion-01 shadow keys unchanged
- ⏭️ Weights wired in scoring — promote story (documented: regulation 1.4, affection 1.3)

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 8  
**Owner:** Backend + Prompt Engineer  
**Status:** Done (2026-08-07) — see `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md`

**As-built (architect override vs README):**
- Semantic definitions in **`expansion-02-signal-definitions.ts`** → `SELF_EXTRACTOR_PROMPT` (not `evaluate-llm-prompts.ts`)
- Single `completeJSON` call per self-domain extract — no parallel per-signal calls
- Scale **1–10 or null** (not 0–10); sparsity via existing 15-word shutdown
- `DOMAIN_ALLOWED_SIGNAL_KEYS.self` — 18 keys (includes Expansion-01 + Expansion-02 shadow)

**Files modified (as-built):**
- `dating-api/src/extraction/expansion-02-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

**Acceptance Criteria:**
- ✅ NO hardcoded patterns (CR verified)
- ✅ High/mid/low scale in semantic prompt block
- ✅ Null-safe defaults (sparsity + out-of-range + prefer-null guidance)
- ⏭️ Live LLM sample validation — Story 5

---

### STORY 3: Tension Rules ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — see `handoffs/STORY_03_tension_rules/agent-3-pm.md`

**As-built:**
- `emotional_volatility_gap` — penalty **5**, chip `Emotional steadiness gap`
- `affection_needs_gap` — penalty **4**, chip `Different affection needs`
- Threshold: high ≥8 vs low ≤3; null guard on both sides
- `EnrichedSignals` extended; friction affects `finalScore` when rules fire

**Files modified:**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

**Acceptance Criteria:**
- ✅ Tension fires at thresholds (8 friction unit tests)
- ✅ Chip labels via `explainability.tensionChip` (English API; UI renders existing field)
- ⏭️ Positive chips / i18n — Story 4

---

### STORY 4: User-Facing Chips & i18n ✅ Done
**Points:** 5  
**Owner:** Frontend + i18n  
**Status:** Done (2026-08-07) — see `handoffs/STORY_04_chips_i18n/agent-3-pm.md`

**As-built (architect override vs README):**
- Shadow overlay via **`expansion-02-explainability.ts`** — not `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- Merge concat with Expansion-01 in `assemble-result.ts` for chip picker only
- Domains: `emotionalRegulation` → `emotional`; `physicalAffectionStyle` → **`intimacy`**

**Chip labels (locked):**
- `emotionalRegulation` → **Emotional balance**
- `physicalAffectionStyle` → **Affection rhythm match**

**Files modified:**
- `dating-api/src/matches/expansion-02-explainability.ts` (+ spec)
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts` (+ spec)
- `dating-api/src/matches/match-explainability.spec.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx`

**Acceptance Criteria:**
- ✅ Positive chips via shadow overlay + unit tests
- ✅ i18n EN/HE/ES (`chip-evidence.spec.ts` + UI tests)
- ⏭️ Browse visual QA with live profiles — Story 5

---

### STORY 5: Testing & Validation ✅ Done
**Points:** 5  
**Owner:** QA + Backend  
**Status:** Done (2026-08-07) — see `handoffs/STORY_05_testing_validation/agent-3-pm.md`

**As-built (architect override vs README):**
- Extraction unit tests in **`extraction.service.spec.ts`** (Story 2) — not `evaluate.service.spec.ts`
- Match-engine E2E via **`compare()`** — 9 integration tests
- Live LLM script: **`validate:expansion-02-extraction`** (12 fixtures); **91.7%** agreement (11/12)
- UI: positive chips (Story 4) + tension chip test (Story 5)

**Files modified:**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/data/expansion-02-extraction-fixtures.json`
- `dating-api/scripts/validate-expansion-02-extraction.ts`
- `dating-api/package.json`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx`

**Acceptance Criteria:**
- ✅ Integration: tension + positive chips + alignments + invariance + Expansion-01 non-regression
- ✅ Live LLM script present; ≥85% on first run with API key (**91.7%**)
- ⏭️ 50-profile human study — operator follow-up
- ⏭️ Browse visual QA — operator follow-up

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] Tests pass (unit + integration + i18n)
- [x] NO hardcoded extraction patterns
- [x] Shadow mode: extract and store, scoring unchanged until Phase 1 gate
- [ ] Code committed — pending user request
- [ ] Promote to `COMPATIBILITY_SIGNAL_KEYS` — future sprint (with Expansion-01)

**Sprint status:** **Complete (5/5)** — shadow mode; promote deferred.

---

## Rollout

Same as Sprint 01: shadow mode → validate → enable with Sprint 01 signals together at Phase 1 end.

---

## Next Sprint

**Sprint Expansion-03:** Humor & Playfulness (`humorPlayfulness`)
