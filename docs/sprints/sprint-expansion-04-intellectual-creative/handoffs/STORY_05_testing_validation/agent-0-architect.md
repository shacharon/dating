# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-04-intellectual-creative  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-04 with **integration tests**, **interest-tag coexistence regression**, and **optional live LLM validation script**. **No** promote to scoring / no new extraction logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-02 Story 5 (two shadow signals). **No** Phase 1 EQ gate (that was Expansion-03 only).

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate extraction tests in `evaluate.service.spec.ts` — Story 2 already covers mocked LLM extraction in `extraction.service.spec.ts` (Expansion-04 describe).
- Add **`match-engine.spec.ts`** describe block for Expansion-04: tension chips, positive chips, alignments exclusion, compatibility invariance, Expansion-03 non-regression, **interest-tag coexistence**.
- Add **optional operator script** for live LLM quality (`>85%` within bands) — **not a CI gate** unless `OPENAI_API_KEY` present.
- **UI tests:** Expansion-04 positive chips EN already in Story 4. Story 5 adds **tension chip passthrough** for `Different mental stimulation needs`.
- Agent 4 **skipped**.
- Closes sprint **engineering gate**; 50-profile human rating remains operator follow-up.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys | `intellectualCuriosity`, `creativeExpression` on `evaluation.self.signals` — in `SHADOW_SIGNAL_KEYS` only |
| Friction | Story 3: `intellectual_gap` (penalty **4**), `creative_mismatch` (penalty **2**) |
| Positive chips | Story 4 `expansion-04-explainability.ts` — `Mental stimulation` / `Creative expression` |
| Expansion-01/02/03 E2E | Existing `describe('Expansion-0N shadow E2E via compare')` blocks — must not regress |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-04 — **do not duplicate** |
| Interest layer | Separate from signals — `interestsTop3` / `INTEREST_CANONICAL_TAGS` / HG `books_reading`/`art_visual` taxonomy |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Unit tests: high/low extraction | **Already in Story 2**. Story 5 = live fixture script + `compare()` integration |
| Integration: tension + positive chips | **`match-engine.spec.ts`** via `compare()` |
| Regression: interest tags unchanged; tags and signals coexist | **Required** — see §5 (Expansion-04 special) |
| Live LLM / 50 profiles >85% | **Operator script** ≥12 fixtures; 50-profile human study deferred |
| Browse visual QA | Document **SKIP** / manual checklist in agent-1 handoff — not a code gate |

---

## Artifacts (agent 1)

### Backend — integration tests

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | Add `makeProfileWithExpansion04Shadow` + `describe('Expansion-04 shadow E2E via compare')` |
| `dating-api/data/expansion-04-extraction-fixtures.json` | **Create** — curated `aboutMe` + expected bands |
| `dating-api/scripts/validate-expansion-04-extraction.ts` | **Create** — live LLM validation (mirror Expansion-03 script) |
| `dating-api/package.json` | Add `"validate:expansion-04-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend — UI tests

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Add Expansion-04 **tension chip** passthrough (`Different mental stimulation needs`) |

### Docs (agent 3)

| Path | Change |
|------|--------|
| `README.md` (sprint-expansion-04) | Mark Story 5 Done; sprint engineering complete; DoD checked |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate.service.spec.ts` | Story 2 lock |
| `compatibility-score.ts` / promote | Future promote sprint |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Expansion-04 positive chip UI tests | Story 4 done |
| Phase 1 EQ orchestrator | Expansion-03 only — **do not add** |
| Browser E2E / Playwright | Out of repo pattern |
| Interest extract / taxonomy code changes | Assert coexistence only — **no edits** to interest modules |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine integration helper (locked)

Add separate helper (do not break Expansion-01–03 helpers):

```typescript
type Expansion04ShadowKey = 'intellectualCuriosity' | 'creativeExpression';

function makeProfileWithExpansion04Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion04ShadowKey, number | null>>,
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

Add `describe('Expansion-04 shadow E2E via compare')` with **≥9** tests:

| Test | Setup | Expect |
|------|-------|--------|
| Shadow keys ∉ scored keys | static assert | `intellectualCuriosity`, `creativeExpression` not in `COMPATIBILITY_SIGNAL_KEYS`; length still **15** |
| Intellectual gap → tension chip | A `intellectualCuriosity: 9`, B `2` | `tensionChip === 'Different mental stimulation needs'`; `friction >= 3`; `intellectual_gap` in friction matrix |
| Creative mismatch → rule fires | A `creativeExpression: 9`, B `1` | `creative_mismatch` in friction matrix; **do not require** `tensionChip === 'Creative drive mismatch'` alone (penalty 2 < friction gate 3) |
| High intellectual → positive chip | both `intellectualCuriosity: 8` | `positiveChips` contains `'Mental stimulation'` |
| High creative → positive chip | both `creativeExpression: 8` | `positiveChips` contains `'Creative expression'` |
| Shadow absent from alignments | both high intellectual | `alignments` keys exclude Expansion-04 shadow keys |
| Null shadow → no chip / no rule | A `intellectualCuriosity: 8`, B `null` | no `'Mental stimulation'`; no `intellectual_gap` |
| Compatibility invariance | same official; only shadow differs | `compatibility` equal between aligned-high vs gap pairs |
| Expansion-03 non-regression | humor gap pair | `tensionChip === 'Playfulness mismatch'` |
| Interest coexistence | both share `interestsTop3: ['books', 'art']` **and** both high `intellectualCuriosity: 8` | `interestAlignment === 100`; `sharedInterestNote` defined; `positiveChips` contains `'Mental stimulation'`; Expansion-04 keys **not** treated as interest tags |

**Friction notes:**
- `intellectual_gap` penalty **4** → alone yields `friction >= 3` → can be `tensionChip`.
- `creative_mismatch` penalty **2** → alone will **not** surface as `tensionChip`; assert via friction matrix / rule id only (matches Story 3 lock).

### 3. Interest-tag coexistence (locked — Expansion-04 special)

README requires tags and signals coexist. Lock **two** cheap asserts (no interest code changes):

1. **Static taxonomy assert** (in match-engine Expansion-04 describe or tiny dedicated it):
   - `intellectualCuriosity` / `creativeExpression` **not** in `INTEREST_CANONICAL_TAGS`
   - Optional: not in HG extract tag list used by `interest-tags-text.extract` (`books_reading`, `art_visual`, etc.) — import the constant if exported; otherwise skip HG list and rely on canonical tags + coexistence compare test

2. **compare() coexistence** (matrix row above): shared interest tags + Expansion-04 shadow chips work **independently** on the same pair.

Do **not** edit `interest-tags-text.extract.ts`, `extracted-interests.interface.ts`, or `interest-alignment.ts`.

### 4. Live LLM validation script (locked — optional gate)

**File:** `dating-api/data/expansion-04-extraction-fixtures.json`

Minimum **12 fixtures** (6 per signal: 3 high band, 3 low band). Example entries:

```json
[
  {
    "id": "intellectual_high_01",
    "aboutMe": "I need deep conversations about ideas, books, and how the world works — shallow small talk drains me.",
    "signal": "intellectualCuriosity",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "intellectual_low_01",
    "aboutMe": "I prefer light conversation and don't care about debates, theories, or learning for its own sake.",
    "signal": "intellectualCuriosity",
    "expectedMin": 1,
    "expectedMax": 4
  },
  {
    "id": "creative_high_01",
    "aboutMe": "Making art, writing, and inventing things is central to who I am — I need creative outlets every week.",
    "signal": "creativeExpression",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "creative_low_01",
    "aboutMe": "I am not artistic and rarely create anything; I prefer consuming entertainment over making it.",
    "signal": "creativeExpression",
    "expectedMin": 1,
    "expectedMax": 4
  }
]
```

Use semantic texts aligned with Story 2 / signal definitions — **no regex scoring in script**.

**File:** `dating-api/scripts/validate-expansion-04-extraction.ts`

Mirror `validate-expansion-03-extraction.ts`:

- Signals: `'intellectualCuriosity' | 'creativeExpression'`
- Fixtures: `data/expansion-04-extraction-fixtures.json`
- Agreement threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold

**package.json:**

```json
"validate:expansion-04-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-04-extraction.ts"
```

### 5. UI component test (locked — delta only)

Story 4 already covers Expansion-04 positive chip EN evidence.

Story 5 adds **≥1** test:

| Test | Expect |
|------|--------|
| Tension chip passthrough — Expansion-04 | `tensionChip: 'Different mental stimulation needs'` renders as-is |

Optional: `Creative drive mismatch` passthrough — nice-to-have only (API rarely surfaces it alone).

### 6. Regression suite (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-04"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-03"
npx jest src/matches/expansion-04-explainability.spec.ts src/matches/match-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-04"
npm run typecheck

cd dating-ui
npm test -- match-why-section.spec.tsx chip-evidence.spec.ts
```

Optional: `npm run validate:golden-pairs` — document SKIP if no DB.  
Optional: `npm run validate:expansion-04-extraction` — document SKIP or % agreement.

### 7. Shadow mode preserved (locked)

Story 5 tests must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Expansion-04 keys ∉ `COMPATIBILITY_SIGNAL_KEYS`
- `alignments` excludes Expansion-04 shadow keys
- Expansion-01/02/03 integration tests still pass

### 8. Agent 4

**Skip** — validation story only.

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-04 integration tests | ≥9 cases in matrix §2 (incl. interest coexistence) |
| Expansion-03 non-regression | Spot-check still passes |
| Interest coexistence | Taxonomy + compare assertions §3 |
| UI tension chip test | ≥1 new case §5 |
| Existing Expansion-04 unit tests still pass | extraction + friction + explainability |
| Optional live LLM script + fixtures | Present; skips without API key |
| Shadow scoring promote | **Not in scope** |
| 50-profile human study | Operator follow-up |
| Browse visual QA | Document SKIP / checklist — not blocking |
| Sprint README Story 5 + DoD | Updated by agent 3 |

---

## API contracts

No DTO changes. Tests validate existing:

- `explainability.positiveChips` — `'Mental stimulation'`, `'Creative expression'`
- `explainability.tensionChip` — `'Different mental stimulation needs'` (and optionally `'Creative drive mismatch'`)
- `alignments[].key` — official keys only
- `interestAlignment` / `sharedInterestNote` — interest layer unchanged
- `compatibility`, `friction`, `finalScore`

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Manual browse smoke checklist for agent 1 handoff:

1. Re-analyze 2 test profiles with intellectual/creative `aboutMe` text.
2. Compare or browse — confirm positive/tension chips when values warrant.
3. Confirm interest tags (books/art) still appear independently of Expansion-04 chips.
4. Switch locale HE/ES — evidence localized.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion04Shadow` + `describe('Expansion-04 shadow E2E via compare')` to `match-engine.spec.ts`.
2. Create fixtures JSON + validation script + npm script.
3. Add Expansion-04 tension chip UI test to `match-why-section.spec.tsx`.
4. Run regression commands; document golden-pairs / live LLM / browse SKIP or results in handoff.
5. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
test(expansion-04): match-engine integration, interest coexistence, optional LLM validation

Story 5 — closes Expansion-04 engineering validation; shadow mode unchanged.
```

Suggested **sprint rollup commit** (when user requests, Stories 1–5):

```
feat(expansion-04): shadow intellectual/creative signals — extract, friction, chips, validation

Expansion-04 complete in shadow mode; no compatibility scoring promote yet.
```

---

## Agent 2 CR checklist

- [ ] Integration tests use `compare()` not fictional helpers
- [ ] No duplicate extraction tests in `evaluate.service.spec.ts`
- [ ] `alignments` exclusion asserted
- [ ] Compatibility invariance test present
- [ ] Creative mismatch asserts friction matrix (not requiring solo tensionChip)
- [ ] Interest coexistence: tags ≠ Expansion-04 signal keys; compare independence
- [ ] Expansion-03 E2E still passes
- [ ] Live script uses real extraction path; no regex scoring
- [ ] Script skips without API key (exit 0)
- [ ] Shadow keys still not in `COMPATIBILITY_SIGNAL_KEYS`
- [ ] No Phase 1 EQ gate added
- [ ] All tests pass

---

## Open questions / blockers

- None blocking Story 5 implementation.
- **Post-sprint:** Promote Expansion-01–04 together at Phase gate; consolidate overlay modules; re-run golden pairs after re-analysis cohort.
- **Live LLM:** If agreement < 85%, operator tunes prompts before promote — script correctly exits 1.

---

## Next agent

```text
--agent 1 expansion 04 story 5
```

**Notes:** Final story in Expansion-04. After agent 3 PM sign-off, sprint engineering is **complete** (shadow mode). Next sprint per roadmap: Expansion-05 (Physical Activity & Domestic Comfort).
