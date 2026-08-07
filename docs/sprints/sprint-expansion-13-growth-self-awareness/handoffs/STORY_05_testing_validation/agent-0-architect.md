# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Regression](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-13 with **`compare()` E2E**, **fixtures + optional live LLM validation**, and **UI tension passthrough**. **No** promote to scoring / no new extraction, tension, or chip logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-12 Story 5 (multi-signal shadow E2E + optional live script). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-13 E2E: two tensions, two positive chips, both-low growth/awareness **no** positives, alignments exclusion, compatibility invariance, Exp-12/11 non-regression spots, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew** rows — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 covers positive chips + onboarding prompts. Story 5 adds **≥1 Exp-13 tension chip passthrough** + confirm Exp-13 labels remain in `CHIP_EVIDENCE_KEYS` (**37**).
- **README “Promote to scoring (42 total)”:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story (same as Exp-01–12).
- Agent 4 **skipped**.
- Closes Expansion-13 **engineering gate** in shadow mode.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (2) | `growthMindset`, `selfAwareness` |
| Friction (Story 3) | `growth_mindset_gap` (4, ≥8 vs ≤3); `both_low_self_awareness` (3, both ≤3) |
| Positive chips (Story 4) | `Grows together` / `Self-awareness match` — **both** synthetic both-high ≥7 (virtual keys `growthGrowsTogether` / `selfAwarenessMatch`) |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **32** shadow / **47** total / `MAX_EVIDENCE_ITEMS === 51` |
| Self / partner `DOMAIN_ALLOWED` | **39** / **25** |
| `CHIP_EVIDENCE_KEYS` | **37** (Story 4) |
| Domains | both shadow chips → **`personal`** (scored `SIGNAL_DOMAIN` unchanged) |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-13 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-13 — **do not duplicate** |
| Adjacent collision risks | `vulnerabilityOpenness`, `directness`, `emotionalRegulation`, `empathyCompassion` |
| Meta vs browse chips | Story 1 meta `Openness to growth` / `Self-awareness` ≠ browse `Grows together` / `Self-awareness match` |
| Live scripts today | Exp-01–07, Exp-09–12 exist; **no** Exp-13 yet |
| Exp-12 rollout counts | Already bumped to post–Exp-13 totals (32/47/51/39/25) — do **not** reverse |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (5 texts) | **In scope** — fixtures JSON + optional live script |
| >85% agreement | **Optional live script** — skip exit 0 without API key; not CI hard gate |
| Hebrew fixtures pass | Represented in fixtures JSON; live when key present |
| Tension + positive chips tested | **`compare()` E2E** — cover **both** tensions + **both** positive chips |
| Chips EN/HE/ES | Story 4 done; Story 5 **re-asserts** registry + tension passthrough |
| `personal` domain in chip-diversity | Story 4 done via `SHADOW_SIGNAL_DOMAIN`; re-assert in rollout gate |
| No regression on “40 existing signals” | Assert scored still **15**; Exp-12/11 E2E spot-checks still pass |
| Promote shadow → scoring (42) | **Forbidden** — shadow engineering complete; future promote story |
| Extraction unit tests (high/low/null) | **Already Story 2** — do not re-add |
| Keyword / regex extraction | **Forbidden** |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion13Shadow` + `describe('Expansion-13 shadow E2E via compare')` |
| `dating-api/src/extraction/expansion-13-rollout.spec.ts` | **Create** — thin rollout gate asserts (§3) |
| `dating-api/data/expansion-13-extraction-fixtures.json` | **Create** — README + Hebrew + null/distinction rows |
| `dating-api/scripts/validate-expansion-13-extraction.ts` | **Create** — live LLM validation (mirror Exp-12) |
| `dating-api/package.json` | `"validate:expansion-13-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | ≥1 Exp-13 **tension** chip passthrough (e.g. `Different growth pace`) |
| `dating-ui/.../chip-evidence.spec.ts` | Verify Exp-13 two labels still in keys (length **37**) — already Story 4; extend only if missing |

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
| Downgrade Exp-12 rollout counts | Counts already include Exp-13 |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine helper (locked)

```typescript
type Expansion13ShadowKey = 'growthMindset' | 'selfAwareness';

function makeProfileWithExpansion13Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion13ShadowKey, number | null>>,
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

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–12 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-13 shadow E2E via compare')` with **≥12** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ≠ `vulnerabilityOpenness` / `directness` / `emotionalRegulation` / `empathyCompassion`; ∉ interest tags |
| 3 | Growth mindset gap | A growth 9 / B 2 | `tensionChip === 'Different growth pace'`; `growth_mindset_gap`; `friction >= 3` |
| 4 | Both low self-awareness | both awareness 2 | `Self-insight gap`; `both_low_self_awareness` |
| 5 | Positive Grows together | both `growthMindset` 8 | `positiveChips` contains `'Grows together'` |
| 6 | Positive Self-awareness match | both `selfAwareness` 8 | contains `'Self-awareness match'` |
| 7 | Both-low growth **no** Grows together | both `growthMindset` 2 | **does not** contain `'Grows together'` |
| 8 | Both-low awareness **no** Self-awareness match | both `selfAwareness` 2 | **does not** contain `'Self-awareness match'` (may still show tension chip) |
| 9 | Alignments exclusion | both high growth | alignments exclude Exp-13 keys / chip labels (`Grows together`, `Self-awareness match`, meta labels) |
| 10 | Null shadow → no growth gap | A growth 9 / B null | no `growth_mindset_gap` |
| 11 | Compatibility invariance | same official; only Exp-13 shadow differs | `compatibility` equal |
| 12 | Exp-12 non-regression | listeningPresence 9 vs 2 | still `Different listening styles` |
| 13 | Exp-11 or Exp-10 spot (recommended) | stressResponse 9 vs 2 **or** repairSkills 9 vs 2 | prior tension still surfaces |

**Friction note:** Growth gap penalty **4**; both-low awareness **3**. When asserting a specific tension chip, keep the other Exp-13 signal null and avoid stacking peer rules (Exp-12 listening gap is also 4 — keep Exp-12 null when asserting Exp-13 chips). For both-low awareness (#4), leave `growthMindset` null so `Self-insight gap` wins the chip.

**Positive-chip note:** Both positives are **synthetic both-high ≥7 only**. Both-low growth/awareness must **never** emit browse positives (tests #7–8). Do **not** invent a pairScore path for these keys.

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-13-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Shadow membership | `SHADOW_SIGNAL_KEYS` contains both; length **32** |
| Total / evidence | `EXTRACTION_SIGNAL_KEYS.length === 47`; `MAX_EVIDENCE_ITEMS === 51` |
| Not scored | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; scored length **15** |
| DOMAIN_ALLOWED | self contains both (length **39**); partner contains both (**25**); relationship does not |
| Meta | `EXPANSION_13_PROMOTION_*` weights/tiers/domains/chips match Story 1 (`Openness to growth` / `Self-awareness` meta OK here; domains **`personal`**) |
| Chip labels | `SHADOW_POSITIVE_CHIP_BY_SIGNAL` from `expansion-13-explainability` — `Grows together` / `Self-awareness match` (`growthGrowsTogether` / `selfAwarenessMatch`); domains both `personal` |
| Tension ids present | `tensionRules` includes `growth_mindset_gap`, `both_low_self_awareness` |

Do **not** re-test full Story 2/3 matrices here.  
Do **not** weaken Exp-12 rollout counts — they already reflect Exp-13 totals.

### 4. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-13-extraction-fixtures.json`  
(Force-add if `/data` is gitignored — same as Exp-12.)

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| README EN high/low/null | ≥5 | Table rows (widen bands for live LLM: high **7–10** / low **1–4** where README was 8–9 / 1–2 / 2–3) |
| Hebrew high growth / high awareness / low growth | ≥3 | Semantic HE text |
| Vulnerability-alone → growth null | ≥1 | `allowNull` on `growthMindset` |
| Regulation-alone → awareness null | ≥1 | Prefer null on `selfAwareness` (`allowNull`) |
| Empathy-alone → awareness null | ≥1 | Prefer null on `selfAwareness` (`allowNull`) |

**Schema (locked — Exp-12 shape):**

```typescript
interface Expansion13Expectation {
  signal: 'growthMindset' | 'selfAwareness';
  expectedMin: number;
  expectedMax: number;
  allowNull?: boolean;
}

interface Expansion13Fixture {
  id: string;
  aboutMe: string;
  signal?: 'growthMindset' | 'selfAwareness';
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion13Expectation[];
}
```

Example README-aligned rows:

```json
{
  "id": "growth_high_en",
  "aboutMe": "I'm always working on becoming better, I welcome feedback",
  "signal": "growthMindset",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "growth_low_en",
  "aboutMe": "I am who I am, not going to change",
  "signal": "growthMindset",
  "expectedMin": 1,
  "expectedMax": 4
}
```

```json
{
  "id": "awareness_high_en",
  "aboutMe": "I know I shut down when criticized, so I try to pause",
  "signal": "selfAwareness",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "awareness_low_en",
  "aboutMe": "I don't know why I react the way I do",
  "signal": "selfAwareness",
  "expectedMin": 1,
  "expectedMax": 4
}
```

Keep **semantic** — no keyword scoring in script.

### 5. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-13-extraction.ts`

Mirror Exp-12:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass; `allowNull` passes on null
- Agreement = passes / scored; **null when band expected (without allowNull) fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-13-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-13-extraction.ts"
```

### 6. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-13 | `tensionChip: 'Different growth pace'` renders as-is (English API) |
| Optional | Second tension e.g. `Self-insight gap` |
| Chip registry | Exp-13 two labels still in `CHIP_EVIDENCE_KEYS` (length **37**) |

Positive chip EN/HE + onboarding prompts already Story 4 — do not require re-tests unless broken.

### 7. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-13"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-12"
npx jest src/extraction/expansion-13-rollout.spec.ts --runInBand
npx jest src/matches/expansion-13-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-13"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-13|Different growth|Self-insight"
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-13-extraction` — document SKIP or % agreement in handoff.  
Optional: Exp-11/10 E2E spot `-t "Expansion-11"` / `-t "Expansion-10"`.

### 8. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Both Exp-13 keys ∉ scored set
- `alignments` exclude Exp-13 shadow keys / positive chip labels
- Exp-01–12 integration describes still pass (spot-check Exp-12/11)
- **No** promote / weight wiring / move to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- **No** use of meta chips `Openness to growth` / `Self-awareness` as browse positives
- **No** invent `self_awareness_gap` (high vs low)

### 9. Agent 4

**Skip.**

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-13 E2E | ≥12 cases in matrix §2 |
| Expansion-12 non-regression | Spot-check still passes |
| Rollout gate spec | Present + green |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew rows represented in fixtures | ≥3 HE |
| UI Exp-13 tension passthrough | ≥1 |
| Exp-13 chips in `CHIP_EVIDENCE_KEYS` | Still **37** / two labels |
| Existing Exp-13 unit suites still pass | extraction + friction + explainability |
| Scoring promote | **Not in scope** |

---

## Service signatures

No new public product APIs. Script-only:

```typescript
// scripts/validate-expansion-13-extraction.ts — CLI
```

---

## API / HTTP contracts

No DTO changes. Existing explainability fields already emit Exp-13 chips/tensions when rules fire.

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

1. Add `makeProfileWithExpansion13Shadow` + Expansion-13 `compare()` E2E matrix (§2).
2. Create `expansion-13-rollout.spec.ts` (§3).
3. Create fixtures JSON + validate script + package.json script (§4–5); force-add fixtures if gitignored.
4. Add UI tension passthrough + confirm chip registry (§6).
5. Run regression commands (§7); optionally run live validator and record SKIP/% .
6. **Do not** promote to scored keys, change extraction prompts, or invent Exp-08 work.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-13-growth-self-awareness/handoffs/STORY_05_testing_validation/`. Do not commit unless user asks.

Suggested commit:

```
test(matching): Expansion-13 growth and self-awareness E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```

---

## Agent 2 CR checklist

- [ ] ≥12 Expansion-13 `compare()` E2E cases with exact tension/chip labels
- [ ] Both-low growth → **no** `Grows together`; both-high (≥7) → `Grows together`
- [ ] Both-low awareness → **no** `Self-awareness match`; both-high → `Self-awareness match`
- [ ] Both tensions + both positive chips covered in E2E
- [ ] Rollout gate asserts counts (32/47/51/39/25/15) + chip map keys + `personal` domains
- [ ] Fixtures cover README + Hebrew + null/distinction cases
- [ ] Validate script mirrors Exp-12; skip without API key; no regex scoring
- [ ] UI tension passthrough present
- [ ] **No** `COMPATIBILITY_SIGNAL_KEYS` / weight promote
- [ ] Prior expansion helpers/specs not broken
- [ ] Regression commands pass

---

## Open questions / blockers

- None blocking Story 5 engineering close.
- **Operator:** Run `npm run validate:expansion-13-extraction` with API key before any future promote.
- **Future:** Explicit promote sprint to move expansion keys into scored registries — do **not** treat README “42” as this story’s deliverable.
- **Exp-08** remains unfinished sibling debt (no Exp-13 dependency).

---

## Next agent

```text
--agent 1 expansion 13 story 5
```

**Notes:** Keep shadow. Mirror Exp-12 Story 5. Live >85% is optional operator gate, not CI. Both positives are synthetic both-high only. Meta chips ≠ browse chips. Promote forbidden.
