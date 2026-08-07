# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-04-intellectual-creative  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add friction tension rules + explainability chip labels for Expansion-04 shadow signals. **No** compatibility scoring / positive chips / i18n.

---

## Summary

- Add **`intellectual_gap`** and **`creative_mismatch`** to `tension-rules.ts` with locked thresholds and penalties from sprint README.
- Extend `EnrichedSignals` so `getSignal()` can read `intellectualCuriosity` and `creativeExpression` from `evaluationJson.self.signals` (already spread via `applyKeywordTriggers`).
- Add English tension chip labels to `TENSION_CHIP_BY_ID` in `match-explainability.ts`.
- Rules fire **only when both profiles have non-null** shadow values — no impact on legacy profiles until re-analyzed.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals` includes both keys after Story 2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Expansion-04 fields | **Neither** `intellectualCuriosity` nor `creativeExpression` is on `EnrichedSignals` yet — Story 3 adds both |
| Expansion-01/02/03 precedent | Shadow tension rules already in `tensionRules` through `humor_mismatch` |
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
| `matches/expansion-01/02/03-explainability.ts` | Prior sprints |
| `matches/expansion-04-explainability.ts` | Story 4 (positive chips shadow overlay) |
| `match-explainability.ts` `POSITIVE_CHIP_BY_SIGNAL` | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 (positive chip evidence; tension chips English-only in API) |
| `extraction/*` | Story 2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Interest tag registries | Orthogonal — Story 5 |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` array **after** Expansion-03 `humor_mismatch`, preserve existing order:

```typescript
{
  id: 'intellectual_gap',
  name: 'Intellectual stimulation gap (MED-HIGH)',
  when: (a, b) => {
    const aInt = getSignal(a, 'intellectualCuriosity');
    const bInt = getSignal(b, 'intellectualCuriosity');
    if (aInt == null || bInt == null) return false;
    return (aInt >= 8 && bInt <= 3) || (bInt >= 8 && aInt <= 3);
  },
  penalty: 4,
  explain: 'One needs intellectual stimulation, the other is less focused on ideas',
},
{
  id: 'creative_mismatch',
  name: 'Creative expression mismatch (LOW-MED)',
  when: (a, b) => {
    const aCre = getSignal(a, 'creativeExpression');
    const bCre = getSignal(b, 'creativeExpression');
    if (aCre == null || bCre == null) return false;
    return (aCre >= 8 && bCre <= 2) || (bCre >= 8 && aCre <= 2);
  },
  penalty: 2,
  explain: 'One needs creative expression, the other does not relate to that drive',
},
```

**Threshold asymmetry (locked):**

| Rule | High | Low | Penalty |
|------|------|-----|---------|
| `intellectual_gap` | ≥8 | ≤**3** | **4** |
| `creative_mismatch` | ≥8 | ≤**2** | **2** |

Do **not** “normalize” creative low-band to ≤3 — README lock is ≤2.

### 2. `EnrichedSignals` extension (locked)

Add optional fields after Expansion-03:

```typescript
/** Shadow Expansion-04 — from evaluationJson.self.signals when extracted. */
intellectualCuriosity?: number | null;
creativeExpression?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

### 3. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
intellectual_gap: 'Different mental stimulation needs',
creative_mismatch: 'Creative drive mismatch',
```

Exact strings locked (match sprint README). `KNOWN_TENSION_CHIP_LABELS` updates automatically via `Object.values(TENSION_CHIP_BY_ID)`.

### 4. Distinct from existing rules (locked)

| Existing rule | Expansion-04 | Distinction |
|---------------|--------------|-------------|
| `emotional_depth_gap` | `intellectual_gap` | Emotional intensity / depth abs gap vs directional intellectual stimulation need |
| `humor_mismatch` | `intellectual_gap` | Levity/banter vs mental stimulation / ideas |
| `lifestyle_pace_mismatch` | `creative_mismatch` | Pace/rhythm vs creative identity/outlet need |
| `affection_needs_gap` | `creative_mismatch` | Touch needs vs making/creating drive |
| Interest tags | both | Tags are binary hobby presence — not tension inputs |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe.

### 5. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when both sides have non-null values for the relevant key |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — predicates return false on null |

### 6. Explainability display (locked)

- `friction >= 3` required for `tensionChip` to appear (existing gate in `topTensionChip`)
- `intellectual_gap` alone (penalty **4**) → chip shows
- `creative_mismatch` alone (penalty **2**) → **does not** meet friction ≥3 gate by itself; chip appears only if total friction ≥3 from stacked rules / other tensions
- If multiple rules fire, highest penalty wins chip label (existing sort) — `intellectual_gap` (4) outranks `creative_mismatch` (2)

This is intentional: creative mismatch is LOW-MED friction signal; primary chip surfacing is intellectual gap when both fire.

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
- `CompareResultDto.tensionMatrix` — may include `intellectual_gap` / `creative_mismatch`
- `CompareResultDto.explainability.tensionChip` — may be `'Different mental stimulation needs'` or `'Creative drive mismatch'` (latter only when total friction ≥3)

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-04|intellectual_gap|creative_mismatch"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-04|intellectual_gap|creative_mismatch|Different mental|Creative drive"
npm run typecheck
```

### Minimum unit tests

**`compute-friction.spec.ts`** — `describe('Expansion-04 shadow tension rules')`:

| Case | enrichedA | enrichedB | Expect |
|------|-----------|-----------|--------|
| intellectual_gap fires | `intellectualCuriosity: 9` | `intellectualCuriosity: 2` | id `intellectual_gap`, penalty 4 |
| intellectual_gap reverse | `2` / `9` | | same |
| intellectual_gap null guard | `9` / `{}` | | does not fire |
| intellectual_gap below threshold | `7` / `4` | | does not fire |
| creative_mismatch fires | `creativeExpression: 9` | `creativeExpression: 1` | id `creative_mismatch`, penalty 2 |
| creative_mismatch reverse | `1` / `9` | | same |
| creative_mismatch null guard | `9` / `{}` | | does not fire |
| creative_mismatch below threshold | `8` / `3` | | does **not** fire (low must be ≤2) |
| creative_mismatch at ≤2 boundary | `8` / `2` | | **does** fire |

**`match-explainability.spec.ts`:**

- `TENSION_CHIP_BY_ID.intellectual_gap === 'Different mental stimulation needs'`
- `TENSION_CHIP_BY_ID.creative_mismatch === 'Creative drive mismatch'`
- `buildMatchExplainability` with `friction: 4`, matrix `[{ id: 'intellectual_gap', penalty: 4 }]` → `tensionChip: 'Different mental stimulation needs'`
- Optional: `friction: 2`, matrix `[{ id: 'creative_mismatch', penalty: 2 }]` → `tensionChip` null/undefined (below gate) — documents §6

Optional: `match-engine.spec.ts` E2E — Story 5 scope.

---

## E2E verification

N/A

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Mental stimulation`, `Creative expression`) + i18n via `expansion-04-explainability.ts` overlay + `assemble-result.ts` merge.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `intellectualCuriosity` + `creativeExpression`.
2. Append both rules to `tensionRules` per §1 (exact thresholds/penalties — note creative ≤2).
3. Add both `TENSION_CHIP_BY_ID` entries per §3.
4. Add unit tests per §Tests (include creative below-threshold at 8 vs 3).
5. Do **not** touch compatibility weights, positive chips, extraction, Expansion-01–03 rules, or i18n.
6. Run test commands; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(engine): add intellectual_gap and creative_mismatch tension rules

Expansion-04 Story 3 — friction + explainability labels; shadow keys only.
```

---

## Agent 2 CR checklist

- [ ] Rule ids, thresholds, penalties match architect lock (esp. creative low ≤**2**, penalties 4 / 2)
- [ ] Null guard on both sides before compare for both rules
- [ ] `EnrichedSignals` includes both Expansion-04 fields
- [ ] `TENSION_CHIP_BY_ID` labels exact
- [ ] No changes to `COMPATIBILITY_SIGNAL_KEYS` / positive chips
- [ ] Expansion-01/02/03 tension rules unchanged
- [ ] Tests pass (including 8 vs 3 creative does not fire)
- [ ] No regex / keyword inference added

---

## Next agent

```text
--agent 1 expansion 04 story 3
```

**Notes:** Mirror Expansion-02 Story 3 (two rules) — Expansion-04 twist is asymmetric low thresholds (≤3 vs ≤2) and asymmetric penalties (4 vs 2). `creative_mismatch` alone does not surface tensionChip (friction gate ≥3).
