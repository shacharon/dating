# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add friction tension rule + explainability chip label for Expansion-06 shadow signal. **No** compatibility scoring / positive chips / i18n.

---

## Summary

- Add **`novelty_routine_clash`** to `tension-rules.ts` with locked thresholds and penalty from sprint README.
- Extend `EnrichedSignals` so `getSignal()` can read `adventureNovelty` from `evaluationJson.self.signals` (already spread via `applyKeywordTriggers`).
- Add English tension chip label to `TENSION_CHIP_BY_ID` in `match-explainability.ts`.
- Rule fires **only when both profiles have non-null** shadow values — no impact on legacy profiles until re-analyzed.
- Friction penalties **do** affect `finalScore` when the rule fires; compatibility breakdown unchanged (key still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Penalty is **4** → alone can surface `tensionChip` (friction gate ≥3); also outranks Expansion-05 rules (penalty 3) when both fire.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.adventureNovelty` after Stories 1–2 (+ alias from legacy `noveltyVsRoutine`) |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new key needs interface field for typed `getSignal` |
| Current Expansion-06 field | **`adventureNovelty` not yet on `EnrichedSignals`** — Story 3 adds it |
| Expansion-01–05 precedent | Shadow tension rules already through `domestic_out_mismatch` |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| UI | Displays `explainability.tensionChip` string from API as-is (English) |
| Compatibility | Key **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals`; append 1 rule to `tensionRules` |
| `dating-api/src/matches/match-explainability.ts` | Add 1 `TENSION_CHIP_BY_ID` entry |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests: fire + reverse + null guards + below threshold + ≤3 boundary |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for `novelty_routine_clash` |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Story 1 shadow lock — no scoring keys |
| `matches/expansion-01/02/03/04/05-explainability.ts` | Prior sprints |
| `matches/expansion-06-explainability.ts` | Story 4 (positive chips shadow overlay) |
| `match-explainability.ts` `POSITIVE_CHIP_BY_SIGNAL` | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Interest tag registries | Orthogonal |

---

## Decisions (do not reverse without discussion)

### 1. Rule definition (locked — from sprint README)

Append to `tensionRules` array **after** Expansion-05 `domestic_out_mismatch`, preserve existing order:

```typescript
{
  id: 'novelty_routine_clash',
  name: 'Novelty vs routine clash (MED-HIGH)',
  when: (a, b) => {
    const aNov = getSignal(a, 'adventureNovelty');
    const bNov = getSignal(b, 'adventureNovelty');
    if (aNov == null || bNov == null) return false;
    return (aNov >= 8 && bNov <= 3) || (bNov >= 8 && aNov <= 3);
  },
  penalty: 4,
  explain: 'One seeks new experiences, the other values routine and familiarity',
},
```

**Thresholds (locked — symmetric):**

| Rule | High | Low | Penalty |
|------|------|-----|---------|
| `novelty_routine_clash` | ≥8 | ≤**3** | **4** |

### 2. `EnrichedSignals` extension (locked)

Add optional field after Expansion-05:

```typescript
/** Shadow Expansion-06 — from evaluationJson.self.signals when extracted. */
adventureNovelty?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Do **not** add `noveltyVsRoutine` to `EnrichedSignals` — canonical key only; alias already maps at extraction time.

### 3. Tension chip label (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
novelty_routine_clash: 'Novelty vs routine',
```

Exact string locked (match sprint README). `KNOWN_TENSION_CHIP_LABELS` updates automatically via `Object.values(TENSION_CHIP_BY_ID)`.

### 4. Distinct from existing rules (locked)

| Existing rule | Expansion-06 | Distinction |
|---------------|--------------|-------------|
| `lifestyle_pace_mismatch` | `novelty_routine_clash` | Busy vs calm **tempo** vs new-experiences vs familiar **routine** |
| `domestic_out_mismatch` | `novelty_routine_clash` | Home-nest vs always-out vs novelty-seeking (homebody can still seek novelty) |
| `structure` / chaos (if any keyword-derived) | `novelty_routine_clash` | Mess/order tolerance ≠ experiential novelty preference |
| Interest tags (`travel`, etc.) | `novelty_routine_clash` | Tags are binary hobby presence — not tension inputs |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. When Expansion-06 (penalty **4**) fires with Expansion-05 rules (penalty 3), chip sort prefers Expansion-06 label.

### 5. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — key not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when both sides have non-null `adventureNovelty` |
| `finalScore` | Reduced by friction penalty when rule fires |
| Profiles without shadow key | **Unchanged** — predicate returns false on null |

### 6. Explainability display (locked)

- `friction >= 3` required for `tensionChip` to appear (existing gate in `topTensionChip`)
- `novelty_routine_clash` alone (penalty **4**) → chip shows
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

- `CompareResultDto.friction` — may increase when new rule fires
- `CompareResultDto.tensionMatrix` — may include `novelty_routine_clash`
- `CompareResultDto.explainability.tensionChip` — may be `'Novelty vs routine'`

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-06|novelty_routine_clash"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-06|novelty_routine_clash|Novelty vs routine"
npm run typecheck
```

### Minimum unit tests

**`compute-friction.spec.ts`** — `describe('Expansion-06 shadow tension rules')`:

| Case | enrichedA | enrichedB | Expect |
|------|-----------|-----------|--------|
| novelty_routine_clash fires | `adventureNovelty: 9` | `adventureNovelty: 2` | id `novelty_routine_clash`, penalty **4** |
| reverse | `2` / `9` | | same |
| null guard | `9` / `{}` | | does not fire |
| below threshold | `7` / `4` | | does not fire |
| low-band boundary ≤3 | `8` / `3` | | **does** fire |

**`match-explainability.spec.ts`:**

- `TENSION_CHIP_BY_ID.novelty_routine_clash === 'Novelty vs routine'`
- `buildMatchExplainability` with `friction: 4`, matrix `[{ id: 'novelty_routine_clash', penalty: 4 }]` → `tensionChip: 'Novelty vs routine'`

Optional: `match-engine.spec.ts` E2E — Story 5 scope.

---

## E2E verification

N/A

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chip (`Adventure & novelty`) + i18n via `expansion-06-explainability.ts` overlay + `assemble-result.ts` merge.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `adventureNovelty`.
2. Append `novelty_routine_clash` to `tensionRules` per §1 (exact thresholds/penalty **4**).
3. Add `TENSION_CHIP_BY_ID` entry per §3.
4. Add unit tests per §Tests.
5. Do **not** touch compatibility weights, positive chips, extraction, Expansion-01–05 rules, or i18n.
6. Run test commands; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(engine): add novelty_routine_clash tension rule for adventureNovelty

Expansion-06 Story 3 — friction + explainability label; shadow key only.
```

---

## Agent 2 CR checklist

- [ ] Rule id, thresholds, penalty match architect lock (≥8 vs ≤3, penalty **4**)
- [ ] Null guard on both sides before compare
- [ ] `EnrichedSignals` includes `adventureNovelty` (not `noveltyVsRoutine`)
- [ ] `TENSION_CHIP_BY_ID` label exact: `'Novelty vs routine'`
- [ ] No changes to `COMPATIBILITY_SIGNAL_KEYS` / positive chips
- [ ] Expansion-01–05 tension rules unchanged
- [ ] Tests pass
- [ ] No regex / keyword inference added

---

## Next agent

```text
--agent 1 expansion 06 story 3
```

**Notes:** Mirror Expansion-05 Story 3 (single-signal variant like Expansion-03). Expansion-06 twist: penalty **4** (MED-HIGH) — alone surfaces tensionChip and outranks Exp-05 penalty-3 rules when stacked.
