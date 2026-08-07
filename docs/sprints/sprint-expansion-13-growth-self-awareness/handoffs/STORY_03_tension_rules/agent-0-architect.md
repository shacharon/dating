# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **two** friction tension rules + English tension chip labels for Expansion-13 shadow signals. **No** compatibility scoring / positive chips / i18n / extraction changes.

---

## Summary

- Append **two** Expansion-13 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`growth_mindset_gap`, `both_low_self_awareness`).
- Extend `EnrichedSignals` with `growthMindset` + `selfAwareness`.
- Add **two** English labels to `TENSION_CHIP_BY_ID`.
- Rules fire **only when required signals are non-null**.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips (`Grows together` both-high growth; `Self-awareness match` aligned) / i18n / onboarding copy are **Story 4**.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{growthMindset\|selfAwareness}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-13 fields | **Not yet on `EnrichedSignals`** — Story 3 adds both |
| Last tension rule today | `emotional_expression_gap` (Expansion-12) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-13 penalties **4 / 3**; each rule alone **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Adjacent tension | `vulnerability_gap` (`vulnerabilityOpenness`); regulation / empathy gaps — distinct from Exp-13 |
| Scale reminder | Growth high = more open to feedback/change; self-awareness high = more insight into own patterns (Story 2 lock) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Two tension rules + two chip labels | **Ship both** in Story 3 (no soft-skip) |
| Positive chip both-high growth → Grows together | **Story 4** — do **not** implement in Story 3 |
| Aligned self-awareness → Self-awareness match | **Story 4** |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Chip labels resolve in explainability | **Yes** — English `TENSION_CHIP_BY_ID` only |
| Extraction / prompts | Stories 1–2 complete — **do not** edit |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+2 fields); append **2** rules after `emotional_expression_gap` |
| `dating-api/src/matches/match-explainability.ts` | Add **2** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 2 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| Positive chips / Expansion-13 explainability overlay | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` / onboarding copy | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `emotional_expression_gap`, preserve existing order:

```typescript
{
  id: 'growth_mindset_gap',
  name: 'Growth mindset gap (MED)',
  when: (a, b) => {
    const aG = getSignal(a, 'growthMindset');
    const bG = getSignal(b, 'growthMindset');
    if (aG == null || bG == null) return false;
    return (aG >= 8 && bG <= 3) || (bG >= 8 && aG <= 3);
  },
  penalty: 4,
  explain:
    'One is highly open to feedback and change, the other more fixed — growth pace may differ',
},
{
  id: 'both_low_self_awareness',
  name: 'Both low self-awareness (MED)',
  when: (a, b) => {
    const aS = getSignal(a, 'selfAwareness');
    const bS = getSignal(b, 'selfAwareness');
    if (aS == null || bS == null) return false;
    return aS <= 3 && bS <= 3;
  },
  penalty: 3,
  explain:
    'Neither partner shows strong self-insight — patterns may be harder to name and resolve together',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `growth_mindset_gap` | ≥8 vs ≤3 (symmetric) | **4** |
| `both_low_self_awareness` | both ≤3 (both non-null) | **3** |

### 2. Interaction notes (locked)

| Case | Behavior |
|------|----------|
| One 9 / one 2 on growth | **`growth_mindset_gap` fires** |
| Both high / mid growth aligned | No growth gap |
| Both high growth (≥7) | No tension (positive chip → Story 4) |
| Both selfAwareness ≤3 | **`both_low_self_awareness` fires** |
| One low / one high or mid self-awareness | No both-low rule (gap-style self-awareness tension **not** in README — do not invent) |
| Both high self-awareness | No tension (aligned positive chip → Story 4) |
| Multiple Exp-13 rules | May fire together — penalties **stack** (clamped 0–10); highest penalty wins chip label (tie: existing sort order) |

Do **not** add mutual-exclusion logic beyond natural predicates. Do **not** invent a `self_awareness_gap` (high vs low) — README only ships both-low for awareness.

Mirror Exp-11 `both_high_jealousy` pattern for the both-low awareness rule (shared-side condition, not a gap).

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `emotionalExpression`:

```typescript
  /** Shadow Expansion-13 — from evaluationJson.self.signals when extracted. */
  growthMindset?: number | null;
  selfAwareness?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  growth_mindset_gap: 'Different growth pace',
  both_low_self_awareness: 'Self-insight gap',
```

Exact strings locked (match sprint README).

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-13 | Distinction |
|---------------------|--------------|-------------|
| `vulnerability_gap` (`vulnerabilityOpenness`) | `growth_mindset_gap` | Willingness to share/be seen ≠ willingness to change / take feedback |
| Regulation / calm-under-stress gaps | `both_low_self_awareness` | Managing emotions in the moment ≠ *knowing* one's patterns |
| `empathy_gap` | `both_low_self_awareness` | Outward understanding of others ≠ inward self-insight |
| Exp-12 listening / expression | Exp-13 growth / awareness | Feeling heard / expressiveness ≠ growth pace / self-insight |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort). When growth gap (4) and both-low awareness (3) both fire, growth chip wins unless another higher-penalty peer also fires.

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each Exp-13 rule alone can surface a chip (penalties **4** and **3**)
- If multiple fire, highest penalty wins label

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-13 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| growth_mindset_gap fires | growth 9 / 2 | id + penalty **4** |
| growth reverse | 2 / 9 | same |
| growth null guard | 9 / `{}` | no fire |
| growth below threshold | 7 / 4 | no fire |
| growth boundary ≤3 | 8 / 3 | **fires** |
| both_low_self_awareness fires | awareness 2 / 2 | penalty **3** |
| both_low boundary | 3 / 3 | **fires** |
| both_low null guard | 2 / `{}` | no fire |
| both_low one high | 2 / 8 | **no fire** |
| both_low both mid | 5 / 5 | **no fire** |

**`match-explainability.spec.ts`:**

- Assert two `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for `growth_mindset_gap` friction 4 → `'Different growth pace'`
- Smoke for `both_low_self_awareness` friction 3 → `'Self-insight gap'`

Optional: `match-engine.spec.ts` E2E — Story 5.

### 9. Agent 4

**Skip.**

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

No DTO shape changes. Existing fields may newly include Exp-13 rule ids / chip labels when rules fire.

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped; no eligibility/ranking harness change required for Story 3 unit tension work.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-13"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-13|Different growth pace|Self-insight gap"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `growthMindset` + `selfAwareness` (§3).
2. Append **two** rules after `emotional_expression_gap` (§1) — exact ids/penalties/predicates/explains.
3. Add **two** `TENSION_CHIP_BY_ID` entries (§4).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, scoring promote, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-13-growth-self-awareness/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-13 growthMindset and selfAwareness shadow tension rules

Story 3 — two friction rules + English tension chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Two rules present with exact ids, penalties, thresholds
- [ ] `EnrichedSignals` has `growthMindset` + `selfAwareness`
- [ ] Two `TENSION_CHIP_BY_ID` labels exact (`Different growth pace`, `Self-insight gap`)
- [ ] Null guards on both rules
- [ ] No invented `self_awareness_gap` (high vs low)
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n drift
- [ ] No regex / text-inference / extraction changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries for growth gap + both-low awareness cases
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Grows together` both-high growth ≥7; `Self-awareness match` aligned) + i18n EN/HE/ES + onboarding prompt copy + wire `personal` diversity.
- **Story 5:** Live / compare E2E; Hebrew fixtures; >85%; optional promote.
- **Correlation risk:** monitor `growthMindset` vs `vulnerabilityOpenness`; `selfAwareness` vs `emotionalRegulation` / `empathyCompassion` — do not hardcode anti-correlation in Story 3.

---

## Next agent

```text
--agent 1 expansion 13 story 3
```

**Notes:** Deterministic tension only — mirror Exp-12 Story 3 pattern with **two** rules (one gap + one both-low). Keep shadow / no promote. Both ship (no soft-skip). Positive chips stay Story 4.
