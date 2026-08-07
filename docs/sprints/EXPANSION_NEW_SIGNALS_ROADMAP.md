# New Compatibility Signals Expansion Roadmap

## Overview
Add **33 new compatibility signals** (10 in Phase 1–2 + 5 profile-gap in Phase 3 + 4 lifestyle/values in Phase 4 + 14 relationship-psychology in Phase 6) to match engine, plus a 19-tag interest taxonomy (Phase 5).

**CRITICAL PRINCIPLE: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

All signal extraction uses LLM with clear semantic definitions, not regex/keyword matching.

---

## Phase 1: Emotional Intelligence Signals (5 signals)

### Sprint 1: Empathy & Vulnerability Signals
**Goal:** Add `empathyCompassion` and `vulnerabilityOpenness` signals

**Story 1:** Schema & Core Infrastructure
- Add new signal keys to `SignalKey` type
- Update `COMPATIBILITY_SIGNAL_KEYS` array
- Add weights to `COMPATIBILITY_WEIGHTS`
- Add to tier assignments (Tier 2 personality)
- Add signal domains for chip diversity

**Story 2:** LLM Extraction Prompts
- Update evaluation LLM prompt with semantic definitions:
  - `empathyCompassion` (0-10): Understanding others' feelings, caring about partner's emotions, emotional attunement
  - `vulnerabilityOpenness` (0-10): Comfort being authentic, sharing fears/struggles, emotional walls vs openness
- Add extraction examples (high/mid/low for each)
- **NO hardcoded patterns** - LLM infers from context

**Story 3:** Tension Rules
- Add `empathy_gap` tension rule (penalty: 4)
- Add `vulnerability_mismatch` tension rule (penalty: 5)
- Update `TENSION_CHIP_BY_ID` with new labels

**Story 4:** User-Facing Chips & Evidence
- Add positive chips: "Understanding & care", "Authentic openness"
- Add chip evidence in EN/HE/ES (i18n)
- Add to `CHIP_TO_TRAIT` mapping
- Update UI chip display

**Story 5:** Testing & Validation
- Unit tests for extraction
- Match engine integration tests
- UI rendering tests (all 3 locales)

---

### Sprint 2: Emotional Regulation & Physical Affection
**Goal:** Add `emotionalRegulation` and `physicalAffectionStyle` signals

**Story 1:** Schema Updates
- Add signal keys, weights, tiers, domains

**Story 2:** LLM Extraction Prompts
- `emotionalRegulation` (0-10): Managing emotions under stress, non-reactive, emotional stability vs volatility
- `physicalAffectionStyle` (0-10): Need for physical touch/affection in relationship (low/moderate/high/very high)
- LLM semantic extraction only

**Story 3:** Tension Rules
- Add `emotional_volatility_gap` (penalty: 5)
- Add `affection_needs_gap` (penalty: 4)

**Story 4:** Chips & i18n
- Positive chips: "Emotional balance", "Affection rhythm match"
- Evidence strings in 3 languages

**Story 5:** Testing & Integration

---

### Sprint 3: Humor & Playfulness
**Goal:** Add `humorPlayfulness` signal

**Story 1:** Schema & LLM Extraction
- Add signal infrastructure
- `humorPlayfulness` (0-10): Importance of playfulness, banter, fun, lightness in relationship
- LLM semantic extraction

**Story 2:** Tension & Display
- Add `humor_mismatch` tension (penalty: 3)
- Chip: "Shared playfulness"
- Evidence in 3 languages

**Story 3:** Testing

---

## Phase 2: Activity-Style Signals (5 signals)

### Sprint 4: Intellectual & Creative Expression
**Goal:** Add `intellectualCuriosity` and `creativeExpression` signals

**Story 1:** Schema Infrastructure
- Add signal keys, weights, tiers, domains

**Story 2:** LLM Extraction Prompts
- `intellectualCuriosity` (0-10): Need for mental stimulation, ideas, learning, deep conversations
- `creativeExpression` (0-10): Need for creative outlets, making things, artistic expression
- LLM semantic definitions only

**Story 3:** Tension Rules
- Add `intellectual_gap` (penalty: 4)
- Add `creative_mismatch` (penalty: 2)

**Story 4:** Chips & i18n
- Positive chips: "Mental stimulation", "Creative expression"
- Evidence strings EN/HE/ES

**Story 5:** Testing & Validation

---

### Sprint 5: Physical Activity & Domestic Comfort
**Goal:** Add `physicalActivityLevel` and `domesticComfort` signals

**Story 1:** Schema Updates

**Story 2:** LLM Extraction Prompts
- `physicalActivityLevel` (0-10): Physical activity behavior/energy — very active/athletic vs sedentary
- `domesticComfort` (0-10): Preference for home/cozy vs always out/restless at home
- LLM-only extraction

**Story 3:** Tension Rules
- Add `activity_level_gap` (penalty: 3)
- Add `domestic_out_mismatch` (penalty: 3)

**Story 4:** Chips & i18n
- Positive chips: "Activity level match", "Home/out balance"
- Evidence strings

**Story 5:** Testing

---

### Sprint 6: Adventure & Novelty
**Goal:** Add `adventureNovelty` signal

**Story 1:** Schema & LLM Extraction
- `adventureNovelty` (0-10): Novelty-seeking vs routine preference — new experiences vs familiar comfort
- LLM semantic extraction

**Story 2:** Tension & Display
- Add `novelty_routine_clash` (penalty: 4)
- Chip: "Adventure & novelty"
- Evidence in 3 languages

**Story 3:** Testing

---

## Phase 3: Profile Gap Signals (5 signals)

### Sprint 7: Intimacy, Arrangement & Religious Observance
**Goal:** Close gaps found in real Hebrew profile samples (Aug 2026 gap analysis)

**Story 1:** Schema & Infrastructure
- Add `casualIntimacyIntent`, `supportExchangeOrientation`, `supportProviderOrientation`, `supportRecipientOrientation`, `religiousObservance`
- Update signal count to 30 total

**Story 2:** LLM Extraction Prompts
- `casualIntimacyIntent` (1-10): Hookups/casual sex vs intimacy only in committed relationship
- `supportExchangeOrientation` (1-10): Openness to money/arrangement in relationship vs purely romantic
- `supportProviderOrientation` (1-10): Wants to **give** financial support (breadwinner, allowance)
- `supportRecipientOrientation` (1-10): Wants to **receive** financial support
- `religiousObservance` (1-10): Practical practice (kosher, Shabbat) vs cultural/secular
- Hebrew profile + provider/recipient pair regression fixtures

**Story 3:** Tension Rules
- `casual_intimacy_clash` (penalty: 6)
- `support_exchange_mismatch` (penalty: 6) — arrangement vs romance
- `support_both_provider` (penalty: 4) — both want to give
- `support_both_recipient` (penalty: 4) — both seek support
- `religious_observance_gap` (penalty: 5)
- Pair-level positive chip: provider ↔ recipient alignment

**Story 4:** Chips, i18n & Interest Overlap
- 5 new signals + pair-level support alignment chips in EN/HE/ES
- Wire shared interest tags (books, travel, hiking, movies) into match explainability UI

**Story 5:** Testing & Validation
- Hebrew sample profile regression tests
- Provider/recipient pair fixtures
- Promote to 30-signal scoring

**Doc:** `sprint-expansion-07-profile-gap-signals/README.md`

---

## Phase 4: Education, Integrity & Lifestyle Fit (4 signals)

### Sprint 8: Education, Integrity, Chronotype & Physical Type
**Goal:** Close second-wave Hebrew profile gaps (honesty, degree, sleep rhythm, body-type preference)

**Story 1:** Schema & Infrastructure
- Add `educationLevel`, `honestyIntegrity`, `chronotype`, `physicalTypePreference`
- Update signal count to 34 total

**Story 2:** LLM Extraction Prompts
- `educationLevel` (1-10): Formal education / degree importance
- `honestyIntegrity` (1-10): Honesty, integrity, no-games values
- `chronotype` (1-10): Morning person ↔ night owl
- `physicalTypePreference` (1-10): Specificity of body/type preferences
- Ethical out-of-scope: race/ethnicity, sexual anatomy (never score)

**Story 3:** Tension Rules
- `education_level_gap` (penalty: 4)
- `honesty_integrity_gap` (penalty: 5)
- `chronotype_clash` (penalty: 3)
- `physical_type_specificity_clash` (penalty: 4) when categories available

**Story 4:** Chips & i18n
- 4 new signal chips in EN/HE/ES

**Story 5:** Testing & Validation
- Hebrew regression fixtures
- Promote to 34-signal scoring

**Doc:** `sprint-expansion-08-education-integrity-lifestyle/README.md`

---

## Phase 5: Interest Taxonomy (not compatibility signals)

### Sprint 9: Interest Taxonomy Gaps
**Goal:** Cover missing hobbies — `biking`, `camping`, `nature`

**Story 1:** Add tags to `INTEREST_CANONICAL_TAGS` (16 → 19)

**Story 2:** LLM interest extraction guidance + Hebrew fixtures

**Story 3:** Interest overlap chips + i18n EN/HE/ES

**Story 4:** Testing & validation

**Doc:** `sprint-expansion-09-interest-taxonomy/README.md`

**Note:** These are interest tags only — do **not** add to `SignalKey`.

---

## Phase 6: Relationship Psychology (14 signals)

**Full detail:** `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` (master onboarding prompt reference + cross-cutting rules)

### Sprint 10: Conflict Recovery
- Add `repairSkills`, `forgivenessStyle`
- Onboarding prompts: "When we disagree, I usually…", "After a fight, I tend to…"
- Tensions: `repair_skills_gap` (5), `both_low_repair` (6), `forgiveness_style_gap` (4)
- **Deliverable:** 36 signals

### Sprint 11: Stress & Security
- Add `stressResponse`, `jealousySecurity`
- Onboarding prompts: stress-support needs, jealousy/security
- Tensions: `stress_response_clash` (5), `jealousy_security_gap` (5), `both_high_jealousy` (3)
- **Deliverable:** 38 signals

### Sprint 12: Feeling Heard
- Add `listeningPresence`, `emotionalExpression`
- Onboarding prompts: feeling loved, feeling listened to
- Tensions: `listening_presence_gap` (4), `emotional_expression_gap` (4)
- **Deliverable:** 40 signals

### Sprint 13: Growth & Self-Awareness
- Add `growthMindset`, `selfAwareness` (new `personal` domain)
- Onboarding prompts: changed your mind, working on yourself
- Tensions: `growth_mindset_gap` (4), `both_low_self_awareness` (3)
- **Deliverable:** 42 signals

### Sprint 14: Tolerance & Intimacy Pacing
- Add `patienceTolerance`, `intimacyPacing`, `monogamyAlignment`
- Onboarding prompts: patience test, pacing, exclusivity meaning
- Tensions: `patience_tolerance_gap` (3), `intimacy_pacing_clash` (4), `monogamy_alignment_mismatch` (8 — near dealbreaker)
- **Deliverable:** 45 signals

### Sprint 15: Family & Social Ecosystem
- Add `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed`
- Onboarding prompts: family involvement, weekend balance, recharge style
- Tensions: `family_enmeshment_gap` (4), `friend_couple_balance_gap` (3), `alone_time_need_gap` (3)
- **Deliverable:** 48 signals — Phase 6 complete

**Docs:**
- `sprint-expansion-10-conflict-recovery/README.md`
- `sprint-expansion-11-stress-security/README.md`
- `sprint-expansion-12-feeling-heard/README.md`
- `sprint-expansion-13-growth-self-awareness/README.md`
- `sprint-expansion-14-tolerance-intimacy-pacing/README.md`
- `sprint-expansion-15-family-social-ecosystem/README.md`

---

## Cross-Cutting Stories (All Sprints)

### LLM Extraction Pattern (Every Sprint)

**Location:** `dating-api/src/evaluate/evaluate-llm-prompts.ts`

**Approach:**
```typescript
// ❌ NO HARDCODING like this:
if (text.includes('empathy')) return 8;

// ✅ YES - LLM semantic definition:
const prompt = `
Analyze this profile text and rate empathyCompassion (0-10):

Definition: Understanding and caring about partner's feelings, emotional attunement, 
noticing when others are upset, compassionate responses.

- 0-2: Little awareness or care for others' emotions
- 3-4: Basic empathy, sometimes misses emotional cues
- 5-6: Moderate empathy, generally attuned
- 7-8: High empathy, deeply cares about partner's feelings
- 9-10: Exceptional empathy, highly emotionally attuned

Text: "${text}"

Rate 0-10 based on semantic meaning, context, and implications. 
Do not rely on keywords alone.
`;
```

**NO pattern matching** — pure LLM inference from semantic definitions.

---

### Testing Pattern (Every Sprint)

**Unit Tests:**
- LLM extraction returns 0-10 for new signals
- Scoring weights apply correctly
- Tension rules fire when thresholds met

**Integration Tests:**
- End-to-end match with new signals
- Chip display in UI (all locales)
- Match score changes appropriately

**Validation:**
- Audit sample matches
- Check chip diversity still works
- Verify no regression on existing signals

---

## Technical Debt Prevention

### Rules to Follow:

1. **LLM-First Extraction**
   - ❌ NO: regex patterns, keyword matching, hardcoded if/else
   - ✅ YES: Semantic definitions → LLM → 0-10 score

2. **No Magic Numbers**
   - All weights in `COMPATIBILITY_WEIGHTS`
   - All penalties in tension rule definitions
   - All thresholds configurable

3. **i18n from Day 1**
   - Add EN/HE/ES evidence strings together
   - Test all 3 locales in same PR

4. **Chip Diversity**
   - Add new signals to appropriate domains
   - Test chip picker doesn't over-select one domain

5. **Backward Compatibility**
   - Existing signals keep working
   - Null/missing new signals handled gracefully
   - Gradual rollout (analyze new profiles, keep old scores)

---

## Migration Strategy

### Phase 1: Shadow Mode (Sprints 1-3)
- Extract new signals for new profiles only
- Store in DB but **don't use in scoring yet**
- Validate extraction quality

### Phase 2: Partial Rollout (Sprints 4-6)
- Use new signals in scoring for 10% of matches
- A/B test match quality metrics
- Monitor for regressions

### Phase 3: Full Rollout
- All matches use 48 signals (15 old + 33 new)
- Backfill old profiles with new signal extraction
- Monitor match satisfaction metrics
- Interest overlap chips live in match UI

---

## Success Metrics

### Extraction Quality
- LLM extraction agreement with human labels: >85%
- Non-null extraction rate: >80% of profiles
- Signal distribution: reasonable spread 0-10

### Match Quality
- User feedback on matches improves
- "Why we matched" chip relevance increases
- Tension chip accuracy (fewer false positives)

### Technical Health
- No regression on existing match scores
- Chip diversity maintained
- Performance: <100ms added latency

---

## Resource Estimate

- **15 sprints** (mostly 2 weeks, Sprint 9 is 1 week) = **~7 months**
- **5 stories per sprint** × 3 days avg = **~2 weeks per sprint**
- **LLM prompt engineering:** 20% of time
- **Testing & validation:** 30% of time
- **i18n & UI:** 25% of time
- **Core logic:** 25% of time

---

## Risk Mitigation

**Risk:** LLM extraction quality varies
- Mitigation: Extensive prompt engineering + human validation on sample
- Fallback: Conservative defaults (5/10) when confidence low

**Risk:** New signals correlate too much with existing
- Mitigation: Correlation analysis before rollout
- Adjust weights if redundant

**Risk:** Performance degradation
- Mitigation: Batch LLM calls, cache aggressively
- Monitor P95 latency

**Risk:** Translation quality (HE/ES)
- Mitigation: Native speaker review
- A/B test evidence string variants

---

## Next Steps

1. ✅ Review this roadmap
2. Create sprint 1 detailed stories
3. Set up LLM prompt engineering environment
4. Kickoff Sprint 1: Empathy & Vulnerability
