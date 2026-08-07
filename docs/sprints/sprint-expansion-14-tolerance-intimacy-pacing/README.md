# Sprint Expansion-14: Tolerance & Intimacy Pacing

**Duration:** 2 weeks  
**Goal:** Add `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` compatibility signals  
**Depends on:** Sprint Expansion-13  
**Milestone:** 45 tracked compatibility signals (shadow → promote gate)  
**Phase:** Phase 6 — Relationship Psychology

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Three related-but-distinct gaps: how much day-to-day imperfection someone can tolerate in a partner, how fast they like to move toward closeness (distinct from `casualIntimacyIntent`, which is about casual-vs-committed, not speed), and what "exclusive" means to them structurally.

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `patienceTolerance` | 1.2 | Tier 2 | relationship | Patience with differences |
| `intimacyPacing` | 1.3 | Tier 1 | intimacy | Pace of closeness |
| `monogamyAlignment` | 1.6 | Tier 1 | relationship | Relationship structure |

`monogamyAlignment` gets the highest weight in this sprint — mismatch here is close to a dealbreaker (structural, not just a preference gap).

**Distinctions from existing signals:**

- `patienceTolerance` ≠ `conflictStyle` — conflict style = behavior during disagreement; patience = tolerance for ongoing quirks/flaws that never rise to "conflict"
- `patienceTolerance` ≠ `emotionalRegulation` — regulation = managing one's own emotional reactivity; patience = tolerance threshold for partner's imperfections specifically
- `intimacyPacing` ≠ `casualIntimacyIntent` (Expansion-07) — casual intent = casual/hookup vs committed-only *type* of intimacy; pacing = *speed* to closeness regardless of type (someone can want committed intimacy but move slowly or quickly toward it)
- `monogamyAlignment` ≠ `relationshipClarity` — clarity = structured/intentional vs free-flow *approach* to dating; monogamy = specifically exclusive vs open/poly *structure* expectation

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "Something about my partner that would test my patience, and how I'd handle it…" | "משהו בבן/בת הזוג שהיה מאתגר את הסבלנות שלי, ואיך הייתי מתמודד/ת..." |
| "How fast do you like to move emotionally/physically in a new relationship?" | "כמה מהר את/ה אוהב/ת להתקדם רגשית/פיזית בקשר חדש?" |
| "What does an exclusive relationship mean to you?" | "מה זוגיות בלעדית אומרת עבורך?" |

---

## Stories

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` to `SHADOW_SIGNAL_KEYS`
2. Add weights, tiers, domains in `expansion-14-signal-definitions.ts`
3. Update signal count docs (45 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-14-signal-definitions.ts` (new)
- `dating-api/src/compatibility/compatibility-score.ts` (at promote gate)
- `dating-api/src/matches/match-explainability.ts` (at promote gate)
- `COMPATIBILITY_SIGNALS_SUMMARY.md`

**Acceptance Criteria:**
- ✅ Three new keys in shadow allowlist

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL)
**Points:** 12  
**Owner:** Backend + Prompt Engineer

#### `patienceTolerance` (1–10 or null)

**Definition:** Tolerance for a partner's flaws, quirks, and differences in daily life vs low tolerance/critical stance.

**Scale:**
- 1–2: Highly critical; low tolerance for differences or imperfection
- 3–4: Some patience but easily frustrated
- 5–6: Moderate tolerance
- 7–8: Generally patient and accepting of differences
- 9–10: Very patient; easily accepts partner's flaws and quirks

**Examples HIGH (8–10):**
- "Nobody's perfect, I try to be understanding about the little things"
- Hebrew: "אף אחד לא מושלם, אני מנסה להיות מבין/ה לגבי הדברים הקטנים"

**Examples LOW (1–3):**
- "Little habits really bother me"
- "I have high standards and don't tolerate much"

**Examples null:**
- No mention of tolerance or reaction to partner's flaws

#### `intimacyPacing` (1–10 or null)

**Definition:** Preferred speed toward emotional and/or physical closeness in a new relationship — slow/cautious vs fast.

**Scale:**
- 1–2: Very slow; takes a long time to open up or get physically close
- 3–4: Cautious pace
- 5–6: Moderate pace
- 7–8: Moves fairly quickly toward closeness
- 9–10: Very fast; dives into closeness quickly

**Examples HIGH (8–10):**
- "When I feel a connection I move fast"
- "I fall hard and quick"

**Examples LOW (1–3):**
- "I take things slow, need time before I open up"
- "It takes a while for me to feel close to someone"

**Examples null:**
- No mention of pacing preference

#### `monogamyAlignment` (1–10 or null)

**Definition:** Expectation of strict exclusivity (1) vs openness to non-monogamous/poly structures (10). Midpoint = open to discussing/undefined.

**Scale:**
- 1–2: Strictly monogamous; exclusivity is non-negotiable
- 3–4: Monogamous-leaning, minimal flexibility
- 5–6: Open to discussion / hasn't decided
- 7–8: Leans open/non-monogamous
- 9–10: Explicitly seeks open/poly relationship structure

**Examples LOW (1–3, strict monogamy):**
- "Looking for a committed, exclusive relationship only"
- Hebrew: "מחפש/ת קשר מחויב ובלעדי בלבד"

**Examples HIGH (8–10, open/poly):**
- "I'm ethically non-monogamous / poly"
- "Open relationship preferred"

**Examples null:**
- No mention of exclusivity/structure

**Tasks:**
1. Create `expansion-14-signal-definitions.ts`
2. Wire into `extraction.service.ts` (self + partner domains)
3. Sync `extraction-strict-validation.ts`
4. Unit tests: 3 signals × high/low/null
5. Hebrew regression fixtures

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set

**Files:**
- `dating-api/src/extraction/expansion-14-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 5  
**Owner:** Backend

```typescript
{
  id: 'patience_tolerance_gap',
  name: 'Patience/tolerance gap (MED)',
  when: (a, b) => {
    const aP = getSignal(a, 'patienceTolerance');
    const bP = getSignal(b, 'patienceTolerance');
    if (aP == null || bP == null) return false;
    return (aP >= 8 && bP <= 3) || (bP >= 8 && aP <= 3);
  },
  penalty: 3,
  explain: 'One is highly tolerant of quirks and flaws, the other more critical — daily friction likely',
},
{
  id: 'intimacy_pacing_clash',
  name: 'Intimacy pacing clash (MED-HIGH)',
  when: (a, b) => {
    const aI = getSignal(a, 'intimacyPacing');
    const bI = getSignal(b, 'intimacyPacing');
    if (aI == null || bI == null) return false;
    return (aI >= 8 && bI <= 3) || (bI >= 8 && aI <= 3);
  },
  penalty: 4,
  explain: 'One moves quickly toward closeness, the other prefers to take things slow',
},
{
  id: 'monogamy_alignment_mismatch',
  name: 'Monogamy alignment mismatch (HIGH — structural dealbreaker territory)',
  when: (a, b) => {
    const aM = getSignal(a, 'monogamyAlignment');
    const bM = getSignal(b, 'monogamyAlignment');
    if (aM == null || bM == null) return false;
    return (aM <= 2 && bM >= 8) || (bM <= 2 && aM >= 8);
  },
  penalty: 8,
  explain: 'One expects strict exclusivity, the other seeks an open/non-monogamous structure',
},
```

**Tension chips:**
- `patience_tolerance_gap`: `Different tolerance levels`
- `intimacy_pacing_clash`: `Different pace to closeness`
- `monogamy_alignment_mismatch`: `Relationship structure mismatch`

**Positive chip:** aligned monogamy expectation (both ≤2 or both ≥7) → "Aligned on relationship structure" chip.

**Note:** Consider whether extreme `monogamy_alignment_mismatch` should also feed a Holy-Grail-style hard filter in a later sprint — flag for product discussion, not built here.

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
| `patienceTolerance` (aligned) | Patience match | You're both patient and accepting of each other's quirks | שניכם סבלניים ומקבלים את הייחודיות של השני | Ambos son pacientes y aceptan las diferencias del otro |
| `intimacyPacing` (aligned) | Pace of closeness | You move toward closeness at a similar pace | אתם מתקדמים לקרבה בקצב דומה | Avanzan hacia la cercanía a un ritmo similar |
| Monogamy aligned | Aligned on relationship structure | You're aligned on what exclusivity means to you | אתם מסונכרנים לגבי המשמעות של בלעדיות עבורכם | Están alineados sobre lo que significa la exclusividad |

**Files:**
- `dating-api/src/matches/match-explainability.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES

---

### STORY 5: Testing, Validation & Regression
**Points:** 9  
**Owner:** QA + Backend + PM

**Fixtures:**

| Text | Expected |
|------|----------|
| "I try to be understanding about the little things" | `patienceTolerance` 8–9 |
| "Little habits really bother me" | `patienceTolerance` 2–3 |
| "I fall hard and quick" | `intimacyPacing` 8–9 |
| "I take things slow, need time" | `intimacyPacing` 2–3 |
| "Looking for committed, exclusive relationship only" | `monogamyAlignment` 1–2 |
| "I'm ethically non-monogamous" | `monogamyAlignment` 8–9 |
| No related text | all → null |

**Rollout gate:**
- [ ] 3 signals >85% agreement
- [ ] Hebrew fixtures pass
- [ ] Tension + positive chips tested (esp. monogamy dealbreaker case)
- [ ] Chips EN/HE/ES
- [ ] No regression on 42 existing signals
- [ ] Promote to scoring (45 total)

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 45-signal system validated (or 42 + 3 in shadow until gate)
- [ ] Onboarding prompts live
- [ ] NO hardcoded patterns anywhere

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-14 section.
