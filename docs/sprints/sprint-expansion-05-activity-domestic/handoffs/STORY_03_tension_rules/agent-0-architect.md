# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add friction tension rules + explainability chip labels for Expansion-05 shadow signals. **No** compatibility scoring / positive chips / i18n.

---

## Summary

- Add **`activity_level_gap`** and **`domestic_out_mismatch`** to `tension-rules.ts` with locked thresholds and penalties from sprint README.
- Extend `EnrichedSignals` so `getSignal()` can read `physicalActivityLevel` and `domesticComfort` from `evaluationJson.self.signals` (already spread via `applyKeywordTriggers`).
- Add English tension chip labels to `TENSION_CHIP_BY_ID` in `match-explainability.ts`.
- Rules fire **only when both profiles have non-null** shadow values — no impact on legacy profiles until re-analyzed.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Both penalties are **3** → each rule alone can surface `tensionChip` (friction gate ≥3).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals` includes both keys after Story 2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Expansion-05 fields | **Neither** key is on `EnrichedSignals` yet — Story 3 adds both |
| Expansion-01–04 precedent | Shadow tension rules already in `tensionRules` through `creative_mismatch` |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| UI | Displays `explainability.tensionChip` string from API as-is (English) |
| Compatibility | Both keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals`; append 2 rules to `tensionRules` |
| `dating-api/src/matches/match-explainability.ts` | Add 2 `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests: both rules fire + reverse + null guards + below threshold |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for both rule ids |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Story 1 shadow lock — no scoring keys |
| `matches/expansion-01/02/03/04-explainability.ts` | Prior sprints |
| `matches/expansion-05-explainability.ts` | Story 4 (positive chips shadow overlay) |
| `match-explainability.ts` `POSITIVE_CHIP_BY_SIGNAL` | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 |
| `extraction/*` | Story 2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Interest tag registries | Orthogonal |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` array **after** Expansion-04 `creative_mismatch`, preserve existing order:

```typescript
{
  id: 'activity_level_gap',
  name: 'Physical activity level gap (MED)',
  when: (a, b) => {
    const aAct = getSignal(a, 'physicalActivityLevel');
    const bAct = getSignal(b, 'physicalActivityLevel');
    if (aAct == null || bAct == null) return false;
    return (aAct >= 8 && bAct <= 3) || (bAct >= 8 && aAct <= 3);
  },
  penalty: 3,
  explain: 'Big difference in physical activity levels',
},
{
  id: 'domestic_out_mismatch',
  name: 'Home vs out preference (MED)',
  when: (a, b) => {
    const aDom = getSignal(a, 'domesticComfort');
    const bDom = getSignal(b, 'domesticComfort');
    if (aDom == null || bDom == null) return false;
    return (aDom >= 8 && bDom <= 3) || (bDom >= 8 && aDom <= 3);
  },
  penalty: 3,
  explain: 'One prefers cozy nights in, the other wants to be out',
},
```

**Thresholds (locked — both symmetric):**

| Rule | High | Low | Penalty |
|------|------|-----|---------|
| `activity_level_gap` | ≥8 | ≤**3** | **3** |
| `domestic_out_mismatch` | ≥8 | ≤**3** | **3** |

### 2. `EnrichedSignals` extension (locked)

Add optional fields after Expansion-04:

```typescript
/** Shadow Expansion-05 — from evaluationJson.self.signals when extracted. */
physicalActivityLevel?: number | null;
domesticComfort?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

### 3. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
activity_level_gap: 'Different activity levels',
domestic_out_mismatch: 'Home vs out mismatch',
```

Exact strings locked (match sprint README). `KNOWN_TENSION_CHIP_LABELS` updates automatically via `Object.values(TENSION_CHIP_BY_ID)`.

### 4. Distinct from existing rules (locked)

| Existing rule | Expansion-05 | Distinction |
|---------------|--------------|-------------|
| `lifestyle_pace_mismatch` | `domestic_out_mismatch` | Busy vs calm life rhythm vs home-nest vs always-out preference |
| `social_battery_mismatch` | `domestic_out_mismatch` | Intro/extro social energy vs home-vs-out nesting preference |
| `physical_priority_mismatch` | `activity_level_gap` | Partner looks importance vs own athletic/activity behavior |
| (no health wellness tension) | `activity_level_gap` | Activity behavior gap — not wellness-values gap |
| Interest tags | both | Tags are binary hobby presence — not tension inputs |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. When both Expansion-05 rules fire (penalty 3 each), highest-penalty sort may pick either first among equals — either chip label is acceptable; do not invent priority between them.

### 5. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when both sides have non-null values for the relevant key |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — predicates return false on null |

### 6. Explainability display (locked)

- `friction >= 3` required for `tensionChip` to appear (existing gate in `topTensionChip`)
- `activity_level_gap` alone (penalty **3**) → chip shows
- `domestic_out_mismatch` alone (penalty **3**) → chip shows
- If multiple rules fire, highest penalty wins chip label (existing sort)

### 7. Agent 4

**Skip.** No eligibility gates or preference-dimension changes. Ranking may shift only for pairs with extracted shadow values — validated in Story 5.

---

## Service signatures

No new public methods. Existing:

```typescript
export function computeFriction(
  enrichedA: EnrichedSignals,
  enrichedB: EnrichedSignals,
): ComputeFrictionResult;
```

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `CompareResultDto.friction` — may increase when new rules fire
- `CompareResultDto.tensionMatrix` — may include `activity_level_gap` / `domestic_out_mismatch`
- `CompareResultDto.explainability.tensionChip` — may be `'Different activity levels'` or `'Home vs out mismatch'`

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-05|activity_level_gap|domestic_out_mismatch"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-05|activity_level_gap|domestic_out_mismatch|Different activity|Home vs out"
npm run typecheck
```

### Minimum unit tests

**`compute-friction.spec.ts`** — `describe('Expansion-05 shadow tension rules')`:

| Case | enrichedA | enrichedB | Expect |
|------|-----------|-----------|--------|
| activity_level_gap fires | `physicalActivityLevel: 9` | `physicalActivityLevel: 2` | id `activity_level_gap`, penalty 3 |
| activity_level_gap reverse | `2` / `9` | | same |
| activity_level_gap null guard | `9` / `{}` | | does not fire |
| activity_level_gap below threshold | `7` / `4` | | does not fire |
| domestic_out_mismatch fires | `domesticComfort: 9` | `domesticComfort: 2` | id `domestic_out_mismatch`, penalty 3 |
| domestic_out_mismatch reverse | `2` / `9` | | same |
| domestic_out_mismatch null guard | `9` / `{}` | | does not fire |
| domestic_out_mismatch below threshold | `7` / `4` | | does not fire |
| domestic_out_mismatch at ≤3 boundary | `8` / `3` | | **does** fire |

**`match-explainability.spec.ts`:**

- `TENSION_CHIP_BY_ID.activity_level_gap === 'Different activity levels'`
- `TENSION_CHIP_BY_ID.domestic_out_mismatch === 'Home vs out mismatch'`
- `buildMatchExplainability` with `friction: 3`, matrix `[{ id: 'activity_level_gap', penalty: 3 }]` → `tensionChip: 'Different activity levels'`
- Optional: same for `domestic_out_mismatch` / `'Home vs out mismatch'`

Optional: `match-engine.spec.ts` E2E — Story 5 scope.

---

## E2E verification

N/A

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Activity level match`, `Home/out balance`) + i18n via `expansion-05-explainability.ts` overlay + `assemble-result.ts` merge.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `physicalActivityLevel` + `domesticComfort`.
2. Append both rules to `tensionRules` per §1 (exact thresholds/penalties).
3. Add both `TENSION_CHIP_BY_ID` entries per §3.
4. Add unit tests per §Tests.
5. Do **not** touch compatibility weights, positive chips, extraction, Expansion-01–04 rules, or i18n.
6. Run test commands; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(engine): add activity_level_gap and domestic_out_mismatch tension rules

Expansion-05 Story 3 — friction + explainability labels; shadow keys only.
```

---

## Agent 2 CR checklist

- [ ] Rule ids, thresholds, penalties match architect lock (≥8 vs ≤3, penalties **3** / **3**)
- [ ] Null guard on both sides before compare for both rules
- [ ] `EnrichedSignals` includes both Expansion-05 fields
- [ ] `TENSION_CHIP_BY_ID` labels exact
- [ ] No changes to `COMPATIBILITY_SIGNAL_KEYS` / positive chips
- [ ] Expansion-01–04 tension rules unchanged
- [ ] Tests pass
- [ ] No regex / keyword inference added

---

## Next agent

```text
--agent 1 expansion 05 story 3
```

**Notes:** Mirror Expansion-02/04 Story 3 (two rules). Expansion-05 twist: **both** penalties are 3 (each alone surfaces tensionChip), and **both** use low-band ≤3 (unlike Expansion-04 creative ≤2).
