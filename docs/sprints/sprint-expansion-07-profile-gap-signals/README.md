# Sprint Expansion-07: Profile Gap Signals

**Duration:** 2 weeks  
**Goal:** Add 5 compatibility signals exposed by real Hebrew profile samples — plus wire interest overlap into match explainability  
**Depends on:** Sprint Expansion-06 (25-signal baseline)  
**Milestone:** 5 profile-gap signals + interest overlap chips in **shadow** (extract / friction / display). Scored “30 live” deferred to an explicit promote story.  
**Sprint status:** ✅ **Complete (5/5)** — engineering gate (2026-08-07)

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Three real profile samples (Hebrew) were analyzed against current + planned signals (Expansion 01–06). Each profile captured only **4–8 signals** despite rich text. Gaps that **neither the original 15 signals nor Expansion 01–06** cover:

| Profile sample | Text theme | Still missed after Expansion 06 |
|----------------|------------|-----------------------------------|
| 52yo divorced | "no commitment, have fun, read, travel, hike" | Leisure activities stored as interest tags but **not scored or shown** in "why we matched" |
| 30yo religious | "keep kosher, religious" | `spirituality` too abstract — does not capture **practical observance** (dietary laws, Shabbat, community) |
| 35yo transactional | "hookups, no commitment, $1000/month support" | `relationshipClarity` covers commitment; `financialMindset` covers money philosophy — **not** casual sex intent or arrangement-style dating |

This sprint closes those gaps.

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `casualIntimacyIntent` | 1.4 | Tier 1 | intimacy | Intimacy expectations |
| `supportExchangeOrientation` | 1.5 | Tier 1 | relationship | Support & arrangement style |
| `supportProviderOrientation` | 1.3 | Tier 1 | relationship | Financial support (giving) |
| `supportRecipientOrientation` | 1.3 | Tier 1 | relationship | Financial support (receiving) |
| `religiousObservance` | 1.5 | Tier 1 | values | Religious practice |

**Support signals work as a set:**

| Signal | Question it answers |
|--------|---------------------|
| `supportExchangeOrientation` | Is money/part of an arrangement OK in this relationship at all? |
| `supportProviderOrientation` | Does this person want to **give** financial support? |
| `supportRecipientOrientation` | Does this person want to **receive** financial support? |

**Matching logic (pair-level):**

| Pair pattern | Result |
|--------------|--------|
| Both open to exchange + one high provider + one high recipient | **Positive chip** — "You're aligned on financial support in the relationship" |
| Both open to exchange + both high provider | **Tension** — "Both want to provide support" |
| Both open to exchange + both high recipient | **Tension** — "Both seek financial support" |
| One open to exchange (≥8), other rejects (≤3) | **Tension** — "Arrangement vs romance" (penalty 6) |
| Both reject exchange (≤3) | **Neutral** — aligned on non-transactional relationship |

**Distinctions from existing signals:**

- `casualIntimacyIntent` ≠ `physicalPriority` — physical priority = importance of attraction/chemistry; casual intimacy = comfort with sex/hookups outside committed relationship
- `casualIntimacyIntent` ≠ `relationshipClarity` — clarity = overall relationship structure intent; casual intimacy = specifically physical/intimate boundary
- `supportExchangeOrientation` ≠ `financialMindset` — financial mindset = save/spend/security philosophy; support exchange = explicit arrangement dynamics (allowance, sugar dating, "I support you / you support me")
- `supportProviderOrientation` / `supportRecipientOrientation` ≠ `supportExchangeOrientation` — exchange = openness to money-in-relationship; provider/recipient = **direction** (give vs receive). A profile can be high provider + low recipient ("I want to support my partner") or high recipient + low provider ("looking for someone who supports me")
- Generosity ("I pay for dates") scores **low–mid** on provider (3–5), not 9–10 — only explicit ongoing financial support scores high
- `religiousObservance` ≠ `spirituality` — spirituality = inner/transcendent meaning; observance = practical religious practice (kosher, Shabbat, prayer, community norms)
- `religiousObservance` ≠ `traditionalism` — traditionalism = life-structure values; observance = religious ritual/practice level

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow mode):** Five net-new keys on `SHADOW_SIGNAL_KEYS` + metadata-only `expansion-07-signal-definitions.ts` (weights/domains/chip labels). Scoring/tension/chips/prompts deferred. Counts: **20** shadow / **35** total / `MAX_EVIDENCE_ITEMS` **39**; scored still **15**. Self `DOMAIN_ALLOWED` still **22** (Story 2 expands).

**Tasks (README original — overridden by architect):**
1. ✅ Add five keys to shadow allowlist (`extracted-signals.interface.ts`)
2. ✅ Add weights/domains/chip labels in `expansion-07-signal-definitions.ts` (not wired into `COMPATIBILITY_WEIGHTS` / `SignalKey`)
3. ⏭️ Update signal count docs (30 total after promote) — deferred / not a Story 1 gate

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-07-signal-definitions.ts` (new)
- Specs under `dating-api/src/extraction/`
- Promote-gate files (`compatibility-score.ts`, `match-explainability.ts`, `COMPATIBILITY_SIGNALS_SUMMARY.md`) — **out of scope** Story 1

**Acceptance Criteria:**
- ✅ Five new keys in shadow allowlist
- ✅ Unit test: keys validate in strict extraction schema / shadow-mode specs
- ⏭️ Promote to scoring registries at Story 5 gate (optional — keep shadow until explicit promote) — **not promoted; deferred**

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended `expansion-07-signal-definitions.ts` with self + partner semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **27** / partner **13**; scale **1–10 or null**; PROTECTED vs adjacent keys; Hebrew-aware semantics (no keyword matchers). Live Hebrew fixtures + >85% deferred to Story 5. Shadow only — no scoring.

**Principle:** Pure semantic extraction via LLM. NO regex, NO keywords, NO if/else.

#### `casualIntimacyIntent` (1–10 or null)

**Definition:** Comfort with casual physical intimacy (hookups, sex without commitment) vs seeking physical intimacy only within committed/emotional relationship.

**Scale:**
- 1–2: Explicitly seeks committed-only intimacy; rejects casual/hookups
- 3–4: Strong preference for emotional connection before physical; casual is unlikely
- 5–6: Open either way depending on connection; no strong stance
- 7–8: Comfortable with casual physical intimacy; may prefer low-commitment
- 9–10: Explicitly seeks hookups/casual sex; rejects relationship commitment for intimacy

**Examples HIGH (8–10):**
- "Looking for fun, hookups, no strings attached"
- "Physical chemistry first — commitment optional"
- Hebrew: "זיונים", "בלי התחייבות", "רק כיף"

**Examples LOW (1–3):**
- "I only get physical when there's real emotional connection"
- "Looking for a partner, not a fling"
- "Intimacy is sacred — needs commitment first"

**Examples null:**
- Profile mentions dating goals but not physical/intimate boundaries
- Only age/location demographics

#### `supportExchangeOrientation` (1–10 or null)

**Definition:** Openness to transactional or support-based relationship dynamics (financial support, allowance, sugar dating, explicit exchange of support for companionship) vs purely romantic/emotional connection without arrangement.

**Scale:**
- 1–2: Explicitly rejects transactional/arrangement dynamics
- 3–4: Uncomfortable with money/support as part of dating
- 5–6: Neutral; no mention of support exchange
- 7–8: Open to mutual or one-sided support as part of relationship
- 9–10: Explicitly seeks arrangement (allowance, financial support, sugar dynamic)

**Examples HIGH (8–10):**
- "Happy to give you support and enjoy — $1000 a month"
- "Looking for a mutually beneficial arrangement"
- Hebrew: "תמיכה", "1000 דולר בחודש", "אשמח לתת לך תמיכה"

**Examples LOW (1–3):**
- "Money shouldn't be part of dating"
- "I want an equal partnership, not an arrangement"
- "Not interested in sugar dating"

**Examples null:**
- Generic "support each other emotionally" without financial/transactional context

#### `supportProviderOrientation` (1–10 or null)

**Definition:** Desire or expectation to **provide** financial support to a partner (breadwinner role, allowance, paying for lifestyle, "I take care of you").

**Scale:**
- 1–2: Does not want to provide financial support; expects equal split
- 3–4: Occasional generosity (dates, gifts) but not ongoing support
- 5–6: Open to contributing more in committed relationship; no explicit provider role
- 7–8: Wants to be primary provider / breadwinner; enjoys supporting partner
- 9–10: Explicitly offers allowance or ongoing financial support ("I'll give you $X/month", "I support you")

**Examples HIGH (8–10):**
- "Happy to give you support — $1000 a month"
- "I'm looking for someone I can take care of financially"
- Hebrew: "אשמח לתת לך תמיכה", "אני רוצה לדאוג לך כלכלית"

**Examples LOW (1–3):**
- "Equal partnership — we both contribute"
- "I don't want to be someone's wallet"

**Examples null:**
- No mention of providing or financial role

#### `supportRecipientOrientation` (1–10 or null)

**Definition:** Desire or expectation to **receive** financial support from a partner (seeking provider, allowance, lifestyle support).

**Scale:**
- 1–2: Does not want financial support from partner; values independence
- 3–4: Accepts occasional treats but not ongoing support
- 5–6: Neutral; would accept support in committed relationship if offered
- 7–8: Prefers or expects partner to contribute more financially
- 9–10: Explicitly seeks allowance or ongoing financial support ("looking for someone who supports me")

**Examples HIGH (8–10):**
- "Looking for someone who can support me"
- "I need financial stability from my partner"
- Hebrew: "מחפש/ת מי שיתמוך בי", "תמיכה כלכלית"

**Examples LOW (1–3):**
- "I support myself — don't need a provider"
- "I want an equal partner, not a sponsor"

**Examples null:**
- No mention of receiving or financial expectations

**Disambiguation (LLM-only):**
- Emotional "תמיכה" (support through hard times) → low on both provider/recipient unless financial context is clear
- "Mutual support" without money → null or mid on exchange, null on provider/recipient
- Profile C ("אשמח לתת לך תמיכה... 1000 דולר") → high exchange, high provider, low recipient

#### `religiousObservance` (1–10 or null)

**Definition:** Level of practical religious practice and observance (dietary laws, Sabbath, prayer, religious community, ritual adherence) vs cultural-only, secular, or non-practicing.

**Scale:**
- 1–2: Secular; no religious practice
- 3–4: Cultural identity only; minimal practice
- 5–6: Moderate practice; some rituals matter
- 7–8: Regular observance (kosher, Shabbat, prayer, community)
- 9–10: Strict observance; religious practice central to daily life and partner requirements

**Examples HIGH (8–10):**
- "I keep kosher, Shabbat observant, looking for same"
- "Religious — practice is non-negotiable in a partner"
- Hebrew: "שומר כשרות", "דתי", "שומר שבת", "מחפש/ת דתי/ה"

**Examples LOW (1–3):**
- "Not religious"
- "Spiritual but not observant"
- "Jewish by culture, not practice"

**Examples null:**
- No religious/spiritual mention
- Vague "values" without practice indicators

**Tasks (as-built):**
1. ✅ Extended `expansion-07-signal-definitions.ts` with semantic definitions (Story 1 created metadata; Story 2 added LLM blocks)
2. ✅ Wired into `extraction.service.ts` (self + partner domains)
3. ✅ Synced `extraction-strict-validation.ts` allowlist (self 27 / partner 13)
4. ✅ Unit tests with mocked LLM (high/low/null + Profile-C support set + partner smoke)
5. ✅ Hebrew profile regression fixtures — Story 5 (`expansion-07-extraction-fixtures.json`)
6. ✅ Provider/recipient pair fixtures — Story 5 (`compare()` E2E)

**Acceptance Criteria:**
- ✅ LLM-only extraction; null when unclear
- ✅ Hebrew samples covered in Story 5 live fixtures (gap A/B/C)
- ✅ NO hardcoded patterns anywhere
- ✅ >85% live LLM agreement on curated validation set — Story 5 (**95%**); large human study deferred

**Files (as-built):**
- `dating-api/src/extraction/expansion-07-signal-definitions.ts` (extended)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts` / `extracted-signals.spec.ts`

---

### STORY 3: Tension Rules ✅ Done
**Points:** 4  
**Owner:** Backend

**As-built (shadow mode):** Five friction rules on Exp-07 keys + `EnrichedSignals` fields + English `TENSION_CHIP_BY_ID` labels. Positive pair chips (`hasSupportAlignment` / Financial support alignment) deferred to Story 4. No `COMPATIBILITY_SIGNAL_KEYS` promote.

```typescript
{
  id: 'casual_intimacy_clash',
  name: 'Casual vs committed intimacy clash (HIGH)',
  when: (a, b) => {
    const aCas = getSignal(a, 'casualIntimacyIntent');
    const bCas = getSignal(b, 'casualIntimacyIntent');
    if (aCas == null || bCas == null) return false;
    return (aCas >= 8 && bCas <= 3) || (bCas >= 8 && aCas <= 3);
  },
  penalty: 6,
  explain: 'One seeks casual physical intimacy, the other needs commitment before intimacy',
},
{
  id: 'support_exchange_mismatch',
  name: 'Support exchange mismatch (HIGH)',
  when: (a, b) => {
    const aSup = getSignal(a, 'supportExchangeOrientation');
    const bSup = getSignal(b, 'supportExchangeOrientation');
    if (aSup == null || bSup == null) return false;
    return (aSup >= 8 && bSup <= 3) || (bSup >= 8 && aSup <= 3);
  },
  penalty: 6,
  explain: 'One seeks a support/arrangement dynamic, the other wants a non-transactional relationship',
},
{
  id: 'support_both_provider',
  name: 'Both want to provide support (MED)',
  when: (a, b) => {
    const aEx = getSignal(a, 'supportExchangeOrientation');
    const bEx = getSignal(b, 'supportExchangeOrientation');
    const aProv = getSignal(a, 'supportProviderOrientation');
    const bProv = getSignal(b, 'supportProviderOrientation');
    if (aEx == null || bEx == null || aProv == null || bProv == null) return false;
    if (aEx < 7 || bEx < 7) return false; // only when both open to exchange
    return aProv >= 7 && bProv >= 7;
  },
  penalty: 4,
  explain: 'You both want to be the one providing financial support — roles may clash',
},
{
  id: 'support_both_recipient',
  name: 'Both seek financial support (MED)',
  when: (a, b) => {
    const aEx = getSignal(a, 'supportExchangeOrientation');
    const bEx = getSignal(b, 'supportExchangeOrientation');
    const aRec = getSignal(a, 'supportRecipientOrientation');
    const bRec = getSignal(b, 'supportRecipientOrientation');
    if (aEx == null || bEx == null || aRec == null || bRec == null) return false;
    if (aEx < 7 || bEx < 7) return false;
    return aRec >= 7 && bRec >= 7;
  },
  penalty: 4,
  explain: 'You both seek financial support from a partner — expectations may not align',
},
{
  id: 'religious_observance_gap',
  name: 'Religious observance gap (MED-HIGH)',
  when: (a, b) => {
    const aRel = getSignal(a, 'religiousObservance');
    const bRel = getSignal(b, 'religiousObservance');
    if (aRel == null || bRel == null) return false;
    const gap = Math.abs(aRel - bRel);
    return gap >= 6 && (aRel >= 7 || bRel >= 7);
  },
  penalty: 5,
  explain: 'Very different levels of religious practice — may affect daily life compatibility',
},
```

**Tension chips:**
- `casual_intimacy_clash`: `Casual vs committed intimacy`
- `support_exchange_mismatch`: `Arrangement vs romance`
- `support_both_provider`: `Both want to provide`
- `support_both_recipient`: `Both seek support`
- `religious_observance_gap`: `Religious practice gap`

**Positive chip logic (pair-level, explainability):** — **Story 4** (architect override; not implemented in Story 3)

Emit **"Financial support alignment"** when ALL of:
- Both `supportExchangeOrientation` ≥ 7 (or both ≤ 3 for non-transactional alignment)
- For exchange-open pairs: one `supportProviderOrientation` ≥ 7 AND other `supportRecipientOrientation` ≥ 7
- OR both `supportExchangeOrientation` ≤ 3 (aligned on no money in relationship — optional softer chip)

```typescript
function hasSupportAlignment(a: EnrichedSignals, b: EnrichedSignals): boolean {
  const aEx = getSignal(a, 'supportExchangeOrientation');
  const bEx = getSignal(b, 'supportExchangeOrientation');
  if (aEx == null || bEx == null) return false;

  // Non-transactional alignment
  if (aEx <= 3 && bEx <= 3) return true;

  // Provider ↔ recipient alignment
  const aProv = getSignal(a, 'supportProviderOrientation');
  const bRec = getSignal(b, 'supportRecipientOrientation');
  const bProv = getSignal(b, 'supportProviderOrientation');
  const aRec = getSignal(a, 'supportRecipientOrientation');
  if (aEx >= 7 && bEx >= 7) {
    return (aProv != null && bRec != null && aProv >= 7 && bRec >= 7)
        || (bProv != null && aRec != null && bProv >= 7 && aRec >= 7);
  }
  return false;
}
```

**Acceptance Criteria:**
- ✅ Rules fire at thresholds (unit tests)
- ✅ Penalties apply via friction pipeline
- ✅ Chip labels resolve in explainability
- ⏭️ Positive pair support chips — Story 4

**Files (as-built):**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

---

### STORY 4: User-Facing Chips, i18n & Interest Overlap ✅ Done
**Points:** 6  
**Owner:** Frontend + i18n

**As-built (shadow mode):** `expansion-07-explainability.ts` overlay — 3 standalone + 2 pair synthetic chips; `interestOverlapTags` (max 2) + distinct UI chips; EN/HE/ES; `CHIP_EVIDENCE_KEYS` **29**. Not wired into official `POSITIVE_CHIP_BY_SIGNAL` / scoring. Admin match-quality polish deferred (operator). Profile fixture browse QA deferred (operator).

#### Positive chips (5 new signals + pair-level support alignment)

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|--------|-----------|-------------|-------------|-------------|
| `casualIntimacyIntent` | Intimacy expectations | You're aligned on what physical intimacy means in your connection | אתם מסונכרנים לגבי מה אינטימיות פיזית אומרת ביניכם | Están alineados sobre lo que significa la intimidad física |
| `supportExchangeOrientation` | Support & arrangement style | You share similar expectations about support and relationship structure | יש לכם ציפיות דומות לגבי תמיכה ומבנה היחסים | Comparten expectativas similares sobre apoyo y estructura |
| Pair: provider ↔ recipient | Financial support alignment | You're aligned on financial support in the relationship | אתם מסונכרנים לגבי תמיכה כלכלית ביחסים | Están alineados sobre el apoyo financiero en la relación |
| Pair: both reject exchange | Non-transactional match | You both want a relationship without financial arrangements | שניכם רוצים קשר ללא הסדרים כלכליים | Ambos quieren una relación sin acuerdos financieros |
| `religiousObservance` | Religious practice | Your level of religious practice is well-matched | רמת הדתיות והשמירה על המצוות שלכם מתאימה | Su nivel de práctica religiosa es compatible |

Note: `supportProviderOrientation` and `supportRecipientOrientation` are **directional inputs** — positive chips surface via pair-level alignment logic above, not as standalone per-person chips.

Add to (as-built):
- ✅ `CHIP_TO_TRAIT` + shadow `SHADOW_POSITIVE_CHIP_BY_SIGNAL` (not official `SignalKey` map)
- ✅ `dating-ui` i18n: `matches.list.browse.chipEvidence` (EN/HE/ES)
- ✅ `chip-evidence.ts` keys array (**29**)
- ✅ `interestOverlapTags` + `interestOverlap` i18n map
- ⏭️ Admin match-quality panel — deferred (operator / not Story 5 engineering gate)

#### Interest overlap chips (NEW — not a compatibility signal)

**Problem:** Profile 1 mentions reading, travel, hiking — stored as interest tags (`books`, `travel`, `hiking`) but invisible in "why we matched".

**Solution:** When ≥1 shared canonical interest tag between pair, show up to 2 **interest overlap chips** in match explainability (alongside signal chips).

**Examples:**
- EN: "You both love travel"
- EN: "You both enjoy reading"
- HE: "שניכם אוהבים לטייל"
- ES: "A ambos les gusta viajar"

**Canonical tags to support:** `books`, `travel`, `hiking`, `movies`, `cooking`, `music`, `gym`, `beach` (extend as needed)

**Tasks (as-built):**
1. ✅ Backend: `interestOverlapTags` on explainability (max 2 preferred tags)
2. ✅ Frontend: interest chips in `match-why-section.tsx` (distinct style)
3. ✅ i18n: `matches.list.browse.interestOverlap` per preferred tag × locale
4. ⏭️ Admin match-quality panel: show shared interests — deferred (operator)

**Acceptance Criteria:**
- ✅ 3 standalone + 2 pair-level support chips in EN/HE/ES
- ✅ Shared interest chips appear when overlap exists (`interestOverlapTags`)
- ✅ Interest overlap covered in Story 5 `compare()` E2E + UI tests
- ✅ Interest chips visually distinct from compatibility signal chips

**Files (as-built):**
- `dating-api/src/matches/expansion-07-explainability.ts`
- `dating-api/src/matches/match-explainability.ts` / `assemble-result.ts` / traits
- `dating-ui/src/app/dating/me-matches/match-why-section.tsx`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`

---

### STORY 5: Testing, Validation & Hebrew Profile Regression ✅ Done
**Points:** 8  
**Owner:** QA + Backend + PM

**As-built (engineering gate):** `compare()` E2E (**15** tests) for 5 tensions, standalone + pair chips, interest overlap, alignments exclusion, score invariance, Exp-06 non-regression. Live fixtures + `validate:expansion-07-extraction` (Hebrew gap A/B/C; multi-signal; **95%** agreement). UI tension passthrough. Shadow unchanged — **no promote** to `COMPATIBILITY_SIGNAL_KEYS`. Agent 4 skipped. Admin panel / golden-pairs / browse QA deferred to operator.

**Regression fixtures (from gap analysis — covered in Story 5 JSON):**

| Fixture | Expected signals (approx) |
|---------|---------------------------|
| Profile A (52yo, divorced, fun/travel/read) | `casualIntimacyIntent` mid–high (live); interests via separate overlap E2E |
| Profile B (30yo, kosher religious) | `religiousObservance` 8–9 |
| Profile C (35yo, hookups + $1000 support) | casual + exchange + provider high; recipient low |

**Provider/recipient pair fixtures:** Covered deterministically in `match-engine.spec.ts` Expansion-07 E2E (not live LLM).

**Tests (as-built):**
- ✅ Extraction unit tests — Story 2 (not re-duplicated)
- ✅ Friction unit tests — Story 3 (not re-duplicated)
- ✅ Integration: `compare()` Expansion-07 E2E
- ✅ UI: chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- ✅ Interest overlap chip rendering (Story 4 UI + Story 5 E2E)

**Rollout gate (engineering):**
- [x] 5 new signals extract with >85% agreement on validation set (**95%**)
- [x] Hebrew profile fixtures present + live pass rate ≥85%
- [x] Provider/recipient pair fixtures pass (`compare()` E2E)
- [x] 5 tension rules + pair-level positive chips tested
- [x] Interest overlap chips work
- [x] No regression on Expansion-06 E2E / scored set still **15**
- [ ] Promote shadow keys to `COMPATIBILITY_SIGNAL_KEYS` (30 total) — **deferred** (explicit future promote story)

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 15 scored + 20 shadow validated (**35** extraction total); scored “30” deferred to promote
- [x] Interest overlap visible in match UI
- [x] Hebrew profile gap analysis fixtures pass (≥85% live)
- [x] NO hardcoded patterns anywhere (LLM-first)
- [ ] Compatibility scoring promote / “30 live” — **deferred**

---

## Expected Impact on Sample Profiles

After this sprint (shadow extract/display; promote deferred):

| Profile | Before (15 signals) | After Expansion 06 (shadow set) | After Expansion 07 (shadow + interests) |
|---------|--------------------|--------------------------------|----------------------------------------|
| A (52yo divorced) | ~5 | ~8 | ~8 + interest chips + casualIntimacy |
| B (30yo religious) | ~4 | ~5 | ~6 (`religiousObservance`) |
| C (35yo transactional) | ~5 | ~7 | ~10 (casual + exchange + provider) |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-07 section.

---

## Extra track — Provider / Recipient Support

**Status:** ✅ **Complete (5/5 Extra stories)** — already shipped via main Stories 1–5; Extra pipeline was verify-only / docs (closed 2026-08-07).

Commands doc Extra block is for a historical **3-signal base** that still needed `supportProviderOrientation` + `supportRecipientOrientation`. This sprint implemented **all 5** keys in the main track.

| Extra story | Disposition |
|-------------|-------------|
| Extra 1 Schema | ✅ **Done** (2026-08-07) — verify-only; already in main Story 1 — `handoffs/EXTRA_STORY_01_schema_infrastructure/` |
| Extra 2 LLM prompts | ✅ **Done** (2026-08-07) — verify-only; already in main Story 2 — `handoffs/EXTRA_STORY_02_llm_extraction_prompts/` |
| Extra 3 Tension | ✅ **Done** (2026-08-07) — verify-only; already in main Story 3 — `handoffs/EXTRA_STORY_03_tension_rules/` |
| Extra 4 Chips & i18n | ✅ **Done** (2026-08-07) — verify-only; already in main Story 4 — `handoffs/EXTRA_STORY_04_chips_i18n/` |
| Extra 5 Testing | ✅ **Done** (2026-08-07) — verify-only; already in main Story 5 — `handoffs/EXTRA_STORY_05_testing_validation/` |

Do **not** re-append keys or duplicate extraction/tension/chips/tests for Extra. Scoring promote remains a future explicit story.
