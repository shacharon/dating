# Sprint Expansion-14: Tolerance & Intimacy Pacing

**Duration:** 2 weeks  
**Goal:** Add `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` compatibility signals  
**Depends on:** Sprint Expansion-13  
**Milestone:** Three tolerance/intimacy signals in **shadow** (extract later). Scored “45” deferred to an explicit promote story.  
**Sprint status:** ✅ **Complete (5/5)** — engineering gate (2026-08-08)  
**Phase:** Phase 6 — Relationship Psychology

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Why This Sprint Exists

Three related-but-distinct gaps: how much day-to-day imperfection someone can tolerate in a partner, how fast they like to move toward closeness (distinct from `casualIntimacyIntent`, which is about casual-vs-committed, not speed), and what "exclusive" means to them structurally.

---

## Signals Added

| Signal | Weight | Tier | Domain | Chip Label |
|--------|--------|------|--------|------------|
| `patienceTolerance` | 1.2 | Tier 2 | relationship | Patience with differences |
| `intimacyPacing` | 1.3 | Tier 1 | intimacy | Pace of closeness |
| `monogamyAlignment` | 1.6 | Tier 1 | relationship | Relationship structure |

`monogamyAlignment` gets the highest weight in this sprint — mismatch here is close to a dealbreaker (structural, not just a preference gap).

**Distinctions from existing signals:**

- `patienceTolerance` ≠ `conflictStyle` — conflict style = behavior during disagreement; patience = tolerance for ongoing quirks/flaws that never rise to "conflict"
- `patienceTolerance` ≠ `emotionalRegulation` — regulation = managing one's own emotional reactivity; patience = tolerance threshold for partner's imperfections specifically
- `intimacyPacing` ≠ `casualIntimacyIntent` (Expansion-07) — casual intent = casual/hookup vs committed-only *type* of intimacy; pacing = *speed* to closeness regardless of type (someone can want committed intimacy but move slowly or quickly toward it)
- `monogamyAlignment` ≠ `relationshipClarity` — clarity = structured/intentional vs free-flow *approach* to dating; monogamy = specifically exclusive vs open/poly *structure* expectation

---

## Onboarding Prompts (optional, self domain)

| EN | HE |
|----|-----|
| "Something about my partner that would test my patience, and how I'd handle it…" | "משהו בבן/בת הזוג שהיה מאתגר את הסבלנות שלי, ואיך הייתי מתמודד/ת..." |
| "How fast do you like to move emotionally/physically in a new relationship?" | "כמה מהר את/ה אוהב/ת להתקדם רגשית/פיזית בקשר חדש?" |
| "What does an exclusive relationship mean to you?" | "מה זוגיות בלעדית אומרת עבורך?" |

---

## Stories

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow):** `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` on `SHADOW_SIGNAL_KEYS` (**32 → 35**); `MAX_EVIDENCE_ITEMS` **51 → 54**; metadata-only `expansion-14-signal-definitions.ts` (weights **1.2/1.3/1.6**, tiers **2/1/1**, domains **relationship/intimacy/relationship**, meta chips). Runtime **15 scored + 35 shadow = 50** extraction keys. Scoring / explainability promote deferred. LLM prompts / `DOMAIN_ALLOWED` → Story 2.

**Tasks (as-built):**
1. ✅ Add `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` to `SHADOW_SIGNAL_KEYS`
2. ✅ Add weights, tiers, domains, chip labels in `expansion-14-signal-definitions.ts` (metadata only)
3. ✅ Counts documented (as-built total extraction **50**; product “45” scored framing → future promote)

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-14-signal-definitions.ts` (new)
- `dating-api/src/extraction/extracted-signals.spec.ts`
- Prior rollout specs global count bumps (Exp-10/11/12/13)
- `compatibility-score.ts` / `match-explainability.ts` — promote gate (unchanged)

**Acceptance Criteria:**
- ✅ Three new keys in shadow allowlist

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 12  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended Story 1 metadata with self + partner LLM semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **39 → 42** / partner **25 → 28**. Upgraded adjacent SIGNAL RULES (`conflictStyle` / `emotionalRegulation` / `casualIntimacyIntent` / partner `relationshipClarity` exclusivity carve-out). `monogamyAlignment` polarity locked (low = mono, high = open/poly). Mocked unit tests (**13**); Hebrew live/>85% deferred to Story 5. Onboarding UI copy deferred to Story 4. Shadow only — not scored.

#### `patienceTolerance` (1–10 or null)

**Definition:** Tolerance for a partner's flaws, quirks, and differences in daily life vs low tolerance/critical stance.

**Scale:**
- 1–2: Highly critical; low tolerance for differences or imperfection
- 3–4: Some patience but easily frustrated
- 5–6: Moderate tolerance
- 7–8: Generally patient and accepting of differences
- 9–10: Very patient; easily accepts partner's flaws and quirks

**Examples HIGH (8–10):**
- "Nobody's perfect, I try to be understanding about the little things"
- Hebrew: "אף אחד לא מושלם, אני מנסה להיות מבין/ה לגבי הדברים הקטנים"

**Examples LOW (1–3):**
- "Little habits really bother me"
- "I have high standards and don't tolerate much"

**Examples null:**
- No mention of tolerance or reaction to partner's flaws

#### `intimacyPacing` (1–10 or null)

**Definition:** Preferred speed toward emotional and/or physical closeness in a new relationship — slow/cautious vs fast.

**Scale:**
- 1–2: Very slow; takes a long time to open up or get physically close
- 3–4: Cautious pace
- 5–6: Moderate pace
- 7–8: Moves fairly quickly toward closeness
- 9–10: Very fast; dives into closeness quickly

**Examples HIGH (8–10):**
- "When I feel a connection I move fast"
- "I fall hard and quick"

**Examples LOW (1–3):**
- "I take things slow, need time before I open up"
- "It takes a while for me to feel close to someone"

**Examples null:**
- No mention of pacing preference

#### `monogamyAlignment` (1–10 or null)

**Definition:** Expectation of strict exclusivity (1) vs openness to non-monogamous/poly structures (10). Midpoint = open to discussing/undefined.

**Scale:**
- 1–2: Strictly monogamous; exclusivity is non-negotiable
- 3–4: Monogamous-leaning, minimal flexibility
- 5–6: Open to discussion / hasn't decided
- 7–8: Leans open/non-monogamous
- 9–10: Explicitly seeks open/poly relationship structure

**Examples LOW (1–3, strict monogamy):**
- "Looking for a committed, exclusive relationship only"
- Hebrew: "מחפש/ת קשר מחויב ובלעדי בלבד"

**Examples HIGH (8–10, open/poly):**
- "I'm ethically non-monogamous / poly"
- "Open relationship preferred"

**Examples null:**
- No mention of exclusivity/structure

**Tasks (as-built):**
1. ✅ Extend `expansion-14-signal-definitions.ts` with SELF/PARTNER LLM blocks (Story 1 meta preserved)
2. ✅ Wire into `extraction.service.ts` (self + partner domains)
3. ✅ Sync `extraction-strict-validation.ts` (`DOMAIN_ALLOWED` **42** / **28**)
4. ✅ Unit tests: 3 signals × high/low/null + OOR + partner smoke
5. ✅ Hebrew regression fixtures → Story 5

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set → Story 5 (**100%** live)

**Files (as-built):**
- `dating-api/src/extraction/expansion-14-signal-definitions.ts` (extended)
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts` + Exp-10/11/12/13 rollout DOMAIN bumps

---

### STORY 3: Tension Rules ✅ Done
**Points:** 5  
**Owner:** Backend

**As-built:** Extended `EnrichedSignals` with `patienceTolerance` + `intimacyPacing` + `monogamyAlignment`. Appended three shadow friction rules after `both_low_self_awareness`: `patience_tolerance_gap` (penalty **3**, ≥8 vs ≤3), `intimacy_pacing_clash` (penalty **4**, ≥8 vs ≤3), `monogamy_alignment_mismatch` (penalty **8**, ≤2 vs ≥8 — low = mono, high = open). English `TENSION_CHIP_BY_ID`: `Different tolerance levels` / `Different pace to closeness` / `Relationship structure mismatch`. Friction can affect `finalScore` when rules fire; keys still **not** in `COMPATIBILITY_SIGNAL_KEYS`. Positive chips (`Patience match` / aligned `Pace of closeness` / `Aligned on relationship structure`) + i18n → Story 4. HG hard filter for extreme monogamy mismatch → later product discussion (not built).

```typescript
{
  id: 'patience_tolerance_gap',
  name: 'Patience/tolerance gap (MED)',
  when: (a, b) => {
    const aP = getSignal(a, 'patienceTolerance');
    const bP = getSignal(b, 'patienceTolerance');
    if (aP == null || bP == null) return false;
    return (aP >= 8 && bP <= 3) || (bP >= 8 && aP <= 3);
  },
  penalty: 3,
  explain: 'One is highly tolerant of quirks and flaws, the other more critical — daily friction likely',
},
{
  id: 'intimacy_pacing_clash',
  name: 'Intimacy pacing clash (MED-HIGH)',
  when: (a, b) => {
    const aI = getSignal(a, 'intimacyPacing');
    const bI = getSignal(b, 'intimacyPacing');
    if (aI == null || bI == null) return false;
    return (aI >= 8 && bI <= 3) || (bI >= 8 && aI <= 3);
  },
  penalty: 4,
  explain: 'One moves quickly toward closeness, the other prefers to take things slow',
},
{
  id: 'monogamy_alignment_mismatch',
  name: 'Monogamy alignment mismatch (HIGH — structural dealbreaker territory)',
  when: (a, b) => {
    const aM = getSignal(a, 'monogamyAlignment');
    const bM = getSignal(b, 'monogamyAlignment');
    if (aM == null || bM == null) return false;
    return (aM <= 2 && bM >= 8) || (bM <= 2 && aM >= 8);
  },
  penalty: 8,
  explain: 'One expects strict exclusivity, the other seeks an open/non-monogamous structure',
},
```

**Tension chips (as-built):**
- `patience_tolerance_gap`: `Different tolerance levels`
- `intimacy_pacing_clash`: `Different pace to closeness`
- `monogamy_alignment_mismatch`: `Relationship structure mismatch`

**Positive chip:** aligned monogamy expectation (both ≤2 or both ≥7) → "Aligned on relationship structure" chip → **Story 4**.

**Note:** Consider whether extreme `monogamy_alignment_mismatch` should also feed a Holy-Grail-style hard filter in a later sprint — flag for product discussion, not built here.

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
**Points:** 6  
**Owner:** Frontend + i18n

**As-built:** Created `expansion-14-explainability.ts` with three synthetic shadow chips — `Patience match` (both `patienceTolerance` ≥7), `Pace of closeness` (both `intimacyPacing` ≥7 or both ≤3), `Aligned on relationship structure` (both `monogamyAlignment` ≤2 or both ≥7). Domains **`relationship`** / **`intimacy`** / **`relationship`** on shadow chips (scored `SIGNAL_DOMAIN` unchanged until promote). Assembled after Exp-13; `_14` resolution. `CHIP_EVIDENCE_KEYS` **37 → 40**; EN/HE/ES evidence + Phase 6 onboarding writing prompts in About-me ideas. Meta labels `Patience with differences` / `Relationship structure` remain promote-meta only (pacing browse string may equal meta). Shadow only — not scored.

| Signal / logic | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|-----------------|-----------|-------------|-------------|-------------|
| Both high patience (≥7) | Patience match | You're both patient and accepting of each other's quirks | שניכם סבלניים ומקבלים את הייחודיות של השני | Ambos son pacientes y aceptan las diferencias del otro |
| Aligned pacing (≥7 or ≤3 both) | Pace of closeness | You move toward closeness at a similar pace | אתם מתקדמים לקרבה בקצב דומה | Avanzan hacia la cercanía a un ritmo similar |
| Aligned monogamy (≤2 or ≥7 both) | Aligned on relationship structure | You're aligned on what exclusivity means to you | אתם מסונכרנים לגבי המשמעות של בלעדיות עבורכם | Están alineados sobre lo que significa la exclusividad |

**Files (as-built):**
- `dating-api/src/matches/expansion-14-explainability.ts` (+ spec)
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
**Points:** 9  
**Owner:** QA + Backend + PM

**As-built (engineering gate):** `compare()` E2E (**17** tests) for 3 tensions (`patience_tolerance_gap` / `intimacy_pacing_clash` / `monogamy_alignment_mismatch` incl. dealbreaker friction ≥8), positive chips (`Patience match` / `Pace of closeness` dual-band / `Aligned on relationship structure` dual-band), both-critical / mono-vs-open exclusivity, alignments exclusion, compatibility invariance, Exp-13/12 non-regression. Rollout gate (`expansion-14-rollout.spec.ts`). Live fixtures + `validate:expansion-14-extraction` (EN + Hebrew + null/distinction; **100%** agreement). UI tension passthrough ×3. Shadow unchanged — **no promote** to `COMPATIBILITY_SIGNAL_KEYS`. Agent 4 skipped. HG hard filter / promote deferred to operator / future promote story. Force-add fixtures on commit (`/data` gitignored).

**Fixtures (as-built in `expansion-14-extraction-fixtures.json`):**

| Text / case | Expected |
|------|----------|
| High patience (EN strengthened) | `patienceTolerance` 7–10 |
| Low patience | `patienceTolerance` 1–4 |
| Fast pacing | `intimacyPacing` 7–10 |
| Slow pacing | `intimacyPacing` 1–4 |
| Exclusive / mono only | `monogamyAlignment` 1–3 (low = mono) |
| Open / ethically non-monogamous | `monogamyAlignment` 7–10 (high = open) |
| No related text | all → null (`allowNull`) |
| Hebrew patience high / pacing low / monogamy low | ≥3 HE rows |
| Conflict alone / casual intimacy alone / clarity labels alone | prefer null on Exp-14 keys (`allowNull`) |

**Tests (as-built):**
- ✅ Extraction unit tests — Story 2 (not re-duplicated)
- ✅ Friction unit tests — Story 3 (not re-duplicated)
- ✅ Integration: `compare()` Expansion-14 E2E (**17**)
- ✅ Rollout gate counts: shadow **35** / total **50** / evidence **54** / DOMAIN self **42** / partner **28** / scored **15** / chips **40**
- ✅ UI: chips EN/HE/ES (Story 4) + tension passthrough ×3 (Story 5)
- ✅ Live LLM ≥85% — **100%** (15/15 scored expectations)

**Files (as-built):**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/src/extraction/expansion-14-rollout.spec.ts`
- `dating-api/data/expansion-14-extraction-fixtures.json` (force-add on commit)
- `dating-api/scripts/validate-expansion-14-extraction.ts`
- `dating-api/package.json` (`validate:expansion-14-extraction`)
- `dating-ui/.../match-why-section.spec.tsx`
- `dating-ui/.../chip-evidence.spec.ts` (length **40**; Story 4)

**Rollout gate (engineering):**
- [x] 3 new signals extract with >85% agreement on validation set (**100%**)
- [x] Hebrew fixtures present + live pass rate ≥85%
- [x] 3 tension rules + positive chips tested (`compare()` E2E + Story 3/4 units); monogamy dealbreaker asserted
- [x] Chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- [x] No regression on Exp-13/12 E2E / scored set still **15**
- [ ] Promote shadow keys → scoring registries (product “45”) — **deferred** (explicit future promote story)
- [ ] HG hard filter for extreme monogamy mismatch — **deferred** (product later)

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 15 scored + 35 shadow validated (**50** extraction total); scored “45” deferred to promote
- [x] Onboarding prompts live in profile creation flow (About-me writing ideas; optional)
- [x] NO hardcoded patterns anywhere (LLM-first)
- [ ] Compatibility scoring promote / “45 live” — **deferred**
- [ ] HG hard filter for monogamy mismatch — **deferred**

---

## Sprint deliverables (as-built)

| Layer | Delivered |
|-------|-----------|
| Schema | `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` on `SHADOW_SIGNAL_KEYS` |
| Extraction | Self + partner LLM prompts (`expansion-14-signal-definitions.ts`); polarity low=mono / high=open |
| Friction | 3 tension rules (penalties 3 / 4 / 8) + English chip labels |
| Display | 3 positive chips + EN/HE/ES evidence + onboarding prompts; domains `relationship` / `intimacy` |
| Validation | Match-engine E2E + rollout gate + fixtures + live LLM script + UI |
| **Not delivered** | Promote to `COMPATIBILITY_SIGNAL_KEYS` / scored “45” / HG hard filter / Exp-08 sibling chips |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-14 section.
