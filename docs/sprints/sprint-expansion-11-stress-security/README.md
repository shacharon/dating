# Sprint Expansion-11: Stress & Security

**Duration:** 2 weeks  
**Goal:** Add `stressResponse` and `jealousySecurity` compatibility signals  
**Depends on:** Sprint Expansion-10  
**Milestone:** 38 tracked compatibility signals (shadow → promote gate)  
**Phase:** Phase 6 — Relationship Psychology

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

The classic "pursuer-distancer" dynamic under stress is a top cause of relationship breakdown, and jealousy/insecurity is a leading driver of conflict and breakups. We have `attachmentSecurity` (general attachment style) but nothing about **behavior specifically under stress**, and nothing about **jealousy/possessiveness** as a distinct trait.

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `stressResponse` | 1.3 | Tier 2 | emotional | Support under pressure |
| `jealousySecurity` | 1.4 | Tier 1 | emotional | Trust & security |

**Scale orientation:**
- `stressResponse`: 1 = withdraws/self-reliant under stress ↔ 10 = seeks closeness/support under stress
- `jealousySecurity`: 1 = secure/trusting, low jealousy ↔ 10 = highly jealous/possessive

**Distinctions from existing signals:**

- `stressResponse` ≠ `attachmentSecurity` — attachment = general relational security pattern; stress response = specific behavior when under pressure (may seek closeness even with anxious attachment, or withdraw even with secure attachment in certain contexts)
- `stressResponse` ≠ `emotionalRegulation` (Expansion-02) — regulation = how reactive/volatile emotions are; stress response = pursue vs withdraw direction, independent of reactivity level
- `jealousySecurity` ≠ `independence` — independence = need for autonomy/space; jealousy = trust and possessiveness specifically
- `jealousySecurity` ≠ `attachmentSecurity` — attachment is broader (comfort with closeness/distance in general); jealousy is specifically about trust and reaction to partner's other relationships/attention

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "When I'm stressed, I need my partner to…" | "כשאני לחוץ/ה, אני צריך/ה שבן/בת הזוג..." |
| "Do you get jealous easily? What helps you feel secure?" | "את/ה מתקנא/ת בקלות? מה עוזר לך להרגיש בטוח/ה?" |

---

## Stories

### STORY 1: Schema & Infrastructure
**Points:** 3  
**Owner:** Backend

**Tasks:**
1. Add `stressResponse`, `jealousySecurity` to `SHADOW_SIGNAL_KEYS`
2. Add weights, tiers, domains in `expansion-11-signal-definitions.ts`
3. Update signal count docs (38 total after promote)

**Files:**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-11-signal-definitions.ts` (new)
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

#### `stressResponse` (1–10 or null)

**Definition:** Behavioral direction under stress — withdrawing/handling alone (low) vs actively seeking closeness/support from partner (high). Neither end is "better"; this is a compatibility axis, not a quality scale.

**Scale:**
- 1–2: Strongly self-reliant; withdraws and processes alone under stress
- 3–4: Prefers some space before reconnecting
- 5–6: Mixed; depends on situation
- 7–8: Prefers to talk it out with partner fairly soon
- 9–10: Actively seeks closeness and reassurance from partner when stressed

**Examples HIGH (8–10):**
- "When I'm stressed I need my partner close, I don't want to be alone"
- Hebrew: "כשאני לחוץ אני צריך שבן/בת הזוג יהיה קרוב אליי"

**Examples LOW (1–3):**
- "I need space to process on my own before I can talk"
- "I handle stress better alone"

**Examples null:**
- No mention of stress-time behavior

#### `jealousySecurity` (1–10 or null)

**Definition:** Tendency toward jealousy and possessiveness vs trust and security regarding partner's other relationships/attention.

**Scale:**
- 1–2: Very secure, trusting, comfortable with partner's independence and friendships
- 3–4: Generally secure with occasional insecurity
- 5–6: Some jealousy in specific situations
- 7–8: Regularly feels jealous or needs reassurance
- 9–10: Highly jealous/possessive; struggles with partner's independence

**Examples HIGH (8–10):**
- "I get jealous easily and need to know where you are"
- Hebrew: "אני מתקנא בקלות וצריך לדעת איפה את"

**Examples LOW (1–3):**
- "I fully trust my partner and don't get jealous"
- "I love that my partner has their own friends and life"

**Examples null:**
- No mention of jealousy, trust, or possessiveness

**Tasks:**
1. Create `expansion-11-signal-definitions.ts` with definitions + EN/HE examples
2. Wire into `extraction.service.ts` (self + partner domains)
3. Sync `extraction-strict-validation.ts` allowlist
4. Unit tests: 2 signals × high/low/null
5. Hebrew regression fixtures

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set

**Files:**
- `dating-api/src/extraction/expansion-11-signal-definitions.ts` (new)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules
**Points:** 4  
**Owner:** Backend

```typescript
{
  id: 'stress_response_clash',
  name: 'Pursue vs withdraw under stress (HIGH — classic pursuer-distancer)',
  when: (a, b) => {
    const aS = getSignal(a, 'stressResponse');
    const bS = getSignal(b, 'stressResponse');
    if (aS == null || bS == null) return false;
    return (aS >= 8 && bS <= 3) || (bS >= 8 && aS <= 3);
  },
  penalty: 5,
  explain: 'One seeks closeness under stress, the other needs space — can create a pursue/withdraw cycle',
},
{
  id: 'jealousy_security_gap',
  name: 'Jealousy vs independence clash (MED-HIGH)',
  when: (a, b) => {
    const aJ = getSignal(a, 'jealousySecurity');
    const bJ = getSignal(b, 'jealousySecurity');
    if (aJ == null || bJ == null) return false;
    return (aJ >= 8 && bJ <= 3) || (bJ >= 8 && aJ <= 3);
  },
  penalty: 5,
  explain: 'One tends toward jealousy/reassurance-seeking, the other values high independence and trust without check-ins',
},
{
  id: 'both_high_jealousy',
  name: 'Both high jealousy (MED)',
  when: (a, b) => {
    const aJ = getSignal(a, 'jealousySecurity');
    const bJ = getSignal(b, 'jealousySecurity');
    if (aJ == null || bJ == null) return false;
    return aJ >= 8 && bJ >= 8;
  },
  penalty: 3,
  explain: 'Both partners lean jealous/possessive — may amplify insecurity dynamics',
},
```

**Tension chips:**
- `stress_response_clash`: `Pursue vs withdraw under stress`
- `jealousy_security_gap`: `Trust & space mismatch`
- `both_high_jealousy`: `Shared jealousy risk`

**Positive chip:** both low jealousy (`jealousySecurity` ≤ 3 for both) → "Secure & trusting" chip.

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
| `stressResponse` (aligned) | Support under pressure | You handle stress in compatible ways | אתם מתמודדים עם לחץ בדרכים תואמות | Manejan el estrés de forma compatible |
| Both low jealousy | Secure & trusting | You're both secure and trusting in relationships | שניכם בטוחים ונותנים אמון במערכת יחסים | Ambos son seguros y confiados en la relación |

**Files:**
- `dating-api/src/matches/match-explainability.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`, `types.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES
- ✅ Onboarding prompt copy translated

---

### STORY 5: Testing, Validation & Regression
**Points:** 8  
**Owner:** QA + Backend + PM

**Fixtures:**

| Text | Expected |
|------|----------|
| "When stressed I need my partner close" | `stressResponse` 8–9 |
| "I need alone time to process before talking" | `stressResponse` 2–3 |
| "I get jealous easily, need to know where you are" | `jealousySecurity` 8–9 |
| "I fully trust my partner, no jealousy" | `jealousySecurity` 1–2 |
| No stress/jealousy text | both → null |

**Rollout gate:**
- [ ] 2 signals >85% agreement
- [ ] Hebrew fixtures pass
- [ ] 3 tension + 1 positive chip tested
- [ ] Chips EN/HE/ES
- [ ] No regression on 36 existing signals
- [ ] Promote to scoring (38 total)

---

## Definition of Done

- [ ] All 5 stories completed
- [ ] 38-signal system validated (or 36 + 2 in shadow until gate)
- [ ] Onboarding prompts live
- [ ] NO hardcoded patterns anywhere

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-11 section.
