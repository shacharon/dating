# Sprint Expansion-12: Feeling Heard

**Duration:** 2 weeks  
**Goal:** Add `listeningPresence` and `emotionalExpression` compatibility signals  
**Depends on:** Sprint Expansion-11  
**Milestone:** 40 tracked compatibility signals (shadow → promote gate)  
**Phase:** Phase 6 — Relationship Psychology

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

"Feeling heard" is one of the most common complaints in failing relationships, yet we have no signal for listening quality or how outwardly someone expresses feelings. `emotionalDepth` measures comfort *having* deep emotions; it says nothing about whether those feelings get *expressed* or *received*.

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `listeningPresence` | 1.3 | Tier 2 | communication | Quality listening |
| `emotionalExpression` | 1.2 | Tier 2 | emotional | Expressiveness |

**Distinctions from existing signals:**

- `listeningPresence` ≠ `empathyCompassion` (Expansion-01) — empathy = understanding/caring about feelings; listening presence = the *behavior* of full attention, not interrupting, being present
- `listeningPresence` ≠ `directness` — directness = how they speak; listening = how they receive
- `emotionalExpression` ≠ `emotionalDepth` — depth = capacity to feel/discuss deep emotion; expression = how outwardly/verbally that emotion is shown (someone can be deep but reserved, or shallow but very expressive)
- `emotionalExpression` ≠ `physicalAffectionStyle` (Expansion-02) — affection = physical touch; expression = verbal/emotional openness (words of affirmation, expressing feelings out loud)

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "I feel most loved when my partner…" | "אני מרגיש/ה הכי אהוב/ה כש..." |
| "A partner really listens to me when they…" | "בן/בת זוג באמת מקשיב/ה לי כש..." |

---

## Stories

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `listeningPresence`, `emotionalExpression` to `SHADOW_SIGNAL_KEYS`
2. Add weights, tiers, domains in `expansion-12-signal-definitions.ts`
3. Update signal count docs (40 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-12-signal-definitions.ts` (new)
- `dating-api/src/compatibility/compatibility-score.ts` (at promote gate)
- `dating-api/src/matches/match-explainability.ts` (at promote gate)
- `COMPATIBILITY_SIGNALS_SUMMARY.md`

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL)
**Points:** 10  
**Owner:** Backend + Prompt Engineer

#### `listeningPresence` (1–10 or null)

**Definition:** Quality of attention and presence when a partner speaks — fully engaged and present vs distracted, interrupting, or half-listening.

**Scale:**
- 1–2: Easily distracted; interrupts; doesn't retain what partner shares
- 3–4: Listens inconsistently
- 5–6: Generally attentive
- 7–8: Actively listens, asks follow-up questions, remembers details
- 9–10: Deeply present; partner consistently feels heard and understood

**Examples HIGH (8–10):**
- "I always put my phone away when my partner is talking to me"
- "I ask questions and really try to understand before responding"
- Hebrew: "אני תמיד שם את הטלפון בצד כשבן/בת הזוג מדבר/ת אליי"

**Examples LOW (1–3):**
- "I get distracted easily during conversations"
- "I often think about my response instead of listening"

**Examples null:**
- No mention of listening behavior

#### `emotionalExpression` (1–10 or null)

**Definition:** Comfort and tendency to outwardly express feelings, affection, and appreciation vs internalizing/reserved emotional style.

**Scale:**
- 1–2: Very reserved; rarely says feelings out loud even when felt deeply
- 3–4: Occasional expression, mostly internal
- 5–6: Moderate, situational expression
- 7–8: Regularly expresses feelings, affection, appreciation verbally
- 9–10: Very expressive; frequently and openly shares feelings and affection

**Examples HIGH (8–10):**
- "I tell my partner I love them multiple times a day"
- "I'm very open about my feelings, good or bad"
- Hebrew: "אני אומר/ת לבן/בת הזוג שאני אוהב/ת אותם כל הזמן"

**Examples LOW (1–3):**
- "I show love through actions, not words"
- "I keep my feelings to myself"

**Examples null:**
- No mention of expressing feelings

**Tasks:**
1. Create `expansion-12-signal-definitions.ts`
2. Wire into `extraction.service.ts` (self + partner domains)
3. Sync `extraction-strict-validation.ts`
4. Unit tests: 2 signals × high/low/null
5. Hebrew regression fixtures

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set

**Files:**
- `dating-api/src/extraction/expansion-12-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 4  
**Owner:** Backend

```typescript
{
  id: 'listening_presence_gap',
  name: 'Listening presence gap (MED-HIGH)',
  when: (a, b) => {
    const aL = getSignal(a, 'listeningPresence');
    const bL = getSignal(b, 'listeningPresence');
    if (aL == null || bL == null) return false;
    return (aL >= 8 && bL <= 3) || (bL >= 8 && aL <= 3);
  },
  penalty: 4,
  explain: 'One partner is highly attentive, the other may seem distracted — mismatch in feeling heard',
},
{
  id: 'emotional_expression_gap',
  name: 'Emotional expression gap (MED — "unmet expression" risk)',
  when: (a, b) => {
    const aE = getSignal(a, 'emotionalExpression');
    const bE = getSignal(b, 'emotionalExpression');
    if (aE == null || bE == null) return false;
    return (aE >= 8 && bE <= 3) || (bE >= 8 && aE <= 3);
  },
  penalty: 4,
  explain: 'One partner expresses feelings openly and often, the other is more reserved — may feel unreciprocated',
},
```

**Tension chips:**
- `listening_presence_gap`: `Different listening styles`
- `emotional_expression_gap`: `Different expression styles`

**Positive chip:** both high listening presence (≥7 each) → "Feels heard" chip.

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
**Points:** 5  
**Owner:** Frontend + i18n

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| Both high listening | Feels heard | You both show up fully present and listen deeply | שניכם נוכחים לגמרי ומקשיבים לעומק | Ambos están presentes y escuchan profundamente |
| `emotionalExpression` (aligned) | Expressiveness match | You express feelings and affection in similar ways | שניכם מבטאים רגשות וחיבה בדרכים דומות | Expresan sentimientos y afecto de forma similar |

**Files:**
- `dating-api/src/matches/match-explainability.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES

---

### STORY 5: Testing, Validation & Regression
**Points:** 8  
**Owner:** QA + Backend + PM

**Fixtures:**

| Text | Expected |
|------|----------|
| "I always put my phone away and really listen" | `listeningPresence` 8–9 |
| "I get distracted easily in conversations" | `listeningPresence` 2–3 |
| "I say I love you multiple times a day" | `emotionalExpression` 8–9 |
| "I show love through actions, not words" | `emotionalExpression` 3–4 |
| No related text | both → null |

**Rollout gate:**
- [ ] 2 signals >85% agreement
- [ ] Hebrew fixtures pass
- [ ] Tension + positive chips tested
- [ ] Chips EN/HE/ES
- [ ] No regression on 38 existing signals
- [ ] Promote to scoring (40 total)

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 40-signal system validated (or 38 + 2 in shadow until gate)
- [ ] Onboarding prompts live
- [ ] NO hardcoded patterns anywhere

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-12 section.
