# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-06 with **integration tests**, **adjacent-signal distinction regression**, **optional live LLM validation**, and a **lightweight 10-chip i18n presence check**. **No** promote to scoring / no new extraction logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-05 Story 5 (single-signal variant like Expansion-03). **No** Phase 1 EQ gate. This is the **final expansion sprint** engineering close-out.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate extraction tests in `evaluate.service.spec.ts` — Story 2 already covers mocked LLM extraction in `extraction.service.spec.ts` (Expansion-06 describe).
- Add **`match-engine.spec.ts`** describe for Expansion-06: tension chip, positive chip, alignments exclusion, compatibility invariance, Expansion-05 non-regression, **adjacent-signal / interest distinction**.
- Add **optional operator script** for live LLM quality (`>85%` within bands) — **not a CI gate** unless `OPENAI_API_KEY` present.
- Fixtures must emphasize **novelty vs routine** (not tempo / homebody / travel-tag-only).
- **UI tests:** Expansion-06 positive chip EN/HE already in Story 4. Story 5 adds **tension chip passthrough** for `Novelty vs routine`.
- **README “full expansion checklist”:** Engineering Story 5 covers Exp-06 thoroughly + documents deferred operator items (correlation matrix, P95, A/B, backfill, scoring rollout). Do **not** enable scoring promote.
- Agent 4 **skipped**.
- Closes Expansion-06 **engineering gate** and the **10-signal expansion set in shadow mode**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow key | `adventureNovelty` on `evaluation.self.signals` — in `SHADOW_SIGNAL_KEYS` only (alias `noveltyVsRoutine` at extraction) |
| Friction | Story 3: `novelty_routine_clash` (penalty **4**) |
| Positive chip | Story 4 `expansion-06-explainability.ts` — `Adventure & novelty` |
| Expansion-01–05 E2E | Existing `describe('Expansion-0N shadow E2E via compare')` blocks — must not regress |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-06 — **do not duplicate** |
| Adjacent keys | `lifestylePace`, `domesticComfort`, `structureChaosTolerance`, travel/adventure interest tags |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow count | **15** shadow / **30** total / `MAX_EVIDENCE_ITEMS === 34` |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Extraction + integration + full i18n sweep | **`compare()` E2E** + live fixture script + chip-evidence locale presence check |
| All 10 new signals >85% agreement | **Exp-06 live script ≥85%** this story; prior Exp-01–05 scripts remain operator re-runs — do not invent a mega-script unless cheap to document as follow-up |
| All 10 tension rules tested | Prior sprints + Exp-06 E2E; Story 5 asserts Exp-06 rule + Expansion-05 non-regression spot-check |
| All 10 chips EN/HE/ES | **chip-evidence.spec** already loops locales; Story 5 adds assert that the **10 expansion chip labels** are present in `CHIP_EVIDENCE_KEYS` (list locked below) |
| Correlation matrix / P95 / A/B / backfill | **Deferred** operator — document in agent-1/3 handoffs, not code gates |
| Rollout: enable all 10 in scoring | **Forbidden** in Story 5 — shadow lock; promote is a future explicit story |
| 25-signal system validated / Project Complete | **Engineering:** 15 scored + 10 expansion product signals **in shadow**. “Live scored 25” only after promote |

---

## Artifacts (agent 1)

### Backend — integration tests

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | Add `makeProfileWithExpansion06Shadow` + `describe('Expansion-06 shadow E2E via compare')` |
| `dating-api/data/expansion-06-extraction-fixtures.json` | **Create** — curated `aboutMe` + expected bands (distinction-aware) |
| `dating-api/scripts/validate-expansion-06-extraction.ts` | **Create** — live LLM validation (mirror Expansion-05 script) |
| `dating-api/package.json` | Add `"validate:expansion-06-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend — UI / i18n

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Add Expansion-06 **tension chip** passthrough (`Novelty vs routine`) |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Assert the **10 expansion chip labels** are in `CHIP_EVIDENCE_KEYS` (and still covered by locale loop) |

### Docs (agent 3)

| Path | Change |
|------|--------|
| `README.md` (sprint-expansion-06) | Mark Story 5 Done; sprint engineering complete; DoD checked with deferred operator notes |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate.service.spec.ts` | Story 2 lock |
| `compatibility-score.ts` / promote / scoring rollout | Future promote sprint |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Expansion-06 positive chip UI tests | Story 4 done |
| Phase 1 EQ orchestrator | Expansion-03 only — **do not add** |
| Browser E2E / Playwright | Out of repo pattern |
| Interest / official signal code changes | Assert distinction only — **no edits** to those modules |
| Correlation matrix tooling / A/B plan docs as code | Operator follow-up |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine integration helper (locked)

Add separate helper (do not break Expansion-01–05 helpers):

```typescript
type Expansion06ShadowKey = 'adventureNovelty';

function makeProfileWithExpansion06Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion06ShadowKey, number | null>>,
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

Use **neutral official signals** (`makeSignals({})`) unless a test needs friction boost.

### 2. Integration test matrix (locked)

Add `describe('Expansion-06 shadow E2E via compare')` with **≥9** tests:

| Test | Setup | Expect |
|------|-------|--------|
| Shadow key ∉ scored keys | static assert | `adventureNovelty` not in `COMPATIBILITY_SIGNAL_KEYS`; length still **15** |
| Novelty clash → tension chip | A `adventureNovelty: 9`, B `2` | `tensionChip === 'Novelty vs routine'`; `friction >= 3`; `novelty_routine_clash` in matrix |
| High novelty → positive chip | both `adventureNovelty: 8` | `positiveChips` contains `'Adventure & novelty'` |
| Shadow absent from alignments | both high | `alignments` keys exclude `adventureNovelty` / `'Adventure & novelty'` |
| Null shadow → no chip / no rule | A `8`, B `null` | no positive chip; no `novelty_routine_clash` |
| Compatibility invariance | same official; only shadow differs | `compatibility` equal between aligned-high vs gap pairs |
| Expansion-05 non-regression | activity gap pair | `tensionChip === 'Different activity levels'` |
| Adjacent ≠ Expansion-06 key | static | `adventureNovelty` ∉ `INTEREST_CANONICAL_TAGS`; !== `lifestylePace` / `domesticComfort` |
| Interest coexistence (recommended) | both share `interestsTop3: ['travel']` **and** both high `adventureNovelty: 8` | `interestAlignment === 100`; `positiveChips` contains `'Adventure & novelty'` |

**Friction note:** Penalty **4** alone yields `friction >= 3` → surfaces `tensionChip`.

### 3. Adjacent-signal distinction (locked)

README requires distinction from pace + travel tags. Lock:

1. **Static asserts** in Expansion-06 describe:
   - `adventureNovelty` ∉ `INTEREST_CANONICAL_TAGS`
   - `adventureNovelty` !== `'lifestylePace'` / `'domesticComfort'` / `'socialBattery'`
2. **Live fixtures** (§4) must use **novelty vs routine** language:
   - High = seeks new experiences / variety / spontaneous new places
   - Low = creature of habit / familiar routines
   - Avoid tempo-only (“busy life”) as high novelty fixtures
   - Avoid homebody-only as high/low novelty fixtures
   - Avoid travel-tag-only (“I like travel”) without preference intensity as high band

Do **not** hardcode anti-correlation scoring. Do **not** edit official signal definitions.

### 4. Live LLM validation script (locked — optional gate)

**File:** `dating-api/data/expansion-06-extraction-fixtures.json`

Minimum **6 fixtures** (3 high, 3 low). Example entries:

```json
[
  {
    "id": "novelty_high_01",
    "aboutMe": "I love trying new places and hate doing the same thing twice. Spontaneous trips keep me alive.",
    "signal": "adventureNovelty",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "novelty_low_01",
    "aboutMe": "I am a creature of habit. I prefer the places and routines I know and do not need novelty to be happy.",
    "signal": "adventureNovelty",
    "expectedMin": 1,
    "expectedMax": 4
  }
]
```

Use semantic texts aligned with Story 2 — **no regex scoring in script**.

**File:** `dating-api/scripts/validate-expansion-06-extraction.ts`

Mirror Expansion-05 script:

- Signal: `'adventureNovelty'`
- Fixtures: `data/expansion-06-extraction-fixtures.json`
- Agreement threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold

**package.json:**

```json
"validate:expansion-06-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-06-extraction.ts"
```

### 5. UI component test (locked — delta only)

Story 4 already covers Expansion-06 positive chip EN/HE evidence.

Story 5 adds **≥1** test:

| Test | Expect |
|------|--------|
| Tension chip passthrough — Expansion-06 | `tensionChip: 'Novelty vs routine'` renders as-is |

### 6. Ten expansion chip i18n presence (locked)

In `chip-evidence.spec.ts`, add a focused test that `CHIP_EVIDENCE_KEYS` includes exactly these expansion product chips (order irrelevant):

```typescript
const EXPANSION_PRODUCT_CHIPS = [
  'Understanding & care',
  'Authentic openness',
  'Emotional balance',
  'Affection rhythm match',
  'Shared playfulness',
  'Mental stimulation',
  'Creative expression',
  'Activity level match',
  'Home/out balance',
  'Adventure & novelty',
] as const;
```

Existing locale loop already asserts non-empty evidence for every `CHIP_EVIDENCE_KEYS` entry — that covers EN/HE/ES for all 10.

### 7. Regression suite (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-06"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-05"
npx jest src/matches/expansion-06-explainability.spec.ts src/matches/match-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-06"
npm run typecheck

cd dating-ui
npm test -- match-why-section.spec.tsx chip-evidence.spec.ts
```

Optional: `npm run validate:golden-pairs` — document SKIP if no DB.  
Optional: `npm run validate:expansion-06-extraction` — document SKIP or % agreement.

### 8. Shadow mode preserved (locked)

Story 5 tests must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- `adventureNovelty` ∉ `COMPATIBILITY_SIGNAL_KEYS`
- `alignments` excludes Expansion-06 shadow key
- Expansion-01–05 integration tests still pass

### 9. Agent 4

**Skip** — validation story only.

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-06 integration tests | ≥9 cases in matrix §2 |
| Expansion-05 non-regression | Spot-check still passes |
| Adjacent-signal distinction | Static asserts + distinction-aware fixtures §3–4 |
| UI tension chip test | ≥1 new case §5 |
| 10 expansion chips in `CHIP_EVIDENCE_KEYS` | §6 assert |
| Existing Expansion-06 unit tests still pass | extraction + friction + explainability |
| Optional live LLM script + fixtures | Present; skips without API key |
| Shadow scoring promote | **Not in scope** |
| Correlation / P95 / A/B / backfill / 50-profile study | Operator follow-up |
| Browse visual QA | Document SKIP / checklist — not blocking |
| Sprint README Story 5 + DoD | Updated by agent 3 |

---

## API contracts

No DTO changes. Tests validate existing:

- `explainability.positiveChips` — `'Adventure & novelty'`
- `explainability.tensionChip` — `'Novelty vs routine'`
- `alignments[].key` — official keys only
- `compatibility`, `friction`, `finalScore`

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Manual browse smoke checklist for agent 1 handoff:

1. Re-analyze 2 test profiles with novelty/routine `aboutMe` text.
2. Compare or browse — confirm positive/tension chips when values warrant.
3. Confirm busy-tempo-only text does not falsely drive high novelty chips; travel-tag-only without preference intensity does not.
4. Switch locale HE/ES — evidence localized.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion06Shadow` + `describe('Expansion-06 shadow E2E via compare')` to `match-engine.spec.ts`.
2. Create fixtures JSON + validation script + npm script (distinction-aware texts).
3. Add Expansion-06 tension chip UI test + 10-chip presence assert in `chip-evidence.spec.ts`.
4. Run regression commands; document golden-pairs / live LLM / browse SKIP or results in handoff.
5. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
test(expansion-06): match-engine integration, fixtures, optional LLM validation

Story 5 — closes Expansion-06 engineering validation; shadow mode unchanged.
```

Suggested **sprint rollup commit** (when user requests, Stories 1–5):

```
feat(expansion-06): shadow adventureNovelty — extract, friction, chips, validation

Expansion-06 complete in shadow mode; closes 10-signal expansion set; no compatibility scoring promote yet.
```

---

## Agent 2 CR checklist

- [ ] Integration tests use `compare()` not fictional helpers
- [ ] No duplicate extraction tests in `evaluate.service.spec.ts`
- [ ] `alignments` exclusion asserted
- [ ] Compatibility invariance test present
- [ ] Tension rule surfaces solo tensionChip (penalty 4)
- [ ] Adjacent distinction asserts present; fixtures avoid tempo/homebody-only high bands
- [ ] Expansion-05 E2E still passes
- [ ] Live script uses real extraction path; no regex scoring
- [ ] Script skips without API key (exit 0)
- [ ] Shadow key still not in `COMPATIBILITY_SIGNAL_KEYS`
- [ ] 10 expansion chips present in `CHIP_EVIDENCE_KEYS`
- [ ] No Phase 1 EQ gate / no scoring promote
- [ ] All tests pass

---

## Open questions / blockers

- None blocking Story 5 implementation.
- **Post-sprint / promote story:** Promote Expansion-01–06 (10 keys) into `COMPATIBILITY_SIGNAL_KEYS` only after operator re-runs live validators + explicit promote sprint; consolidate overlay modules; re-run golden pairs after re-analysis cohort.
- **Live LLM:** If agreement < 85%, operator tunes prompts before promote — script correctly exits 1.

---

## Next agent

```text
--agent 1 expansion 06 story 5
```

**Notes:** Final story in Expansion-06 and final expansion sprint engineering close. After agent 3 PM sign-off, the **10 expansion signals are complete in shadow mode**. Next roadmap item is promote / monitoring — not another expansion signal sprint.
