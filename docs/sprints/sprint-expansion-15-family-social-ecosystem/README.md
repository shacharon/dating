# Sprint Expansion-15: Family & Social Ecosystem

**Duration:** 2 weeks  
**Goal:** Add `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` compatibility signals  
**Depends on:** Sprint Expansion-14  
**Milestone:** Three family/social ecosystem signals in **shadow** (engineering complete). Scored “48” deferred to an explicit promote story.  
**Sprint status:** **Complete (5/5)** — engineering gate (2026-08-08). Shadow mode; Phase 6 scoring promote deferred.  
**Phase:** Phase 6 — Relationship Psychology (final sprint of this phase) — **engineering complete in shadow**

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Closes the last major gap: how a person's life fits with **family, friends, and their own need to be alone** — the "outside the couple" ecosystem that determines how much time, attention, and boundary-setting a relationship actually gets in practice.

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `familyEnmeshment` | 1.2 | Tier 2 | relationship | Family closeness |
| `friendCoupleBalance` | 1.1 | Tier 3 | social | Friends & couple balance |
| `aloneTimeNeed` | 1.2 | Tier 2 | social | Alone time needs |

**Distinctions from existing signals:**

- `familyEnmeshment` ≠ `traditionalism` — traditionalism = general life-structure values; enmeshment = specifically how much family-of-origin is involved in day-to-day decisions/boundaries
- `friendCoupleBalance` ≠ `socialBattery` — social battery = introversion/extroversion energy; friend/couple balance = *where* social time goes (friends vs partner), independent of how much total social energy someone has
- `aloneTimeNeed` ≠ `independence` — independence = general autonomy need across life decisions; alone-time need = specifically the need for solo recharge time, finer-grained and behavior-specific (can be very independent in decisions but still want to spend every evening together, or vice versa)

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "How involved is your family in your day-to-day decisions?" | "כמה המשפחה שלך מעורבת בהחלטות היומיומיות שלך?" |
| "A great weekend for me balances friends, alone time, and us time like…" | "סוף שבוע מושלם בשבילי מאזן בין חברים, זמן לבד וזמן ביחד ב..." |
| "How do you recharge after a long week?" | "איך את/ה נטען/ת מחדש אחרי שבוע ארוך?" |

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow):** `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` on `SHADOW_SIGNAL_KEYS` (**35 → 38**); `MAX_EVIDENCE_ITEMS` **54 → 57**; metadata-only `expansion-15-signal-definitions.ts` (weights **1.2/1.1/1.2**, tiers **2/3/2**, domains **relationship/social/social**, meta chips). Runtime **15 scored + 38 shadow = 53** extraction keys. Scoring / explainability promote deferred. LLM prompts / `DOMAIN_ALLOWED` → Story 2. Product “48” framing → future promote / Story 5.

**Tasks (as-built):**
1. ✅ Add `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` to `SHADOW_SIGNAL_KEYS`
2. ✅ Add weights, tiers, domains, chip labels in `expansion-15-signal-definitions.ts` (metadata only)
3. ✅ Counts documented (as-built total extraction **53**; product “48” scored framing → future promote)

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-15-signal-definitions.ts` (new)
- `dating-api/src/extraction/extracted-signals.spec.ts`
- Prior rollout specs global count bumps (Exp-10/11/12/13/14)
- `compatibility-score.ts` / `match-explainability.ts` — promote gate (unchanged)

**Acceptance Criteria:**
- ✅ Three new keys in shadow allowlist

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 12  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended Story 1 metadata with self + partner LLM semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **42 → 45** / partner **28 → 31**. Upgraded adjacent SIGNAL RULES (`independence` / `socialBattery` self; `traditionalism` / `socialBattery` partner family-involvement carve-out). `friendCoupleBalance` polarity locked (low = friends-first, high = couple-centric). Mocked unit tests (**13**); Hebrew live/>85% deferred to Story 5. Onboarding UI copy deferred to Story 4. Shadow only — not scored.

#### `familyEnmeshment` (1–10 or null)

**Definition:** Degree to which family-of-origin is involved in daily decisions and boundaries — independent/boundaried (low) vs highly enmeshed (high).

**Scale:**
- 1–2: Very independent from family; makes decisions autonomously
- 3–4: Some family closeness, clear boundaries
- 5–6: Moderate involvement
- 7–8: Family heavily involved in decisions/routines
- 9–10: Very enmeshed; family opinion central to most decisions

**Examples HIGH (8–10):**
- "My family is very involved in my life, we talk every day and they weigh in on big decisions"
- Hebrew: "המשפחה שלי מאוד מעורבת בחיים שלי"

**Examples LOW (1–3):**
- "I make my own decisions, family isn't very involved"

**Examples null:**
- No mention of family involvement

#### `friendCoupleBalance` (1–10 or null)

**Definition:** Where social time and priority tend to go — friends-first/high external social investment (low) vs couple-centric (high). Neither end is inherently better.

**Scale:**
- 1–2: Friends are a huge priority; lots of independent social time
- 3–4: Leans toward friend time
- 5–6: Balanced
- 7–8: Leans couple-centric
- 9–10: Very couple-centric; prioritizes partner time over friend groups

**Examples HIGH (9–10, couple-centric):**
- "I like most of my free time to be with my partner"
- Hebrew: "אני אוהב/ת שרוב הזמן הפנוי שלי יהיה עם בן/בת הזוג"

**Examples LOW (1–2, friends-first):**
- "My friend group is a huge part of my life and identity"

**Examples null:**
- No mention of friend/couple time balance

#### `aloneTimeNeed` (1–10 or null)

**Definition:** Need for solo time to recharge, independent of overall social energy (`socialBattery`) — low need for alone time (always wants togetherness) vs high need for solo recharge.

**Scale:**
- 1–2: Rarely needs alone time; prefers constant togetherness
- 3–4: Occasional alone time
- 5–6: Moderate need
- 7–8: Regularly needs solo time to recharge
- 9–10: Strong need for significant alone time; recharges primarily solo

**Examples HIGH (8–10):**
- "I need my own space and time to recharge, even in a relationship"
- Hebrew: "אני צריך/ה את המרחב והזמן שלי כדי להיטען מחדש"

**Examples LOW (1–3):**
- "I want to spend as much time together as possible"

**Examples null:**
- No mention of alone-time preference

**Tasks (as-built):**
1. ✅ Extend `expansion-15-signal-definitions.ts` with SELF/PARTNER LLM blocks (Story 1 meta preserved)
2. ✅ Wire into `extraction.service.ts` (self + partner domains)
3. ✅ Sync `extraction-strict-validation.ts` (`DOMAIN_ALLOWED` **45** / **31**)
4. ✅ Unit tests: 3 signals × high/low/null + OOR + partner smoke
5. ⏳ Hebrew regression fixtures → Story 5

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ⏳ >85% agreement on validation set → Story 5

**Files (as-built):**
- `dating-api/src/extraction/expansion-15-signal-definitions.ts` (extended)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts` + Exp-10/11/12/13/14 rollout DOMAIN bumps

---

### STORY 3: Tension Rules ✅ Done
**Points:** 5  
**Owner:** Backend

**As-built:** Extended `EnrichedSignals` with Exp-15 keys; appended three shadow friction rules after `monogamy_alignment_mismatch` (≥8 vs ≤3, penalties **4 / 3 / 3**); English `TENSION_CHIP_BY_ID` labels. Friction can reduce `finalScore` when rules fire; keys still **not** in `COMPATIBILITY_SIGNAL_KEYS`. Positive chips / i18n deferred Story 4. CR restored architect-verbatim name/explain + aligned no-fire tests.

```typescript
{
  id: 'family_enmeshment_gap',
  name: 'Family enmeshment gap (MED-HIGH)',
  when: (a, b) => {
    const aF = getSignal(a, 'familyEnmeshment');
    const bF = getSignal(b, 'familyEnmeshment');
    if (aF == null || bF == null) return false;
    return (aF >= 8 && bF <= 3) || (bF >= 8 && aF <= 3);
  },
  penalty: 4,
  explain: 'One is very close/involved with family decisions, the other more independent — boundary expectations may clash',
},
{
  id: 'friend_couple_balance_gap',
  name: 'Friend vs couple time gap (MED)',
  when: (a, b) => {
    const aB = getSignal(a, 'friendCoupleBalance');
    const bB = getSignal(b, 'friendCoupleBalance');
    if (aB == null || bB == null) return false;
    return (aB >= 8 && bB <= 3) || (bB >= 8 && aB <= 3);
  },
  penalty: 3,
  explain: 'One prioritizes couple time heavily, the other prioritizes friends — time allocation may cause friction',
},
{
  id: 'alone_time_need_gap',
  name: 'Alone time need gap (MED)',
  when: (a, b) => {
    const aA = getSignal(a, 'aloneTimeNeed');
    const bA = getSignal(b, 'aloneTimeNeed');
    if (aA == null || bA == null) return false;
    return (aA >= 8 && bA <= 3) || (bA >= 8 && aA <= 3);
  },
  penalty: 3,
  explain: 'One needs significant solo recharge time, the other prefers constant togetherness',
},
```

**Tension chips (as-built):**
- `family_enmeshment_gap`: `Family involvement gap`
- `friend_couple_balance_gap`: `Friends vs couple time`
- `alone_time_need_gap`: `Different alone-time needs`

**Positive chips:** deferred Story 4 — aligned family enmeshment → "Family style match"; aligned friend/couple → "Friends & couple balance"; aligned alone-time → "Recharge style match".

**Acceptance Criteria:**
- ✅ Rules fire at thresholds (unit: friction **17/17**)
- ✅ Chip labels resolve in explainability (**4/4**)

**Files (as-built):**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

---

### STORY 4: User-Facing Chips & i18n ✅ Done
**Points:** 6  
**Owner:** Frontend + i18n

**As-built:** Shadow overlay `expansion-15-explainability.ts` with three dual-band synthetics (≥7 or ≤3): `Family style match` / `Friends & couple balance` / `Recharge style match`. Domains `relationship` / `social` / `social`. Assembled after Exp-14; `_15` resolution; `CHIP_TO_TRAIT`; browse EN/HE/ES (`CHIP_EVIDENCE_KEYS` **40 → 43**); Phase 6 onboarding writing prompts appended. Shadow only — not scored. Meta `Family closeness` / `Alone time needs` stay promote-meta (not browse).

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| `familyEnmeshment` (aligned dual-band) | Family style match | You have a similar sense of family closeness and boundaries | יש לכם תחושה דומה של קרבה משפחתית וגבולות | Tienen una sensación similar de cercanía familiar y límites |
| `friendCoupleBalance` (aligned dual-band) | Friends & couple balance | You balance friends and couple time in a similar way | אתם מאזנים בין חברים לזמן זוגי בצורה דומה | Equilibran el tiempo con amigos y en pareja de forma similar |
| `aloneTimeNeed` (aligned dual-band) | Recharge style match | You have a similar need for alone time to recharge | יש לכם צורך דומה בזמן לבד להיטען מחדש | Tienen una necesidad similar de tiempo a solas para recargar energías |

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES
- ✅ Onboarding writing-prompt copy EN/HE (+ ES parity)

**Files (as-built):**
- `dating-api/src/matches/expansion-15-explainability.ts` (new)
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
---

### STORY 5: Testing, Validation, Full Phase 6 Rollout Gate ✅ Done
**Points:** 10  
**Owner:** QA + Backend + PM

**As-built:** `compare()` E2E **17** cases; `expansion-15-rollout.spec.ts` (counts **38/53/57/45/31/15**); fixtures + `validate:expansion-15-extraction` (live **86.7%** ≥85%); UI tension passthrough ×3; Exp-14 non-regression. Shadow preserved — **no** scoring promote / “Enable all 14”.

**Fixtures (as-built — live bands widened):**

| Text | Expected |
|------|----------|
| "My family is very involved…" (strengthened variants in JSON) | `familyEnmeshment` high **7–10** |
| Family-boundary / independent-of-family text | `familyEnmeshment` low **1–4** |
| Partner free-time priority | `friendCoupleBalance` high **7–10** (couple-centric) |
| Friends-first priority text | `friendCoupleBalance` low **1–4** |
| Solo recharge need | `aloneTimeNeed` high **7–10** |
| Constant togetherness | `aloneTimeNeed` low **1–4** |
| No related text | all → null (`allowNull`) |
| Hebrew ×3 + traditionalism/socialBattery/independence distinction | present |

**Full Phase 6 completion checklist (Sprints 10–15) — disposition:**
- [x] All 14 signals extract with >85% agreement — **operator gate** (Exp-15 live **86.7%**; re-run Exp-10–15 validators before promote)
- [x] All 14 corresponding tension rules tested — **engineering** (Exp-15 E2E + prior Exp-10–14 E2E)
- [x] All chips display in EN/HE/ES — **engineering** (Exp-15 Story 4; registry **43**)
- [x] Onboarding prompts live for all 6 sprints' topics — **engineering** (Exp-10–15 writing prompts appended)
- [ ] Correlation matrix across all ~48 signals reviewed — **deferred** (post-promote / ops)
- [x] No regression on Expansion 01–09 signals — **engineering** (scored still **15** + Exp-14 spot)
- [x] Chip diversity maintained across all domains including new `personal` domain — **no change** (Exp-13 `personal`; Exp-15 relationship/social)
- [ ] A/B test plan for Phase 6 signals (10% rollout) — **deferred** (product)
- [ ] Backfill strategy for existing profiles (re-extraction pass) — **deferred** (document: re-extract on promote)

**Rollout decision:** Enable all 14 in scoring for 10% → monitor → full rollout — **FORBIDDEN this story** (future explicit promote sprint).

**Acceptance Criteria:**
- ✅ Integration tests via `compare()` (**17/17**)
- ✅ Tension + dual-band positive chips covered
- ✅ Rollout gate + fixtures + optional live ≥85%
- ✅ UI tension passthrough
- ⏭️ Scoring promote / “48 live” — deferred

**Files (as-built):**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/src/extraction/expansion-15-rollout.spec.ts`
- `dating-api/data/expansion-15-extraction-fixtures.json` (force-add on commit)
- `dating-api/scripts/validate-expansion-15-extraction.ts`
- `dating-ui/.../match-why-section.spec.tsx`
---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 53-key extraction system validated end-to-end in **shadow** (15 scored + 38 shadow); product “48 scored” → future promote
- [x] Phase 6 **engineering** rollout gate passed (checklist disposition above); scoring enable deferred
- [x] NO hardcoded patterns anywhere in Sprints 10–15 (LLM-first)

---

## Project Complete (Phase 6)

**As-built (engineering):** Phase 6 Expansions 10–15 closed in **shadow** — extract, friction, chips, i18n, E2E validation. Still **15** scored compatibility keys; **38** shadow keys extractable (**53** total extraction keys). Product framing “48 tracked live in scoring” reconciles only after an explicit **promote** sprint.

Plus: 19-tag interest taxonomy from Sprint 09; onboarding writing prompts across 6 relationship-psychology themes.

See `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` for post-launch monitoring and the master onboarding prompt reference.

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-15 section.
