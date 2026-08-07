# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Regression](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-10 with **`compare()` E2E**, **fixtures + optional live LLM validation**, and **UI/i18n presence checks**. **No** promote to scoring / no new extraction, tension, or chip logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-07 Story 5 (multi-signal shadow E2E + optional live script). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-10 E2E: three tensions, two positive chips, alignments exclusion, compatibility invariance, Exp-07/09 non-regression spots, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew** rows — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 covers positive chips + onboarding prompts. Story 5 adds **≥1 Exp-10 tension chip passthrough** + confirm Exp-10 labels remain in `CHIP_EVIDENCE_KEYS` (**31**).
- **README “Promote shadow keys → scoring (36 total)”:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story (same as Exp-01–07).
- Agent 4 **skipped**.
- Closes Expansion-10 **engineering gate** in shadow mode.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (2) | `repairSkills`, `forgivenessStyle` |
| Friction (Story 3) | `repair_skills_gap` (5), `both_low_repair` (6), `forgiveness_style_gap` (4) |
| Positive chips (Story 4) | `Conflict recovery`, `Letting go & moving forward` |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **26** shadow / **41** total / `MAX_EVIDENCE_ITEMS === 45` |
| Self / partner `DOMAIN_ALLOWED` | **33** / **19** |
| `CHIP_EVIDENCE_KEYS` | **31** (Story 4) |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-10 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-10 — **do not duplicate** |
| Adjacent collision risks | `conflictStyle`, `directness`, `emotionalRegulation`, `attachmentSecurity` |
| Live scripts today | Exp-01–07, Exp-09 exist; **no** Exp-08/10 yet |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (5 texts) | **In scope** — fixtures JSON + optional live script |
| >85% agreement | **Optional live script** — skip exit 0 without API key; not CI hard gate |
| Hebrew fixtures pass | Represented in fixtures JSON; live when key present |
| 3 tension rules tested | **`compare()` E2E** (Story 3 units already green) |
| Chips EN/HE/ES | Story 4 done; Story 5 **re-asserts** registry + tension passthrough |
| No regression on “34 existing signals” | Assert scored still **15**; Exp-07/09 E2E spot-checks still pass |
| Promote shadow → scoring (36) | **Forbidden** — shadow engineering complete; future promote story |
| Extraction unit tests (high/low/null) | **Already Story 2** — do not re-add |
| Ambiguous “shut down / need space” band 3–4 | Fixture with **wide band 1–5** + comment; or `allowNull` acceptable — human-review soft case |
| Keyword / regex extraction | **Forbidden** |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion10Shadow` + `describe('Expansion-10 shadow E2E via compare')` |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | **Create** — thin rollout gate asserts (§3) |
| `dating-api/data/expansion-10-extraction-fixtures.json` | **Create** — README + Hebrew + null/distinction rows |
| `dating-api/scripts/validate-expansion-10-extraction.ts` | **Create** — live LLM validation (mirror Exp-07) |
| `dating-api/package.json` | `"validate:expansion-10-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | ≥1 Exp-10 **tension** chip passthrough (e.g. `Conflict recovery risk`) |
| `dating-ui/.../chip-evidence.spec.ts` | Verify Exp-10 two labels still in keys (length **31**) — already Story 4; extend only if missing |

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
type Expansion10ShadowKey = 'repairSkills' | 'forgivenessStyle';

function makeProfileWithExpansion10Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion10ShadowKey, number | null>>,
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

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–09 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-10 shadow E2E via compare')` with **≥12** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ≠ `conflictStyle` / `emotionalRegulation` / `attachmentSecurity` / `directness`; ∉ interest tags |
| 3 | Repair skills gap | A repair 9 / B 2 | `tensionChip === 'Different repair styles'`; `repair_skills_gap` in matrix; `friction >= 3` |
| 4 | Both low repair | both repair 2 | `tensionChip === 'Conflict recovery risk'`; `both_low_repair`; **no** `repair_skills_gap` |
| 5 | Forgiveness style gap | A forg 9 / B 2 | `Different forgiveness pace`; `forgiveness_style_gap` |
| 6 | Positive Conflict recovery | both repair 8 | `positiveChips` contains `'Conflict recovery'` |
| 7 | Positive Letting go | both forg 8 | contains `'Letting go & moving forward'` |
| 8 | Alignments exclusion | both high repair | alignments exclude Exp-10 keys / chip labels |
| 9 | Null shadow → no clash | A repair 9 / B null | no `repair_skills_gap` / `both_low_repair` |
| 10 | Compatibility invariance | same official; only Exp-10 shadow differs | `compatibility` equal |
| 11 | Exp-07 non-regression | casualIntimacyIntent 9 vs 2 | still `Casual vs committed intimacy` |
| 12 | Exp-09 interest spot (recommended) | both `interestsTop3: ['biking','camping']` | `interestOverlapTags` length ≤ 2 includes those tags |

**Friction note:** When asserting a specific tension chip, avoid stacking a higher-penalty rule unless intentional (`both_low_repair` 6 beats `forgiveness_style_gap` 4).

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-10-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Shadow membership | `SHADOW_SIGNAL_KEYS` contains both; length **26** |
| Total / evidence | `EXTRACTION_SIGNAL_KEYS.length === 41`; `MAX_EVIDENCE_ITEMS === 45` |
| Not scored | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; scored length **15** |
| DOMAIN_ALLOWED | self contains both (length **33**); partner contains both (**19**); relationship does not |
| Meta | `EXPANSION_10_PROMOTION_*` weights/tiers/domains/chips match Story 1 |
| Chip labels | `SHADOW_POSITIVE_CHIP_BY_SIGNAL` from `expansion-10-explainability` exact |
| Tension ids present | `tensionRules` includes the three Exp-10 ids (import from `tension-rules`) |

Do **not** re-test full Story 2/3 matrices here.

### 4. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-10-extraction-fixtures.json`  
(Force-add if `/data` is gitignored — same as Exp-09.)

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| README EN high/low/null | ≥5 | Table rows |
| Hebrew high repair / high forgiveness / low forgiveness | ≥3 | Semantic HE text |
| Space-after-fight → null | ≥1 | `allowNull: true` on `repairSkills` |
| During-conflict only (no aftermath) → null | ≥1 | Prefer null on Exp-10 keys (`allowNull`) |
| Ambiguous shut-down/space | ≥1 | Wide band **1–5** on `repairSkills` (soft human-review case) |

**Schema (locked — Exp-07 shape):**

```typescript
interface Expansion10Expectation {
  signal: 'repairSkills' | 'forgivenessStyle';
  expectedMin: number;
  expectedMax: number;
  allowNull?: boolean;
}

interface Expansion10Fixture {
  id: string;
  aboutMe: string;
  signal?: 'repairSkills' | 'forgivenessStyle';
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion10Expectation[];
}
```

Example README-aligned rows:

```json
{
  "id": "repair_high_en",
  "aboutMe": "I always apologize first and want to reconnect fast after we fight.",
  "signal": "repairSkills",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "repair_space_alone_null",
  "aboutMe": "I need space after a fight.",
  "expectations": [
    { "signal": "repairSkills", "expectedMin": 1, "expectedMax": 10, "allowNull": true }
  ]
}
```

Keep **semantic** — no keyword scoring in script.

### 5. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-10-extraction.ts`

Mirror Exp-07:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass; `allowNull` passes on null
- Agreement = passes / scored; **null when band expected (without allowNull) fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-10-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-10-extraction.ts"
```

### 6. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-10 | `tensionChip: 'Conflict recovery risk'` renders as-is (English API) |
| Optional | Second tension e.g. `Different repair styles` |
| Chip registry | Exp-10 two labels still in `CHIP_EVIDENCE_KEYS` (length **31**) |

Positive chip EN/HE + onboarding prompts already Story 4 — do not require re-tests unless broken.

### 7. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-10"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-07"
npx jest src/extraction/expansion-10-rollout.spec.ts --runInBand
npx jest src/matches/expansion-10-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-10"
npm run typecheck

cd dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-10|Conflict recovery risk|Different repair"
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-10-extraction` — document SKIP or % agreement in handoff.  
Optional: Exp-09 E2E spot `-t "Expansion-09"`.

### 8. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Both Exp-10 keys ∉ scored set
- `alignments` exclude Exp-10 shadow keys
- Exp-01–09 integration describes still pass (spot-check Exp-07/09)
- **No** promote / weight wiring / move to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`

### 9. Agent 4

**Skip.**

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-10 E2E | ≥12 cases in matrix §2 |
| Expansion-07 non-regression | Spot-check still passes |
| Rollout gate spec | Present + green |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew rows represented in fixtures | ≥3 HE |
| UI Exp-10 tension passthrough | ≥1 |
| Exp-10 chips in `CHIP_EVIDENCE_KEYS` | Still **31** / two labels |
| Existing Exp-10 unit suites still pass | extraction + friction + explainability |
| Scoring promote | **Not in scope** |

---

## Service signatures

No new public product APIs. Script-only:

```typescript
// scripts/validate-expansion-10-extraction.ts — CLI
```

---

## API / HTTP contracts

No DTO changes. Existing explainability fields already emit Exp-10 chips/tensions when rules fire.

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

1. Add `makeProfileWithExpansion10Shadow` + Expansion-10 `compare()` E2E matrix (§2).
2. Create `expansion-10-rollout.spec.ts` (§3).
3. Create fixtures JSON + validate script + package.json script (§4–5); force-add fixtures if gitignored.
4. Add UI tension passthrough + confirm chip registry (§6).
5. Run regression commands (§7); optionally run live validator and record SKIP/% .
6. **Do not** promote to scored keys, change extraction prompts, or invent Exp-08 work.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-10-conflict-recovery/handoffs/STORY_05_testing_validation/`. Do not commit unless user asks.

Suggested commit:

```
test(matching): Expansion-10 conflict recovery E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```

---

## Agent 2 CR checklist

- [ ] ≥12 Expansion-10 `compare()` E2E cases with exact tension/chip labels
- [ ] `both_low_repair` exclusivity vs gap covered in E2E
- [ ] Rollout gate asserts counts (26/41/45/33/19/15/31)
- [ ] Fixtures cover README + Hebrew + null/distinction cases
- [ ] Validate script mirrors Exp-07; skip without API key; no regex scoring
- [ ] UI tension passthrough present
- [ ] **No** `COMPATIBILITY_SIGNAL_KEYS` / weight promote
- [ ] Prior expansion helpers/specs not broken
- [ ] Regression commands pass

---

## Open questions / blockers

- None blocking Story 5 engineering close.
- **Operator:** Run `npm run validate:expansion-10-extraction` with API key before any future promote.
- **Future:** Explicit promote sprint to move Exp-01–10 (or subset) into scored registries — do **not** treat README “36” as this story’s deliverable.
- **Exp-08** remains unfinished sibling debt (no Exp-10 dependency).

---

## Next agent

```text
--agent 1 expansion 10 story 5
```

**Notes:** Keep shadow. Mirror Exp-07 Story 5. Live >85% is optional operator gate, not CI. Ambiguous space/shut-down fixture is soft (wide band / allowNull).
