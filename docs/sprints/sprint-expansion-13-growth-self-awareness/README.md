# Sprint Expansion-13: Growth & Self-Awareness

**Duration:** 2 weeks  
**Goal:** Add `growthMindset` and `selfAwareness` compatibility signals  
**Depends on:** Sprint Expansion-12  
**Milestone:** 42 tracked compatibility signals (shadow → promote gate)  
**Phase:** Phase 6 — Relationship Psychology

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Every other Phase 6 signal describes a fixed trait or style. This sprint captures something different: **capacity to change**. A couple with mismatched patterns can still thrive if both partners have growth mindset and self-awareness; a couple with matched patterns can stagnate without them. This is a meta-signal that modulates how much other mismatches actually matter over time — but for v1 we score and surface it like any other signal (no cross-signal weighting logic yet).

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `growthMindset` | 1.3 | Tier 2 | personal | Openness to growth |
| `selfAwareness` | 1.2 | Tier 2 | personal | Self-awareness |

*(New domain `personal` — distinct from `emotional`/`communication`/`relationship`/`values`/`lifestyle`/`ambition_money`/`social`/`intimacy`. Add to `SIGNAL_DOMAIN` for chip diversity.)*

**Distinctions from existing signals:**

- `growthMindset` ≠ `vulnerabilityOpenness` (Expansion-01) — vulnerability = willingness to share fears/be seen; growth mindset = willingness to change/take feedback
- `growthMindset` ≠ `directness` — directness is about communication style, not receptivity to feedback
- `selfAwareness` ≠ `emotionalRegulation` (Expansion-02) — regulation = managing emotions in the moment; self-awareness = *knowing* one's own patterns/triggers (can have insight without regulation, or vice versa)
- `selfAwareness` ≠ `empathyCompassion` (Expansion-01) — empathy is outward (understanding others); self-awareness is inward (understanding oneself)

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "A time I changed my mind about something important…" | "פעם ששיניתי את דעתי בנושא חשוב..." |
| "One thing I'm working on about myself…" | "דבר אחד שאני עובד/ת עליו בעצמי..." |

---

## Stories

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `growthMindset`, `selfAwareness` to `SHADOW_SIGNAL_KEYS`
2. Add weights, tier (Tier 2), new domain `personal` in `expansion-13-signal-definitions.ts`
3. Update `SIGNAL_DOMAIN` map and chip-diversity logic to include `personal`
4. Update signal count docs (42 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-13-signal-definitions.ts` (new)
- `dating-api/src/matches/match-explainability.ts` (`SIGNAL_DOMAIN`, at promote gate)
- `dating-api/src/compatibility/compatibility-score.ts` (at promote gate)
- `COMPATIBILITY_SIGNALS_SUMMARY.md`

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist
- ✅ New `personal` domain wired for chip diversity without breaking existing domain balance tests

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL)
**Points:** 10  
**Owner:** Backend + Prompt Engineer

#### `growthMindset` (1–10 or null)

**Definition:** Openness to feedback, willingness to change and learn from mistakes in a relationship, vs defensiveness or fixed patterns.

**Scale:**
- 1–2: Defensive; resists feedback; "this is just who I am"
- 3–4: Occasionally open, mostly resistant
- 5–6: Moderately open to change
- 7–8: Actively seeks feedback and works on self-improvement
- 9–10: Strongly growth-oriented; regularly reflects and adapts based on feedback

**Examples HIGH (8–10):**
- "I'm always working on becoming a better partner"
- "I welcome feedback, even when it's hard to hear"
- Hebrew: "אני תמיד עובד על להיות בן/בת זוג טוב/ה יותר"

**Examples LOW (1–3):**
- "I am who I am, I'm not going to change"
- "I don't take criticism well"

**Examples null:**
- No mention of change, feedback, or self-improvement

#### `selfAwareness` (1–10 or null)

**Definition:** Understanding of one's own emotional patterns, triggers, and behavioral tendencies.

**Scale:**
- 1–2: Little insight into own patterns; surprised by own reactions
- 3–4: Limited self-reflection
- 5–6: Some awareness of patterns
- 7–8: Clearly names own triggers/tendencies ("I tend to shut down when...")
- 9–10: Deep self-insight; articulates patterns and their origins

**Examples HIGH (8–10):**
- "I know I tend to get defensive when I feel criticized, so I try to pause first"
- Hebrew: "אני יודע/ת שאני נוטה להיות מגונן/ת כשאני מרגיש/ה שמבקרים אותי"

**Examples LOW (1–3):**
- "I don't really know why I react the way I do"

**Examples null:**
- No self-reflective statements

**Tasks:**
1. Create `expansion-13-signal-definitions.ts`
2. Wire into `extraction.service.ts` (self + partner domains)
3. Sync `extraction-strict-validation.ts`
4. Unit tests: 2 signals × high/low/null
5. Hebrew regression fixtures

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set

**Files:**
- `dating-api/src/extraction/expansion-13-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 4  
**Owner:** Backend

```typescript
{
  id: 'growth_mindset_gap',
  name: 'Growth mindset gap (MED)',
  when: (a, b) => {
    const aG = getSignal(a, 'growthMindset');
    const bG = getSignal(b, 'growthMindset');
    if (aG == null || bG == null) return false;
    return (aG >= 8 && bG <= 3) || (bG >= 8 && aG <= 3);
  },
  penalty: 4,
  explain: 'One is highly open to feedback and change, the other more fixed — growth pace may differ',
},
{
  id: 'both_low_self_awareness',
  name: 'Both low self-awareness (MED)',
  when: (a, b) => {
    const aS = getSignal(a, 'selfAwareness');
    const bS = getSignal(b, 'selfAwareness');
    if (aS == null || bS == null) return false;
    return aS <= 3 && bS <= 3;
  },
  penalty: 3,
  explain: 'Neither partner shows strong self-insight — patterns may be harder to name and resolve together',
},
```

**Tension chips:**
- `growth_mindset_gap`: `Different growth pace`
- `both_low_self_awareness`: `Self-insight gap`

**Positive chip:** both high growth mindset (≥7 each) → "Grows together" chip.

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
| Both high growth mindset | Grows together | You both value feedback and growing as partners | שניכם מעריכים משוב וצמיחה כבני זוג | Ambos valoran el feedback y crecer como pareja |
| `selfAwareness` (aligned) | Self-awareness match | You both have clear insight into your own patterns | לשניכם יש תובנה ברורה לגבי הדפוסים שלכם | Ambos tienen buena comprensión de sus propios patrones |

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
| "I'm always working on becoming better, I welcome feedback" | `growthMindset` 8–9 |
| "I am who I am, not going to change" | `growthMindset` 1–2 |
| "I know I shut down when criticized, so I try to pause" | `selfAwareness` 8–9 |
| "I don't know why I react the way I do" | `selfAwareness` 2–3 |
| No related text | both → null |

**Rollout gate:**
- [ ] 2 signals >85% agreement
- [ ] Hebrew fixtures pass
- [ ] Tension + positive chips tested
- [ ] Chips EN/HE/ES
- [ ] `personal` domain integrated into chip-diversity logic without regressions
- [ ] No regression on 40 existing signals
- [ ] Promote to scoring (42 total)

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 42-signal system validated (or 40 + 2 in shadow until gate)
- [ ] Onboarding prompts live
- [ ] NO hardcoded patterns anywhere

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-13 section.
