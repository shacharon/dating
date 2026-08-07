# Sprint Expansion-15: Family & Social Ecosystem

**Duration:** 2 weeks  
**Goal:** Add `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` compatibility signals  
**Depends on:** Sprint Expansion-14  
**Milestone:** 48 tracked compatibility signals (shadow → promote gate)  
**Phase:** Phase 6 — Relationship Psychology (final sprint of this phase)

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

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` to `SHADOW_SIGNAL_KEYS`
2. Add weights, tiers, domains in `expansion-15-signal-definitions.ts`
3. Update signal count docs (48 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-15-signal-definitions.ts` (new)
- `dating-api/src/compatibility/compatibility-score.ts` (at promote gate)
- `dating-api/src/matches/match-explainability.ts` (at promote gate)
- `COMPATIBILITY_SIGNALS_SUMMARY.md`

**Acceptance Criteria:**
- ✅ Three new keys in shadow allowlist

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL)
**Points:** 12  
**Owner:** Backend + Prompt Engineer

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

**Tasks:**
1. Create `expansion-15-signal-definitions.ts`
2. Wire into `extraction.service.ts` (self + partner domains)
3. Sync `extraction-strict-validation.ts`
4. Unit tests: 3 signals × high/low/null
5. Hebrew regression fixtures

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set

**Files:**
- `dating-api/src/extraction/expansion-15-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 5  
**Owner:** Backend

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

**Tension chips:**
- `family_enmeshment_gap`: `Family involvement gap`
- `friend_couple_balance_gap`: `Friends vs couple time`
- `alone_time_need_gap`: `Different alone-time needs`

**Positive chips:** aligned family enmeshment → "Family style match"; aligned alone-time need → "Recharge style match".

**Acceptance Criteria:**
- ✅ Rules fire at thresholds
- ✅ Chip labels resolve in explainability

**Files:**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

---

### STORY 4: User-Facing Chips & i18n
**Points:** 6  
**Owner:** Frontend + i18n

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| `familyEnmeshment` (aligned) | Family style match | You have a similar sense of family closeness and boundaries | יש לכם תחושה דומה של קרבה משפחתית וגבולות | Tienen una sensación similar de cercanía familiar y límites |
| `friendCoupleBalance` (aligned) | Friends & couple balance | You balance friends and couple time in a similar way | אתם מאזנים בין חברים לזמן זוגי בצורה דומה | Equilibran el tiempo con amigos y en pareja de forma similar |
| `aloneTimeNeed` (aligned) | Recharge style match | You have a similar need for alone time to recharge | יש לכם צורך דומה בזמן לבד להיטען מחדש | Tienen una necesidad similar de tiempo a solas para recargar energías |

**Files:**
- `dating-api/src/matches/match-explainability.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES

---

### STORY 5: Testing, Validation, Full Phase 6 Rollout Gate
**Points:** 10  
**Owner:** QA + Backend + PM

**Fixtures:**

| Text | Expected |
|------|----------|
| "My family is very involved, we talk daily and they weigh in on decisions" | `familyEnmeshment` 8–9 |
| "I make my own decisions independently of family" | `familyEnmeshment` 2–3 |
| "I like most of my free time to be with my partner" | `friendCoupleBalance` 9–10 |
| "My friend group is a huge part of my identity" | `friendCoupleBalance` 1–2 |
| "I need my own space and time to recharge" | `aloneTimeNeed` 8–9 |
| "I want to spend as much time together as possible" | `aloneTimeNeed` 1–3 |
| No related text | all → null |

**Full Phase 6 completion checklist (Sprints 10–15):**
- [ ] All 14 signals extract with >85% agreement
- [ ] All 14 corresponding tension rules tested
- [ ] All chips display in EN/HE/ES
- [ ] Onboarding prompts live for all 6 sprints' topics
- [ ] Correlation matrix across all ~48 signals reviewed (flag any redundant pairs)
- [ ] No regression on Expansion 01–09 signals
- [ ] Chip diversity maintained across all domains including new `personal` domain
- [ ] A/B test plan for Phase 6 signals (10% rollout)
- [ ] Backfill strategy for existing profiles (re-extraction pass)

**Rollout decision:** Enable all 14 in scoring for 10% → monitor → full rollout.

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 48-signal system validated end-to-end
- [ ] Phase 6 rollout gate passed
- [ ] NO hardcoded patterns anywhere in Sprints 10–15

---

## Project Complete (Phase 6)

After this sprint: **48 tracked compatibility signals** live (15 original + 19 Phases 1–4 + 14 Phase 6), plus the 19-tag interest taxonomy from Sprint 09, plus onboarding prompts across 6 relationship-psychology themes.

See `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` for post-launch monitoring and the master onboarding prompt reference.

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-15 section.
