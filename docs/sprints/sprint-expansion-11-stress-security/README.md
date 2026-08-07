# Sprint Expansion-11: Stress & Security

**Duration:** 2 weeks  
**Goal:** Add `stressResponse` and `jealousySecurity` compatibility signals  
**Depends on:** Sprint Expansion-10  
**Milestone:** Two stress/security signals in **shadow** (extract / friction / display). Scored “38” deferred to an explicit promote story.  
**Sprint status:** ✅ **Complete (5/5)** — engineering gate (2026-08-07)  
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

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow):** `stressResponse`, `jealousySecurity` on `SHADOW_SIGNAL_KEYS` (**26 → 28**); `MAX_EVIDENCE_ITEMS` **45 → 47**; metadata-only at Story 1 then extended in Story 2. Runtime **15 scored + 28 shadow = 43** extraction keys. Scoring / explainability promote deferred (explicit future promote). LLM prompts / `DOMAIN_ALLOWED` → Story 2 ✅.

**Tasks (as-built):**
1. ✅ Add `stressResponse`, `jealousySecurity` to `SHADOW_SIGNAL_KEYS`
2. ✅ Add weights, tiers, domains, chip labels in `expansion-11-signal-definitions.ts` (metadata only)
3. ✅ Counts documented (as-built total extraction **43**; product “38” scored framing → future promote)

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-11-signal-definitions.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`
- `compatibility-score.ts` / scored promote — **out of scope** (future promote story)

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist
- ✅ Unit tests: keys on shadow allowlist / meta; not scored (`DOMAIN_ALLOWED` sync → Story 2 ✅)

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended Story 1 metadata with self + partner LLM semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **33 → 35** / partner **19 → 21**. Polarity lock (`jealousySecurity` HIGH = jealous); compatibility axis for `stressResponse`. Upgraded adjacent SIGNAL RULES (`attachmentSecurity` / `independence` / `emotionalRegulation`). Mocked unit tests; Hebrew live/>85% closed in Story 5 (**100%** on curated set). Onboarding UI copy → Story 4 (same free-text extractor path). Shadow only — not scored.

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

**Tasks (as-built):**
1. ✅ Extended `expansion-11-signal-definitions.ts` with semantic definitions + EN/HE examples
2. ✅ Wired into `extraction.service.ts` (self + partner); onboarding answers use same free-text path (UI copy → Story 4)
3. ✅ Synced `extraction-strict-validation.ts` allowlist (`DOMAIN_ALLOWED` 35/21)
4. ✅ Unit tests: high/low/null + OOR + partner smoke (mocked LLM)
5. ✅ Hebrew regression fixtures → Story 5 (`expansion-11-extraction-fixtures.json`)

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set — Story 5 (**100%**)

**Files (as-built):**
- `dating-api/src/extraction/expansion-11-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`

---

### STORY 3: Tension Rules ✅ Done
**Points:** 4  
**Owner:** Backend

**As-built:** Three shadow friction rules after `forgiveness_style_gap` — `stress_response_clash` (5), `jealousy_security_gap` (5), `both_high_jealousy` (3). `EnrichedSignals` + English `TENSION_CHIP_BY_ID`. Both-high fires shared-jealousy chip without gap. Friction affects `finalScore` when rules fire; keys still not in `COMPATIBILITY_SIGNAL_KEYS`. Positive chips / i18n → Story 4.

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

**Tension chips (as-built):**
- `stress_response_clash`: `Pursue vs withdraw under stress`
- `jealousy_security_gap`: `Trust & space mismatch`
- `both_high_jealousy`: `Shared jealousy risk`

**Positive chip:** both low jealousy (`jealousySecurity` ≤ 3 for both) → "Secure & trusting" chip — **Story 4**.

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

**As-built:** Shadow positive chips via `expansion-11-explainability.ts` (not scored `POSITIVE_CHIP_BY_SIGNAL`). Aligned `stressResponse` → `Support under pressure`; both-low jealousy → synthetic `Secure & trusting` (both-high stays tension-only). EN/HE/ES browse evidence; `CHIP_EVIDENCE_KEYS` **31 → 33**. Phase 6 onboarding writing prompts appended to `writingPrompts.aboutMe.questions` (EN/HE/ES) — no new form fields. Scoring promote deferred (Story 5 engineering gate closed without promote).

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| `stressResponse` (aligned) | Support under pressure | You handle stress in compatible ways | אתם מתמודדים עם לחץ בדרכים תואמות | Manejan el estrés de forma compatible |
| Both low jealousy | Secure & trusting | You're both secure and trusting in relationships | שניכם בטוחים ונותנים אמון במערכת יחסים | Ambos son seguros y confiados en la relación |

**Onboarding prompts (as-built):** appended to About-me writing ideas — "When I'm stressed, I need my partner to…" / "Do you get jealous easily? What helps you feel secure?" (+ HE/ES).

**Files (as-built):**
- `dating-api/src/matches/expansion-11-explainability.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES
- ✅ Onboarding prompt copy translated

---

### STORY 5: Testing, Validation & Regression ✅ Done
**Points:** 8  
**Owner:** QA + Backend + PM

**As-built (engineering gate):** `compare()` E2E (**12** tests) for 3 tensions, positive chips (`Support under pressure` / `Secure & trusting`), `both_high_jealousy` exclusivity, alignments exclusion, compatibility invariance, Exp-10/09 non-regression. Rollout gate (`expansion-11-rollout.spec.ts`). Live fixtures + `validate:expansion-11-extraction` (EN + Hebrew + null/distinction; **100%** agreement). UI tension passthrough. Shadow unchanged — **no promote** to `COMPATIBILITY_SIGNAL_KEYS`. Agent 4 skipped. Admin / browse QA / promote deferred to operator / future promote story.

**Fixtures (as-built in `expansion-11-extraction-fixtures.json`):**

| Text / case | Expected |
|------|----------|
| "When I'm stressed I need my partner close…" | `stressResponse` 7–10 |
| "I need alone time to process before talking when I'm stressed." | `stressResponse` 1–4 |
| "I get jealous easily and need to know where you are." | `jealousySecurity` 7–10 |
| "I fully trust my partner and don't get jealous." | `jealousySecurity` 1–3 |
| No stress/jealousy text | both → null (`allowNull`) |
| Hebrew high stress / high+low jealousy | ≥3 HE rows |
| Independence alone | `jealousySecurity` prefer null (`allowNull`) |
| Calm under stress alone | `stressResponse` prefer null (`allowNull`) |

**Tests (as-built):**
- ✅ Extraction unit tests — Story 2 (not re-duplicated)
- ✅ Friction unit tests — Story 3 (not re-duplicated)
- ✅ Integration: `compare()` Expansion-11 E2E (**12**)
- ✅ Rollout gate counts: shadow **28** / total **43** / evidence **47** / DOMAIN self **35** / partner **21** / scored **15** / chips **33**
- ✅ UI: chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- ✅ Live LLM ≥85% — **100%** (11/11 scored expectations)

**Files (as-built):**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/src/extraction/expansion-11-rollout.spec.ts`
- `dating-api/data/expansion-11-extraction-fixtures.json`
- `dating-api/scripts/validate-expansion-11-extraction.ts`
- `dating-api/package.json` (`validate:expansion-11-extraction`)
- `dating-ui/.../match-why-section.spec.tsx`

**Rollout gate (engineering):**
- [x] 2 new signals extract with >85% agreement on validation set (**100%**)
- [x] Hebrew fixtures present + live pass rate ≥85%
- [x] 3 tension rules + positive chips tested (`compare()` E2E + Story 3/4 units)
- [x] Chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- [x] No regression on Exp-10 E2E / scored set still **15**
- [ ] Promote shadow keys → scoring registries (product “38”) — **deferred** (explicit future promote story)

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 15 scored + 28 shadow validated (**43** extraction total); scored “38” deferred to promote
- [x] Onboarding prompts live in profile creation flow (About-me writing ideas; optional)
- [x] NO hardcoded patterns anywhere (LLM-first)
- [ ] Compatibility scoring promote / “38 live” — **deferred**

---

## Sprint deliverables (as-built)

| Layer | Delivered |
|-------|-----------|
| Schema | `stressResponse`, `jealousySecurity` on `SHADOW_SIGNAL_KEYS` |
| Extraction | Self + partner LLM prompts (`expansion-11-signal-definitions.ts`) |
| Friction | 3 tension rules + English chip labels |
| Display | 2 positive chips + EN/HE/ES evidence + onboarding prompts |
| Validation | Match-engine E2E + rollout gate + fixtures + live LLM script + UI |
| **Not delivered** | Promote to `COMPATIBILITY_SIGNAL_KEYS` / scored “38” / Exp-08 sibling chips |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-11 section.
