# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Regression](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-11 with **`compare()` E2E**, **fixtures + optional live LLM validation**, and **UI/i18n presence checks**. **No** promote to scoring / no new extraction, tension, or chip logic.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Expansion-10 Story 5 (multi-signal shadow E2E + optional live script). **No** Phase 1 EQ gate.

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — not isolated unit slices alone.
- **Architect override:** Do **not** duplicate Story 2 extraction mocks or Story 3 friction unit matrices — assert via `compare()` + optional live script.
- Add **`match-engine.spec.ts`** Expansion-11 E2E: three tensions, two positive chips, both-high exclusivity, alignments exclusion, compatibility invariance, Exp-10/09 non-regression spots, adjacent-signal distinction.
- Add **fixtures + optional live script** (≥85% within bands) including **Hebrew** rows — **not a CI gate** without `OPENAI_API_KEY`.
- **UI:** Story 4 covers positive chips + onboarding prompts. Story 5 adds **≥1 Exp-11 tension chip passthrough** + confirm Exp-11 labels remain in `CHIP_EVIDENCE_KEYS` (**33**).
- **README “Promote to scoring (38 total)”:** **Forbidden** in Story 5 — keep shadow; promote is a future explicit story (same as Exp-01–10).
- Agent 4 **skipped**.
- Closes Expansion-11 **engineering gate** in shadow mode.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` in `match-engine.ts` |
| Shadow keys (2) | `stressResponse`, `jealousySecurity` |
| Friction (Story 3) | `stress_response_clash` (5), `jealousy_security_gap` (5), `both_high_jealousy` (3) |
| Positive chips (Story 4) | `Support under pressure` (aligned stress); `Secure & trusting` (both-low jealousy synthetic) |
| Scored keys | Still **15** — `COMPATIBILITY_SIGNAL_KEYS.length === 15` |
| Shadow / total / evidence | **28** shadow / **43** total / `MAX_EVIDENCE_ITEMS === 47` |
| Self / partner `DOMAIN_ALLOWED` | **35** / **21** |
| `CHIP_EVIDENCE_KEYS` | **33** (Story 4) |
| Extraction unit tests | `extraction.service.spec.ts` Expansion-11 — **do not duplicate** |
| Friction unit tests | `compute-friction.spec.ts` Expansion-11 — **do not duplicate** |
| Adjacent collision risks | `attachmentSecurity`, `emotionalRegulation`, `independence`; Exp-10 repair |
| Polarity | `jealousySecurity` **high = more jealous** |
| Live scripts today | Exp-01–07, Exp-09, Exp-10 exist; **no** Exp-11 yet |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (5 texts) | **In scope** — fixtures JSON + optional live script |
| >85% agreement | **Optional live script** — skip exit 0 without API key; not CI hard gate |
| Hebrew fixtures pass | Represented in fixtures JSON; live when key present |
| 3 tension + 1 positive chip tested | **`compare()` E2E** — cover **all 3** tensions + **both** positive chips |
| Chips EN/HE/ES | Story 4 done; Story 5 **re-asserts** registry + tension passthrough |
| No regression on “36 existing signals” | Assert scored still **15**; Exp-10/09 E2E spot-checks still pass |
| Promote shadow → scoring (38) | **Forbidden** — shadow engineering complete; future promote story |
| Extraction unit tests (high/low/null) | **Already Story 2** — do not re-add |
| Keyword / regex extraction | **Forbidden** |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion11Shadow` + `describe('Expansion-11 shadow E2E via compare')` |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | **Create** — thin rollout gate asserts (§3) |
| `dating-api/data/expansion-11-extraction-fixtures.json` | **Create** — README + Hebrew + null/distinction rows |
| `dating-api/scripts/validate-expansion-11-extraction.ts` | **Create** — live LLM validation (mirror Exp-10) |
| `dating-api/package.json` | `"validate:expansion-11-extraction"` |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.spec.tsx` | ≥1 Exp-11 **tension** chip passthrough (e.g. `Pursue vs withdraw under stress`) |
| `dating-ui/.../chip-evidence.spec.ts` | Verify Exp-11 two labels still in keys (length **33**) — already Story 4; extend only if missing |

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
type Expansion11ShadowKey = 'stressResponse' | 'jealousySecurity';

function makeProfileWithExpansion11Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion11ShadowKey, number | null>>,
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

Use **neutral official** signals unless a test needs otherwise. Do not break Exp-01–10 helpers.

### 2. Integration test matrix (locked)

Add `describe('Expansion-11 shadow E2E via compare')` with **≥12** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shadow keys ∉ scored | static | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; length **15** |
| 2 | Adjacent distinction | static | keys ≠ `attachmentSecurity` / `emotionalRegulation` / `independence` / `repairSkills`; ∉ interest tags |
| 3 | Stress response clash | A stress 9 / B 2 | `tensionChip === 'Pursue vs withdraw under stress'`; `stress_response_clash`; `friction >= 3` |
| 4 | Jealousy security gap | A jealousy 9 / B 2 | `Trust & space mismatch`; `jealousy_security_gap` |
| 5 | Both high jealousy | both jealousy 9 | `tensionChip === 'Shared jealousy risk'`; `both_high_jealousy`; **no** `jealousy_security_gap` |
| 6 | Positive Support under pressure | both stress 8 | `positiveChips` contains `'Support under pressure'` |
| 7 | Positive Secure & trusting | both jealousy 2 | contains `'Secure & trusting'` |
| 8 | Alignments exclusion | both high stress | alignments exclude Exp-11 keys / chip labels |
| 9 | Null shadow → no clash | A stress 9 / B null | no `stress_response_clash` |
| 10 | Compatibility invariance | same official; only Exp-11 shadow differs | `compatibility` equal |
| 11 | Exp-10 non-regression | repairSkills 9 vs 2 | still `Different repair styles` |
| 12 | Exp-09 interest spot (recommended) | both `interestsTop3: ['biking','camping']` | `interestOverlapTags` length ≤ 2 includes those tags |

**Friction note:** When asserting a specific tension chip, avoid stacking a higher-or-equal penalty peer unless intentional (stress clash 5 ties jealousy gap 5 — keep other signals null/neutral).

**Positive-chip note:** Both-high jealousy must **not** produce `Secure & trusting`. Both-low jealousy must produce it (synthetic Story 4 path).

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-11-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Shadow membership | `SHADOW_SIGNAL_KEYS` contains both; length **28** |
| Total / evidence | `EXTRACTION_SIGNAL_KEYS.length === 43`; `MAX_EVIDENCE_ITEMS === 47` |
| Not scored | both ∉ `COMPATIBILITY_SIGNAL_KEYS`; scored length **15** |
| DOMAIN_ALLOWED | self contains both (length **35**); partner contains both (**21**); relationship does not |
| Meta | `EXPANSION_11_PROMOTION_*` weights/tiers/domains/chips match Story 1 (`Trust & security` meta chip OK here) |
| Chip labels | `SHADOW_POSITIVE_CHIP_BY_SIGNAL` from `expansion-11-explainability` — `Support under pressure` / `Secure & trusting` |
| Tension ids present | `tensionRules` includes the three Exp-11 ids |

Do **not** re-test full Story 2/3 matrices here.

### 4. Live LLM fixtures (locked)

**File:** `dating-api/data/expansion-11-extraction-fixtures.json`  
(Force-add if `/data` is gitignored — same as Exp-10.)

Minimum coverage:

| Category | Count | Notes |
|----------|-------|-------|
| README EN high/low/null | ≥5 | Table rows |
| Hebrew high stress / high jealousy / low jealousy (secure) | ≥3 | Semantic HE text |
| Independence-alone → jealousy null | ≥1 | `allowNull` on `jealousySecurity` |
| Calm-under-stress alone → stress null | ≥1 | Prefer null on `stressResponse` (`allowNull`) — regulation territory |
| Polarity sanity | covered | jealous text → high band; trust/no-jealousy → low band |

**Schema (locked — Exp-10 shape):**

```typescript
interface Expansion11Expectation {
  signal: 'stressResponse' | 'jealousySecurity';
  expectedMin: number;
  expectedMax: number;
  allowNull?: boolean;
}

interface Expansion11Fixture {
  id: string;
  aboutMe: string;
  signal?: 'stressResponse' | 'jealousySecurity';
  expectedMin?: number;
  expectedMax?: number;
  expectations?: Expansion11Expectation[];
}
```

Example README-aligned rows:

```json
{
  "id": "stress_high_en",
  "aboutMe": "When I'm stressed I need my partner close, I don't want to be alone.",
  "signal": "stressResponse",
  "expectedMin": 7,
  "expectedMax": 10
}
```

```json
{
  "id": "jealousy_low_en",
  "aboutMe": "I fully trust my partner and don't get jealous.",
  "signal": "jealousySecurity",
  "expectedMin": 1,
  "expectedMax": 3
}
```

Keep **semantic** — no keyword scoring in script. Remember polarity: HIGH jealousy = jealous.

### 5. Live validation script (locked — optional gate)

**File:** `dating-api/scripts/validate-expansion-11-extraction.ts`

Mirror Exp-10:

- Extract `self` via `ExtractionService.extract`
- For each expectation (flattened), score within band → pass; `allowNull` passes on null
- Agreement = passes / scored; **null when band expected (without allowNull) fails**
- Threshold **85%**; exit 0 if no `OPENAI_API_KEY`; exit 1 if key present and below threshold
- **No regex scoring**

**package.json:**

```json
"validate:expansion-11-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-11-extraction.ts"
```

### 6. UI tests (locked — delta only)

| Test | Expect |
|------|--------|
| Tension passthrough Exp-11 | `tensionChip: 'Pursue vs withdraw under stress'` renders as-is (English API) |
| Optional | Second tension e.g. `Shared jealousy risk` or `Trust & space mismatch` |
| Chip registry | Exp-11 two labels still in `CHIP_EVIDENCE_KEYS` (length **33**) |

Positive chip EN/HE + onboarding prompts already Story 4 — do not require re-tests unless broken.

### 7. Regression commands (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-11"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-10"
npx jest src/extraction/expansion-11-rollout.spec.ts --runInBand
npx jest src/matches/expansion-11-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-11"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-11|Pursue vs withdraw|Shared jealousy|Trust & space"
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Optional: `npm run validate:expansion-11-extraction` — document SKIP or % agreement in handoff.  
Optional: Exp-09 E2E spot `-t "Expansion-09"`.

### 8. Shadow mode preserved (locked)

Story 5 must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- Both Exp-11 keys ∉ scored set
- `alignments` exclude Exp-11 shadow keys / positive chip labels
- Exp-01–10 integration describes still pass (spot-check Exp-10/09)
- **No** promote / weight wiring / move to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`

### 9. Agent 4

**Skip.**

---

## Definition of Done (Story 5 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-11 E2E | ≥12 cases in matrix §2 |
| Expansion-10 non-regression | Spot-check still passes |
| Rollout gate spec | Present + green |
| Fixtures JSON + validate script | Present; skips without API key |
| Hebrew rows represented in fixtures | ≥3 HE |
| UI Exp-11 tension passthrough | ≥1 |
| Exp-11 chips in `CHIP_EVIDENCE_KEYS` | Still **33** / two labels |
| Existing Exp-11 unit suites still pass | extraction + friction + explainability |
| Scoring promote | **Not in scope** |

---

## Service signatures

No new public product APIs. Script-only:

```typescript
// scripts/validate-expansion-11-extraction.ts — CLI
```

---

## API / HTTP contracts

No DTO changes. Existing explainability fields already emit Exp-11 chips/tensions when rules fire.

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

1. Add `makeProfileWithExpansion11Shadow` + Expansion-11 `compare()` E2E matrix (§2).
2. Create `expansion-11-rollout.spec.ts` (§3).
3. Create fixtures JSON + validate script + package.json script (§4–5); force-add fixtures if gitignored.
4. Add UI tension passthrough + confirm chip registry (§6).
5. Run regression commands (§7); optionally run live validator and record SKIP/% .
6. **Do not** promote to scored keys, change extraction prompts, or invent Exp-08 work.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-11-stress-security/handoffs/STORY_05_testing_validation/`. Do not commit unless user asks.

Suggested commit:

```
test(matching): Expansion-11 stress and security E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```

---

## Agent 2 CR checklist

- [ ] ≥12 Expansion-11 `compare()` E2E cases with exact tension/chip labels
- [ ] `both_high_jealousy` exclusivity vs gap covered in E2E
- [ ] Both-low jealousy → `Secure & trusting`; both-high → **no** that positive chip
- [ ] Rollout gate asserts counts (28/43/47/35/21/15/33)
- [ ] Fixtures cover README + Hebrew + null/distinction cases
- [ ] Validate script mirrors Exp-10; skip without API key; no regex scoring
- [ ] UI tension passthrough present
- [ ] **No** `COMPATIBILITY_SIGNAL_KEYS` / weight promote
- [ ] Prior expansion helpers/specs not broken
- [ ] Regression commands pass

---

## Open questions / blockers

- None blocking Story 5 engineering close.
- **Operator:** Run `npm run validate:expansion-11-extraction` with API key before any future promote.
- **Future:** Explicit promote sprint to move expansion keys into scored registries — do **not** treat README “38” as this story’s deliverable.
- **Exp-08** remains unfinished sibling debt (no Exp-11 dependency).

---

## Next agent

```text
--agent 1 expansion 11 story 5
```

**Notes:** Keep shadow. Mirror Exp-10 Story 5. Live >85% is optional operator gate, not CI. Jealousy polarity lock is non-negotiable in fixtures and E2E.
