# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Regression](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-14 with **`compare()` E2E**, **fixtures + optional live LLM validation**, and **UI tension passthrough**. **No** promote to scoring / no new extraction, tension, or chip logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-13 Story 5 (multi-signal shadow E2E + optional live script). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-14 E2E: three tensions, three positive chips, dual-band / both-critical exclusivity, alignments exclusion, compatibility invariance, Exp-13 non-regression spots, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew** rows — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 covers positive chips + onboarding + monogamy tension passthrough. Story 5 **re-asserts** registry (`CHIP_EVIDENCE_KEYS` **40**) + ≥1 Exp-14 tension chip (prefer monogamy dealbreaker; add patience/pacing if missing).
- **README “Promote to scoring (45 total)”:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story (same as Exp-01–13).
- Agent 4 **skipped**.
- Closes Expansion-14 **engineering gate** in shadow mode.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (3) | `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` |
| Friction (Story 3) | `patience_tolerance_gap` (3, ≥8 vs ≤3); `intimacy_pacing_clash` (4, ≥8 vs ≤3); `monogamy_alignment_mismatch` (8, ≤2 vs ≥8) |
| Positive chips (Story 4) | `Patience match` (both ≥7); `Pace of closeness` (both ≥7 or both ≤3); `Aligned on relationship structure` (both ≤2 or both ≥7) |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **35** shadow / **50** total / `MAX_EVIDENCE_ITEMS === 54` |
| Self / partner `DOMAIN_ALLOWED` | **42** / **28** |
| `CHIP_EVIDENCE_KEYS` | **40** (Story 4) |
| Domains | patience/monogamy chips → **`relationship`**; pacing → **`intimacy`** |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-14 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-14 — **do not duplicate** |
| Adjacent collision risks | `conflictStyle`, `emotionalRegulation`, `casualIntimacyIntent`, `relationshipClarity` |
| Meta vs browse chips | Story 1 meta `Patience with differences` / `Relationship structure` ≠ browse `Patience match` / `Aligned on relationship structure` (pacing string may match meta) |
| Live scripts today | Exp-01–07, Exp-09–13 exist; **no** Exp-14 yet |
| Exp-13 rollout counts | Already bumped to post–Exp-14 totals (35/50/54/42/28) — do **not** reverse |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (7 texts) | **In scope** — fixtures JSON + optional live script |
| >85% agreement | **Optional live script** — skip exit 0 without API key; not CI hard gate |
| Hebrew fixtures pass | Represented in fixtures JSON; live when key present |
| Tension + positive chips tested (esp. monogamy dealbreaker) | **`compare()` E2E** — cover **all three** tensions + **all three** positive chips; monogamy mismatch chip must be asserted |
| Chips EN/HE/ES | Story 4 done; Story 5 **re-asserts** registry + tension passthrough |
| No regression on “42 existing signals” | Assert scored still **15**; Exp-13 E2E spot-checks still pass |
| Promote shadow → scoring (45) | **Forbidden** — shadow engineering complete; future promote story |
| Extraction unit tests (high/low/null) | **Already Story 2** — do not re-add |
| Keyword / regex extraction | **Forbidden** |
| HG hard filter | **Out of scope** — product later |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion14Shadow` + `describe('Expansion-14 shadow E2E via compare')` |
| `dating-api/src/extraction/expansion-14-rollout.spec.ts` | **Create** — thin rollout gate asserts (§3) |
| `dating-api/data/expansion-14-extraction-fixtures.json` | **Create** — README + Hebrew + null/distinction rows |
| `dating-api/scripts/validate-expansion-14-extraction.ts` | **Create** — live LLM validation (mirror Exp-13) |
| `dating-api/package.json` | `"validate:expansion-14-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | Confirm ≥1 Exp-14 **tension** chip passthrough (Story 4 may already have monogamy; add patience/pacing if useful) |
| `dating-ui/.../chip-evidence.spec.ts` | Verify Exp-14 three labels still in keys (length **40**) — already Story 4; extend only if missing |

### Docs (agent 3)

| Path | Change |
|------|--------|
| Sprint README Story 5 + DoD | Mark Done (engineering); promote deferred; operator notes |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility-score.ts` / promote / weight wiring | Future promote story |
| New tension/chip/extraction rules | Stories 2–4 complete |
| Duplicate Story 2/3 unit matrices | Already green |
| Expansion-08 chips / validate script | Separate unfinished sprint |
| HG hard filter / admission gate | Product later |
| Admin match-quality deep UI | Defer / SKIP |
| Browser Playwright | Out of pattern |
| Keyword / regex extraction | Forbidden |
| Downgrade Exp-13 rollout counts | Counts already include Exp-14 |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine helper (locked)

```typescript
type Expansion14ShadowKey =
  | 'patienceTolerance'
  | 'intimacyPacing'
  | 'monogamyAlignment';

function makeProfileWithExpansion14Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion14ShadowKey, number | null>>,
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

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–13 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-14 shadow E2E via compare')` with **≥15** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | all three ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ≠ `conflictStyle` / `emotionalRegulation` / `casualIntimacyIntent` / `relationshipClarity`; ∉ interest tags |
| 3 | Patience tolerance gap | A patience 9 / B 2 | `tensionChip === 'Different tolerance levels'`; `patience_tolerance_gap`; `friction >= 3` |
| 4 | Intimacy pacing clash | A pacing 9 / B 2 | `Different pace to closeness`; `intimacy_pacing_clash` |
| 5 | Monogamy alignment mismatch (**dealbreaker**) | A mono 2 / B open 9 | `Relationship structure mismatch`; `monogamy_alignment_mismatch`; `friction >= 8` |
| 6 | Positive Patience match | both patience 8 | `positiveChips` contains `'Patience match'` |
| 7 | Positive Pace of closeness (both fast) | both pacing 8 | contains `'Pace of closeness'` |
| 8 | Positive Pace of closeness (both slow) | both pacing 2 | contains `'Pace of closeness'` |
| 9 | Positive Aligned on relationship structure (both mono) | both monogamy 2 | contains `'Aligned on relationship structure'` |
| 10 | Positive Aligned on relationship structure (both open) | both monogamy 8 | contains `'Aligned on relationship structure'` |
| 11 | Both-critical patience **no** Patience match | both patience 2 | **does not** contain `'Patience match'` |
| 12 | Mono vs open **no** Aligned structure | A 2 / B 9 | **does not** contain `'Aligned on relationship structure'` (may show tension) |
| 13 | Alignments exclusion | both high patience | alignments exclude Exp-14 keys / browse labels / meta labels |
| 14 | Null shadow → no patience gap | A patience 9 / B null | no `patience_tolerance_gap` |
| 15 | Compatibility invariance | same official; only Exp-14 shadow differs | `compatibility` equal |
| 16 | Exp-13 non-regression | growthMindset 9 vs 2 | still `Different growth pace` |
| 17 | Exp-12 or Exp-11 spot (recommended) | listeningPresence 9 vs 2 **or** stressResponse 9 vs 2 | prior tension still surfaces |

**Friction note:** Monogamy mismatch penalty **8** dominates when stacked. When asserting patience (3) or pacing (4) chips, keep other Exp-14 signals **null** and avoid stacking higher-penalty peers. For monogamy (#5), leave patience/pacing null so `Relationship structure mismatch` wins cleanly.

**Positive-chip note:** Patience is **both-high ≥7 only**. Pacing dual-band (≥7 or ≤3). Monogamy dual-band (≤2 or ≥7). Both-critical patience and mono-vs-open must **never** emit the matching browse positives (tests #11–12).

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-14-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Shadow membership | `SHADOW_SIGNAL_KEYS` contains all three; length **35** |
| Total / evidence | `EXTRACTION_SIGNAL_KEYS.length === 50`; `MAX_EVIDENCE_ITEMS === 54` |
| Not scored | all three ∉ `COMPATIBILITY_SIGNAL_KEYS`; scored length **15** |
| DOMAIN_ALLOWED | self contains all three (length **42**); partner contains all three (**28**); relationship does not |
| Meta | `EXPANSION_14_PROMOTION_*` weights/tiers/domains/chips match Story 1 (meta chips OK here; domains **relationship/intimacy/relationship**) |
| Chip labels | `SHADOW_POSITIVE_CHIP_BY_SIGNAL` from `expansion-14-explainability` — three browse labels; domains relationship/intimacy/relationship |
| Tension ids present | `tensionRules` includes `patience_tolerance_gap`, `intimacy_pacing_clash`, `monogamy_alignment_mismatch` |

Do **not** re-test full Story 2/3 matrices here.  
Do **not** weaken Exp-13 rollout counts — they already reflect Exp-14 totals.

### 4. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-14-extraction-fixtures.json`  
(Force-add if `/data` is gitignored — same as Exp-13.)

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| README EN high/low/null | ≥7 | Table rows (widen bands for live LLM: high **7–10** / low **1–4** where README was 8–9 / 1–2 / 2–3) |
| Hebrew patience high / pacing low / monogamy low | ≥3 | Semantic HE text |
| Conflict-alone → patience null | ≥1 | `allowNull` on `patienceTolerance` |
| Casual-intimacy-alone → pacing null | ≥1 | Prefer null on `intimacyPacing` (`allowNull`) |
| Clarity-labels-alone → monogamy null | ≥1 | Prefer null on `monogamyAlignment` (`allowNull`) unless exclusive/open structure explicit |

**Schema (locked — Exp-13 shape):**

```typescript
interface Expansion14Expectation {
  signal: 'patienceTolerance' | 'intimacyPacing' | 'monogamyAlignment';
  expectedMin: number;
  expectedMax: number;
  allowNull?: boolean;
}

interface Expansion14Fixture {
  id: string;
  aboutMe: string;
  signal?: 'patienceTolerance' | 'intimacyPacing' | 'monogamyAlignment';
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion14Expectation[];
}
```

Example README-aligned rows:

```json
{
  "id": "patience_high_en",
  "aboutMe": "I try to be understanding about the little things",
  "signal": "patienceTolerance",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "patience_low_en",
  "aboutMe": "Little habits really bother me",
  "signal": "patienceTolerance",
  "expectedMin": 1,
  "expectedMax": 4
}
```

```json
{
  "id": "pacing_high_en",
  "aboutMe": "I fall hard and quick",
  "signal": "intimacyPacing",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "pacing_low_en",
  "aboutMe": "I take things slow, need time",
  "signal": "intimacyPacing",
  "expectedMin": 1,
  "expectedMax": 4
}
```

```json
{
  "id": "monogamy_low_en",
  "aboutMe": "Looking for committed, exclusive relationship only",
  "signal": "monogamyAlignment",
  "expectedMin": 1,
  "expectedMax": 3
}
```

```json
{
  "id": "monogamy_high_en",
  "aboutMe": "I'm ethically non-monogamous",
  "signal": "monogamyAlignment",
  "expectedMin": 7,
  "expectedMax": 10
}
```

**Polarity reminder:** monogamy low = mono/exclusive; high = open/poly — do not invert fixture expectations.

Keep **semantic** — no keyword scoring in script.

### 5. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-14-extraction.ts`

Mirror Exp-13:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass; `allowNull` passes on null
- Agreement = passes / scored; **null when band expected (without allowNull) fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-14-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-14-extraction.ts"
```

### 6. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-14 | `tensionChip: 'Relationship structure mismatch'` renders as-is (already Story 4 — keep/confirm) |
| Optional | `Different tolerance levels` and/or `Different pace to closeness` |
| Chip registry | Exp-14 three labels still in `CHIP_EVIDENCE_KEYS` (length **40**) |

Positive chip EN/HE + onboarding prompts already Story 4 — do not require re-tests unless broken.

### 7. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-14"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-13"
npx jest src/extraction/expansion-14-rollout.spec.ts --runInBand
npx jest src/matches/expansion-14-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-14"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-14|Relationship structure mismatch|Different tolerance|Different pace"
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-14-extraction` — document SKIP or % agreement in handoff.  
Optional: Exp-12/11 E2E spot `-t "Expansion-12"` / `-t "Expansion-11"`.

### 8. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- All Exp-14 keys ∉ scored set
- `alignments` exclude Exp-14 shadow keys / positive chip labels
- Exp-01–13 integration describes still pass (spot-check Exp-13)
- **No** promote / weight wiring / move to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- **No** use of meta chips `Patience with differences` / `Relationship structure` as browse positives (except pacing string equality OK)
- **No** invert monogamy polarity
- **No** HG hard filter

### 9. Agent 4

**Skip.**

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-14 E2E | ≥15 cases in matrix §2 |
| Expansion-13 non-regression | Spot-check still passes |
| Rollout gate spec | Present + green |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew rows represented in fixtures | ≥3 HE |
| UI Exp-14 tension passthrough | ≥1 (monogamy dealbreaker preferred) |
| Exp-14 chips in `CHIP_EVIDENCE_KEYS` | Still **40** / three labels |
| Existing Exp-14 unit suites still pass | extraction + friction + explainability |
| Scoring promote | **Not in scope** |

---

## Service signatures

No new public product APIs. Script-only:

```typescript
// scripts/validate-expansion-14-extraction.ts — CLI
```

---

## API / HTTP contracts

No DTO changes. Existing explainability fields already emit Exp-14 chips/tensions when rules fire.

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

1. Add `makeProfileWithExpansion14Shadow` + Expansion-14 `compare()` E2E matrix (§2) — include monogamy dealbreaker + dual-band positives.
2. Create `expansion-14-rollout.spec.ts` (§3).
3. Create fixtures JSON + validate script + package.json script (§4–5); force-add fixtures if gitignored.
4. Confirm UI tension passthrough + chip registry (§6).
5. Run regression commands (§7); optionally run live validator and record SKIP/% .
6. **Do not** promote to scored keys, change extraction prompts, invent HG hard filter, or invent Exp-08 work.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-14-tolerance-intimacy-pacing/handoffs/STORY_05_testing_validation/`. Do not commit unless user asks.

Suggested commit:

```
test(matching): Expansion-14 patience pacing monogamy E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```

---

## Agent 2 CR checklist

- [ ] ≥15 Expansion-14 `compare()` E2E cases with exact tension/chip labels
- [ ] Monogamy mismatch → `Relationship structure mismatch` / friction ≥8
- [ ] Both-critical patience → **no** `Patience match`; both-high → `Patience match`
- [ ] Pacing both-slow **and** both-fast → `Pace of closeness`; mono vs open → **no** aligned structure positive
- [ ] All three tensions + all three positive chips covered in E2E
- [ ] Rollout gate asserts counts (35/50/54/42/28/15) + chip map keys + domains
- [ ] Fixtures cover README + Hebrew + null/distinction cases; monogamy polarity correct
- [ ] Validate script mirrors Exp-13; skip without API key; no regex scoring
- [ ] UI tension passthrough present
- [ ] **No** `COMPATIBILITY_SIGNAL_KEYS` / weight promote / HG hard filter
- [ ] Prior expansion helpers/specs not broken
- [ ] Regression commands pass

---

## Open questions / blockers

- None blocking Story 5 engineering close.
- **Operator:** Run `npm run validate:expansion-14-extraction` with API key before any future promote.
- **Future:** Explicit promote sprint to move expansion keys into scored registries — do **not** treat README “45” as this story’s deliverable.
- **Product later:** HG hard filter for extreme monogamy mismatch.
- **Exp-08** remains unfinished sibling debt (no Exp-14 dependency).

---

## Next agent

```text
--agent 1 expansion 14 story 5
```

**Notes:** Keep shadow. Mirror Exp-13 Story 5. Live >85% is optional operator gate, not CI. Dual-band positives + monogamy dealbreaker tension are the Exp-14-specific locks. Meta chips ≠ browse chips. Promote forbidden.
