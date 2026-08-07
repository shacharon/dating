# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-08-education-integrity-lifestyle  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **three** friction tension rules + English tension chip labels for Expansion-08 shadow signals. Soft-skip physical-type category clash. **No** compatibility scoring / positive chips / i18n.

---

## Summary

- Append **three** Expansion-08 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`education_level_gap`, `honesty_integrity_gap`, `chronotype_clash`).
- **Soft-skip** `physical_type_specificity_clash` — Story 2 shipped score-only `physicalTypePreference` with **no** category metadata; README allows soft-skip until categories exist. Do **not** invent `hasConflictingPhysicalTypeCategories` or a score-gap fallback clash.
- Extend `EnrichedSignals` with all **four** Exp-08 optional fields (including `physicalTypePreference` for future category clash).
- Add **three** English labels to `TENSION_CHIP_BY_ID` (not the soft-skipped physical-type id).
- Rules fire **only when required signals are non-null** — race/ethnicity/anatomy-only text extracts as null on Exp-08 keys → no tension from that alone.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips are **Story 4**.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{educationLevel\|honestyIntegrity\|chronotype\|physicalTypePreference}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-08 fields | **Not yet on `EnrichedSignals`** — Story 3 adds all four |
| Last tension rule today | `religious_observance_gap` (Expansion-07) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-08 penalties **3 / 4 / 5**; chronotype alone (3) **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Category metadata | **Does not exist** (Story 2 lock) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Four tension rules + chip labels | **Three rules + three chips in Story 3**; physical-type clash **soft-skipped** |
| `hasConflictingPhysicalTypeCategories` | **Do not implement** until category metadata exists |
| Fallback score-gap clash when both ≥7 | **Forbidden** — README says gap alone is NOT a clash |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Positive chips / i18n | **Story 4** |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+4 fields); append **3** rules after `religious_observance_gap` |
| `dating-api/src/matches/match-explainability.ts` | Add **3** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 3 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| `physical_type_specificity_clash` rule / chip | Soft-skip — no category metadata |
| `hasConflictingPhysicalTypeCategories` helper | Not inventable without categories |
| Positive chips / expansion-08-explainability overlay | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README; physical soft-skipped)

Append to `tensionRules` **after** `religious_observance_gap`, preserve existing order:

```typescript
{
  id: 'education_level_gap',
  name: 'Education level gap (MED)',
  when: (a, b) => {
    const aEd = getSignal(a, 'educationLevel');
    const bEd = getSignal(b, 'educationLevel');
    if (aEd == null || bEd == null) return false;
    return Math.abs(aEd - bEd) >= 5 && (aEd >= 8 || bEd >= 8);
  },
  penalty: 4,
  explain:
    'One strongly requires formal education credentials, the other does not share that priority',
},
{
  id: 'honesty_integrity_gap',
  name: 'Honesty / integrity mismatch (MED-HIGH)',
  when: (a, b) => {
    const aH = getSignal(a, 'honestyIntegrity');
    const bH = getSignal(b, 'honestyIntegrity');
    if (aH == null || bH == null) return false;
    return (aH >= 8 && bH <= 3) || (bH >= 8 && aH <= 3);
  },
  penalty: 5,
  explain:
    'Very different emphasis on honesty and integrity as relationship values',
},
{
  id: 'chronotype_clash',
  name: 'Morning vs night rhythm clash (MED)',
  when: (a, b) => {
    const aC = getSignal(a, 'chronotype');
    const bC = getSignal(b, 'chronotype');
    if (aC == null || bC == null) return false;
    return (aC >= 8 && bC <= 3) || (bC >= 8 && aC <= 3);
  },
  penalty: 3,
  explain:
    'One is a strong night owl, the other a strong early bird — daily rhythm may clash',
},
```

**Do not append** `physical_type_specificity_clash` in Story 3.

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `education_level_gap` | `|a−b| ≥ 5` **and** at least one ≥8 | **4** |
| `honesty_integrity_gap` | ≥8 vs ≤3 (symmetric) | **5** |
| `chronotype_clash` | ≥8 vs ≤3 (symmetric) | **3** |
| `physical_type_specificity_clash` | — | **Soft-skipped** |

### 2. Soft-skip physical-type clash (locked)

| Item | Decision |
|------|----------|
| Rule in `tensionRules` | **Absent** until category metadata exists |
| `TENSION_CHIP_BY_ID.physical_type_specificity_clash` | **Absent** |
| Score-gap fallback (both ≥7, gap ≥6) | **Forbidden** — README says not a clash by itself |
| `EnrichedSignals.physicalTypePreference` | **Still add** the field so future Story can wire clash without another allowlist pass |
| Follow-up | Story 5 / promote track or a later delta when category storage lands |

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `religiousObservance`:

```typescript
  /** Shadow Expansion-08 — from evaluationJson.self.signals when extracted. */
  educationLevel?: number | null;
  honestyIntegrity?: number | null;
  chronotype?: number | null;
  physicalTypePreference?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  education_level_gap: 'Education expectations',
  honesty_integrity_gap: 'Honesty values gap',
  chronotype_clash: 'Morning vs night',
```

Exact strings locked (match sprint README). Do **not** add `Physical type mismatch` yet.

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-08 | Distinction |
|---------------------|--------------|-------------|
| `intellectual_gap` / curiosity | `education_level_gap` | Mental stimulation ≠ formal credential priority |
| `lifestyle_pace_mismatch` | `chronotype_clash` | Busy vs calm tempo ≠ morning vs night sleep rhythm |
| `physical_priority_mismatch` | (future physical-type clash) | Looks importance ≠ body/build type conflict |
| `directness` / communication tensions | `honesty_integrity_gap` | Bluntness ≠ honesty/integrity as a core value |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort).

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |
| Race/ethnicity/anatomy-only | **No tension** — Exp-08 keys stay null → predicates false |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each of the three Exp-08 rules alone can surface a chip (penalties 3–5)
- If multiple fire, highest penalty wins label

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-08 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| education_level_gap fires | ed 9 / 3 (gap 6, one ≥8) | id + penalty **4** |
| education reverse | 3 / 9 | same |
| education null guard | 9 / `{}` | no fire |
| education gap 5 with one ≥8 | 8 / 3 | **fires** |
| education gap 4 | 8 / 4 | no fire |
| education both mid, gap ≥5 but neither ≥8 | 7 / 2 | no fire |
| honesty_integrity_gap fires | 9 / 2 | penalty **5** |
| honesty reverse | 2 / 9 | same |
| honesty null guard | 9 / `{}` | no fire |
| honesty below threshold | 7 / 4 | no fire |
| honesty boundary ≤3 | 8 / 3 | **fires** |
| chronotype_clash fires | 9 / 2 | penalty **3** |
| chronotype reverse | 2 / 9 | same |
| chronotype null guard | 9 / `{}` | no fire |
| chronotype below threshold | 7 / 4 | no fire |
| chronotype boundary ≤3 | 8 / 3 | **fires** |
| physical-type soft-skip | both physicalTypePreference 9 / 2 | **no** `physical_type_specificity_clash` id in matrix |

**`match-explainability.spec.ts`:**

- Assert three `TENSION_CHIP_BY_ID` strings exact
- Assert `physical_type_specificity_clash` **not** in map (optional explicit `not.toHaveProperty` / undefined)
- `buildMatchExplainability` smoke for `honesty_integrity_gap` friction 5 → `'Honesty values gap'`
- Optional smoke for `chronotype_clash` friction 3 → `'Morning vs night'`

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

No DTO shape changes. Existing fields may newly include Exp-08 rule ids / chip labels when rules fire.

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
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-08"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-08|Education expectations|Honesty values gap|Morning vs night"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with four Exp-08 optional fields (§3).
2. Append **three** rules after `religious_observance_gap` (§1) — exact ids/penalties/predicates.
3. Add **three** `TENSION_CHIP_BY_ID` entries (§4). Do **not** add physical-type clash rule or chip.
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, scoring promote, category storage, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-08-education-integrity-lifestyle/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-08 education/integrity/chronotype shadow tension rules

Story 3 — three friction rules + chip labels; physical-type clash soft-skipped.
```

---

## Agent 2 CR checklist

- [ ] Three rules present with exact ids, penalties, thresholds
- [ ] `physical_type_specificity_clash` **absent** (soft-skip)
- [ ] `EnrichedSignals` has all four Exp-08 fields
- [ ] Three `TENSION_CHIP_BY_ID` labels exact
- [ ] Null guards on all three rules
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n / category-helper drift
- [ ] No regex / text-inference changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries + soft-skip assert
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips for four signals + i18n EN/HE/ES (shadow overlay pattern).
- **Story 5:** Live / compare E2E; Hebrew fixtures; optional promote; physical-type clash remains deferred until categories.
- **Category follow-up:** When/if structured physical-type categories land, add `physical_type_specificity_clash` + chip `Physical type mismatch` in a dedicated story — not a score-gap fallback.

---

## Next agent

```text
--agent 1 expansion 08 story 3
```

**Notes:** Deterministic tension only — mirror Exp-07 Story 3 pattern with **three** rules. Soft-skip physical-type clash. Keep shadow / no promote.
