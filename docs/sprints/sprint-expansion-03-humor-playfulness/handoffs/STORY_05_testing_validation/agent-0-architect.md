# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [README.md — STORY 5: Testing, Validation & Phase 1 Gate](../../README.md)  
**Sprint:** sprint-expansion-03-humor-playfulness  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-03 with **integration tests**, **live LLM validation**, and **Phase 1 EQ gate artifacts**. **No** promote to scoring.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Story 5 validates Stories 1–4 **end-to-end** through `compare()` — plus **Phase 1 milestone** for all **5 EQ shadow signals** (Expansion-01 + 02 + 03).
- **Architect override:** Do **not** duplicate extraction unit tests — Story 2 covers mocked LLM in `extraction.service.spec.ts` (4 Expansion-03 tests).
- Add **`match-engine.spec.ts`** describe for Expansion-03: tension chip, positive chip, alignments exclusion, compatibility invariance, Expansion-02 non-regression.
- Add **live LLM script** for `humorPlayfulness` (`validate:expansion-03-extraction`) — mirror Expansion-01/02.
- Add **Phase 1 gate tooling:** orchestrator script + correlation report + chip-diversity unit test (see §Phase 1).
- **UI:** Story 4 added EN/HE positive chip tests. Story 5 adds **tension chip passthrough** for `Playfulness mismatch`.
- Agent 4 **skipped**. Closes **Expansion-03** and **Phase 1 EQ engineering gate**; promote remains future sprint.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Integration surface | `compare(profileA, profileB)` → `assemble-result` |
| Expansion-03 friction | `humor_mismatch` (penalty 3) |
| Expansion-03 positive chip | `Shared playfulness` via `expansion-03-explainability.ts` |
| Expansion-01 E2E | `describe('Expansion-01 shadow E2E via compare')` — **8 tests** |
| Expansion-02 E2E | `describe('Expansion-02 shadow E2E via compare')` — **9 tests** |
| Prior live LLM scripts | `validate:expansion-01-extraction`, `validate:expansion-02-extraction` |
| Expansion-01 live result | **66.7%** (below 85% — operator follow-up before promote) |
| Expansion-02 live result | **91.7%** (11/12) |
| Golden regression | `npm run validate:golden-pairs` — optional; document SKIP if no DB |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Unit tests: high/low from text | **Story 2** (mock LLM). Story 5 = `compare()` integration + live script |
| `evaluate.service.spec.ts` | **Wrong file** — use `extraction.service.spec.ts` + match-engine |
| Phase 1: all 5 EQ >85% | **Orchestrator script** runs 01+02+03 validators; reports per-signal + aggregate; exit 1 if any below 85% when API key present |
| Correlation matrix r>0.85 | **`phase1-eq-correlation-report.ts`** — operator script, not CI hard gate |
| Chip diversity | **Unit test** in `match-explainability.spec.ts` — domains span `connection` + others |
| Performance P95 batch extraction | **Document only** in Phase 1 gate handoff — no new benchmark harness in Story 5 |
| Promote to scoring | **Out of scope** — gate informs decision, does not auto-promote |
| 50 real profiles human-rated | **Deferred operator task** |

---

## Artifacts (agent 1)

### Backend — Expansion-03 integration

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | Add `makeProfileWithExpansion03Shadow` + `describe('Expansion-03 shadow E2E via compare')` |
| `dating-api/data/expansion-03-extraction-fixtures.json` | **Create** — ≥12 curated `aboutMe` texts + bands for `humorPlayfulness` |
| `dating-api/scripts/validate-expansion-03-extraction.ts` | **Create** — mirror Expansion-02 script |
| `dating-api/package.json` | Add `"validate:expansion-03-extraction"` |

### Backend — Phase 1 gate (Story 5 special scope)

| Path | Change |
|------|--------|
| `dating-api/scripts/validate-phase1-eq-extraction.ts` | **Create** — runs Expansion-01/02/03 validators sequentially; prints summary table |
| `dating-api/scripts/phase1-eq-correlation-report.ts` | **Create** — extracts 5 EQ shadow keys on diverse fixture texts; Pearson r matrix; flags \|r\|>0.85 |
| `dating-api/data/phase1-eq-correlation-fixtures.json` | **Create** — ≥15 diverse `aboutMe` texts (semantic, not keyword-stuffed) |
| `dating-api/package.json` | Add `"validate:phase1-eq-extraction"`, `"report:phase1-eq-correlation"` |
| `dating-api/src/matches/match-explainability.spec.ts` | Add Phase 1 chip-diversity test (§Phase 1) |

### Frontend — UI tests

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Add Expansion-03 **tension chip** passthrough test (`Playfulness mismatch`) |

### Handoffs

| Path | Change |
|------|--------|
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | Created by agent 1 |
| `handoffs/STORY_05_testing_validation/PHASE1_EQ_GATE.md` | **Create** (agent 1 or agent 3) — gate results template |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate.service.spec.ts` | Story 2 lock |
| `compatibility-score.ts` promote / weights | Post-gate promote sprint |
| Duplicate Expansion-03 positive chip UI tests | Story 4 done |
| Browser Playwright E2E | Out of repo pattern |
| Re-analyze all production profiles | Operator rollout |
| Auto-fix Expansion-01 prompts to hit 85% | Operator follow-up |

---

## Decisions (do not reverse without discussion)

### 1. Match-engine helper (locked)

```typescript
type Expansion03ShadowKey = 'humorPlayfulness';

function makeProfileWithExpansion03Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion03ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}
```

Use neutral official signals unless test needs friction boost.

### 2. Integration test matrix (locked)

Add `describe('Expansion-03 shadow E2E via compare')` with **≥8** tests:

| Test | Setup | Expect |
|------|-------|--------|
| Shadow key ∉ scored keys | static assert | `humorPlayfulness` not in `COMPATIBILITY_SIGNAL_KEYS` |
| Playfulness gap → tension chip | A `humorPlayfulness: 9`, B `2` | `tensionChip === 'Playfulness mismatch'`; `friction >= 3`; `humor_mismatch` in matrix |
| Reverse direction | A `2`, B `9` | same |
| High both → positive chip | both `humorPlayfulness: 8` | `positiveChips` contains `'Shared playfulness'` |
| Shadow absent from alignments | both high | `alignments` exclude humorPlayfulness key label |
| Null shadow → no chip / no rule | A `8`, B `null` | no `'Shared playfulness'`; no `humor_mismatch` |
| Compatibility invariance | same official; only shadow differs | `compatibility` equal high-high vs gap pair |
| Expansion-02 non-regression | regulation gap pair | `tensionChip === 'Emotional steadiness gap'` |

**Friction note:** `humor_mismatch` penalty **3** meets `friction >= 3` gate exactly — use neutral official signals.

### 3. Live LLM validation — Expansion-03 (locked)

**File:** `dating-api/data/expansion-03-extraction-fixtures.json`

Minimum **12 fixtures** (6 high band, 6 low band) for `humorPlayfulness`. Example entries:

```json
[
  {
    "id": "humor_high_01",
    "aboutMe": "I want someone I can be silly with after a long day — banter and inside jokes keep us close.",
    "signal": "humorPlayfulness",
    "expectedMin": 7,
    "expectedMax": 10
  },
  {
    "id": "humor_low_01",
    "aboutMe": "I prefer deep conversations over joking around — playfulness is not really my thing.",
    "signal": "humorPlayfulness",
    "expectedMin": 1,
    "expectedMax": 4
  }
]
```

Use semantic texts from Story 2 unit tests + sprint README — **no regex scoring**.

**Script:** `validate-expansion-03-extraction.ts` — mirror Expansion-02; threshold **85%**; exit 0 without `OPENAI_API_KEY`.

**package.json:**

```json
"validate:expansion-03-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-03-extraction.ts"
```

### 4. Phase 1 orchestrator script (locked)

**File:** `scripts/validate-phase1-eq-extraction.ts`

- Spawns or imports logic from Expansion-01/02/03 validators (prefer **reuse** via shared helper or sequential `execSync` of npm scripts).
- Prints table:

| Signal | Sprint | Agreement | Pass |
|--------|--------|-----------|------|
| empathyCompassion | 01 | …% | ✅/❌ |
| … | … | … | … |

- Exit **0** if no API key (SKIP all).
- Exit **1** if key present and **any** signal below 85%.
- Does **not** block Expansion-03 ship if Expansion-01 still at 66.7% — but gate doc must flag it for promote decision.

**package.json:**

```json
"validate:phase1-eq-extraction": "ts-node --project tsconfig.json scripts/validate-phase1-eq-extraction.ts"
```

### 5. Correlation report script (locked)

**File:** `data/phase1-eq-correlation-fixtures.json` — ≥15 diverse texts spanning EQ dimensions (not 15 copies of same theme).

**File:** `scripts/phase1-eq-correlation-report.ts`

- For each fixture: `extract('self', aboutMe)` → read 5 shadow EQ keys:
  - `empathyCompassion`, `vulnerabilityOpenness`, `emotionalRegulation`, `physicalAffectionStyle`, `humorPlayfulness`
- Build numeric matrix (skip nulls per pair).
- Compute Pearson r for each pair; print matrix.
- **Flag** pairs with \|r\| > **0.85** (README threshold).
- Known watch pairs: `humorPlayfulness` vs `noveltyVsRoutine`, `socialBattery` (may correlate — flag only, not auto-fail).
- Exit 0 without API key; exit 0 with key even if flags present (report-only) — **or** exit 1 if any flagged pair (architect lock: **exit 0 with warnings** — operator interprets; do not block CI on correlation alone).

### 6. Chip diversity unit test (locked)

In `match-explainability.spec.ts`:

```typescript
it('Phase 1 EQ: high shadow breakdown yields chips from multiple domains including connection', () => {
  const breakdown: BreakdownEntry[] = [
    { key: 'empathyCompassion', self: 8, partner: 8, gap: 0, pairScore: 10 },
    { key: 'vulnerabilityOpenness', self: 8, partner: 8, gap: 0, pairScore: 10 },
    { key: 'emotionalRegulation', self: 8, partner: 8, gap: 0, pairScore: 10 },
    { key: 'physicalAffectionStyle', self: 8, partner: 8, gap: 0, pairScore: 10 },
    { key: 'humorPlayfulness', self: 8, partner: 8, gap: 0, pairScore: 10 },
  ];
  const chips = pickPositiveChips(breakdown);
  expect(chips).toContain('Shared playfulness'); // connection domain
  expect(chips.length).toBeGreaterThanOrEqual(2);
  // emotional domain must not consume all 3 slots when connection/intimacy alternatives exist
  const emotionalLabels = new Set([
    'Understanding & care',
    'Authentic openness',
    'Emotional balance',
  ]);
  const emotionalCount = chips.filter((c) => emotionalLabels.has(c)).length;
  expect(emotionalCount).toBeLessThan(3);
});
```

### 7. UI test delta (locked)

Story 4 already covers EN/HE **positive** chip for `Shared playfulness`.

Story 5 adds **one** test:

| Test | Expect |
|------|--------|
| Tension chip passthrough — Expansion-03 | `tensionChip: 'Playfulness mismatch'` renders as-is (English API) |

Optional: ES evidence for `Shared playfulness` — not blocking.

### 8. Phase 1 gate document (locked)

**File:** `handoffs/STORY_05_testing_validation/PHASE1_EQ_GATE.md`

Template sections (agent 1 fills results, agent 3 signs off):

| Check | Target | Result | Pass |
|-------|--------|--------|------|
| Expansion-01 LLM agreement | ≥85% | (run date / %) | |
| Expansion-02 LLM agreement | ≥85% | | |
| Expansion-03 LLM agreement | ≥85% | | |
| Correlation flags (\|r\|>0.85) | Review | list pairs | |
| Chip diversity test | Multi-domain | unit test pass | |
| Shadow mode intact | No promote | COMPATIBILITY still 15 | |
| Performance P95 batch | Acceptable | manual / deferred | |
| Promote recommendation | Operator | GO / NO-GO / PARTIAL | |

**Expected gate outcome (pre-run):** Expansion-01 likely **NO-GO for promote** until prompt tuning; Expansion-02/03 likely pass; **PARTIAL** promote decision documented.

### 9. Regression suite (locked — agent 1 must run)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-03"
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-01|Expansion-02"
npx jest src/matches/expansion-03-explainability.spec.ts src/matches/match-explainability.spec.ts src/engine/compute-friction.spec.ts src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-03|Phase 1"
npm run typecheck

# Optional with OPENAI_API_KEY:
npm run validate:expansion-03-extraction
npm run validate:phase1-eq-extraction
npm run report:phase1-eq-correlation

cd dating-ui
npm test -- match-why-section.spec.tsx chip-evidence.spec.ts
```

### 10. Shadow mode preserved (locked)

Story 5 tests must **assert** but **not change**:

- `COMPATIBILITY_SIGNAL_KEYS.length === 15`
- All 5 EQ keys ∉ `COMPATIBILITY_SIGNAL_KEYS`
- `alignments` excludes shadow keys
- Expansion-01/02 integration tests still pass

### 11. Agent 4

**Skip** — validation story only.

---

## Definition of Done (Story 5 + Phase 1 engineering gate)

| Item | Gate |
|------|------|
| Match-engine Expansion-03 integration tests | ≥8 cases §2 |
| Expansion-02 non-regression spot-check | §2 |
| UI tension chip test | ≥1 §7 |
| Expansion-03 live LLM script + fixtures | Present §3 |
| Phase 1 orchestrator + correlation report | Present §4–5 |
| Chip diversity unit test | §6 |
| `PHASE1_EQ_GATE.md` filled with run results | §8 |
| Shadow scoring promote | **Not in scope** |
| Sprint README Story 5 + DoD | Updated by agent 3 |

---

## API contracts

No DTO changes. Tests validate existing:

- `explainability.positiveChips` — `'Shared playfulness'`
- `explainability.tensionChip` — `'Playfulness mismatch'`
- `alignments[].key` — official keys only

---

## Runtime topology

N/A

---

## E2E verification

Manual browse smoke (agent 1 notes in handoff):

1. Re-analyze 2 profiles with playfulness `aboutMe` text.
2. Compare — confirm positive/tension chips when values warrant.
3. Run Phase 1 orchestrator with API key — record in `PHASE1_EQ_GATE.md`.

---

## Agent 1 instructions

1. Add `makeProfileWithExpansion03Shadow` + Expansion-03 `compare()` describe to `match-engine.spec.ts`.
2. Create Expansion-03 fixtures + validation script + npm script.
3. Create Phase 1 orchestrator, correlation fixtures + report, chip-diversity test.
4. Add Expansion-03 tension chip UI test.
5. Run regression commands; run live scripts if API key available; fill `PHASE1_EQ_GATE.md`.
6. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
test(expansion-03): match-engine integration, LLM validation, Phase 1 EQ gate tooling

Story 5 — closes Expansion-03 and Phase 1 engineering validation; shadow mode unchanged.
```

Suggested **sprint rollup commit** (Stories 1–5):

```
feat(expansion-03): shadow humorPlayfulness — extract, friction, chips, Phase 1 gate

Expansion-03 complete in shadow mode; Phase 1 EQ gate documented; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Integration tests use `compare()` not fictional helpers
- [ ] No duplicate extraction tests in `evaluate.service.spec.ts`
- [ ] `alignments` exclusion asserted
- [ ] Compatibility invariance test present
- [ ] Expansion-01/02 E2E tests still pass
- [ ] Live scripts use real extraction path; no regex scoring
- [ ] Scripts skip without API key (exit 0)
- [ ] Phase 1 orchestrator reports all 5 signals
- [ ] Correlation report flags \|r\|>0.85 without false hard-fail unless documented
- [ ] Shadow keys still not in `COMPATIBILITY_SIGNAL_KEYS`
- [ ] All tests pass

---

## Open questions / blockers

- None blocking Story 5 implementation.
- **Expansion-01 at 66.7%:** Phase 1 gate will likely recommend **defer full promote** until Expansion-01 prompts tuned — document in `PHASE1_EQ_GATE.md`.
- **Post-gate:** Promote all 5 EQ signals together requires explicit promote sprint + golden-pairs re-run + overlay consolidation.

---

## Next agent

```text
--agent 1 expansion 03 story 5
```

**Notes:** Final story in Expansion-03. Completes **Phase 1 EQ** (5 signals). After agent 3 PM sign-off, next sprint per roadmap: **Expansion-04** (Phase 2 begins).
