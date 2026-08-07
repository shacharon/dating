# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-05 with **integration tests**, **adjacent-signal distinction regression**, and **optional live LLM validation script**. **No** promote to scoring / no new extraction logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-04 Story 5 (two shadow signals). **No** Phase 1 EQ gate (that was Expansion-03 only).

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate extraction tests in `evaluate.service.spec.ts` — Story 2 already covers mocked LLM extraction in `extraction.service.spec.ts` (Expansion-05 describe).
- Add **`match-engine.spec.ts`** describe block for Expansion-05: tension chips, positive chips, alignments exclusion, compatibility invariance, Expansion-04 non-regression, **adjacent-signal / interest distinction**.
- Add **optional operator script** for live LLM quality (`>85%` within bands) — **not a CI gate** unless `OPENAI_API_KEY` present.
- Fixtures must emphasize **behavior vs wellness** and **home-vs-out vs social energy / pace** (README “no false correlation”).
- **UI tests:** Expansion-05 positive chips EN/HE already in Story 4. Story 5 adds **tension chip passthrough** for `Different activity levels` (optional: also `Home vs out mismatch`).
- Agent 4 **skipped**.
- Closes sprint **engineering gate**; 50-profile human rating remains operator follow-up.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys | `physicalActivityLevel`, `domesticComfort` on `evaluation.self.signals` — in `SHADOW_SIGNAL_KEYS` only |
| Friction | Story 3: `activity_level_gap` (penalty **3**), `domestic_out_mismatch` (penalty **3**) |
| Positive chips | Story 4 `expansion-05-explainability.ts` — `Activity level match` / `Home/out balance` |
| Expansion-01–04 E2E | Existing `describe('Expansion-0N shadow E2E via compare')` blocks — must not regress |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-05 — **do not duplicate** |
| Adjacent official keys | `healthBodyConsciousness`, `socialBattery`, `lifestylePace`, `physicalPriority` — distinct (Story 2 PROTECTED) |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow count | **15** shadow / **30** total / `MAX_EVIDENCE_ITEMS === 34` |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Active vs sedentary / homebody vs always-out unit tests | **Already in Story 2** (mock LLM). Story 5 = live fixture script + `compare()` integration |
| No false correlation with wellness / social rhythm | **Required** — fixture wording + taxonomy asserts (§3) |
| Integration: tension + chips + i18n | **`match-engine.spec.ts`** via `compare()` + UI tension passthrough |
| Live LLM / 50 profiles | **Operator script** ≥12 fixtures; 50-profile human study deferred |
| Browse visual QA | Document **SKIP** / manual checklist in agent-1 handoff — not a code gate |

---

## Artifacts (agent 1)

### Backend — integration tests

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | Add `makeProfileWithExpansion05Shadow` + `describe('Expansion-05 shadow E2E via compare')` |
| `dating-api/data/expansion-05-extraction-fixtures.json` | **Create** — curated `aboutMe` + expected bands (distinction-aware texts) |
| `dating-api/scripts/validate-expansion-05-extraction.ts` | **Create** — live LLM validation (mirror Expansion-04 script) |
| `dating-api/package.json` | Add `"validate:expansion-05-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend — UI tests

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Add Expansion-05 **tension chip** passthrough (`Different activity levels`) |

### Docs (agent 3)

| Path | Change |
|------|--------|
| `README.md` (sprint-expansion-05) | Mark Story 5 Done; sprint engineering complete; DoD checked |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate.service.spec.ts` | Story 2 lock |
| `compatibility-score.ts` / promote | Future promote sprint |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Expansion-05 positive chip UI tests | Story 4 done |
| Phase 1 EQ orchestrator | Expansion-03 only — **do not add** |
| Browser E2E / Playwright | Out of repo pattern |
| Interest / official signal code changes | Assert distinction only — **no edits** to those modules |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine integration helper (locked)

Add separate helper (do not break Expansion-01–04 helpers):

```typescript
type Expansion05ShadowKey = 'physicalActivityLevel' | 'domesticComfort';

function makeProfileWithExpansion05Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion05ShadowKey, number | null>>,
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

Add `describe('Expansion-05 shadow E2E via compare')` with **≥10** tests:

| Test | Setup | Expect |
|------|-------|--------|
| Shadow keys ∉ scored keys | static assert | `physicalActivityLevel`, `domesticComfort` not in `COMPATIBILITY_SIGNAL_KEYS`; length still **15** |
| Activity gap → tension chip | A `physicalActivityLevel: 9`, B `2` | `tensionChip === 'Different activity levels'`; `friction >= 3`; `activity_level_gap` in matrix |
| Domestic mismatch → tension chip | A `domesticComfort: 9`, B `2` | `tensionChip === 'Home vs out mismatch'`; `friction >= 3`; `domestic_out_mismatch` in matrix |
| High activity → positive chip | both `physicalActivityLevel: 8` | `positiveChips` contains `'Activity level match'` |
| High domestic → positive chip | both `domesticComfort: 8` | `positiveChips` contains `'Home/out balance'` |
| Shadow absent from alignments | both high activity | `alignments` keys exclude Expansion-05 shadow labels / activity\|domestic keys |
| Null shadow → no chip / no rule | A `physicalActivityLevel: 8`, B `null` | no `'Activity level match'`; no `activity_level_gap` |
| Compatibility invariance | same official; only shadow differs | `compatibility` equal between aligned-high vs gap pairs |
| Expansion-04 non-regression | intellectual gap pair | `tensionChip === 'Different mental stimulation needs'` |
| Adjacent official ≠ Expansion-05 keys | static | Expansion-05 keys **not** equal to / not in `INTEREST_CANONICAL_TAGS`; document they are distinct from `healthBodyConsciousness` / `socialBattery` / `lifestylePace` (assert key names differ) |
| Interest coexistence (optional but recommended) | both share `interestsTop3: ['gym', 'hiking']` **and** both high `physicalActivityLevel: 8` | `interestAlignment === 100`; `positiveChips` contains `'Activity level match'` |

**Friction notes:**
- Both Expansion-05 rules penalty **3** → each alone yields `friction >= 3` → **both** can be `tensionChip` (unlike Expansion-04 `creative_mismatch`).

### 3. Adjacent-signal distinction (locked — Expansion-05 special)

README requires no false correlation with wellness / social rhythm. Lock:

1. **Static asserts** in Expansion-05 describe:
   - `physicalActivityLevel` / `domesticComfort` ∉ `INTEREST_CANONICAL_TAGS`
   - `physicalActivityLevel` !== `'healthBodyConsciousness'` / `'physicalPriority'`
   - `domesticComfort` !== `'socialBattery'` / `'lifestylePace'`
2. **Live fixtures** (§4) must use **behavior/preference** language:
   - Activity high = trains/moves regularly; activity low = sedentary
   - Avoid wellness-only texts (“I care about healthy eating”) as **high** activity fixtures
   - Domestic high = prefers nights in; domestic low = always wants to be out
   - Avoid introvert-only / calm-pace-only texts as **high** domestic fixtures

Do **not** hardcode anti-correlation scoring. Do **not** edit official signal definitions.

### 4. Live LLM validation script (locked — optional gate)

**File:** `dating-api/data/expansion-05-extraction-fixtures.json`

Minimum **12 fixtures** (6 per signal: 3 high band, 3 low band). Example entries:

```json
[
  {
    "id": "activity_high_01",
    "aboutMe": "I train hard most days — running and sports are a regular part of my life, not optional.",
    "signal": "physicalActivityLevel",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "activity_low_01",
    "aboutMe": "I prefer minimal movement and sedentary evenings — the gym is not for me.",
    "signal": "physicalActivityLevel",
    "expectedMin": 1,
    "expectedMax": 4
  },
  {
    "id": "domestic_high_01",
    "aboutMe": "I love cozy nights in on weekends — home is my comfort zone and I rarely want to go out.",
    "signal": "domesticComfort",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "domestic_low_01",
    "aboutMe": "I get restless at home — I always want to be out and rarely enjoy staying in.",
    "signal": "domesticComfort",
    "expectedMin": 1,
    "expectedMax": 4
  }
]
```

Use semantic texts aligned with Story 2 / signal definitions — **no regex scoring in script**.

**File:** `dating-api/scripts/validate-expansion-05-extraction.ts`

Mirror `validate-expansion-04-extraction.ts`:

- Signals: `'physicalActivityLevel' | 'domesticComfort'`
- Fixtures: `data/expansion-05-extraction-fixtures.json`
- Agreement threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold

**package.json:**

```json
"validate:expansion-05-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-05-extraction.ts"
```

### 5. UI component test (locked — delta only)

Story 4 already covers Expansion-05 positive chip EN/HE evidence.

Story 5 adds **≥1** test:

| Test | Expect |
|------|--------|
| Tension chip passthrough — Expansion-05 | `tensionChip: 'Different activity levels'` renders as-is |

Optional: `Home vs out mismatch` passthrough — nice-to-have.

### 6. Regression suite (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-05"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-04"
npx jest src/matches/expansion-05-explainability.spec.ts src/matches/match-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-05"
npm run typecheck

cd dating-ui
npm test -- match-why-section.spec.tsx chip-evidence.spec.ts
```

Optional: `npm run validate:golden-pairs` — document SKIP if no DB.  
Optional: `npm run validate:expansion-05-extraction` — document SKIP or % agreement.

### 7. Shadow mode preserved (locked)

Story 5 tests must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Expansion-05 keys ∉ `COMPATIBILITY_SIGNAL_KEYS`
- `alignments` excludes Expansion-05 shadow keys
- Expansion-01–04 integration tests still pass

### 8. Agent 4

**Skip** — validation story only.

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-05 integration tests | ≥10 cases in matrix §2 |
| Expansion-04 non-regression | Spot-check still passes |
| Adjacent-signal distinction | Static asserts + distinction-aware fixtures §3–4 |
| UI tension chip test | ≥1 new case §5 |
| Existing Expansion-05 unit tests still pass | extraction + friction + explainability |
| Optional live LLM script + fixtures | Present; skips without API key |
| Shadow scoring promote | **Not in scope** |
| 50-profile human study | Operator follow-up |
| Browse visual QA | Document SKIP / checklist — not blocking |
| Sprint README Story 5 + DoD | Updated by agent 3 |

---

## API contracts

No DTO changes. Tests validate existing:

- `explainability.positiveChips` — `'Activity level match'`, `'Home/out balance'`
- `explainability.tensionChip` — `'Different activity levels'`, `'Home vs out mismatch'`
- `alignments[].key` — official keys only
- `compatibility`, `friction`, `finalScore`

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Manual browse smoke checklist for agent 1 handoff:

1. Re-analyze 2 test profiles with activity/domestic `aboutMe` text.
2. Compare or browse — confirm positive/tension chips when values warrant.
3. Confirm wellness-focused text does not falsely drive high activity chips; introvert-only text does not falsely drive high domestic chips.
4. Switch locale HE/ES — evidence localized.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion05Shadow` + `describe('Expansion-05 shadow E2E via compare')` to `match-engine.spec.ts`.
2. Create fixtures JSON + validation script + npm script (distinction-aware texts).
3. Add Expansion-05 tension chip UI test to `match-why-section.spec.tsx`.
4. Run regression commands; document golden-pairs / live LLM / browse SKIP or results in handoff.
5. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
test(expansion-05): match-engine integration, distinction fixtures, optional LLM validation

Story 5 — closes Expansion-05 engineering validation; shadow mode unchanged.
```

Suggested **sprint rollup commit** (when user requests, Stories 1–5):

```
feat(expansion-05): shadow activity/domestic signals — extract, friction, chips, validation

Expansion-05 complete in shadow mode; no compatibility scoring promote yet.
```

---

## Agent 2 CR checklist

- [ ] Integration tests use `compare()` not fictional helpers
- [ ] No duplicate extraction tests in `evaluate.service.spec.ts`
- [ ] `alignments` exclusion asserted
- [ ] Compatibility invariance test present
- [ ] Both tension rules can surface solo tensionChip (penalty 3)
- [ ] Adjacent distinction asserts present; fixtures avoid wellness/introvert-only high bands
- [ ] Expansion-04 E2E still passes
- [ ] Live script uses real extraction path; no regex scoring
- [ ] Script skips without API key (exit 0)
- [ ] Shadow keys still not in `COMPATIBILITY_SIGNAL_KEYS`
- [ ] No Phase 1 EQ gate added
- [ ] All tests pass

---

## Open questions / blockers

- None blocking Story 5 implementation.
- **Post-sprint:** Promote Expansion-05 with other Phase 2 signals after validation; consolidate overlay modules; re-run golden pairs after re-analysis cohort.
- **Live LLM:** If agreement < 85%, operator tunes prompts before promote — script correctly exits 1.

---

## Next agent

```text
--agent 1 expansion 05 story 5
```

**Notes:** Final story in Expansion-05. After agent 3 PM sign-off, sprint engineering is **complete** (shadow mode). Next sprint per roadmap: Expansion-06 (Adventure & Novelty).
