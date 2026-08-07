# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Hebrew Profile Regression](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-07 with **`compare()` E2E**, **Hebrew gap fixtures**, **optional live LLM validation**, and **UI/i18n presence checks**. **No** promote to scoring / no new extraction or tension logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-05/06 Story 5 (multi-signal + pair chips). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-07 E2E: five tensions, standalone/pair positive chips, interest overlap tags, alignments exclusion, compatibility invariance, Expansion-06 non-regression, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew gap profiles A/B/C** — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 already covers Exp-07 positive + interest chips. Story 5 adds **≥1 Exp-07 tension chip passthrough** + confirm Exp-07 labels remain in `CHIP_EVIDENCE_KEYS` (29).
- **README “promote to 30 scored”:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story.
- Agent 4 **skipped**.
- Closes Expansion-07 **engineering gate** in shadow mode.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (5) | `casualIntimacyIntent`, `supportExchangeOrientation`, `supportProviderOrientation`, `supportRecipientOrientation`, `religiousObservance` |
| Friction (Story 3) | `casual_intimacy_clash` (6), `support_exchange_mismatch` (6), `support_both_provider` (4), `support_both_recipient` (4), `religious_observance_gap` (5) |
| Positive chips (Story 4) | 3 standalone + 2 pair synthetic; `interestOverlapTags` max 2 |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **20** shadow / **35** total / `MAX_EVIDENCE_ITEMS === 39` |
| Self `DOMAIN_ALLOWED` | **27** |
| `CHIP_EVIDENCE_KEYS` | **29** (Story 4) |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-07 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-07 — **do not duplicate** |
| Adjacent collision risks | `physicalPriority`, `relationshipClarity`, `physicalAffectionStyle`, `financialMindset`, `spirituality`, `traditionalism`; emotional תמיכה ≠ financial support |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Extraction unit tests (5× high/low/null) | **Already Story 2** — Story 5 does not re-add |
| Friction unit tests | **Already Story 3** — Story 5 uses `compare()` E2E |
| Integration end-to-end | **`match-engine.spec.ts` via `compare()`** |
| UI chips EN/HE/ES + interest rendering | Story 4 done; Story 5 adds **tension passthrough** + registry assert |
| Hebrew fixtures + >85% | **Optional live script** + fixtures JSON; skip without API key |
| Provider/recipient pair fixtures | **`compare()` E2E** with injected shadow scores (deterministic) |
| Promote to `COMPATIBILITY_SIGNAL_KEYS` (30) | **Forbidden** — shadow lock; document as future promote story |
| No regression on “25 existing signals” | Assert Exp-06 E2E still passes + scored set still 15 |
| Admin match-quality panel | **Defer** / document SKIP — not blocking |
| Correlation / P95 / A/B / backfill | Operator follow-up — not code gates |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion07Shadow` + `describe('Expansion-07 shadow E2E via compare')` |
| `dating-api/data/expansion-07-extraction-fixtures.json` | **Create** — EN + Hebrew gap fixtures with expected bands |
| `dating-api/scripts/validate-expansion-07-extraction.ts` | **Create** — live LLM validation (mirror Exp-05/06; multi-signal capable) |
| `dating-api/package.json` | `"validate:expansion-07-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | ≥1 Exp-07 **tension** chip passthrough (e.g. `Casual vs committed intimacy`) |
| `dating-ui/.../chip-evidence.spec.ts` | Keep Exp-01–06 “10 chips” + Exp-07 five-chip assert (already from Story 4 — verify still green; extend only if missing) |

### Docs (agent 3)

| Path | Change |
|------|--------|
| Sprint README Story 5 + DoD | Mark Done (engineering); promote deferred; operator notes |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate.service.spec.ts` | Story 2 lock |
| `compatibility-score.ts` / promote / scoring rollout | Future promote story |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Story 2/3 unit matrices | Already green |
| Admin match-quality deep UI | Optional / SKIP |
| Browser Playwright | Out of pattern |
| Keyword / regex extraction | Forbidden |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine helper (locked)

```typescript
type Expansion07ShadowKey =
  | 'casualIntimacyIntent'
  | 'supportExchangeOrientation'
  | 'supportProviderOrientation'
  | 'supportRecipientOrientation'
  | 'religiousObservance';

function makeProfileWithExpansion07Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion07ShadowKey, number | null>>,
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

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–06 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-07 shadow E2E via compare')` with **≥14** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | all 5 ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ∉ `INTEREST_CANONICAL_TAGS`; ≠ `physicalPriority` / `spirituality` / `traditionalism` / `financialMindset` |
| 3 | Casual intimacy clash | A cas 9 / B 2 | `tensionChip === 'Casual vs committed intimacy'`; `casual_intimacy_clash` in matrix; `friction >= 3` |
| 4 | Support exchange mismatch | A exch 9 / B 2 | `Arrangement vs romance`; `support_exchange_mismatch` |
| 5 | Both providers | both exch 8, both prov 8 | `Both want to provide`; `support_both_provider` |
| 6 | Both recipients | both exch 8, both rec 8 | `Both seek support`; `support_both_recipient` |
| 7 | Religious gap | A 9 / B 2 | `Religious practice gap`; `religious_observance_gap` |
| 8 | Standalone positive chip | both `casualIntimacyIntent: 8` | `positiveChips` contains `'Intimacy expectations'` |
| 9 | Financial support alignment chip | A: exch9 prov9 rec2; B: exch9 prov2 rec9 | contains `'Financial support alignment'` |
| 10 | Non-transactional chip | both exch 2 | contains `'Non-transactional match'` |
| 11 | Alignments exclusion | both high religious | alignments exclude Exp-07 keys / chip labels |
| 12 | Null shadow → no clash | A cas 9 / B null | no `casual_intimacy_clash` |
| 13 | Compatibility invariance | same official; only Exp-07 shadow differs | `compatibility` equal |
| 14 | Interest overlap tags | both `interestsTop3: ['travel','books']` | `interestOverlapTags` includes preferred tags (order may prefer travel/books); length ≤ 2 |
| 15 | Exp-06 non-regression (recommended) | adventureNovelty 9 vs 2 | still `Novelty vs routine` |

**Friction note:** Penalties 4–6 all surface `tensionChip` alone (gate ≥3). When multiple fire, highest penalty wins label — tests that assert a specific chip should avoid stacking stronger rules unless intentional.

### 3. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-07-extraction-fixtures.json`

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| EN high/low per signal | ≥10 (5×2) | One primary `signal` each |
| Hebrew gap Profile A/B/C | ≥3 multi-expectation rows **or** ≥6 single-signal rows sharing texts | See README expected bands |
| Distinctions | Include ≥1 fixture that is spiritual-not-observant (low `religiousObservance`) and ≥1 emotional-תמיכה-without-money (support* should not force high) | Prefer null/low bands |

**Schema (locked — support both shapes):**

```typescript
interface Expansion07Fixture {
  id: string;
  aboutMe: string;
  /** Single-signal row (Exp-05/06 style). */
  signal?: Expansion07ShadowKey;
  expectedMin?: number;
  expectedMax?: number;
  /** Multi-signal row (Hebrew gap profiles). */
  expectations?: Array<{
    signal: Expansion07ShadowKey;
    expectedMin: number;
    expectedMax: number;
  }>;
}
```

Each fixture must have either (`signal`+min/max) **or** non-empty `expectations`.

Hebrew texts may be Hebrew-only or bilingual. Keep **semantic** — no keyword scoring in script.

Example Profile C multi-row:

```json
{
  "id": "gap_c_he_transactional",
  "aboutMe": "מחפש זיונים בלי התחייבות. אשמח לתת לך תמיכה — 1000 דולר בחודש.",
  "expectations": [
    { "signal": "casualIntimacyIntent", "expectedMin": 8, "expectedMax": 10 },
    { "signal": "supportExchangeOrientation", "expectedMin": 8, "expectedMax": 10 },
    { "signal": "supportProviderOrientation", "expectedMin": 8, "expectedMax": 10 },
    { "signal": "supportRecipientOrientation", "expectedMin": 1, "expectedMax": 3 }
  ]
}
```

### 4. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-07-extraction.ts`

Mirror Exp-05/06:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass
- Agreement = passes / scored (non-null attempts that were expected); **null when band expected fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-07-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-07-extraction.ts"
```

### 5. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-07 | `tensionChip: 'Casual vs committed intimacy'` renders as-is |
| Optional | Second tension e.g. `Arrangement vs romance` |
| Chip registry | Exp-07 five labels still in `CHIP_EVIDENCE_KEYS` (length **29**) |

Interest overlap UI already Story 4 — do not require re-tests unless broken.

### 6. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-07"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-06"
npx jest src/matches/expansion-07-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-07"
npm run typecheck

cd dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-07-extraction` — document SKIP or % agreement.  
Optional: `npm run validate:golden-pairs` — document SKIP if no DB.

### 7. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- All five Exp-07 keys ∉ scored set
- `alignments` exclude Exp-07 shadow keys
- Exp-01–06 integration describes still pass
- **No** promote / weight wiring

### 8. Agent 4

**Skip.**

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-07 E2E | ≥14 cases in matrix §2 |
| Expansion-06 non-regression | Spot-check still passes |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew gap profiles represented in fixtures | A/B/C covered |
| UI Exp-07 tension passthrough | ≥1 |
| Exp-07 chips in `CHIP_EVIDENCE_KEYS` | Still **29** / five labels |
| Existing Exp-07 unit suites still pass | extraction + friction + explainability |
| Scoring promote | **Not in scope** |
| Admin panel / correlation / P95 / A/B / backfill | Operator follow-up |
| Browse visual QA | Document SKIP / checklist — not blocking |
| Sprint README Story 5 + DoD | Updated by agent 3 |

---

## API contracts

No DTO changes required (Story 4 already added `interestOverlapTags`). Tests validate existing explainability / friction / alignments fields.

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Manual browse smoke checklist for agent 1 handoff:

1. Re-analyze Hebrew gap-like profiles (or EN equivalents) with Exp-07 themes.
2. Confirm tension/positive/interest chips when values warrant.
3. Confirm emotional-תמיכה-only text does not force high support* chips; spiritual-not-observant does not force high `religiousObservance`.
4. Locale HE/ES — chip evidence localized.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion07Shadow` + Expansion-07 `compare()` E2E describe (§1–2).
2. Create fixtures JSON (§3) + validation script + npm script (§4).
3. Add Exp-07 tension UI test; verify chip-evidence Exp-07 assert (§5).
4. Run regression commands; document live LLM / golden-pairs / browse SKIP or results.
5. Write `agent-1-dev.md` under `docs/sprints/.../STORY_05_testing_validation/`.
6. **Do not** promote scoring, add keyword heuristics, or change Stories 1–4 product locks.
7. Do not commit unless user asks.

Suggested commit:

```
test(expansion-07): match-engine E2E, Hebrew fixtures, optional LLM validation

Story 5 — closes Expansion-07 engineering validation; shadow mode unchanged.
```

Suggested **sprint rollup** (when user requests Stories 1–5):

```
feat(expansion-07): profile-gap shadow signals — extract, friction, chips, validation

Five shadow keys + self/partner LLM + tensions + display + interest overlap; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Integration tests use `compare()` 
- [ ] No duplicate evaluate-layer extraction tests
- [ ] Five tension E2E + pair positive chips + interestOverlapTags covered
- [ ] Alignments exclusion + compatibility invariance
- [ ] Exp-06 non-regression present
- [ ] Fixtures include Hebrew gap themes; script multi-signal capable
- [ ] Script skips without API key; no regex scoring
- [ ] Shadow keys still not in `COMPATIBILITY_SIGNAL_KEYS`
- [ ] No promote / weight wiring
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 5.
- **Promote:** Explicit future story after operator live ≥85% + product decision — not automatic at Story 5 close.
- Live LLM may fail Hebrew bands on first run — agent 1 may tighten fixture wording (not thresholds) if needed; document agreement %.

---

## Next agent

```text
--agent 1 expansion 07 story 5
```

**Notes:** Deterministic `compare()` E2E is the CI gate. Live Hebrew validation is operator-optional. Keep shadow / **no promote**.
