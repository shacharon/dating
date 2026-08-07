# New Signals Expansion - Executive Summary

## What We're Adding

**33 new compatibility signals** across 15 sprints: 10 (Sprints 1–6) + 5 profile-gap (Sprint 7) + 4 lifestyle/values (Sprint 8) + interest taxonomy (Sprint 9) + **14 relationship-psychology signals** (Sprints 10–15, Phase 6) (~7 months total)

### Phase 1: Emotional Intelligence (5 signals)
| Signal | Weight | What It Measures | Why It Matters |
|--------|--------|------------------|----------------|
| `empathyCompassion` | 1.5 | Understanding partner's feelings | #1 predictor per Gottman research |
| `vulnerabilityOpenness` | 1.4 | Comfort being authentic/vulnerable | Foundation for emotional intimacy |
| `emotionalRegulation` | 1.4 | Managing emotions, non-reactive | Prevents flooding, keeps stability |
| `humorPlayfulness` | 1.2 | Playfulness, fun, lightness | Positivity ratio, relationship resilience |
| `physicalAffectionStyle` | 1.3 | Physical touch needs | #1 complaint: mismatched love languages |

### Phase 2: Activity-Style (5 signals)
| Signal | Weight | What It Measures | Why It Matters |
|--------|--------|------------------|----------------|
| `intellectualCuriosity` | 1.3 | Mental stimulation needs | Boredom vs engagement long-term |
| `physicalActivityLevel` | 1.2 | Fitness/activity behavior | Daily lifestyle friction |
| `creativeExpression` | 1.0 | Need for creative outlets | Identity/time respect |
| `domesticComfort` | 1.1 | Home vs out preference | Where you spend time together |
| `adventureNovelty` | 1.2 | New experiences vs routine | Spontaneity vs stability tension |

**Total after expansion: 48 signals** (15 current + 10 Phase 1–2 + 5 Phase 3 + 4 Phase 4 + 14 Phase 6), plus a 19-tag interest taxonomy (Phase 5)

---

## Critical Principle: LLM-FIRST

**NO HARDCODED PATTERNS OR KEYWORDS**

All signal extraction uses LLM semantic inference:

```typescript
// ❌ WRONG
if (text.includes('empathy')) return 8;

// ✅ RIGHT
const prompt = EMPATHY_SEMANTIC_DEFINITION + text;
return await llm.extractScore(prompt, 0, 10);
```

**Read before EVERY coding session:**
- `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Sprint Breakdown

### Sprint 1 (2 weeks): Empathy & Vulnerability
- Add `empathyCompassion` and `vulnerabilityOpenness`
- LLM semantic extraction
- Tension rules + chips + i18n
- **Deliverable:** 2 new signals in shadow mode

### Sprint 2 (2 weeks): Emotional Regulation & Affection
- Add `emotionalRegulation` and `physicalAffectionStyle`
- Same pattern: LLM → tension → chips → i18n

### Sprint 3 (2 weeks): Humor & Playfulness
- Add `humorPlayfulness`
- Phase 1 complete: **5 EQ signals live**

### Sprint 4 (2 weeks): Intellectual & Creative
- Add `intellectualCuriosity` and `creativeExpression`
- Activity-style signals begin

### Sprint 5 (2 weeks): Physical Activity & Domestic
- Add `physicalActivityLevel` and `domesticComfort`

### Sprint 6 (2 weeks): Adventure & Novelty
- Add `adventureNovelty`
- Phase 2 complete: **All 10 activity/EQ signals live**

### Sprint 7 (2 weeks): Profile Gap Signals
- Add `casualIntimacyIntent`, `supportExchangeOrientation`, `supportProviderOrientation`, `supportRecipientOrientation`, `religiousObservance`
- Provider ↔ recipient pair matching (positive when aligned, tension when both want same role)
- Wire shared interest overlap chips (books, travel, hiking) into match UI
- Hebrew profile regression fixtures
- **Deliverable:** 30 signals + interest chips

### Sprint 8 (2 weeks): Education, Integrity, Chronotype & Physical Type
- Add `educationLevel`, `honestyIntegrity`, `chronotype`, `physicalTypePreference`
- Ethical out-of-scope: race/ethnicity and sexual anatomy (never score / never chip)
- Hebrew regression fixtures (honesty, degree, sleep late, body type)
- **Deliverable:** 34 signals

### Sprint 9 (1 week): Interest Taxonomy Gaps
- Add interest tags: `biking`, `camping`, `nature`
- Overlap chips EN/HE/ES
- **Deliverable:** Games / Cooking / Nature / Dancing / Travelling / Biking / Camping / Movies all covered

---

## Phase 6: Relationship Psychology (14 signals, Sprints 10–15)

**Full detail:** `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`

Deepest EQ layer yet — how people fight, recover, feel heard, grow, and balance family/friends/alone-time. Backed by Gottman's repair/forgiveness research and attachment-under-stress patterns (pursuer-distancer). Uses **optional onboarding prompts** (given to users during profile creation) to elicit richer signal text, since these traits rarely appear spontaneously in a generic bio.

| Sprint | Signals | Theme |
|--------|---------|-------|
| 10 | `repairSkills`, `forgivenessStyle` | Conflict Recovery |
| 11 | `stressResponse`, `jealousySecurity` | Stress & Security |
| 12 | `listeningPresence`, `emotionalExpression` | Feeling Heard |
| 13 | `growthMindset`, `selfAwareness` | Growth & Self-Awareness |
| 14 | `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` | Tolerance & Intimacy Pacing |
| 15 | `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` | Family & Social Ecosystem |

**Deliverable after Sprint 15: 48 total signals.**

---

## Rollout Strategy

### Shadow Mode (Sprints 1-3)
- Extract signals for new profiles
- **Don't use in scoring yet**
- Validate extraction quality
- Target: >85% LLM agreement with human labels

### A/B Test (Sprints 4-6)
- Use new signals in scoring for 10% of users
- Monitor match quality metrics
- Compare satisfaction vs control group

### Full Rollout (Post-Sprint 15)
- All matches use 48 signals
- Backfill old profiles
- Monitor performance and quality

---

## Success Metrics

### Extraction Quality
- ✅ LLM extraction agreement: >85%
- ✅ Non-null rate: >80%
- ✅ Signal distribution: reasonable spread 0-10

### Match Quality
- ✅ User satisfaction with matches improves
- ✅ "Why we matched" chip relevance increases
- ✅ Fewer "this match is off" complaints

### Technical Health
- ✅ Performance: <100ms added latency
- ✅ No regression on existing 15 signals
- ✅ Chip diversity maintained

---

## Resource Requirements

**Time:** ~7 months (15 sprints, mostly 2 weeks; Sprint 9 is 1 week)

**Effort Breakdown:**
- 20% LLM prompt engineering
- 25% Core logic (schema, scoring, tension)
- 25% i18n & UI (3 languages)
- 30% Testing & validation

**Team:**
- 1 backend engineer (full-time)
- 1 frontend engineer (50%)
- 1 QA (50%)
- 1 prompt engineer (25%)

---

## Key Documents

1. **Roadmap:** `EXPANSION_NEW_SIGNALS_ROADMAP.md`
   - Full 6-sprint plan
   - Migration strategy
   - Risk mitigation

2. **LLM Principle:** `LLM_FIRST_PRINCIPLE.md`
   - **READ BEFORE EVERY CODING SESSION**
   - NO hardcoded patterns rule
   - Code review checklist

3. **Sprint 1 Detail:** `sprint-expansion-01-empathy-vulnerability/README.md`
   - Detailed story breakdown
   - Acceptance criteria
   - Testing plan

4. **Original Analysis:** `COMPATIBILITY_SIGNALS_SUMMARY.md`
   - Gap analysis
   - Research basis
   - Current state (15 signals)

---

## What This Fixes

### Current Problem
We have **strong coverage** of:
- ✅ Values (money, spirituality, traditionalism)
- ✅ Lifestyle (pace, social energy, independence)
- ✅ Basic communication (directness, conflict)

We're **missing** the emotional intelligence layer:
- ❌ Empathy, vulnerability, emotional regulation
- ❌ Relationship skills (humor, affection needs)
- ❌ Activity-style compatibility (intellectual, creative, domestic)

### After Expansion
- ✅ **Comprehensive** emotional intelligence coverage
- ✅ **Balanced** cognitive/lifestyle AND emotional/relational signals
- ✅ **Research-backed** — all signals from published relationship science

**Result:** Better long-term match quality, fewer "we're incompatible" surprises.

---

## Next Steps

1. ✅ Review this summary
2. ✅ Read `LLM_FIRST_PRINCIPLE.md` (mandatory)
3. Create Sprint 1 tickets in project management
4. Set up LLM prompt testing environment
5. **Kickoff Sprint 1** → Empathy & Vulnerability signals

---

## Questions?

**"Why LLM-first?"**  
Accuracy, robustness, gaming-resistance. Hardcoded patterns don't capture semantic meaning.

**"What if LLM is wrong?"**  
We validate on samples (>85% agreement). Conservative defaults when unsure.

**"Performance impact?"**  
Batch calls, cache results, parallel extraction. Target <100ms added.

**"Why these 10 signals?"**  
Consensus from 50+ years of relationship research (Gottman, attachment theory, EQ framework). Biggest gaps in current coverage.

**"Can we add more later?"**  
Sprint 7–8 closed profile-gap signals from real Hebrew samples. Sprints 10–15 (Phase 6) added the full relationship-psychology layer: repair, forgiveness, stress response, jealousy/security, listening, expression, growth mindset, self-awareness, patience, intimacy pacing, monogamy alignment, family enmeshment, friend/couple balance, and alone-time need.
