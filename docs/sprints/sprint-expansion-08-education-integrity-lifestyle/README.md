# Sprint Expansion-08: Education, Integrity, Chronotype & Physical Type

**Duration:** 2 weeks  
**Goal:** Add 4 compatibility signals exposed by Hebrew profile samples that Expansion 01–07 still miss  
**Depends on:** Sprint Expansion-07 (30-signal baseline)  
**Milestone:** 34 compatibility signals (shadow → promote gate)

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Second-wave Hebrew profile samples (Aug 2026) showed gaps **after** Expansion 01–07:

| Profile sample | Text theme | Still missed after Expansion 07 |
|----------------|------------|-----------------------------------|
| "ישרה כמו סרגל" | Honesty / integrity as a trait | `directness` ≠ integrity; no honesty signal |
| "תואר ראשון / אוניברסיטה" | Degree / education requirement | `intellectualCuriosity` ≠ formal education level |
| "לישון עד מאוחר בשבת" | Sleep late / night owl | No chronotype / daily rhythm signal |
| "שמנות ומלאות" / "ג'ינג'יות" | Body type / physical type preference | `physicalPriority` = importance of looks, not *which* type |

### Explicitly OUT OF SCOPE (ethical / product)

Do **not** add signals or filters for:
- Racial / ethnic group preference or exclusion
- Explicit sexual anatomy preferences
- Hair-color-only filters as a scored signal (too granular; body-type covers the useful case)

These may appear in free text; treat as **null** for scoring and do not surface in "why we matched".

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `educationLevel` | 1.3 | Tier 1 | values | Education alignment |
| `honestyIntegrity` | 1.4 | Tier 1 | values | Honesty & integrity |
| `chronotype` | 1.1 | Tier 3 | lifestyle | Sleep & energy rhythm |
| `physicalTypePreference` | 1.2 | Tier 3 | lifestyle | Physical type fit |

**Distinctions from existing signals:**

- `educationLevel` ≠ `intellectualCuriosity` — curiosity = love of learning/ideas; education = formal attainment / degree importance
- `educationLevel` ≠ `ambition` — ambition = drive/goals; education = schooling credential preference
- `honestyIntegrity` ≠ `directness` — directness = communication bluntness; honesty = truthfulness / integrity / no games
- `chronotype` ≠ `lifestylePace` — pace = fast/slow life tempo; chronotype = morning vs night energy/sleep
- `physicalTypePreference` ≠ `physicalPriority` — priority = how much looks matter; type = *which* body/build preferences (or flexibility)

---

## Stories

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `educationLevel`, `honestyIntegrity`, `chronotype`, `physicalTypePreference` to shadow allowlist (`extracted-signals.interface.ts`)
2. Add weights, tiers, domains in `expansion-08-signal-definitions.ts`
3. Update signal count docs (34 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-08-signal-definitions.ts` (new)
- `dating-api/src/compatibility/compatibility-score.ts` (at promote gate)
- `dating-api/src/matches/match-explainability.ts` (at promote gate)
- `COMPATIBILITY_SIGNALS_SUMMARY.md`

**Acceptance Criteria:**
- ✅ Four new keys in shadow allowlist
- ✅ Unit test: keys validate in strict extraction schema
- ⏭️ Promote to scoring registries at Story 5 gate

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL)
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**Principle:** Pure semantic extraction via LLM. NO regex, NO keywords, NO if/else.

#### `educationLevel` (1–10 or null)

**Definition:** Importance of formal education / degree attainment for self and partner (high school → university → advanced degree).

**Scale:**
- 1–2: Education/credentials do not matter
- 3–4: Some schooling preferred; not a filter
- 5–6: Appreciates education; open either way
- 7–8: Prefers university-educated partner
- 9–10: Requires degree / advanced degree as partner filter

**Examples HIGH (8–10):**
- "Only university-educated with a bachelor's"
- Hebrew: "רק עם תואר ראשון", "חכמים באוניברסיטה"

**Examples LOW (1–3):**
- "Degrees don't impress me"
- "Street smarts over diplomas"

**Examples null:**
- Mentions being "smart" without formal education stance

#### `honestyIntegrity` (1–10 or null)

**Definition:** Importance of honesty, integrity, trustworthiness, and "no games" as a core relationship value.

**Scale:**
- 1–2: Little emphasis on honesty/integrity in text
- 3–4: Mild preference for honesty
- 5–6: Values honesty but not a dominant theme
- 7–8: Strongly seeks honest / straightforward partner
- 9–10: Honesty/integrity is central ("straight as a ruler", "no liars")

**Examples HIGH (8–10):**
- "Looking for someone honest as a ruler"
- "No games, no lies"
- Hebrew: "ישרה כמו סרגל", "לא משחק משחקים"

**Examples LOW (1–3):**
- Rare — usually null if not mentioned; do not invent low scores from silence

**Examples null:**
- No mention of honesty, trust, games, or integrity

#### `chronotype` (1–10 or null)

**Definition:** Natural sleep/wake and energy rhythm — early bird ↔ night owl.

**Scale:**
- 1–2: Strong early bird / morning person
- 3–4: Prefers mornings / early nights
- 5–6: Flexible / normal schedule
- 7–8: Prefers late nights / sleeping in
- 9–10: Strong night owl; sleeps late regularly

**Examples HIGH (8–10):**
- "I love sleeping late on Saturday — you too?"
- Hebrew: "לישון עד מאוחר בשבת"

**Examples LOW (1–3):**
- "Up at 5am every day"
- "Early mornings are my thing"

**Examples null:**
- No sleep/schedule rhythm mentioned

#### `physicalTypePreference` (1–10 or null)

**Definition:** How specific and important **particular** physical/body-type preferences are (curvy, athletic, slim, taller, etc.) vs flexible about type.

**Scale:**
- 1–2: Explicitly flexible / "doesn't care about appearance"
- 3–4: Mild preferences, not filters
- 5–6: Some preference mentioned; still open
- 7–8: Clear type preference (e.g. athletic, curvy)
- 9–10: Strong exclusive preference ("only X type")

**LLM also extracts optional category hint** (for pair friction, not user-facing chip alone):
- Categories (examples): `athletic`, `curvy`, `slim`, `petite`, `average`, `flexible`, `unspecified`
- Store category as shadow metadata if pipeline supports it; otherwise score alone is enough for v1

**Examples HIGH (8–10):**
- "I love curvy/fuller women"
- Hebrew: "אוהב שמנות ומלאות"
- "Redheads rule" → high specificity if framed as exclusive preference; otherwise mid + null category

**Examples LOW (1–3):**
- "Doesn't care about appearance"
- Hebrew: "לא איכפת לו ממראה חיצוני"

**Examples null:**
- Mentions "beautiful" without type specificity (`physicalPriority` may still fire)

**Tasks:**
1. Create `expansion-08-signal-definitions.ts` with semantic definitions + EN/HE examples
2. Wire into `extraction.service.ts` (self + partner domains)
3. Sync `extraction-strict-validation.ts` allowlist
4. Unit tests: 4 signals × high/low/null
5. Hebrew regression fixtures from gap analysis table above

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ Racist / sexual-anatomy-only text → null on these four (do not invent scores)
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set (Story 5)

**Files:**
- `dating-api/src/extraction/expansion-08-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 4  
**Owner:** Backend

```typescript
{
  id: 'education_level_gap',
  name: 'Education level gap (MED)',
  when: (a, b) => {
    const aEd = getSignal(a, 'educationLevel');
    const bEd = getSignal(b, 'educationLevel');
    if (aEd == null || bEd == null) return false;
    return Math.abs(aEd - bEd) >= 5 && (aEd >= 8 || bEd >= 8);
  },
  penalty: 4,
  explain: 'One strongly requires formal education credentials, the other does not share that priority',
},
{
  id: 'honesty_integrity_gap',
  name: 'Honesty / integrity mismatch (MED-HIGH)',
  when: (a, b) => {
    const aH = getSignal(a, 'honestyIntegrity');
    const bH = getSignal(b, 'honestyIntegrity');
    if (aH == null || bH == null) return false;
    return (aH >= 8 && bH <= 3) || (bH >= 8 && aH <= 3);
  },
  penalty: 5,
  explain: 'Very different emphasis on honesty and integrity as relationship values',
},
{
  id: 'chronotype_clash',
  name: 'Morning vs night rhythm clash (MED)',
  when: (a, b) => {
    const aC = getSignal(a, 'chronotype');
    const bC = getSignal(b, 'chronotype');
    if (aC == null || bC == null) return false;
    return (aC >= 8 && bC <= 3) || (bC >= 8 && aC <= 3);
  },
  penalty: 3,
  explain: 'One is a strong night owl, the other a strong early bird — daily rhythm may clash',
},
{
  id: 'physical_type_specificity_clash',
  name: 'Physical type preference clash (MED)',
  when: (a, b) => {
    const aP = getSignal(a, 'physicalTypePreference');
    const bP = getSignal(b, 'physicalTypePreference');
    // v1: high specificity on one side + partner explicitly low/flexible is OK (not a clash)
    // Clash when both highly specific AND category metadata conflicts (if available)
    // Fallback v1 without categories: gap ≥ 6 when both ≥ 7 is NOT a clash by itself
    // Prefer category mismatch when shadow metadata exists:
    return hasConflictingPhysicalTypeCategories(a, b);
  },
  penalty: 4,
  explain: 'Strongly different physical type preferences',
},
```

**Tension chips:**
- `education_level_gap`: `Education expectations`
- `honesty_integrity_gap`: `Honesty values gap`
- `chronotype_clash`: `Morning vs night`
- `physical_type_specificity_clash`: `Physical type mismatch`

**Note:** If category metadata is not ready in v1, implement first three tension rules fully; ship `physical_type_specificity_clash` only when categories exist (or soft-skip).

**Acceptance Criteria:**
- ✅ Rules fire at thresholds (unit tests)
- ✅ Chip labels resolve in explainability
- ✅ No tension from race/ethnic/anatomy text alone

**Files:**
- `dating-api/src/engine/tension-rules.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/engine/compute-friction.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`

---

### STORY 4: User-Facing Chips & i18n
**Points:** 5  
**Owner:** Frontend + i18n

| Signal | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|--------|-----------|-------------|-------------|-------------|
| `educationLevel` | Education alignment | You're aligned on how much formal education matters | אתם מסונכרנים לגבי חשיבות ההשכלה הפורמלית | Están alineados sobre la importancia de la educación formal |
| `honestyIntegrity` | Honesty & integrity | You both value honesty and integrity in a relationship | שניכם מעריכים יושר ויושרה במערכת יחסים | Ambos valoran la honestidad y la integridad |
| `chronotype` | Sleep & energy rhythm | Your sleep and energy rhythms are well-matched | קצב השינה והאנרגיה שלכם מתאים | Sus ritmos de sueño y energía son compatibles |
| `physicalTypePreference` | Physical type fit | You're compatible on physical type preferences | אתם מתאימים בהעדפות לגבי טיפוס פיזי | Son compatibles en preferencias de tipo físico |

Add to:
- `POSITIVE_CHIP_BY_SIGNAL` / `CHIP_TO_TRAIT`
- `dating-ui` i18n `matches.list.browse.chipEvidence` (EN/HE/ES)
- `chip-evidence.ts` keys

**Acceptance Criteria:**
- ✅ 4 chips in EN/HE/ES
- ✅ Never show race/ethnic/anatomy preference language in evidence strings

**Files:**
- `dating-api/src/matches/match-explainability.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`

---

### STORY 5: Testing, Validation & Hebrew Regression
**Points:** 8  
**Owner:** QA + Backend + PM

**Regression fixtures:**

| Fixture | Expected (approx) |
|---------|-------------------|
| Honesty ("ישרה כמו סרגל") | `honestyIntegrity` 8–9 |
| Degree ("תואר ראשון") | `educationLevel` 8–9 |
| Sleep late Shabbat | `chronotype` 8–9 |
| Curvy preference | `physicalTypePreference` 8–9 |
| "Doesn't care about appearance" | `physicalTypePreference` 1–3 |
| Racist / anatomy-only text | all four → null (or no score from that alone) |
| Kosher + Shabbat (already Sprint 7) | still `religiousObservance` — no regression |

**Rollout gate:**
- [ ] 4 new signals extract with >85% agreement
- [ ] Hebrew fixtures pass
- [ ] Tension rules tested
- [ ] Chips EN/HE/ES
- [ ] No regression on Expansion 01–07 signals
- [ ] Promote shadow keys → `COMPATIBILITY_SIGNAL_KEYS` (34 total)

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 34-signal system validated (or 30 + 4 in shadow until gate)
- [ ] Ethical out-of-scope items documented and not scored
- [ ] NO hardcoded patterns anywhere

---

## Expected Impact on Sample Profiles

| Profile theme | Before Expansion 08 | After Expansion 08 |
|---------------|---------------------|--------------------|
| Honesty / "no games" | ~1 (directness only) | + `honestyIntegrity` |
| Degree requirement | ~1 (curiosity only) | + `educationLevel` |
| Sleep late | ~0 | + `chronotype` |
| Curvy / type preference | ~0–1 | + `physicalTypePreference` |
| Racist / anatomy-only | ~0 | still ~0 (by design) |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-08 section.
