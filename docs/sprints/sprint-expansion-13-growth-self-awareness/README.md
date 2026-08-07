# Sprint Expansion-13: Growth & Self-Awareness

**Duration:** 2 weeks  
**Goal:** Add `growthMindset` and `selfAwareness` compatibility signals  
**Depends on:** Sprint Expansion-12  
**Milestone:** Two growth/self-awareness signals in **shadow** (extract later). Scored “42” deferred to an explicit promote story.  
**Sprint status:** ✅ **Complete (5/5)** — engineering gate (2026-08-08)  
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

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow):** `growthMindset`, `selfAwareness` on `SHADOW_SIGNAL_KEYS` (**30 → 32**); `MAX_EVIDENCE_ITEMS` **49 → 51**; metadata-only at Story 1 then extended in Story 2. Runtime **15 scored + 32 shadow = 47** extraction keys. New domain string **`personal`** documented in promotion metadata only — `SIGNAL_DOMAIN` / chip-diversity runtime deferred to Story 4 / promote. Scoring / explainability promote deferred (explicit future promote). LLM prompts / `DOMAIN_ALLOWED` → Story 2.

**Tasks (as-built):**
1. ✅ Add `growthMindset`, `selfAwareness` to `SHADOW_SIGNAL_KEYS`
2. ✅ Add weights, tiers, domains (`personal`), chip labels in `expansion-13-signal-definitions.ts` (metadata only)
3. ⏭️ `SIGNAL_DOMAIN` / chip-diversity runtime — deferred (Story 4 / promote); metadata documents `personal`
4. ✅ Counts documented (as-built total extraction **47**; product “42” scored framing → future promote)

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-13-signal-definitions.ts` (new)
- `dating-api/src/extraction/extracted-signals.spec.ts`
- Prior rollout specs global count bumps (Exp-10/11/12)

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist
- ✅ `personal` domain in promotion metadata (runtime diversity → Story 4 / promote)

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended Story 1 metadata with self + partner LLM semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **37 → 39** / partner **23 → 25**. Upgraded adjacent SIGNAL RULES (`vulnerabilityOpenness` / `directness` / `emotionalRegulation` / `empathyCompassion`). Mocked unit tests; Hebrew live/>85% deferred to Story 5. Onboarding UI copy deferred to Story 4. Shadow only — not scored.

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

**Tasks (as-built):**
1. ✅ Extended `expansion-13-signal-definitions.ts` with SELF/PARTNER blocks (Story 1 meta kept)
2. ✅ Wired into `extraction.service.ts` (self + partner); onboarding answers use same free-text path (UI copy → Story 4)
3. ✅ Synced `extraction-strict-validation.ts` (`DOMAIN_ALLOWED` 39/25)
4. ✅ Unit tests: 2 signals × high/low/null + OOR + partner smoke (mocked)
5. ⏭️ Hebrew live fixtures / >85% → Story 5

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ⏭️ >85% agreement on validation set → Story 5

**Files (as-built):**
- `dating-api/src/extraction/expansion-13-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`

---

### STORY 3: Tension Rules ✅ Done
**Points:** 4  
**Owner:** Backend

**As-built:** Extended `EnrichedSignals` with `growthMindset` + `selfAwareness`. Appended two shadow friction rules after `emotional_expression_gap`: `growth_mindset_gap` (penalty **4**, ≥8 vs ≤3) and `both_low_self_awareness` (penalty **3**, both ≤3). English `TENSION_CHIP_BY_ID`: `Different growth pace` / `Self-insight gap`. No invented `self_awareness_gap`. Friction can affect `finalScore` when rules fire; keys still **not** in `COMPATIBILITY_SIGNAL_KEYS`. Positive chips (`Grows together` / `Self-awareness match`) + i18n → Story 4.

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

**Tension chips (as-built):**
- `growth_mindset_gap`: `Different growth pace`
- `both_low_self_awareness`: `Self-insight gap`

**Positive chip:** both high growth mindset (≥7 each) → "Grows together" chip — **Story 4**.

**Acceptance Criteria:**
- ✅ Rules fire at thresholds
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

**As-built:** Created `expansion-13-explainability.ts` with **two synthetic both-high (≥7)** shadow chips — `Grows together` (`growthGrowsTogether`) and `Self-awareness match` (`selfAwarenessMatch`). Domain **`personal`** on both for picker diversity (scored `SIGNAL_DOMAIN` unchanged until promote). Assembled after Exp-12; `_13` resolution. `CHIP_EVIDENCE_KEYS` **35 → 37**; EN/HE/ES evidence + Phase 6 onboarding writing prompts in About-me ideas. Meta labels `Openness to growth` / `Self-awareness` remain promote-meta only. Shadow only — not scored.

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| Both high growth mindset (≥7) | Grows together | You both value feedback and growing as partners | שניכם מעריכים משוב וצמיחה כבני זוג | Ambos valoran el feedback y crecer como pareja |
| Both high self-awareness (≥7) | Self-awareness match | You both have clear insight into your own patterns | לשניכם יש תובנה ברורה לגבי הדפוסים שלכם | Ambos tienen buena comprensión de sus propios patrones |

**Files (as-built):**
- `dating-api/src/matches/expansion-13-explainability.ts` (+ spec)
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`

**Acceptance Criteria:**
- ✅ Chips in EN/HE/ES
- ✅ Onboarding writing-prompt copy EN/HE (+ ES parity)

---

### STORY 5: Testing, Validation & Regression ✅ Done
**Points:** 8  
**Owner:** QA + Backend + PM

**As-built (engineering gate):** `compare()` E2E (**13** tests) for 2 tensions (`growth_mindset_gap` / `both_low_self_awareness`), positive chips (`Grows together` / `Self-awareness match`), both-low exclusivity (no positives), alignments exclusion, compatibility invariance, Exp-12/11 non-regression. Rollout gate (`expansion-13-rollout.spec.ts`). Live fixtures + `validate:expansion-13-extraction` (EN + Hebrew + null/distinction; **91.7%** agreement). UI tension passthrough. Shadow unchanged — **no promote** to `COMPATIBILITY_SIGNAL_KEYS`. Agent 4 skipped. Admin / browse QA / promote deferred to operator / future promote story.

**Fixtures (as-built in `expansion-13-extraction-fixtures.json`):**

| Text / case | Expected |
|------|----------|
| "I'm always working on becoming better, I welcome feedback" | `growthMindset` 7–10 |
| "I am who I am, not going to change" | `growthMindset` 1–4 |
| "I know I shut down when criticized, so I try to pause" | `selfAwareness` 7–10 |
| Low self-insight wording (patterns/triggers) | `selfAwareness` 1–4 |
| No growth/awareness text | both → null (`allowNull`) |
| Hebrew high growth / high awareness / low growth | ≥3 HE rows |
| Vulnerability alone | `growthMindset` prefer null (`allowNull`) |
| Regulation alone / empathy alone | `selfAwareness` prefer null (`allowNull`) |

**Tests (as-built):**
- ✅ Extraction unit tests — Story 2 (not re-duplicated)
- ✅ Friction unit tests — Story 3 (not re-duplicated)
- ✅ Integration: `compare()` Expansion-13 E2E (**13**)
- ✅ Rollout gate counts: shadow **32** / total **47** / evidence **51** / DOMAIN self **39** / partner **25** / scored **15** / chips **37**
- ✅ UI: chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- ✅ Live LLM ≥85% — **91.7%** (11/12 scored expectations)

**Files (as-built):**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/src/extraction/expansion-13-rollout.spec.ts`
- `dating-api/data/expansion-13-extraction-fixtures.json`
- `dating-api/scripts/validate-expansion-13-extraction.ts`
- `dating-api/package.json` (`validate:expansion-13-extraction`)
- `dating-ui/.../match-why-section.spec.tsx`

**Rollout gate (engineering):**
- [x] 2 new signals extract with >85% agreement on validation set (**91.7%**)
- [x] Hebrew fixtures present + live pass rate ≥85%
- [x] 2 tension rules + positive chips tested (`compare()` E2E + Story 3/4 units)
- [x] Chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- [x] `personal` domain on shadow chip diversity (Story 4) without scored-set regressions
- [x] No regression on Exp-12/11 E2E / scored set still **15**
- [ ] Promote shadow keys → scoring registries (product “42”) — **deferred** (explicit future promote story)

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 15 scored + 32 shadow validated (**47** extraction total); scored “42” deferred to promote
- [x] Onboarding prompts live in profile creation flow (About-me writing ideas; optional)
- [x] NO hardcoded patterns anywhere (LLM-first)
- [ ] Compatibility scoring promote / “42 live” — **deferred**

---

## Sprint deliverables (as-built)

| Layer | Delivered |
|-------|-----------|
| Schema | `growthMindset`, `selfAwareness` on `SHADOW_SIGNAL_KEYS` |
| Extraction | Self + partner LLM prompts (`expansion-13-signal-definitions.ts`) |
| Friction | 2 tension rules + English chip labels |
| Display | 2 positive chips + EN/HE/ES evidence + onboarding prompts; domain `personal` |
| Validation | Match-engine E2E + rollout gate + fixtures + live LLM script + UI |
| **Not delivered** | Promote to `COMPATIBILITY_SIGNAL_KEYS` / scored “42” / Exp-08 sibling chips |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-13 section.
