# Sprint Expansion-06: Adventure & Novelty

**Duration:** 2 weeks  
**Goal:** Add `adventureNovelty` compatibility signal  
**Depends on:** Sprint Expansion-05  
**Milestone:** All 10 new signals complete (25 total)

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Signal Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `adventureNovelty` | 1.2 | Tier 3 | lifestyle | Adventure & novelty |

**Distinction from existing:**
- `adventureNovelty` ≠ `lifestylePace` — pace = fast/slow tempo; novelty = new vs familiar/routine
- Can be slow-paced but love new experiences, or fast-paced but routine-focused

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 2  
**Owner:** Backend

**As-built (shadow mode):** Renamed pre-existing shadow `noveltyVsRoutine` → `adventureNovelty` + `KEY_ALIASES`; self domain allowlist updated. Scoring/weights/tiers deferred to promote. Counts unchanged (15 shadow / 30 total / `MAX_EVIDENCE_ITEMS` 34).

**Tasks (README original — overridden by architect):**
1. ~~Add `adventureNovelty` to `SignalKey`, weight 1.2, Tier 3, domain `lifestyle`~~ → shadow rename + alias only
2. ~~Final audit: 25 signals in all registries~~ → product milestone when promoted; runtime still 15 scored + 15 shadow
3. Update any signal count docs — deferred / N/A for Story 1 gate

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/extraction-normalization.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- Specs under `dating-api/src/extraction/`

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 8  
**Owner:** Backend + Prompt Engineer

**As-built:** `expansion-06-signal-definitions.ts` → `SELF_EXTRACTOR_PROMPT`; prompt key migrated `noveltyVsRoutine` → `adventureNovelty`; scale **1–10 or null**; PROTECTED vs `lifestylePace` / `domesticComfort` / interest tags; alias kept. Live LLM validation deferred to Story 5.

**`adventureNovelty` (1-10)** — README “0-10” overridden to extraction stack scale.

Definition: Novelty-seeking vs routine preference — excitement for new experiences, places, activities vs comfort in familiar patterns.

Scale:
- 0-2: Strong preference for routine and familiar; dislikes change
- 3-4: Mostly routine, occasional new things are fine
- 5-6: Balanced — enjoys some novelty, some routine
- 7-8: Seeks new experiences regularly, variety matters
- 9-10: Strong novelty-seeker, thrives on adventure and the unfamiliar

Instructions:
- Infer from how they describe weekends, travel, restaurants, habits
- "Adventure" doesn't require extreme sports — can be trying new restaurants
- Distinguish from lifestylePace (speed) and travel interest tag (binary)

Examples HIGH (7-9):
- "I love trying new places and hate doing the same thing twice"
- "Spontaneous trips and new experiences keep me alive"
- "Routine bores me — I need variety"

Examples LOW (1-3):
- "I'm a creature of habit"
- "I prefer the places and routines I know"
- "I don't need novelty to be happy"

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear

---

### STORY 3: Tension Rules ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built:** `novelty_routine_clash` on `adventureNovelty` (≥8 vs ≤3, penalty **4**); `EnrichedSignals.adventureNovelty`; chip `Novelty vs routine`. Shadow-only — no compatibility promote.

```typescript
{
  id: 'novelty_routine_clash',
  name: 'Novelty vs routine clash (MED-HIGH)',
  when: (a, b) => {
    const aNov = getSignal(a, 'adventureNovelty');
    const bNov = getSignal(b, 'adventureNovelty');
    if (aNov == null || bNov == null) return false;
    return (aNov >= 8 && bNov <= 3) || (bNov >= 8 && aNov <= 3);
  },
  penalty: 4,
  explain: 'One seeks new experiences, the other values routine and familiarity',
},
```

`TENSION_CHIP_BY_ID`: `novelty_routine_clash: 'Novelty vs routine'`

---

### STORY 4: User-Facing Chips & i18n ✅ Done
**Points:** 4  
**Owner:** Frontend + i18n

**As-built (shadow overlay):** Chip `Adventure & novelty` via `expansion-06-explainability.ts` (domain `lifestyle`); merged in `assemble-result.ts` for chip picker only — not `POSITIVE_CHIP_BY_SIGNAL` / scoring. EN/HE/ES evidence + `CHIP_EVIDENCE_KEYS` **24**. Full 10-chip i18n audit deferred to Story 5.

**Chip:** `adventureNovelty` → "Adventure & novelty"

**Evidence:**
- EN: "You're both excited by new experiences and variety"
- HE: "שניכם מתרגשים מחוויות חדשות וגיוון"
- ES: "Ambos se emocionan con nuevas experiencias y variedad"

---

### STORY 5: Testing, Validation & Full Rollout Gate ✅ Done (engineering)
**Points:** 8  
**Owner:** QA + Backend + PM

**As-built:** 9 `compare()` E2E tests; `validate:expansion-06-extraction` (6 fixtures, live ≥85%); UI tension passthrough; 10 expansion chips in `CHIP_EVIDENCE_KEYS`. **Shadow mode only** — scoring rollout / promote deferred.

**Tests:** extraction + integration + full i18n sweep (engineering)

**Full expansion completion checklist:**
- [x] Expansion-06 extracts with >85% agreement (live script; prior Exp-01–05 scripts remain operator re-run)
- [x] Expansion-06 tension rule tested (+ prior sprint rules via existing E2E)
- [x] All 10 expansion chips present in EN/HE/ES (`CHIP_EVIDENCE_KEYS` + locale coverage)
- [ ] Correlation matrix across 25 signals reviewed — **operator deferred**
- [x] No regression on existing 15 scored signals (asserted; Exp-05 E2E green)
- [ ] Performance: full profile extraction P95 within budget — **operator deferred**
- [ ] A/B test plan ready (10% rollout) — **operator deferred**
- [ ] Backfill strategy documented for old profiles — **operator deferred**

**Rollout decision:** Scoring enablement **not** done in this sprint — future explicit promote story (10% → monitor → full).

---

## Definition of Done

- [x] All 5 stories completed (engineering)
- [x] 15 scored + 10 expansion signals validated in **shadow** end-to-end (engineering)
- [ ] Rollout / scoring promote gate — **deferred** (not “25 live scored” yet)
- [x] NO hardcoded patterns anywhere in new Expansion-06 signals

---

## Project Complete (engineering — shadow)

After this sprint: **10 expansion signals complete in shadow mode** (extract + friction + display + validation). Official scored count remains **15** until promote.

See `EXPANSION_SUMMARY.md` for post-launch monitoring after promote.
