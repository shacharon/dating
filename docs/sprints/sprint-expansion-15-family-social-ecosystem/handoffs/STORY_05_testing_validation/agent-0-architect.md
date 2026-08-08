# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation, Full Phase 6 Rollout Gate](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-15 (and Phase 6 **engineering** gate) with **`compare()` E2E**, **fixtures + optional live LLM validation**, **UI tension passthrough**, and a **documented Phase 6 checklist** disposition. **No** promote to scoring / no new extraction, tension, or chip logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-14 Story 5 (multi-signal shadow E2E + optional live script + rollout gate). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-15 E2E: three tensions, three dual-band positive chips, tension/positive exclusivity, alignments exclusion, compatibility invariance, Exp-14 non-regression spot, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew** rows — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 covers positive chips + onboarding. Story 5 **adds** Exp-15 **tension** chip passthrough (≥1; prefer all three) + re-asserts registry (`CHIP_EVIDENCE_KEYS` **43**).
- **README “Enable all 14 in scoring” / product “48” scored:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story (same as Exp-01–14).
- **Phase 6 checklist:** Close what engineering can prove; soft-skip operator/product items (§10).
- Agent 4 **skipped**.
- Closes Expansion-15 **engineering gate** in shadow mode (final sprint of Phase 6).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (3) | `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` |
| Friction (Story 3) | `family_enmeshment_gap` (4, ≥8 vs ≤3); `friend_couple_balance_gap` (3); `alone_time_need_gap` (3) |
| Positive chips (Story 4) | All dual-band: both ≥7 **or** both ≤3 → `Family style match` / `Friends & couple balance` / `Recharge style match` |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **38** shadow / **53** total / `MAX_EVIDENCE_ITEMS === 57` |
| Self / partner `DOMAIN_ALLOWED` | **45** / **31** |
| `CHIP_EVIDENCE_KEYS` | **43** (Story 4) |
| Domains | family chip → **`relationship`**; friend/couple + recharge → **`social`** |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-15 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-15 — **do not duplicate** |
| Adjacent collision risks | `traditionalism`, `socialBattery`, `independence` |
| Meta vs browse chips | Meta `Family closeness` / `Alone time needs` ≠ browse `Family style match` / `Recharge style match`; browse `Friends & couple balance` may equal meta |
| Tension vs browse | `Friends vs couple time` ≠ `Friends & couple balance` |
| Polarity | `friendCoupleBalance` **low = friends-first, high = couple-centric** — do not invert fixtures |
| Live scripts today | Exp-01–07, Exp-09–14 exist; **no** Exp-15 yet |
| Exp-14 rollout counts | Already bumped to post–Exp-15 totals (38/53/57/45/31) — do **not** reverse |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (7 texts) | **In scope** — fixtures JSON + optional live script |
| >85% agreement | **Optional live script** — skip exit 0 without API key; not CI hard gate |
| Hebrew fixtures pass | Represented in fixtures JSON; live when key present |
| Tension + positive chips tested | **`compare()` E2E** — cover **all three** tensions + **all three** dual-band positives |
| Chips EN/HE/ES | Story 4 done; Story 5 **re-asserts** registry + **adds** tension passthrough |
| Phase 6 checklist (all 14 >85%, correlation, A/B, backfill, scoring enable) | **§10** — engineering close vs operator/product soft-skip |
| “Enable all 14 in scoring” / “48-signal system validated” scored | **Forbidden** — shadow engineering complete; future promote story |
| Extraction unit tests (high/low/null) | **Already Story 2** — do not re-add |
| Keyword / regex extraction | **Forbidden** |
| Expansion-08 chips | **Out of scope** |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion15Shadow` + `describe('Expansion-15 shadow E2E via compare')` |
| `dating-api/src/extraction/expansion-15-rollout.spec.ts` | **Create** — thin rollout gate asserts (§3) |
| `dating-api/data/expansion-15-extraction-fixtures.json` | **Create** — README + Hebrew + null/distinction rows |
| `dating-api/scripts/validate-expansion-15-extraction.ts` | **Create** — live LLM validation (mirror Exp-14) |
| `dating-api/package.json` | `"validate:expansion-15-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | Add Exp-15 **tension** chip passthrough (≥1; prefer all three) |
| `dating-ui/.../chip-evidence.spec.ts` | Verify Exp-15 three labels still in keys (length **43**) — already Story 4; extend only if missing |

### Docs (agent 3)

| Path | Change |
|------|--------|
| Sprint README Story 5 + DoD + Phase 6 checklist | Mark Done (engineering); promote deferred; checklist disposition; operator notes |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility-score.ts` / promote / weight wiring | Future promote story |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Story 2/3 unit matrices | Already green |
| Expansion-08 chips / validate script | Separate unfinished sprint |
| Full live >85% across Exp-10–14 | Operator runs existing validate scripts — not this story’s code |
| Correlation matrix / A/B plan / backfill implementation | Product / ops soft-skip (§10) |
| Admin match-quality deep UI | Defer / SKIP |
| Browser Playwright | Out of pattern |
| Keyword / regex extraction | Forbidden |
| Downgrade Exp-14 rollout counts | Counts already include Exp-15 |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine helper (locked)

```typescript
type Expansion15ShadowKey =
  | 'familyEnmeshment'
  | 'friendCoupleBalance'
  | 'aloneTimeNeed';

function makeProfileWithExpansion15Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion15ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}
```

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–14 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-15 shadow E2E via compare')` with **≥15** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | all three ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ≠ `traditionalism` / `socialBattery` / `independence`; ∉ interest tags |
| 3 | Family enmeshment gap | A family 9 / B 2 | `tensionChip === 'Family involvement gap'`; `family_enmeshment_gap`; `friction >= 4` |
| 4 | Friend–couple balance gap | A balance 9 / B 2 | `Friends vs couple time`; `friend_couple_balance_gap`; `friction >= 3` |
| 5 | Alone-time need gap | A alone 9 / B 2 | `Different alone-time needs`; `alone_time_need_gap`; `friction >= 3` |
| 6 | Positive Family style match (both high) | both family 8 | `positiveChips` contains `'Family style match'` |
| 7 | Positive Family style match (both low) | both family 2 | contains `'Family style match'` |
| 8 | Positive Friends & couple balance (both couple-centric) | both balance 8 | contains `'Friends & couple balance'` |
| 9 | Positive Friends & couple balance (both friends-first) | both balance 2 | contains `'Friends & couple balance'` |
| 10 | Positive Recharge style match (both high alone) | both alone 8 | contains `'Recharge style match'` |
| 11 | Positive Recharge style match (both low alone) | both alone 2 | contains `'Recharge style match'` |
| 12 | Family tension pair **no** Family style match | A 9 / B 2 | **does not** contain `'Family style match'` (may show tension) |
| 13 | Alignments exclusion | both high family | alignments exclude Exp-15 keys / browse labels / meta `Family closeness` |
| 14 | Null shadow → no family gap | A family 9 / B null | no `family_enmeshment_gap` |
| 15 | Compatibility invariance | same official; only Exp-15 shadow differs | `compatibility` equal |
| 16 | Exp-14 non-regression | patienceTolerance 9 vs 2 **or** monogamy 2 vs 9 | still Exp-14 tension chip |
| 17 | Mid dual-band **no** positive (recommended) | both family 5 | **does not** contain `'Family style match'` |

**Friction note:** Family gap penalty **4** dominates Exp-15 peers (3). When asserting friend/couple or alone-time tension chips, keep other Exp-15 signals **null** and avoid stacking family gap. For family (#3), leave friend/alone null so `Family involvement gap` wins cleanly.

**Positive-chip note:** All three are **dual-band ≥7 or ≤3**. Tension pairs (9 vs 2) and mid (5/5) must **never** emit the matching browse positives.

**Polarity note:** `friendCoupleBalance` high = couple-centric; low = friends-first — both poles correctly emit `Friends & couple balance`.

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-15-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Shadow membership | `SHADOW_SIGNAL_KEYS` contains all three; length **38** |
| Total / evidence | `EXTRACTION_SIGNAL_KEYS.length === 53`; `MAX_EVIDENCE_ITEMS === 57` |
| Not scored | all three ∉ `COMPATIBILITY_SIGNAL_KEYS`; scored length **15** |
| DOMAIN_ALLOWED | self contains all three (length **45**); partner contains all three (**31**); relationship does not |
| Meta | `EXPANSION_15_PROMOTION_*` weights/tiers/domains/chips match Story 1 (meta chips OK here; domains **relationship/social/social**; weights **1.2/1.1/1.2**; tiers **2/3/2**) |
| Chip labels | `SHADOW_POSITIVE_CHIP_BY_SIGNAL` from `expansion-15-explainability` — three browse labels; domains relationship/social/social |
| Tension ids present | `tensionRules` includes `family_enmeshment_gap`, `friend_couple_balance_gap`, `alone_time_need_gap` |

Do **not** re-test full Story 2/3 matrices here.  
Do **not** weaken Exp-14 rollout counts — they already reflect Exp-15 totals.

### 4. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-15-extraction-fixtures.json`  
(Force-add if `/data` is gitignored — same as Exp-14.)

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| README EN high/low/null | ≥7 | Table rows (widen bands for live LLM: high **7–10** / low **1–4** where README was 8–9 / 9–10 / 1–2 / 2–3) |
| Hebrew family high / friends-first low / alone high | ≥3 | Semantic HE text from Story 2 / Phase 6 |
| Traditionalism-alone → family null | ≥1 | `allowNull` on `familyEnmeshment` |
| SocialBattery-alone → friendCouple null | ≥1 | Prefer null on `friendCoupleBalance` (`allowNull`) |
| Independence-alone → aloneTime null | ≥1 | Prefer null on `aloneTimeNeed` (`allowNull`) |

**Schema (locked — Exp-14 shape):**

```typescript
interface Expansion15Expectation {
  signal: 'familyEnmeshment' | 'friendCoupleBalance' | 'aloneTimeNeed';
  expectedMin: number;
  expectedMax: number;
  allowNull?: boolean;
}

interface Expansion15Fixture {
  id: string;
  aboutMe: string;
  signal?: 'familyEnmeshment' | 'friendCoupleBalance' | 'aloneTimeNeed';
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion15Expectation[];
}
```

Example README-aligned rows:

```json
{
  "id": "family_high_en",
  "aboutMe": "My family is very involved, we talk daily and they weigh in on decisions",
  "signal": "familyEnmeshment",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "family_low_en",
  "aboutMe": "I make my own decisions independently of family",
  "signal": "familyEnmeshment",
  "expectedMin": 1,
  "expectedMax": 4
}
```

```json
{
  "id": "friend_couple_high_en",
  "aboutMe": "I like most of my free time to be with my partner",
  "signal": "friendCoupleBalance",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "friend_couple_low_en",
  "aboutMe": "My friend group is a huge part of my identity",
  "signal": "friendCoupleBalance",
  "expectedMin": 1,
  "expectedMax": 4
}
```

```json
{
  "id": "alone_high_en",
  "aboutMe": "I need my own space and time to recharge",
  "signal": "aloneTimeNeed",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "alone_low_en",
  "aboutMe": "I want to spend as much time together as possible",
  "signal": "aloneTimeNeed",
  "expectedMin": 1,
  "expectedMax": 4
}
```

**Polarity reminder:** friendCoupleBalance low = friends-first; high = couple-centric — do not invert fixture expectations.

Keep **semantic** — no keyword scoring in script.

### 5. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-15-extraction.ts`

Mirror Exp-14:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass; `allowNull` passes on null
- Agreement = passes / scored; **null when band expected (without allowNull) fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-15-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-15-extraction.ts"
```

### 6. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-15 | Add `Family involvement gap` and/or `Friends vs couple time` and/or `Different alone-time needs` renders as-is |
| Chip registry | Exp-15 three labels still in `CHIP_EVIDENCE_KEYS` (length **43**) |

Positive chip EN/HE + onboarding prompts already Story 4 — do not require re-tests unless broken.

### 7. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-15"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-14"
npx jest src/extraction/expansion-15-rollout.spec.ts --runInBand
npx jest src/matches/expansion-15-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-15"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-15|Family involvement|Friends vs couple|Different alone-time"
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-15-extraction` — document SKIP or % agreement in handoff.  
Optional: Exp-13 E2E spot `-t "Expansion-13"`.

### 8. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- All Exp-15 keys ∉ scored set
- `alignments` exclude Exp-15 shadow keys / positive chip labels
- Exp-01–14 integration describes still pass (spot-check Exp-14)
- **No** promote / weight wiring / move to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- **No** use of meta chips `Family closeness` / `Alone time needs` as browse positives (friends/couple string equality OK)
- **No** invert `friendCoupleBalance` polarity
- **No** invent Expansion-08 work

### 9. Agent 4

**Skip.**

### 10. Phase 6 checklist disposition (locked)

| Checklist item | Story 5 disposition |
|----------------|---------------------|
| All 14 signals extract with >85% agreement | **Operator** — optional `validate:expansion-10`…`15` with API key; Exp-15 fixtures/script ship here; **not** CI hard gate |
| All 14 corresponding tension rules tested | **Engineering** — Exp-15 via §2 E2E; prior Exp-10–14 already have E2E (spot Exp-14) |
| All chips display in EN/HE/ES | **Engineering** — Exp-15 Story 4 done; re-assert registry **43** |
| Onboarding prompts live for all 6 sprints' topics | **Engineering** — Exp-15 prompts appended Story 4; PM may note prior Exp-10–14 prompts already present |
| Correlation matrix across ~48 signals | **Soft-skip** — product/ops after promote; do not invent a matrix in code |
| No regression on Expansion 01–09 | **Engineering** — scored still **15** + Exp-14 spot |
| Chip diversity including `personal` | **No change** — Exp-13 already wired `personal`; Exp-15 uses relationship/social |
| A/B test plan for Phase 6 (10% rollout) | **Soft-skip** — product later; document only |
| Backfill strategy (re-extraction) | **Soft-skip** — document “re-extract on promote”; no implementation |
| Enable all 14 in scoring | **Forbidden** this story |

Agent 3 marks checklist items Done / Deferred accordingly in sprint README — do **not** claim scored “48 live” until promote.

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-15 E2E | ≥15 cases in matrix §2 |
| Expansion-14 non-regression | Spot-check still passes |
| Rollout gate spec | Present + green |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew rows represented in fixtures | ≥3 HE |
| UI Exp-15 tension passthrough | ≥1 |
| Exp-15 chips in `CHIP_EVIDENCE_KEYS` | Still **43** / three labels |
| Existing Exp-15 unit suites still pass | extraction + friction + explainability |
| Phase 6 checklist disposition | Documented (§10); promote **not** claimed |
| Scoring promote | **Not in scope** |

---

## Service signatures

No new public product APIs. Script-only:

```typescript
// scripts/validate-expansion-15-extraction.ts — CLI
```

---

## API / HTTP contracts

No DTO changes. Existing explainability fields already emit Exp-15 chips/tensions when rules fire.

---

## Runtime topology

N/A for unit/E2E. Live script needs Nest app + `OPENAI_API_KEY`.

---

## E2E verification

Agent 4 skipped. Deterministic `compare()` E2E is the Story 5 gate. Live LLM optional.

---

## Tests / verification (agent 1)

See §7 commands. Architect: not run.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion15Shadow` + Expansion-15 `compare()` E2E matrix (§2) — dual-band positives + all three tensions.
2. Create `expansion-15-rollout.spec.ts` (§3).
3. Create fixtures JSON + validate script + package.json script (§4–5); force-add fixtures if gitignored.
4. Add UI tension passthrough + confirm chip registry (§6).
5. Run regression commands (§7); optionally run live validator and record SKIP/% .
6. **Do not** promote to scored keys, change extraction prompts, invent Exp-08 work, or claim Phase 6 scoring enable.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-15-family-social-ecosystem/handoffs/STORY_05_testing_validation/`. Do not commit unless user asks.

Suggested commit:

```
test(matching): Expansion-15 family social ecosystem E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```

---

## Agent 2 CR checklist

- [ ] ≥15 Expansion-15 `compare()` E2E cases with exact tension/chip labels
- [ ] All three tensions + all three dual-band positive chips covered
- [ ] Family tension pair → **no** `Family style match`; both-high **and** both-low → positive
- [ ] `friendCoupleBalance` polarity not inverted (friends-first low / couple-centric high)
- [ ] Rollout gate asserts counts (38/53/57/45/31/15) + chip map keys + domains
- [ ] Fixtures cover README + Hebrew + null/distinction cases
- [ ] Validate script mirrors Exp-14; skip without API key; no regex scoring
- [ ] UI Exp-15 tension passthrough present
- [ ] **No** `COMPATIBILITY_SIGNAL_KEYS` / weight promote
- [ ] Prior expansion helpers/specs not broken; Exp-14 rollout counts not reversed
- [ ] Regression commands pass
- [ ] Phase 6 promote / scoring enable **not** implemented

---

## Open questions / blockers

- None blocking Story 5 engineering close.
- **Operator:** Run `npm run validate:expansion-15-extraction` (and prior Exp-10–14 validators) with API key before any future promote.
- **Future:** Explicit promote sprint to move Phase 6 expansion keys into scored registries — do **not** treat README “48” / “Enable all 14” as this story’s deliverable.
- **Exp-08** remains unfinished sibling debt (no Exp-15 dependency).
- **Phase 6 product ops:** correlation / A/B / backfill remain post-promote work.

---

## Next agent

```text
--agent 1 expansion 15 story 5
```

**Notes:** Keep shadow. Mirror Exp-14 Story 5. Live >85% is optional operator gate, not CI. All three dual-band positives + three tension gaps are the Exp-15-specific locks. Meta chips ≠ browse chips (except friends/couple string). Phase 6 scoring enable forbidden. This closes Phase 6 **engineering** in shadow mode.
