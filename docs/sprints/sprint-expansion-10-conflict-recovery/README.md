# Sprint Expansion-10: Conflict Recovery

**Duration:** 2 weeks  
**Goal:** Add `repairSkills` and `forgivenessStyle` compatibility signals  
**Depends on:** Sprint Expansion-09  
**Milestone:** Two conflict-recovery signals in **shadow** (extract / friction / display). Scored “36” deferred to an explicit promote story.  
**Sprint status:** ✅ **Complete (5/5)** — engineering gate (2026-08-07)  
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

### STORY 1: Schema & Infrastructure ✅ Done
**Points:** 3  
**Owner:** Backend

**As-built (shadow):** `repairSkills`, `forgivenessStyle` on `SHADOW_SIGNAL_KEYS` (**24 → 26**); `MAX_EVIDENCE_ITEMS` **43 → 45**; metadata-only `expansion-10-signal-definitions.ts`. Runtime **15 scored + 26 shadow = 41** extraction keys. Scoring / explainability promote deferred past Story 5 (explicit future promote story). LLM prompts / `DOMAIN_ALLOWED` → Story 2.

**Tasks (as-built):**
1. ✅ Add `repairSkills`, `forgivenessStyle` to `SHADOW_SIGNAL_KEYS`
2. ✅ Add weights, tiers, domains, chip labels in `expansion-10-signal-definitions.ts` (metadata only)
3. ✅ Counts documented (as-built total extraction **41**; product “36” scored framing → future promote)

**Files (as-built):**
- `dating-api/src/extraction/extracted-signals.interface.ts`
- `dating-api/src/extraction/expansion-10-signal-definitions.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`
- `compatibility-score.ts` / scored promote — **out of scope** (future promote story)

**Acceptance Criteria:**
- ✅ Two new keys in shadow allowlist
- ✅ Unit tests: keys on shadow allowlist / meta; not scored (strict `DOMAIN_ALLOWED` sync → Story 2)

---

### STORY 2: LLM Extraction Prompts (MOST CRITICAL) ✅ Done
**Points:** 10  
**Owner:** Backend + Prompt Engineer

**As-built:** Extended Story 1 metadata with self + partner LLM semantic blocks; wired into `extraction.service.ts`; `DOMAIN_ALLOWED` self **33** / partner **19**. Upgraded `conflictStyle` SIGNAL RULES (during vs after). Mocked unit tests; Hebrew live/>85% closed in Story 5 (**100%** on curated set). Onboarding UI copy → Story 4 (same free-text extractor path). Shadow only — not scored.

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

**Tasks (as-built):**
1. ✅ Extended `expansion-10-signal-definitions.ts` with semantic definitions + EN/HE examples
2. ✅ Wired into `extraction.service.ts` (self + partner); onboarding answers use same free-text path (UI copy → Story 4)
3. ✅ Synced `extraction-strict-validation.ts` allowlist (`DOMAIN_ALLOWED` 33/19)
4. ✅ Unit tests: high/low/null + OOR + partner smoke (mocked LLM)
5. ✅ Hebrew regression fixtures → Story 5 (`expansion-10-extraction-fixtures.json`)

**Acceptance Criteria:**
- ✅ LLM-only; null when unclear
- ✅ NO hardcoded patterns
- ✅ >85% agreement on validation set — Story 5 (**100%**)

**Files (as-built):**
- `dating-api/src/extraction/expansion-10-signal-definitions.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-strict-validation.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`
- `dating-api/src/extraction/extracted-signals.spec.ts`

---

### STORY 3: Tension Rules ✅ Done
**Points:** 4  
**Owner:** Backend

**As-built:** Three shadow friction rules after `chronotype_clash` — `repair_skills_gap` (5), `both_low_repair` (6), `forgiveness_style_gap` (4). `EnrichedSignals` + English `TENSION_CHIP_BY_ID`. Both-low fires recovery-risk chip without gap. Friction affects `finalScore` when rules fire; keys still not in `COMPATIBILITY_SIGNAL_KEYS`. Positive chips / i18n → Story 4.

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

**Tension chips (as-built):**
- `repair_skills_gap`: `Different repair styles`
- `both_low_repair`: `Conflict recovery risk`
- `forgiveness_style_gap`: `Different forgiveness pace`

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

**As-built:** Shadow positive chips via `expansion-10-explainability.ts` (not scored `POSITIVE_CHIP_BY_SIGNAL`). Labels `Conflict recovery` / `Letting go & moving forward`; EN/HE/ES browse evidence; `CHIP_EVIDENCE_KEYS` **29 → 31**. Phase 6 onboarding writing prompts appended to `writingPrompts.aboutMe.questions` (EN/HE/ES) — no new form fields. Scoring promote deferred (Story 5 engineering gate closed without promote).

| Signal | Chip Label | Evidence EN | Evidence HE | Evidence ES |
|--------|-----------|-------------|-------------|-------------|
| `repairSkills` | Conflict recovery | You both know how to apologize and reconnect after disagreements | שניכם יודעים להתנצל ולהתחבר מחדש אחרי ויכוחים | Ambos saben disculparse y reconectar después de un desacuerdo |
| `forgivenessStyle` | Letting go & moving forward | You both let go of conflict and move forward at a similar pace | שניכם משחררים קונפליקטים וממשיכים הלאה בקצב דומה | Ambos dejan ir los conflictos y siguen adelante a un ritmo similar |

**Onboarding prompts (as-built):** appended to About-me writing ideas — "When we disagree, I usually…" / "After a fight, I tend to…" (+ HE/ES).

**Files (as-built):**
- `dating-api/src/matches/expansion-10-explainability.ts`
- `dating-api/src/matches/match-explainability.ts`
- `dating-api/src/matches/compare-stages/assemble-result.ts`
- `dating-api/src/matches/match-explanation-traits.ts`
- `dating-ui/src/app/dating/me-matches/chip-evidence.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`

**Acceptance Criteria:**
- ✅ 2 chips in EN/HE/ES
- ✅ Onboarding prompt copy translated

---

### STORY 5: Testing, Validation & Regression ✅ Done
**Points:** 8  
**Owner:** QA + Backend + PM

**As-built (engineering gate):** `compare()` E2E (**12** tests) for 3 tensions, positive chips, `both_low_repair` exclusivity, alignments exclusion, compatibility invariance, Exp-07/09 non-regression. Rollout gate (`expansion-10-rollout.spec.ts`). Live fixtures + `validate:expansion-10-extraction` (EN + Hebrew + null/distinction; **100%** agreement). UI tension passthrough. Shadow unchanged — **no promote** to `COMPATIBILITY_SIGNAL_KEYS`. Agent 4 skipped. Admin / browse QA / promote deferred to operator / future promote story.

**Fixtures (as-built in `expansion-10-extraction-fixtures.json`):**

| Text / case | Expected |
|------|----------|
| "I always apologize first and want to reconnect fast after we fight." | `repairSkills` 7–10 |
| "I shut down and need a lot of space, rarely bring it up again after a fight." | `repairSkills` 1–5 (soft / human-review band) |
| "I don't hold grudges, once we talk it's done." | `forgivenessStyle` 7–10 |
| "Old fights tend to resurface for me and it's hard to let go." | `forgivenessStyle` 1–4 |
| No conflict-related text | both → null (`allowNull`) |
| Hebrew high repair / high+low forgiveness | ≥3 HE rows |
| "I need space after a fight." alone | `repairSkills` prefer null (`allowNull`) |
| During-conflict only (no aftermath) | Exp-10 keys prefer null (`allowNull`) |

**Tests (as-built):**
- ✅ Extraction unit tests — Story 2 (not re-duplicated)
- ✅ Friction unit tests — Story 3 (not re-duplicated)
- ✅ Integration: `compare()` Expansion-10 E2E (**12**)
- ✅ Rollout gate counts: shadow **26** / total **41** / evidence **45** / DOMAIN self **33** / partner **19** / scored **15** / chips **31**
- ✅ UI: chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- ✅ Live LLM ≥85% — **100%** (12/12 scored expectations)

**Files (as-built):**
- `dating-api/src/matches/match-engine.spec.ts`
- `dating-api/src/extraction/expansion-10-rollout.spec.ts`
- `dating-api/data/expansion-10-extraction-fixtures.json`
- `dating-api/scripts/validate-expansion-10-extraction.ts`
- `dating-api/package.json` (`validate:expansion-10-extraction`)
- `dating-ui/.../match-why-section.spec.tsx`

**Rollout gate (engineering):**
- [x] 2 new signals extract with >85% agreement on validation set (**100%**)
- [x] Hebrew fixtures present + live pass rate ≥85%
- [x] 3 tension rules tested (`compare()` E2E + Story 3 units)
- [x] Chips EN/HE/ES (Story 4) + tension passthrough (Story 5)
- [x] No regression on Exp-07 E2E / scored set still **15**
- [ ] Promote shadow keys → scoring registries (product “36”) — **deferred** (explicit future promote story)

---

## Definition of Done

- [x] All 5 stories completed (engineering gate)
- [x] 15 scored + 26 shadow validated (**41** extraction total); scored “36” deferred to promote
- [x] Onboarding prompts live in profile creation flow (About-me writing ideas; optional)
- [x] NO hardcoded patterns anywhere (LLM-first)
- [ ] Compatibility scoring promote / “36 live” — **deferred**

---

## Sprint deliverables (as-built)

| Layer | Delivered |
|-------|-----------|
| Schema | `repairSkills`, `forgivenessStyle` on `SHADOW_SIGNAL_KEYS` |
| Extraction | Self + partner LLM prompts (`expansion-10-signal-definitions.ts`) |
| Friction | 3 tension rules + English chip labels |
| Display | 2 positive chips + EN/HE/ES evidence + onboarding prompts |
| Validation | Match-engine E2E + rollout gate + fixtures + live LLM script + UI |
| **Not delivered** | Promote to `COMPATIBILITY_SIGNAL_KEYS` / scored “36” / Exp-08 sibling chips |

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-10 section.
