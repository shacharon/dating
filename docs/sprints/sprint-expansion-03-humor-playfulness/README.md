# Sprint Expansion-03: Humor & Playfulness

**Duration:** 2 weeks  
**Goal:** Add `humorPlayfulness` compatibility signal  
**Depends on:** Sprint Expansion-01, Sprint Expansion-02  
**Milestone:** Completes Phase 1 (Emotional Intelligence — 5 signals total)

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Signal Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `humorPlayfulness` | 1.2 | Tier 2 | connection | Shared playfulness |

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 2  
**Owner:** Backend  
**Status:** Done (2026-08-07) — shadow allowlist only; see `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md`

**Tasks:**
1. Add `humorPlayfulness` to `SignalKey`
2. Weight 1.2, Tier 2, domain `connection`
3. Update all signal registries

**Files:**
- `dating-api/src/compatibility/compatibility-score.ts`
- `dating-api/src/matches/match-explainability.ts`

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 8  
**Owner:** Backend + Prompt Engineer  
**Status:** Done (2026-08-07) — see `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md`

**As-built (architect override vs README):**
- Semantic definition in **`expansion-03-signal-definitions.ts`** → `SELF_EXTRACTOR_PROMPT` (not `evaluate-llm-prompts.ts`)
- Single `completeJSON` call per self-domain extract — no parallel per-signal calls
- Scale **1–10 or null** (not 0–10); sparsity via existing 15-word shutdown
- `DOMAIN_ALLOWED_SIGNAL_KEYS.self` — 19 keys (includes Expansion-01/02/03 shadow)

**Files modified (as-built):**
- `dating-api/src/extraction/expansion-03-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

**`humorPlayfulness` (1–10)**

Definition: Importance of playfulness, banter, fun, lightness, shared laughter in a relationship. Not just "funny" — how much levity and play matter day-to-day.

Scale:
- 0-2: Very serious tone, little room for play or banter in relationships
- 3-4: Occasional humor, playfulness is nice but not important
- 5-6: Moderate — enjoys fun together, balanced with seriousness
- 7-8: Playfulness is important; banter and lightness strengthen the bond
- 9-10: Play and humor are essential; needs a partner who can laugh and be silly together

Instructions:
- Infer from tone, self-description, what they value in a partner
- Distinguish "I am funny" vs "I need playfulness in relationships"
- Rate semantic meaning, not keyword "fun" or "humor"

Examples HIGH (7-9):
- "I want someone I can be silly with after a long day"
- "Banter and inside jokes are how we stay close"
- "Life is heavy enough — I need lightness in love"

Examples LOW (1-3):
- "I'm quite serious about relationships"
- "I prefer deep conversations over joking around"
- "Playfulness isn't really my thing"

**Acceptance Criteria:**
- ✅ LLM-only extraction
- ✅ Null when unclear

---

### STORY 3: Tension Rules ✅ Done
**Points:** 3  
**Owner:** Backend  
**Status:** Done (2026-08-07) — see `handoffs/STORY_03_tension_rules/agent-3-pm.md`

**As-built:**
- `humor_mismatch` — penalty **3**, chip `Playfulness mismatch`
- Threshold: high ≥8 vs low ≤3; null guard on both sides
- `EnrichedSignals` extended with `humorPlayfulness`; friction affects `finalScore` when rule fires

**Files modified:**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

**Rule (reference):**

```typescript
{
  id: 'humor_mismatch',
  name: 'Playfulness mismatch (MED)',
  when: (a, b) => {
    const aHum = getSignal(a, 'humorPlayfulness');
    const bHum = getSignal(b, 'humorPlayfulness');
    if (aHum == null || bHum == null) return false;
    return (aHum >= 8 && bHum <= 3) || (bHum >= 8 && aHum <= 3);
  },
  penalty: 3,
  explain: 'One values playfulness and fun, the other is more serious',
},
```

`TENSION_CHIP_BY_ID`: `humor_mismatch: 'Playfulness mismatch'`

**Acceptance Criteria:**
- ✅ Tension fires at thresholds (4 friction unit tests)
- ✅ Chip label via `explainability.tensionChip` (English API; UI renders existing field)
- ⏭️ Positive chips / i18n — Story 4

---

### STORY 4: User-Facing Chips & i18n ✅ Done
**Points:** 4  
**Owner:** Frontend + i18n  
**Status:** Done (2026-08-07) — see `handoffs/STORY_04_chips_i18n/agent-3-pm.md`

**As-built (architect override vs README):**
- Shadow overlay via **`expansion-03-explainability.ts`** — not `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- Merge concat with Expansion-01/02 in `assemble-result.ts` for chip picker only
- Domain: `humorPlayfulness` → **`connection`**

**Chip label (locked):**
- `humorPlayfulness` → **Shared playfulness**

**Files modified:**
- `dating-api/src/matches/expansion-03-explainability.ts` (+ spec)
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts` (+ spec)
- `dating-api/src/matches/match-explainability.spec.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx`

**Evidence (reference):**
- EN: "You bring out lightness and laughter in each other"
- HE: "אתם מביאים קלילות וצחוק אחד לשני"
- ES: "Se traen ligereza y risas mutuamente"

Update `CHIP_TO_TRAIT`, `chip-evidence.ts`, i18n `chipEvidence` maps.

**Acceptance Criteria:**
- ✅ Positive chip via shadow overlay + unit tests
- ✅ i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS`
- ⏭️ Browse UI visual QA — Story 5

---

### STORY 5: Testing, Validation & Phase 1 Gate ✅ Done
**Points:** 6  
**Owner:** QA + Backend  
**Status:** Done (2026-08-07) — see `handoffs/STORY_05_testing_validation/agent-3-pm.md` + `PHASE1_EQ_GATE.md`

**As-built (architect override vs README):**
- Match-engine `compare()` E2E — **8** Expansion-03 tests (not duplicate extraction unit tests — Story 2)
- Live LLM: `validate:expansion-03-extraction` (12 fixtures) + Phase 1 orchestrator `validate:phase1-eq-extraction`
- Correlation: `report:phase1-eq-correlation` (report-only, exit 0 with warnings)
- Chip diversity unit test in `match-explainability.spec.ts`
- UI: Expansion-03 tension chip passthrough (`Playfulness mismatch`); positive chips covered in Story 4
- **No** scoring promote; Agent 4 skipped

**Phase 1 completion checklist (engineering gate):**
- [x] Orchestrator reports all 5 EQ signals — Expansion-02/03 ≥85%; Expansion-01 below (PARTIAL)
- [x] Correlation matrix tooling present — no \|r\|>0.85 flags on sample (sparse n; operator follow-up)
- [x] Shadow mode intact — **not** ready for full scoring enablement (Expansion-01 block)
- [x] Chip diversity: multi-domain incl. `connection` — unit test pass
- [ ] Performance: batch LLM extraction P95 — deferred (manual / future)

**Acceptance Criteria:**
- ✅ Expansion-03 engineering validation complete in shadow mode
- ✅ Phase 1 gate documented — **PARTIAL** promote recommendation (see `PHASE1_EQ_GATE.md`)

---

## Definition of Done

- [x] All 5 stories completed
- [x] Phase 1 engineering gate reviewed — **PARTIAL** (Expansion-01 below 85%; Expansion-02/03 pass; no full EQ promote)
- [x] NO hardcoded patterns (LLM-first extraction preserved)

---

## Next Sprint

**Sprint Expansion-04:** Intellectual & Creative Expression (Phase 2 begins)
