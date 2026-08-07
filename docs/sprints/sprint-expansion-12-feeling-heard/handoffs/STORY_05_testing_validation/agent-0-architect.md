# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Regression](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-12 with **`compare()` E2E**, **fixtures + optional live LLM validation**, and **UI tension passthrough**. **No** promote to scoring / no new extraction, tension, or chip logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-11 Story 5 (multi-signal shadow E2E + optional live script). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-12 E2E: two tensions, two positive chips, both-low listening **no** `Feels heard`, alignments exclusion, compatibility invariance, Exp-11/10 non-regression spots, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew** rows — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 covers positive chips + onboarding prompts. Story 5 adds **≥1 Exp-12 tension chip passthrough** + confirm Exp-12 labels remain in `CHIP_EVIDENCE_KEYS` (**35**).
- **README “Promote to scoring (40 total)”:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story (same as Exp-01–11).
- Agent 4 **skipped**.
- Closes Expansion-12 **engineering gate** in shadow mode.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (2) | `listeningPresence`, `emotionalExpression` |
| Friction (Story 3) | `listening_presence_gap` (4), `emotional_expression_gap` (4) — fire at ≥8 vs ≤3 |
| Positive chips (Story 4) | `Feels heard` (synthetic both-high listening ≥7); `Expressiveness match` (aligned `emotionalExpression` via pairScore) |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **30** shadow / **45** total / `MAX_EVIDENCE_ITEMS === 49` |
| Self / partner `DOMAIN_ALLOWED` | **37** / **23** |
| `CHIP_EVIDENCE_KEYS` | **35** (Story 4) |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-12 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-12 — **do not duplicate** |
| Adjacent collision risks | `empathyCompassion`, `directness`, `emotionalDepth`, `physicalAffectionStyle` |
| Meta vs browse chips | Story 1 meta `Quality listening` / `Expressiveness` ≠ browse `Feels heard` / `Expressiveness match` |
| Live scripts today | Exp-01–07, Exp-09–11 exist; **no** Exp-12 yet |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (5 texts) | **In scope** — fixtures JSON + optional live script |
| >85% agreement | **Optional live script** — skip exit 0 without API key; not CI hard gate |
| Hebrew fixtures pass | Represented in fixtures JSON; live when key present |
| Tension + positive chips tested | **`compare()` E2E** — cover **both** tensions + **both** positive chips |
| Chips EN/HE/ES | Story 4 done; Story 5 **re-asserts** registry + tension passthrough |
| No regression on “38 existing signals” | Assert scored still **15**; Exp-11/10 E2E spot-checks still pass |
| Promote shadow → scoring (40) | **Forbidden** — shadow engineering complete; future promote story |
| Extraction unit tests (high/low/null) | **Already Story 2** — do not re-add |
| Keyword / regex extraction | **Forbidden** |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion12Shadow` + `describe('Expansion-12 shadow E2E via compare')` |
| `dating-api/src/extraction/expansion-12-rollout.spec.ts` | **Create** — thin rollout gate asserts (§3) |
| `dating-api/data/expansion-12-extraction-fixtures.json` | **Create** — README + Hebrew + null/distinction rows |
| `dating-api/scripts/validate-expansion-12-extraction.ts` | **Create** — live LLM validation (mirror Exp-11) |
| `dating-api/package.json` | `"validate:expansion-12-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | ≥1 Exp-12 **tension** chip passthrough (e.g. `Different listening styles`) |
| `dating-ui/.../chip-evidence.spec.ts` | Verify Exp-12 two labels still in keys (length **35**) — already Story 4; extend only if missing |

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
| Admin match-quality deep UI | Defer / SKIP |
| Browser Playwright | Out of pattern |
| Keyword / regex extraction | Forbidden |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine helper (locked)

```typescript
type Expansion12ShadowKey = 'listeningPresence' | 'emotionalExpression';

function makeProfileWithExpansion12Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion12ShadowKey, number | null>>,
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

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–11 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-12 shadow E2E via compare')` with **≥12** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ≠ `empathyCompassion` / `directness` / `emotionalDepth` / `physicalAffectionStyle`; ∉ interest tags |
| 3 | Listening presence gap | A listen 9 / B 2 | `tensionChip === 'Different listening styles'`; `listening_presence_gap`; `friction >= 3` |
| 4 | Emotional expression gap | A expr 9 / B 2 | `Different expression styles`; `emotional_expression_gap` |
| 5 | Positive Feels heard | both `listeningPresence` 8 | `positiveChips` contains `'Feels heard'` |
| 6 | Positive Expressiveness match | both `emotionalExpression` 8 | contains `'Expressiveness match'` |
| 7 | Both-low listening **no** Feels heard | both `listeningPresence` 2 | **does not** contain `'Feels heard'` |
| 8 | Alignments exclusion | both high listening | alignments exclude Exp-12 keys / chip labels (`Feels heard`, `Expressiveness match`, meta labels) |
| 9 | Null shadow → no gap | A listen 9 / B null | no `listening_presence_gap` |
| 10 | Compatibility invariance | same official; only Exp-12 shadow differs | `compatibility` equal |
| 11 | Exp-11 non-regression | stressResponse 9 vs 2 | still `Pursue vs withdraw under stress` |
| 12 | Exp-10 or Exp-09 spot (recommended) | repairSkills 9 vs 2 **or** shared `biking`/`camping` | Exp-10 tension / Exp-09 overlap tags still work |

**Friction note:** Both Exp-12 gaps are penalty **4**. When asserting a specific tension chip, keep the other Exp-12 signal null and avoid stacking peer rules (Exp-11 stress clash is 5 — keep Exp-11 null when asserting Exp-12 chips).

**Positive-chip note:** Both-low listening must **not** produce `Feels heard` (synthetic path requires both ≥7). Aligned low `emotionalExpression` **may** produce `Expressiveness match` via pairScore — test #6 uses both-high for clarity; both-low listening exclusivity is test #7.

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-12-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Shadow membership | `SHADOW_SIGNAL_KEYS` contains both; length **30** |
| Total / evidence | `EXTRACTION_SIGNAL_KEYS.length === 45`; `MAX_EVIDENCE_ITEMS === 49` |
| Not scored | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; scored length **15** |
| DOMAIN_ALLOWED | self contains both (length **37**); partner contains both (**23**); relationship does not |
| Meta | `EXPANSION_12_PROMOTION_*` weights/tiers/domains/chips match Story 1 (`Quality listening` / `Expressiveness` meta OK here) |
| Chip labels | `SHADOW_POSITIVE_CHIP_BY_SIGNAL` from `expansion-12-explainability` — `Expressiveness match` / `Feels heard` (`emotionalExpression` / `listeningFeelsHeard`) |
| Tension ids present | `tensionRules` includes `listening_presence_gap`, `emotional_expression_gap` |

Do **not** re-test full Story 2/3 matrices here.  
Do **not** weaken Exp-11 rollout counts — they already reflect Exp-12 totals.

### 4. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-12-extraction-fixtures.json`  
(Force-add if `/data` is gitignored — same as Exp-11.)

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| README EN high/low/null | ≥5 | Table rows (widen bands slightly for live LLM like Exp-11: e.g. high 7–10 / low 1–4 where README was 8–9 / 2–3) |
| Hebrew high listening / high expression / low expression (actions-not-words) | ≥3 | Semantic HE text |
| Empathy-alone → listening null | ≥1 | `allowNull` on `listeningPresence` |
| Depth-alone → expression null | ≥1 | Prefer null on `emotionalExpression` (`allowNull`) — depth territory |

**Schema (locked — Exp-11 shape):**

```typescript
interface Expansion12Expectation {
  signal: 'listeningPresence' | 'emotionalExpression';
  expectedMin: number;
  expectedMax: number;
  allowNull?: boolean;
}

interface Expansion12Fixture {
  id: string;
  aboutMe: string;
  signal?: 'listeningPresence' | 'emotionalExpression';
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion12Expectation[];
}
```

Example README-aligned rows:

```json
{
  "id": "listening_high_en",
  "aboutMe": "I always put my phone away and really listen when my partner talks.",
  "signal": "listeningPresence",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "expression_low_en",
  "aboutMe": "I show love through actions, not words.",
  "signal": "emotionalExpression",
  "expectedMin": 1,
  "expectedMax": 4
}
```

Keep **semantic** — no keyword scoring in script.

### 5. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-12-extraction.ts`

Mirror Exp-11:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass; `allowNull` passes on null
- Agreement = passes / scored; **null when band expected (without allowNull) fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-12-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-12-extraction.ts"
```

### 6. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-12 | `tensionChip: 'Different listening styles'` renders as-is (English API) |
| Optional | Second tension e.g. `Different expression styles` |
| Chip registry | Exp-12 two labels still in `CHIP_EVIDENCE_KEYS` (length **35**) |

Positive chip EN/HE + onboarding prompts already Story 4 — do not require re-tests unless broken.

### 7. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-12"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-11"
npx jest src/extraction/expansion-12-rollout.spec.ts --runInBand
npx jest src/matches/expansion-12-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-12"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-12|Different listening|Different expression"
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-12-extraction` — document SKIP or % agreement in handoff.  
Optional: Exp-10/09 E2E spot `-t "Expansion-10"` / `-t "Expansion-09"`.

### 8. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Both Exp-12 keys ∉ scored set
- `alignments` exclude Exp-12 shadow keys / positive chip labels
- Exp-01–11 integration describes still pass (spot-check Exp-11/10)
- **No** promote / weight wiring / move to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- **No** use of meta chips `Quality listening` / `Expressiveness` as browse positives

### 9. Agent 4

**Skip.**

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-12 E2E | ≥12 cases in matrix §2 |
| Expansion-11 non-regression | Spot-check still passes |
| Rollout gate spec | Present + green |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew rows represented in fixtures | ≥3 HE |
| UI Exp-12 tension passthrough | ≥1 |
| Exp-12 chips in `CHIP_EVIDENCE_KEYS` | Still **35** / two labels |
| Existing Exp-12 unit suites still pass | extraction + friction + explainability |
| Scoring promote | **Not in scope** |

---

## Service signatures

No new public product APIs. Script-only:

```typescript
// scripts/validate-expansion-12-extraction.ts — CLI
```

---

## API / HTTP contracts

No DTO changes. Existing explainability fields already emit Exp-12 chips/tensions when rules fire.

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

1. Add `makeProfileWithExpansion12Shadow` + Expansion-12 `compare()` E2E matrix (§2).
2. Create `expansion-12-rollout.spec.ts` (§3).
3. Create fixtures JSON + validate script + package.json script (§4–5); force-add fixtures if gitignored.
4. Add UI tension passthrough + confirm chip registry (§6).
5. Run regression commands (§7); optionally run live validator and record SKIP/% .
6. **Do not** promote to scored keys, change extraction prompts, or invent Exp-08 work.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-12-feeling-heard/handoffs/STORY_05_testing_validation/`. Do not commit unless user asks.

Suggested commit:

```
test(matching): Expansion-12 feeling-heard E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```

---

## Agent 2 CR checklist

- [ ] ≥12 Expansion-12 `compare()` E2E cases with exact tension/chip labels
- [ ] Both-low listening → **no** `Feels heard`; both-high (≥7) → `Feels heard`
- [ ] Both tensions + both positive chips covered in E2E
- [ ] Rollout gate asserts counts (30/45/49/37/23/15) + chip map keys
- [ ] Fixtures cover README + Hebrew + null/distinction cases
- [ ] Validate script mirrors Exp-11; skip without API key; no regex scoring
- [ ] UI tension passthrough present
- [ ] **No** `COMPATIBILITY_SIGNAL_KEYS` / weight promote
- [ ] Prior expansion helpers/specs not broken
- [ ] Regression commands pass

---

## Open questions / blockers

- None blocking Story 5 engineering close.
- **Operator:** Run `npm run validate:expansion-12-extraction` with API key before any future promote.
- **Future:** Explicit promote sprint to move expansion keys into scored registries — do **not** treat README “40” as this story’s deliverable.
- **Exp-08** remains unfinished sibling debt (no Exp-12 dependency).

---

## Next agent

```text
--agent 1 expansion 12 story 5
```

**Notes:** Keep shadow. Mirror Exp-11 Story 5. Live >85% is optional operator gate, not CI. Both-low listening must never emit `Feels heard`. Meta chips ≠ browse chips.
