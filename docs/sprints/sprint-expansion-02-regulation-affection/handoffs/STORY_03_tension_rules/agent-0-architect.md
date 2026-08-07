# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add friction tension rules + explainability chip labels for Expansion-02 shadow signals. **No** compatibility scoring / positive chips / i18n.

---

## Summary

- Add `emotional_volatility_gap` and `affection_needs_gap` rules to `tension-rules.ts` with locked thresholds and penalties from sprint README.
- Extend `EnrichedSignals` so `getSignal()` can read Expansion-02 shadow keys from `evaluationJson.self.signals` (already spread via `applyKeywordTriggers`).
- Add English tension chip labels to `TENSION_CHIP_BY_ID` in `match-explainability.ts`.
- Rules fire **only when both profiles have non-null** shadow values — no impact on legacy profiles until re-analyzed (Story 1 shadow rollout model).
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Agent 4 **skipped** (no eligibility / preference-dimension change; bounded ranking impact only when shadow keys present).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals` includes shadow keys at runtime after Story 2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Expansion-01 precedent | `empathy_gap` + `vulnerability_mismatch` already in `tensionRules`; same pattern for Expansion-02 |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| UI | Displays `explainability.tensionChip` string from API as-is (English) |
| Compatibility | `emotionalRegulation` / `physicalAffectionStyle` **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals`; append 2 rules to `tensionRules` |
| `dating-api/src/matches/match-explainability.ts` | Add `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests: each rule fires + penalties + null guards |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for new rule ids |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Story 1 shadow lock — no scoring keys |
| `matches/expansion-01-explainability.ts` | Expansion-01 only |
| `matches/expansion-02-explainability.ts` | Story 4 (positive chips shadow overlay) |
| `match-explainability.ts` `POSITIVE_CHIP_BY_SIGNAL` | Story 4 (positive chips) |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 (positive chip evidence; tension chips English-only in API) |
| `extraction/*` | Story 2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` array **after** Expansion-01 rules (`vulnerability_mismatch`), preserve existing order:

```typescript
{
  id: 'emotional_volatility_gap',
  name: 'Emotional regulation mismatch (HIGH)',
  when: (a, b) => {
    const aReg = getSignal(a, 'emotionalRegulation');
    const bReg = getSignal(b, 'emotionalRegulation');
    if (aReg == null || bReg == null) return false;
    return (aReg >= 8 && bReg <= 3) || (bReg >= 8 && aReg <= 3);
  },
  penalty: 5,
  explain: 'One partner is emotionally steady, the other more reactive',
},
{
  id: 'affection_needs_gap',
  name: 'Physical affection mismatch (MED-HIGH)',
  when: (a, b) => {
    const aAff = getSignal(a, 'physicalAffectionStyle');
    const bAff = getSignal(b, 'physicalAffectionStyle');
    if (aAff == null || bAff == null) return false;
    return (aAff >= 8 && bAff <= 3) || (bAff >= 8 && aAff <= 3);
  },
  penalty: 4,
  explain: 'Big difference in physical affection needs',
},
```

### 2. `EnrichedSignals` extension (locked)

Add optional fields to interface in `tension-rules.ts` (after Expansion-01 fields):

```typescript
/** Shadow Expansion-02 — from evaluationJson.self.signals when extracted. */
emotionalRegulation?: number | null;
physicalAffectionStyle?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

### 3. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
emotional_volatility_gap: 'Emotional steadiness gap',
affection_needs_gap: 'Different affection needs',
```

Exact strings locked (match sprint README). `KNOWN_TENSION_CHIP_LABELS` in `explainability-review-heuristics.ts` updates automatically via `Object.values(TENSION_CHIP_BY_ID)`.

### 4. Distinct from existing rules (locked)

| Existing rule | Expansion-02 rule | Distinction |
|---------------|-------------------|-------------|
| `emotional_depth_gap` | `emotional_volatility_gap` | Symmetric abs gap on `emotionalDepth` (>=4) vs directional high/low on `emotionalRegulation` |
| `physical_priority_mismatch` | `affection_needs_gap` | Symmetric abs gap on `physicalPriority` (>=6) vs directional high/low on `physicalAffectionStyle` (touch frequency, not attractiveness) |
| `empathy_gap` | `emotional_volatility_gap` | Attunement to partner feelings vs self-regulation under stress |
| `vulnerability_mismatch` | (none) | Different signal domain |

Multiple rules **may fire together** on the same pair — penalties stack (clamped 0–10). Do not dedupe.

### 5. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when both sides have non-null shadow values |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — predicates return false on null |

This is intentional partial rollout: friction signal only where Story 2 extraction populated keys.

### 6. Explainability display (locked)

- `friction >= 3` required for `tensionChip` to appear (existing gate in `topTensionChip`)
- `emotional_volatility_gap` alone (penalty 5) → chip shows if friction >= 3
- `affection_needs_gap` alone (penalty 4) → chip shows if friction >= 3
- If multiple rules fire, highest penalty wins chip label (existing sort)

### 7. Agent 4

**Skip.** No eligibility gates or preference-dimension changes. Ranking may shift only for pairs with extracted shadow values — validated in Story 5.

---

## Service signatures

No new public methods. Existing:

```typescript
// compute-friction.ts
export function computeFriction(
  enrichedA: EnrichedSignals,
  enrichedB: EnrichedSignals,
): ComputeFrictionResult;
```

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `CompareResultDto.friction` — may increase when new rules fire
- `CompareResultDto.tensionMatrix` — may include new rule ids
- `CompareResultDto.explainability.tensionChip` — may be `'Emotional steadiness gap'` or `'Different affection needs'`

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "volatility|affection|Expansion-02"
npx jest src/matches/match-explainability.spec.ts --runInBand
npm run typecheck
```

### Minimum unit tests

**`compute-friction.spec.ts`** (new `describe('Expansion-02 tension rules')` or similar):

| Case | enrichedA | enrichedB | Expect |
|------|-----------|-----------|--------|
| emotional_volatility_gap fires | `emotionalRegulation: 9` | `emotionalRegulation: 2` | id `emotional_volatility_gap`, penalty 5 |
| emotional_volatility_gap reverse | `emotionalRegulation: 2` | `emotionalRegulation: 9` | same |
| emotional_volatility_gap null guard | `emotionalRegulation: 9` | `{}` | does not fire |
| emotional_volatility_gap below threshold | `emotionalRegulation: 7` | `emotionalRegulation: 4` | does not fire |
| affection_needs_gap fires | `physicalAffectionStyle: 8` | `physicalAffectionStyle: 2` | id `affection_needs_gap`, penalty 4 |
| affection_needs_gap reverse | `physicalAffectionStyle: 3` | `physicalAffectionStyle: 9` | same |
| affection_needs_gap null guard | `physicalAffectionStyle: 8` | `{}` | does not fire |
| affection_needs_gap below threshold | `physicalAffectionStyle: 7` | `physicalAffectionStyle: 4` | does not fire |

**`match-explainability.spec.ts`:**

- `TENSION_CHIP_BY_ID.emotional_volatility_gap === 'Emotional steadiness gap'`
- `TENSION_CHIP_BY_ID.affection_needs_gap === 'Different affection needs'`
- `buildMatchExplainability` with `friction: 5`, `tensionMatrix: [{ id: 'emotional_volatility_gap', penalty: 5 }]` → `tensionChip: 'Emotional steadiness gap'`

Optional: one `match-engine.spec.ts` case with injected evaluationJson shadow signals — not required to block Story 3 (Story 5 scope).

---

## E2E verification

N/A

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Emotional balance`, `Affection rhythm match`) + i18n — requires shadow overlay module (Expansion-01 pattern: `expansion-02-explainability.ts`).

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with two Expansion-02 optional shadow fields.
2. Append both rules to `tensionRules` per §1 (exact thresholds/penalties).
3. Add `TENSION_CHIP_BY_ID` entries per §3.
4. Add unit tests per §Tests.
5. Do **not** touch compatibility weights, positive chips, extraction, Expansion-01 rules, or i18n.
6. Run test commands; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(engine): add regulation and affection tension rules

Expansion-02 Story 3 — friction + explainability labels; shadow keys only.
```

---

## Agent 2 CR checklist

- [ ] Rule ids, thresholds, penalties match architect lock
- [ ] Null guard on both sides before compare
- [ ] `EnrichedSignals` includes both Expansion-02 shadow keys
- [ ] `TENSION_CHIP_BY_ID` has both entries with exact labels
- [ ] No changes to `COMPATIBILITY_SIGNAL_KEYS` / positive chips
- [ ] Expansion-01 tension rules unchanged
- [ ] Tests pass
- [ ] No regex / keyword inference added

---

## Next agent

```text
--agent 1 expansion 02 story 3
```

**Notes:** Mirror Expansion-01 Story 3 implementation exactly — only rule ids, signals, thresholds, and chip labels differ.
