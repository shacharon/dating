# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-02 with **integration tests**, **regression gate**, and **optional live LLM validation script**. **No** promote to scoring / no new extraction logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` (match engine) — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate extraction tests in `evaluate.service.spec.ts` — Story 2 already covers mocked LLM extraction in `extraction.service.spec.ts` (6 Expansion-02 tests).
- Add **`match-engine.spec.ts`** describe block for Expansion-02: tension chips, positive chips, alignments exclusion, compatibility invariance, Expansion-01 non-regression spot-check.
- Add **optional operator script** for live LLM quality (`>85%` within bands on fixture set) — **not a CI gate** unless `OPENAI_API_KEY` present.
- **UI tests:** Expansion-02 positive chip EN/HE already in `match-why-section.spec.tsx` (Story 4). Story 5 adds **tension chip passthrough** test for Expansion-02 rule id label.
- Agent 4 **skipped** (no eligibility/ranking formula change).
- Closes sprint **engineering gate**; full 50-profile human rating remains operator follow-up.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` — full pipeline through `assemble-result` |
| Profile signals | Shadow keys on `evaluation.self.signals` (Story 2 extraction → Story 4 chip overlay) |
| Friction | Story 3 rules: `emotional_volatility_gap`, `affection_needs_gap` |
| Positive chips | Story 4 `expansion-02-explainability.ts` merged in `assemble-result` |
| Expansion-01 E2E | `describe('Expansion-01 shadow E2E via compare')` — **8 tests** — must not regress |
| Existing extraction tests | `extraction.service.spec.ts` → `describe('Expansion-02 shadow signals')` — **do not duplicate** |
| Golden regression | `npm run validate:golden-pairs` — compatibility/finalScore bands unchanged for profiles without shadow keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Unit tests: high/low regulation & affection from text | **Already in Story 2** (mock LLM). Story 5 adds **live fixture script** + **compare() integration** — not re-test extraction unit slices |
| `evaluate.service.spec.ts` | **Wrong file** — use `extraction.service.spec.ts` (Story 2) + match-engine integration |
| Live LLM >85% as hard CI gate | **Operator script** — skips without API key; exit 1 only when key present and agreement < 85% |
| 50 real profiles human-rated | **Deferred operator task** — fixture set **≥12** curated texts for script |
| Sprint DoD all `[x]` | **Engineering DoD** for Story 5 — promote/rollout remains future |

---

## Artifacts (agent 1)

### Backend — integration tests

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | Add `describe('Expansion-02 shadow E2E via compare')` — see §Test matrix |
| `dating-api/data/expansion-02-extraction-fixtures.json` | **Create** — curated `aboutMe` texts + expected bands |
| `dating-api/scripts/validate-expansion-02-extraction.ts` | **Create** — live LLM validation (mirror Expansion-01 script) |
| `dating-api/package.json` | Add `"validate:expansion-02-extraction"` script |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend — UI tests

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Add Expansion-02 **tension chip** passthrough test (Story 4 added positive chip EN/HE) |

### Docs (agent 3)

| Path | Change |
|------|--------|
| `README.md` (sprint-expansion-02) | Mark Story 5 Done; sprint engineering complete |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate.service.spec.ts` | Story 2 lock |
| `compatibility-score.ts` promote / weights | Post-sprint promote story |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Expansion-02 UI positive chip tests | Story 4 done |
| Browser E2E (Playwright) | Out of repo pattern |
| Re-analyze all production profiles | Operator rollout |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine integration helper (locked)

Add separate helper (do not break Expansion-01 helper):

```typescript
type Expansion02ShadowKey = 'emotionalRegulation' | 'physicalAffectionStyle';

function makeProfileWithExpansion02Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion02ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}
```

Use **neutral official signals** (`makeSignals({})`) unless a test needs friction boost.

### 2. Integration test matrix (locked)

Add `describe('Expansion-02 shadow E2E via compare')` with **≥8** tests:

| Test | Setup | Expect |
|------|-------|--------|
| Shadow keys ∉ scored keys | static assert | `emotionalRegulation`, `physicalAffectionStyle` not in `COMPATIBILITY_SIGNAL_KEYS` |
| Regulation gap → tension chip | A `emotionalRegulation: 9`, B `2` | `tensionChip === 'Emotional steadiness gap'`; `friction >= 3`; `emotional_volatility_gap` in matrix |
| Affection gap → tension chip | A `physicalAffectionStyle: 8`, B `2` | `tensionChip === 'Different affection needs'`; `affection_needs_gap` in matrix |
| High regulation → positive chip | both `emotionalRegulation: 8` | `positiveChips` contains `'Emotional balance'` |
| High affection → positive chip | both `physicalAffectionStyle: 8` | `positiveChips` contains `'Affection rhythm match'` |
| Shadow absent from alignments | both high regulation | `alignments` keys exclude `emotionalRegulation` / `physicalAffectionStyle` |
| Null shadow → no chip / no rule | A `emotionalRegulation: 8`, B `null` | no `'Emotional balance'`; no `emotional_volatility_gap` |
| Compatibility invariance | same official; only shadow differs | `compatibility` equal between aligned-high vs gap pairs |
| Expansion-01 non-regression spot-check | empathy gap pair still works | `tensionChip === 'Empathy mismatch'` (single test) |

**Friction note:** `emotional_volatility_gap` penalty 5 and `affection_needs_gap` penalty 4 suffice for `friction >= 3` with neutral official signals.

### 3. Live LLM validation script (locked — optional gate)

**File:** `dating-api/data/expansion-02-extraction-fixtures.json`

Minimum **12 fixtures** (6 per signal: 3 high band, 3 low band). Example entries:

```json
[
  {
    "id": "regulation_high_01",
    "aboutMe": "I stay calm under pressure and take time to process before reacting when things get stressful.",
    "signal": "emotionalRegulation",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "regulation_low_01",
    "aboutMe": "When I get upset I blow up and need a long time to calm down.",
    "signal": "emotionalRegulation",
    "expectedMin": 1,
    "expectedMax": 4
  },
  {
    "id": "affection_high_01",
    "aboutMe": "Physical touch and cuddling every day is how I feel connected in a relationship.",
    "signal": "physicalAffectionStyle",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "affection_low_01",
    "aboutMe": "I prefer minimal physical affection and need plenty of personal space.",
    "signal": "physicalAffectionStyle",
    "expectedMin": 1,
    "expectedMax": 4
  }
]
```

Use semantic texts from Story 2 unit tests + README — **no regex scoring in script**.

**File:** `dating-api/scripts/validate-expansion-02-extraction.ts`

Mirror `validate-expansion-01-extraction.ts`:

- Signals: `'emotionalRegulation' | 'physicalAffectionStyle'`
- Fixtures path: `data/expansion-02-extraction-fixtures.json`
- Agreement threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold

**package.json:**

```json
"validate:expansion-02-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-02-extraction.ts"
```

### 4. UI component test (locked — delta only)

Story 4 already covers:

- EN — `Emotional balance` evidence
- HE — `Affection rhythm match` evidence

Story 5 adds **one** test:

| Test | Expect |
|------|--------|
| Tension chip passthrough — Expansion-02 | `tensionChip: 'Emotional steadiness gap'` renders as-is (English API string) |

Optional nice-to-have: ES evidence for one Expansion-02 positive chip — not blocking.

### 5. Regression suite (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-02"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-01"
npx jest src/matches/expansion-02-explainability.spec.ts src/matches/match-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-02"
npm run typecheck

cd dating-ui
npm test -- match-why-section.spec.tsx chip-evidence.spec.ts
```

Optional: `npm run validate:golden-pairs` — document SKIP if no DB.

### 6. Shadow mode preserved (locked)

Story 5 tests must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Expansion-02 keys ∉ `COMPATIBILITY_SIGNAL_KEYS`
- `alignments` excludes Expansion-02 shadow keys
- Expansion-01 integration tests still pass

### 7. Agent 4

**Skip** — validation story only.

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-02 integration tests | ≥8 cases in matrix §2 |
| Expansion-01 non-regression | Spot-check or full Expansion-01 describe still passes |
| UI tension chip test | ≥1 new case §4 |
| Existing Expansion-02 unit tests still pass | extraction + friction + explainability |
| Optional live LLM script + fixtures | Present; skips without API key |
| Shadow scoring promote | **Not in scope** |
| 50-profile human study | Operator follow-up |
| Sprint README Story 5 + DoD | Updated by agent 3 |

---

## API contracts

No DTO changes. Tests validate existing:

- `explainability.positiveChips` — `'Emotional balance'`, `'Affection rhythm match'`
- `explainability.tensionChip` — `'Emotional steadiness gap'`, `'Different affection needs'`
- `alignments[].key` — official keys only
- `compatibility`, `friction`, `finalScore`

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Manual browse smoke checklist for agent 1 handoff:

1. Re-analyze 2 test profiles with regulation/affection `aboutMe` text.
2. Compare or browse — confirm positive/tension chips when values warrant.
3. Switch locale HE/ES — evidence localized.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion02Shadow` + `describe('Expansion-02 shadow E2E via compare')` to `match-engine.spec.ts`.
2. Create fixtures JSON + validation script + npm script.
3. Add Expansion-02 tension chip UI test to `match-why-section.spec.tsx`.
4. Run regression commands; document golden-pairs / live LLM SKIP or results in handoff.
5. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
test(expansion-02): match-engine integration, optional LLM validation, tension chip UI test

Story 5 — closes Expansion-02 engineering validation; shadow mode unchanged.
```

Suggested **sprint rollup commit** (when user requests, Stories 1–5):

```
feat(expansion-02): shadow regulation/affection signals — extract, friction, chips, validation

Expansion-02 complete in shadow mode; no compatibility scoring promote yet.
```

---

## Agent 2 CR checklist

- [ ] Integration tests use `compare()` not fictional helpers
- [ ] No duplicate extraction tests in `evaluate.service.spec.ts`
- [ ] `alignments` exclusion asserted
- [ ] Compatibility invariance test present
- [ ] Expansion-01 E2E tests still pass
- [ ] Live script uses real extraction path; no regex scoring
- [ ] Script skips without API key (exit 0)
- [ ] Shadow keys still not in `COMPATIBILITY_SIGNAL_KEYS`
- [ ] All tests pass

---

## Open questions / blockers

- None blocking Story 5 implementation.
- **Post-sprint:** Promote Expansion-01 + Expansion-02 together at Phase 1 gate; consolidate overlay modules; re-run golden pairs after re-analysis cohort.
- **Live LLM:** If agreement < 85%, operator tunes prompts before promote — script correctly exits 1 (Expansion-01 precedent at 66.7%).

---

## Next agent

```text
--agent 1 expansion 02 story 5
```

**Notes:** Final story in Expansion-02. After agent 3 PM sign-off, sprint engineering is **complete** (shadow mode). Next sprint per roadmap: Expansion-03 or user-requested commit.
