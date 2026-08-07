# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-03-humor-playfulness  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add friction tension rule + explainability chip label for Expansion-03 shadow signal. **No** compatibility scoring / positive chips / i18n.

---

## Summary

- Add `humor_mismatch` rule to `tension-rules.ts` with locked thresholds and penalty from sprint README.
- Extend `EnrichedSignals` so `getSignal()` can read `humorPlayfulness` from `evaluationJson.self.signals` (already spread via `applyKeywordTriggers`).
- Add English tension chip label to `TENSION_CHIP_BY_ID` in `match-explainability.ts`.
- Rule fires **only when both profiles have non-null** shadow values — no impact on legacy profiles until re-analyzed.
- Friction penalties **do** affect `finalScore` when rule fires; compatibility breakdown unchanged (key still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Agent 4 **skipped** (no eligibility / preference-dimension change; bounded ranking impact only when shadow key present).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals` includes `humorPlayfulness` after Story 2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new key needs interface field for typed `getSignal` |
| Expansion-01/02 precedent | `empathy_gap`, `vulnerability_mismatch`, `emotional_volatility_gap`, `affection_needs_gap` already in `tensionRules` |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| UI | Displays `explainability.tensionChip` string from API as-is (English) |
| Compatibility | `humorPlayfulness` **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals`; append 1 rule to `tensionRules` |
| `dating-api/src/matches/match-explainability.ts` | Add `TENSION_CHIP_BY_ID` entry |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests: rule fires + penalty + null guards + below threshold |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for `humor_mismatch` |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Story 1 shadow lock — no scoring keys |
| `matches/expansion-01-explainability.ts`, `expansion-02-explainability.ts` | Prior sprints |
| `matches/expansion-03-explainability.ts` | Story 4 (positive chips shadow overlay) |
| `match-explainability.ts` `POSITIVE_CHIP_BY_SIGNAL` | Story 4 (positive chips) |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 (positive chip evidence; tension chips English-only in API) |
| `extraction/*` | Story 2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |

---

## Decisions (do not reverse without discussion)

### 1. Rule definition (locked — from sprint README)

Append to `tensionRules` array **after** Expansion-02 rules (`affection_needs_gap`), preserve existing order:

```typescript
{
  id: 'humor_mismatch',
  name: 'Playfulness mismatch (MED)',
  when: (a, b) => {
    const aHum = getSignal(a, 'humorPlayfulness');
    const bHum = getSignal(b, 'humorPlayfulness');
    if (aHum == null || bHum == null) return false;
    return (aHum >= 8 && bHum <= 3) || (bHum >= 8 && aHum <= 3);
  },
  penalty: 3,
  explain: 'One values playfulness and fun, the other is more serious',
},
```

### 2. `EnrichedSignals` extension (locked)

Add optional field to interface in `tension-rules.ts` (after Expansion-02 fields):

```typescript
/** Shadow Expansion-03 — from evaluationJson.self.signals when extracted. */
humorPlayfulness?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

### 3. Tension chip label (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
humor_mismatch: 'Playfulness mismatch',
```

Exact string locked (match sprint README). `KNOWN_TENSION_CHIP_LABELS` in `explainability-review-heuristics.ts` updates automatically via `Object.values(TENSION_CHIP_BY_ID)`.

### 4. Distinct from existing rules (locked)

| Existing rule | `humor_mismatch` | Distinction |
|---------------|------------------|-------------|
| `emotional_depth_gap` | playfulness need | Symmetric abs gap on `emotionalDepth` (>=4) vs directional high/low on `humorPlayfulness` (levity/banter need) |
| `social_battery_mismatch` | playfulness need | Abs gap on social energy (>=6) vs directional high/low on relationship playfulness |
| `lifestyle_pace_mismatch` | playfulness need | Pace/rhythm gap vs need for banter/silliness in love |
| `vulnerability_mismatch` | playfulness need | Openness vs walls on `vulnerabilityOpenness` vs playfulness vs seriousness |

No `noveltyVsRoutine` tension rule exists — `humor_mismatch` is the first playfulness-specific friction rule.

Multiple rules **may fire together** on the same pair — penalties stack (clamped 0–10). Do not dedupe.

### 5. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — key not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when both sides have non-null `humorPlayfulness` |
| `finalScore` | Reduced by friction penalty (3) when rule fires |
| Profiles without shadow key | **Unchanged** — predicate returns false on null |

This is intentional partial rollout: friction signal only where Story 2 extraction populated the key.

### 6. Explainability display (locked)

- `friction >= 3` required for `tensionChip` to appear (existing gate in `topTensionChip`)
- `humor_mismatch` alone (penalty 3) → chip shows when friction >= 3 (borderline — exactly meets gate)
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

- `CompareResultDto.friction` — may increase when new rule fires
- `CompareResultDto.tensionMatrix` — may include `humor_mismatch`
- `CompareResultDto.explainability.tensionChip` — may be `'Playfulness mismatch'`

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "humor|Expansion-03"
npx jest src/matches/match-explainability.spec.ts --runInBand
npm run typecheck
```

### Minimum unit tests

**`compute-friction.spec.ts`** (new `describe('Expansion-03 tension rules')` or similar):

| Case | enrichedA | enrichedB | Expect |
|------|-----------|-----------|--------|
| humor_mismatch fires | `humorPlayfulness: 9` | `humorPlayfulness: 2` | id `humor_mismatch`, penalty 3 |
| humor_mismatch reverse | `humorPlayfulness: 2` | `humorPlayfulness: 9` | same |
| humor_mismatch null guard | `humorPlayfulness: 9` | `{}` | does not fire |
| humor_mismatch below threshold | `humorPlayfulness: 7` | `humorPlayfulness: 4` | does not fire |

**`match-explainability.spec.ts`:**

- `TENSION_CHIP_BY_ID.humor_mismatch === 'Playfulness mismatch'`
- `buildMatchExplainability` with `friction: 3`, `tensionMatrix: [{ id: 'humor_mismatch', penalty: 3 }]` → `tensionChip: 'Playfulness mismatch'`

Optional: one `match-engine.spec.ts` case with injected evaluationJson shadow signals — not required to block Story 3 (Story 5 scope).

---

## E2E verification

N/A

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chip (`Shared playfulness`) + i18n — requires shadow overlay module (`expansion-03-explainability.ts`, merged in `assemble-result.ts` like Expansion-01/02).

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `humorPlayfulness` optional shadow field.
2. Append rule to `tensionRules` per §1 (exact thresholds/penalty).
3. Add `TENSION_CHIP_BY_ID` entry per §3.
4. Add unit tests per §Tests.
5. Do **not** touch compatibility weights, positive chips, extraction, Expansion-01/02 rules, or i18n.
6. Run test commands; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(engine): add humor_mismatch tension rule

Expansion-03 Story 3 — friction + explainability label; shadow key only.
```

---

## Agent 2 CR checklist

- [ ] Rule id, thresholds, penalty match architect lock
- [ ] Null guard on both sides before compare
- [ ] `EnrichedSignals` includes `humorPlayfulness`
- [ ] `TENSION_CHIP_BY_ID.humor_mismatch === 'Playfulness mismatch'`
- [ ] No changes to `COMPATIBILITY_SIGNAL_KEYS` / positive chips
- [ ] Expansion-01/02 tension rules unchanged
- [ ] Tests pass
- [ ] No regex / keyword inference added

---

## Next agent

```text
--agent 1 expansion 03 story 3
```

**Notes:** Mirror Expansion-02 Story 3 implementation exactly — only rule id, signal, threshold, penalty, and chip label differ (single rule this sprint).
