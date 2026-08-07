# Sprint Expansion-12: Feeling Heard

**Duration:** 2 weeks  
**Goal:** Add `listeningPresence` and `emotionalExpression` compatibility signals  
**Depends on:** Sprint Expansion-11  
**Milestone:** Two feeling-heard signals in **shadow** (extract later). Scored “40” deferred to an explicit promote story.  
**Sprint status:** ✅ **Complete (5/5)** — engineering gate (2026-08-07)  
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

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow):** `listeningPresence`, `emotionalExpression` on `SHADOW_SIGNAL_KEYS` (**28 → 30**); `MAX_EVIDENCE_ITEMS` **47 → 49**; metadata-only at Story 1 then extended in Story 2. Runtime **15 scored + 30 shadow = 45** extraction keys. Scoring / explainability promote deferred (explicit future promote). LLM prompts / `DOMAIN_ALLOWED` → Story 2.

**Tasks (as-built):**
1. ✅ Add `listeningPresence`, `emotionalExpression` to `SHADOW_SIGNAL_KEYS`
2. ✅ Add weights, tiers, domains, chip labels in `expansion-12-signal-definitions.ts` (metadata only)
3. ✅ Counts documented (as-built total extraction **45**; product “40” scored framing → future promote)

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-12-signal-definitions.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`
- `compatibility-score.ts` / scored promote — **out of scope** (future promote story)

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist
- ✅ Unit tests: keys on shadow allowlist / meta; not scored (`DOMAIN_ALLOWED` sync → Story 2)

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended Story 1 metadata with self + partner LLM semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **35 → 37** / partner **21 → 23**. Upgraded adjacent SIGNAL RULES (`empathyCompassion` / `directness` / `emotionalDepth` / `physicalAffectionStyle`). Mocked unit tests; Hebrew live/>85% deferred to Story 5. Onboarding UI copy deferred to Story 4. Shadow only — not scored.

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

**Tasks (as-built):**
1. ✅ Extended `expansion-12-signal-definitions.ts` with semantic definitions + EN/HE examples
2. ✅ Wired into `extraction.service.ts` (self + partner); onboarding answers use same free-text path (UI copy → Story 4)
3. ✅ Synced `extraction-strict-validation.ts` allowlist (`DOMAIN_ALLOWED` 37/23)
4. ✅ Unit tests: high/low/null + OOR + partner smoke (mocked LLM)
5. ⏳ Hebrew regression fixtures → Story 5

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ⏳ >85% agreement on validation set (Story 5)

**Files (as-built):**
- `dating-api/src/extraction/expansion-12-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`

---

### STORY 3: Tension Rules ✅ Done
**Points:** 4  
**Owner:** Backend

**As-built:** Two shadow friction rules after `both_high_jealousy` — `listening_presence_gap` (4), `emotional_expression_gap` (4). `EnrichedSignals` + English `TENSION_CHIP_BY_ID`. Friction affects `finalScore` when rules fire; keys still not in `COMPATIBILITY_SIGNAL_KEYS`. Positive chips / i18n → Story 4.

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

**Tension chips (as-built):**
- `listening_presence_gap`: `Different listening styles`
- `emotional_expression_gap`: `Different expression styles`

**Positive chip:** both high listening presence (≥7 each) → "Feels heard" chip — **Story 4**.

**Acceptance Criteria:**
- ✅ Rules fire at thresholds (unit tests)
- ✅ Chip labels resolve in explainability

**Files (as-built):**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

---

### STORY 4: User-Facing Chips & i18n ✅ Done
**Points:** 5  
**Owner:** Frontend + i18n

**As-built:** Shadow positive chips via `expansion-12-explainability.ts` (not scored `POSITIVE_CHIP_BY_SIGNAL`). Both-high `listeningPresence` (≥7) → synthetic `Feels heard` (virtual key `listeningFeelsHeard`; both-low / gap do not emit); aligned `emotionalExpression` → `Expressiveness match` via pairScore. EN/HE/ES browse evidence; `CHIP_EVIDENCE_KEYS` **33 → 35**. Phase 6 onboarding writing prompts appended to `writingPrompts.aboutMe.questions` (EN/HE/ES) — no new form fields. Meta chips `Quality listening` / `Expressiveness` remain promote-meta only. Scoring promote deferred (Story 5).

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| Both high listening | Feels heard | You both show up fully present and listen deeply | שניכם נוכחים לגמרי ומקשיבים לעומק | Ambos están presentes y escuchan profundamente |
| `emotionalExpression` (aligned) | Expressiveness match | You express feelings and affection in similar ways | שניכם מבטאים רגשות וחיבה בדרכים דומות | Expresan sentimientos y afecto de forma similar |

**Onboarding prompts (as-built):** appended to About-me writing ideas — "I feel most loved when my partner…" / "A partner really listens to me when they…" (+ HE/ES).

**Files (as-built):**
- `dating-api/src/matches/expansion-12-explainability.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES
- ✅ Onboarding prompt copy in EN/HE/ES writing ideas

---

### STORY 5: Testing, Validation & Regression ✅ Done
**Points:** 8  
**Owner:** QA + Backend + PM

**As-built (engineering gate):** `compare()` E2E (**12** tests) for 2 tensions, positive chips (`Feels heard` / `Expressiveness match`), both-low listening exclusivity (no `Feels heard`), alignments exclusion, compatibility invariance, Exp-11/10 non-regression. Rollout gate (`expansion-12-rollout.spec.ts`). Live fixtures + `validate:expansion-12-extraction` (EN + Hebrew + null/distinction; **100%** agreement). UI tension passthrough. Shadow unchanged — **no promote** to `COMPATIBILITY_SIGNAL_KEYS`. Agent 4 skipped. Admin / browse QA / promote deferred to operator / future promote story.

**Fixtures (as-built in `expansion-12-extraction-fixtures.json`):**

| Text / case | Expected |
|------|----------|
| "I always put my phone away and really listen…" | `listeningPresence` 7–10 |
| "I get distracted easily in conversations…" | `listeningPresence` 1–4 |
| "I say I love you multiple times a day…" | `emotionalExpression` 7–10 |
| "I show love through actions, not words." | `emotionalExpression` 1–4 |
| No listening/expression text | both → null (`allowNull`) |
| Hebrew high listening / high+low expression | ≥3 HE rows |
| Empathy alone | `listeningPresence` prefer null (`allowNull`) |
| Depth alone | `emotionalExpression` prefer null (`allowNull`) |

**Tests (as-built):**
- ✅ Extraction unit tests — Story 2 (not re-duplicated)
- ✅ Friction unit tests — Story 3 (not re-duplicated)
- ✅ Integration: `compare()` Expansion-12 E2E (**12**)
- ✅ Rollout gate counts: shadow **30** / total **45** / evidence **49** / DOMAIN self **37** / partner **23** / scored **15** / chips **35**
- ✅ UI: chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- ✅ Live LLM ≥85% — **100%** (11/11 scored expectations)

**Files (as-built):**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/src/extraction/expansion-12-rollout.spec.ts`
- `dating-api/data/expansion-12-extraction-fixtures.json`
- `dating-api/scripts/validate-expansion-12-extraction.ts`
- `dating-api/package.json` (`validate:expansion-12-extraction`)
- `dating-ui/.../match-why-section.spec.tsx`

**Rollout gate (engineering):**
- [x] 2 new signals extract with >85% agreement on validation set (**100%**)
- [x] Hebrew fixtures present + live pass rate ≥85%
- [x] 2 tension rules + positive chips tested (`compare()` E2E + Story 3/4 units)
- [x] Chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- [x] No regression on Exp-11/10 E2E / scored set still **15**
- [ ] Promote shadow keys → scoring registries (product “40”) — **deferred** (explicit future promote story)

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 15 scored + 30 shadow validated (**45** extraction total); scored “40” deferred to promote
- [x] Onboarding prompts live in profile creation flow (About-me writing ideas; optional)
- [x] NO hardcoded patterns anywhere (LLM-first)
- [ ] Compatibility scoring promote / “40 live” — **deferred**

---

## Sprint deliverables (as-built)

| Layer | Delivered |
|-------|-----------|
| Schema | `listeningPresence`, `emotionalExpression` on `SHADOW_SIGNAL_KEYS` |
| Extraction | Self + partner LLM prompts (`expansion-12-signal-definitions.ts`) |
| Friction | 2 tension rules + English chip labels |
| Display | 2 positive chips + EN/HE/ES evidence + onboarding prompts |
| Validation | Match-engine E2E + rollout gate + fixtures + live LLM script + UI |
| **Not delivered** | Promote to `COMPATIBILITY_SIGNAL_KEYS` / scored “40” / Exp-08 sibling chips |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-12 section.
