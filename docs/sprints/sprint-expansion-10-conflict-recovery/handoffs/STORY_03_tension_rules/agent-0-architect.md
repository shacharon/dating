# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **three** friction tension rules + English tension chip labels for Expansion-10 shadow signals. **No** compatibility scoring / positive chips / i18n / extraction changes.

---

## Summary

- Append **three** Expansion-10 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`repair_skills_gap`, `both_low_repair`, `forgiveness_style_gap`).
- Extend `EnrichedSignals` with `repairSkills` + `forgivenessStyle`.
- Add **three** English labels to `TENSION_CHIP_BY_ID`.
- Rules fire **only when required signals are non-null**.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips / i18n / onboarding copy are **Story 4**.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{repairSkills\|forgivenessStyle}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-10 fields | **Not yet on `EnrichedSignals`** — Story 3 adds both |
| Last tension rule today | `chronotype_clash` (Expansion-08) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-10 penalties **5 / 6 / 4**; each rule alone **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Adjacent tension | `emotional_volatility_gap` (`emotionalRegulation`) — in-the-moment steadiness ≠ post-conflict forgiveness |
| `conflictStyle` tension | **None today** — do not invent a conflictStyle tension rule in Story 3 |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Three tension rules + three chip labels | **Ship all three** in Story 3 (no soft-skip) |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Chip labels resolve in explainability | **Yes** — English `TENSION_CHIP_BY_ID` only |
| Positive chips / i18n | **Story 4** |
| Extraction / prompts | Stories 1–2 complete — **do not** edit |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+2 fields); append **3** rules after `chronotype_clash` |
| `dating-api/src/matches/match-explainability.ts` | Add **3** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 3 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| Positive chips / Expansion-10 explainability overlay | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` / onboarding copy | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| New `conflictStyle` tension rule | Out of scope |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `chronotype_clash`, preserve existing order:

```typescript
{
  id: 'repair_skills_gap',
  name: 'Repair skills gap (HIGH)',
  when: (a, b) => {
    const aR = getSignal(a, 'repairSkills');
    const bR = getSignal(b, 'repairSkills');
    if (aR == null || bR == null) return false;
    return (aR >= 8 && bR <= 3) || (bR >= 8 && aR <= 3);
  },
  penalty: 5,
  explain:
    'One actively repairs after conflict, the other tends to withdraw or avoid resolution',
},
{
  id: 'both_low_repair',
  name: 'Both low repair skills (HIGH — Gottman "stonewalling" risk)',
  when: (a, b) => {
    const aR = getSignal(a, 'repairSkills');
    const bR = getSignal(b, 'repairSkills');
    if (aR == null || bR == null) return false;
    return aR <= 3 && bR <= 3;
  },
  penalty: 6,
  explain:
    'Neither partner tends to repair after conflict — unresolved issues may accumulate',
},
{
  id: 'forgiveness_style_gap',
  name: 'Forgiveness style gap (MED)',
  when: (a, b) => {
    const aF = getSignal(a, 'forgivenessStyle');
    const bF = getSignal(b, 'forgivenessStyle');
    if (aF == null || bF == null) return false;
    return (aF >= 8 && bF <= 3) || (bF >= 8 && aF <= 3);
  },
  penalty: 4,
  explain:
    'One lets go of conflict quickly, the other holds onto it longer — pacing after fights may clash',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `repair_skills_gap` | ≥8 vs ≤3 (symmetric) | **5** |
| `both_low_repair` | both ≤3 | **6** |
| `forgiveness_style_gap` | ≥8 vs ≤3 (symmetric) | **4** |

### 2. Interaction notes (locked)

| Case | Behavior |
|------|----------|
| Both ≤3 on repair | **`both_low_repair` fires**; `repair_skills_gap` does **not** (gap predicate needs one ≥8) |
| One 9 / one 2 on repair | **`repair_skills_gap` only** |
| Both high repair | Neither repair rule fires |
| Multiple Exp-10 rules | May fire together (e.g. repair gap + forgiveness gap) — penalties **stack** (clamped 0–10); highest penalty wins chip label |

Do **not** add mutual-exclusion logic between the two repair rules.

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `physicalTypePreference`:

```typescript
  /** Shadow Expansion-10 — from evaluationJson.self.signals when extracted. */
  repairSkills?: number | null;
  forgivenessStyle?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  repair_skills_gap: 'Different repair styles',
  both_low_repair: 'Conflict recovery risk',
  forgiveness_style_gap: 'Different forgiveness pace',
```

Exact strings locked (match sprint README).

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-10 | Distinction |
|---------------------|--------------|-------------|
| (no conflictStyle tension today) | `repair_skills_gap` / `both_low_repair` | Post-conflict apology/ownership/reconnection — not during-conflict style |
| `emotional_volatility_gap` (`emotionalRegulation`) | `forgiveness_style_gap` | In-the-moment steadiness ≠ letting go of grudges over time |
| Attachment / fusion tensions | `forgiveness_style_gap` | Closeness/security ≠ grudge/forgiveness pacing |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort).

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each of the three Exp-10 rules alone can surface a chip (penalties 4–6)
- If multiple fire, highest penalty wins label (e.g. `both_low_repair` penalty 6 beats `forgiveness_style_gap` penalty 4)

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-10 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| repair_skills_gap fires | repair 9 / 2 | id + penalty **5** |
| repair reverse | 2 / 9 | same |
| repair null guard | 9 / `{}` | no fire |
| repair below threshold | 7 / 4 | no fire |
| repair boundary ≤3 | 8 / 3 | **fires** |
| both_low_repair fires | 2 / 3 | penalty **6** |
| both_low boundary | 3 / 3 | **fires** |
| both_low null guard | 2 / `{}` | no fire |
| both_low one above | 3 / 4 | no fire |
| both_low does not also fire gap | 2 / 2 | `both_low_repair` yes; `repair_skills_gap` **no** |
| forgiveness_style_gap fires | 9 / 2 | penalty **4** |
| forgiveness reverse | 2 / 9 | same |
| forgiveness null guard | 9 / `{}` | no fire |
| forgiveness below threshold | 7 / 4 | no fire |
| forgiveness boundary ≤3 | 8 / 3 | **fires** |

**`match-explainability.spec.ts`:**

- Assert three `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for `both_low_repair` friction 6 → `'Conflict recovery risk'`
- Smoke for `repair_skills_gap` friction 5 → `'Different repair styles'`
- Smoke for `forgiveness_style_gap` friction 4 → `'Different forgiveness pace'`

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

No DTO shape changes. Existing fields may newly include Exp-10 rule ids / chip labels when rules fire.

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
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-10"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-10|Different repair styles|Conflict recovery risk|Different forgiveness pace"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `repairSkills` + `forgivenessStyle` (§3).
2. Append **three** rules after `chronotype_clash` (§1) — exact ids/penalties/predicates/explains.
3. Add **three** `TENSION_CHIP_BY_ID` entries (§4).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, scoring promote, extraction changes, or a conflictStyle tension rule.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-10-conflict-recovery/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-10 repairSkills and forgivenessStyle shadow tension rules

Story 3 — three friction rules + English tension chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Three rules present with exact ids, penalties, thresholds
- [ ] `EnrichedSignals` has `repairSkills` + `forgivenessStyle`
- [ ] Three `TENSION_CHIP_BY_ID` labels exact
- [ ] Null guards on all three rules
- [ ] `both_low_repair` and `repair_skills_gap` correctly non-overlapping on both-low inputs
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n drift
- [ ] No regex / text-inference / extraction changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries + both-low exclusivity
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips for both signals + i18n EN/HE/ES + onboarding prompt copy.
- **Story 5:** Live / compare E2E; Hebrew fixtures; >85%; optional promote.
- **Correlation risk:** monitor `repairSkills` vs (future) conflictStyle product semantics; `forgivenessStyle` vs `emotionalRegulation` — do not hardcode anti-correlation in Story 3.

---

## Next agent

```text
--agent 1 expansion 10 story 3
```

**Notes:** Deterministic tension only — mirror Exp-08 Story 3 pattern with **three** rules. Keep shadow / no promote. All three ship (no soft-skip).
