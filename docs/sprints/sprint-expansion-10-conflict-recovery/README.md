# Sprint Expansion-10: Conflict Recovery

**Duration:** 2 weeks  
**Goal:** Add `repairSkills` and `forgivenessStyle` compatibility signals  
**Depends on:** Sprint Expansion-09  
**Milestone:** 36 tracked compatibility signals (shadow → promote gate)  
**Phase:** Phase 6 — Relationship Psychology (see `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Gottman's research names conflict **recovery** — not conflict avoidance — as the strongest predictor of relationship longevity. We have `conflictStyle` (how they engage in conflict) but nothing about what happens **after**: do they apologize, own their part, and reconnect — or stonewall and rehash?

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `repairSkills` | 1.4 | Tier 2 | communication | Conflict recovery |
| `forgivenessStyle` | 1.3 | Tier 2 | communication | Letting go & moving forward |

**Distinctions from existing signals:**

- `repairSkills` ≠ `conflictStyle` — conflict style = how they behave *during* disagreement (direct/avoidant/escalating); repair = what happens *after* (apology, ownership, reconnection)
- `repairSkills` ≠ `directness` — directness = communication bluntness; repair = accountability and reconciliation behavior
- `forgivenessStyle` ≠ `attachmentSecurity` — attachment = general relational security; forgiveness = specifically how grudges/resentment are handled post-conflict
- `forgivenessStyle` ≠ `emotionalRegulation` (Expansion-02) — regulation = managing emotional reactivity in the moment; forgiveness = resolution over time after the moment has passed

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "When we disagree, I usually…" | "כשיש לנו חילוקי דעות, אני בדרך כלל..." |
| "After a fight, I tend to…" | "אחרי ריב, אני נוטה..." |

These feed the same LLM extractor as free-text bio fields — no separate pipeline.

---

## Stories

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `repairSkills`, `forgivenessStyle` to `SHADOW_SIGNAL_KEYS` (`extracted-signals.interface.ts`)
2. Add weights, tiers, domains in `expansion-10-signal-definitions.ts`
3. Update signal count docs (36 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-10-signal-definitions.ts` (new)
- `dating-api/src/compatibility/compatibility-score.ts` (at promote gate)
- `dating-api/src/matches/match-explainability.ts` (at promote gate)
- `COMPATIBILITY_SIGNALS_SUMMARY.md`

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist
- ✅ Unit test: keys validate in strict extraction schema

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL)
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**Principle:** Pure semantic extraction via LLM. NO regex, NO keywords, NO if/else.

#### `repairSkills` (1–10 or null)

**Definition:** Ability and willingness to apologize, take ownership of one's part, and actively reconnect after conflict, vs stonewalling, deflecting blame, or avoiding resolution.

**Scale:**
- 1–2: Rarely apologizes; stonewalls or shuts down after conflict
- 3–4: Struggles to own mistakes; slow to reconnect
- 5–6: Occasionally repairs; inconsistent
- 7–8: Generally apologizes and reconnects after disagreements
- 9–10: Actively repairs — owns their part, apologizes genuinely, reconnects quickly

**Examples HIGH (8–10):**
- "I always try to apologize first, even if I think I'm partly right"
- "After an argument I need to reconnect and make sure we're okay"
- Hebrew: "אני תמיד מתנצל/ת ראשון/ה, גם אם אני חושב/ת שאני קצת צודק/ת"

**Examples LOW (1–3):**
- "I need space and don't like talking right after a fight" (if framed as avoidance, not healthy space)
- "I rarely admit I'm wrong"

**Examples null:**
- No mention of conflict aftermath or repair behavior

#### `forgivenessStyle` (1–10 or null)

**Definition:** Tendency to let go of resentment and move forward vs holding grudges and repeatedly bringing up past issues.

**Scale:**
- 1–2: Holds grudges for a long time; rehashes old conflicts
- 3–4: Slow to forgive; issues linger
- 5–6: Forgives eventually with effort
- 7–8: Forgives fairly quickly; doesn't dwell
- 9–10: Lets go easily; genuinely moves forward without resentment

**Examples HIGH (8–10):**
- "I don't hold grudges — once we talk it out, it's done"
- Hebrew: "אני לא שומר/ת טינה - ברגע שדיברנו, זה נגמר"

**Examples LOW (1–3):**
- "I remember things for a long time and it's hard to let go"
- "Old fights tend to come back up"

**Examples null:**
- No mention of grudges, forgiveness, or moving on from conflict

**Tasks:**
1. Create `expansion-10-signal-definitions.ts` with semantic definitions + EN/HE examples
2. Wire into `extraction.service.ts` (self + partner domains); include onboarding-prompt answers as additional input text when present
3. Sync `extraction-strict-validation.ts` allowlist
4. Unit tests: 2 signals × high/low/null
5. Hebrew regression fixtures

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set (Story 5)

**Files:**
- `dating-api/src/extraction/expansion-10-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 4  
**Owner:** Backend

```typescript
{
  id: 'repair_skills_gap',
  name: 'Repair skills gap (HIGH)',
  when: (a, b) => {
    const aR = getSignal(a, 'repairSkills');
    const bR = getSignal(b, 'repairSkills');
    if (aR == null || bR == null) return false;
    return (aR >= 8 && bR <= 3) || (bR >= 8 && aR <= 3);
  },
  penalty: 5,
  explain: 'One actively repairs after conflict, the other tends to withdraw or avoid resolution',
},
{
  id: 'both_low_repair',
  name: 'Both low repair skills (HIGH — Gottman "stonewalling" risk)',
  when: (a, b) => {
    const aR = getSignal(a, 'repairSkills');
    const bR = getSignal(b, 'repairSkills');
    if (aR == null || bR == null) return false;
    return aR <= 3 && bR <= 3;
  },
  penalty: 6,
  explain: 'Neither partner tends to repair after conflict — unresolved issues may accumulate',
},
{
  id: 'forgiveness_style_gap',
  name: 'Forgiveness style gap (MED)',
  when: (a, b) => {
    const aF = getSignal(a, 'forgivenessStyle');
    const bF = getSignal(b, 'forgivenessStyle');
    if (aF == null || bF == null) return false;
    return (aF >= 8 && bF <= 3) || (bF >= 8 && aF <= 3);
  },
  penalty: 4,
  explain: 'One lets go of conflict quickly, the other holds onto it longer — pacing after fights may clash',
},
```

**Tension chips:**
- `repair_skills_gap`: `Different repair styles`
- `both_low_repair`: `Conflict recovery risk`
- `forgiveness_style_gap`: `Different forgiveness pace`

**Acceptance Criteria:**
- ✅ Rules fire at thresholds (unit tests)
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

| Signal | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|--------|-----------|-------------|-------------|-------------|
| `repairSkills` | Conflict recovery | You both know how to apologize and reconnect after disagreements | שניכם יודעים להתנצל ולהתחבר מחדש אחרי ויכוחים | Ambos saben disculparse y reconectar después de un desacuerdo |
| `forgivenessStyle` | Letting go & moving forward | You both let go of conflict and move forward at a similar pace | שניכם משחררים קונפליקטים וממשיכים הלאה בקצב דומה | Ambos dejan ir los conflictos y siguen adelante a un ritmo similar |

Add onboarding prompt translations (EN/HE) to profile-creation copy per the Phase 6 master table.

**Files:**
- `dating-api/src/matches/match-explainability.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`
- Profile onboarding copy (wherever "About me" prompts live)

**Acceptance Criteria:**
- ✅ 2 chips in EN/HE/ES
- ✅ Onboarding prompt copy translated

---

### STORY 5: Testing, Validation & Regression
**Points:** 8  
**Owner:** QA + Backend + PM

**Fixtures:**

| Text | Expected |
|------|----------|
| "I always apologize first and want to reconnect fast" | `repairSkills` 8–9 |
| "I shut down and need a lot of space, rarely bring it up again" | `repairSkills` 3–4 (ambiguous — validate with human review) |
| "I don't hold grudges, once we talk it's done" | `forgivenessStyle` 8–9 |
| "Old fights tend to resurface for me" | `forgivenessStyle` 2–3 |
| No conflict-related text | both → null |

**Rollout gate:**
- [ ] 2 new signals extract with >85% agreement
- [ ] Hebrew fixtures pass
- [ ] 3 tension rules tested
- [ ] Chips EN/HE/ES
- [ ] No regression on 34 existing signals
- [ ] Promote shadow keys → scoring registries (36 total)

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 36-signal system validated (or 34 + 2 in shadow until gate)
- [ ] Onboarding prompts live in profile creation flow (optional fields)
- [ ] NO hardcoded patterns anywhere

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-10 section.
