# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **three** friction tension rules + English tension chip labels for Expansion-11 shadow signals. **No** compatibility scoring / positive chips / i18n / extraction changes.

---

## Summary

- Append **three** Expansion-11 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`stress_response_clash`, `jealousy_security_gap`, `both_high_jealousy`).
- Extend `EnrichedSignals` with `stressResponse` + `jealousySecurity`.
- Add **three** English labels to `TENSION_CHIP_BY_ID`.
- Rules fire **only when required signals are non-null**.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips (`Support under pressure`, both-low `Secure & trusting`) / i18n / onboarding copy are **Story 4**.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{stressResponse\|jealousySecurity}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-11 fields | **Not yet on `EnrichedSignals`** — Story 3 adds both |
| Last tension rule today | `forgiveness_style_gap` (Expansion-10) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-11 penalties **5 / 5 / 3**; each rule alone **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Adjacent tension | `emotional_volatility_gap` (`emotionalRegulation`); attachment / independence tensions — distinct from Exp-11 |
| Polarity reminder | `jealousySecurity` **high = more jealous** (Story 2 lock) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Three tension rules + three chip labels | **Ship all three** in Story 3 (no soft-skip) |
| Positive chip both-low jealousy → Secure & trusting | **Story 4** — do **not** implement in Story 3 |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Chip labels resolve in explainability | **Yes** — English `TENSION_CHIP_BY_ID` only |
| Extraction / prompts | Stories 1–2 complete — **do not** edit |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+2 fields); append **3** rules after `forgiveness_style_gap` |
| `dating-api/src/matches/match-explainability.ts` | Add **3** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 3 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| Positive chips / Expansion-11 explainability overlay | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` / onboarding copy | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `forgiveness_style_gap`, preserve existing order:

```typescript
{
  id: 'stress_response_clash',
  name: 'Pursue vs withdraw under stress (HIGH — classic pursuer-distancer)',
  when: (a, b) => {
    const aS = getSignal(a, 'stressResponse');
    const bS = getSignal(b, 'stressResponse');
    if (aS == null || bS == null) return false;
    return (aS >= 8 && bS <= 3) || (bS >= 8 && aS <= 3);
  },
  penalty: 5,
  explain:
    'One seeks closeness under stress, the other needs space — can create a pursue/withdraw cycle',
},
{
  id: 'jealousy_security_gap',
  name: 'Jealousy vs independence clash (MED-HIGH)',
  when: (a, b) => {
    const aJ = getSignal(a, 'jealousySecurity');
    const bJ = getSignal(b, 'jealousySecurity');
    if (aJ == null || bJ == null) return false;
    return (aJ >= 8 && bJ <= 3) || (bJ >= 8 && aJ <= 3);
  },
  penalty: 5,
  explain:
    'One tends toward jealousy/reassurance-seeking, the other values high independence and trust without check-ins',
},
{
  id: 'both_high_jealousy',
  name: 'Both high jealousy (MED)',
  when: (a, b) => {
    const aJ = getSignal(a, 'jealousySecurity');
    const bJ = getSignal(b, 'jealousySecurity');
    if (aJ == null || bJ == null) return false;
    return aJ >= 8 && bJ >= 8;
  },
  penalty: 3,
  explain:
    'Both partners lean jealous/possessive — may amplify insecurity dynamics',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `stress_response_clash` | ≥8 vs ≤3 (symmetric) | **5** |
| `jealousy_security_gap` | ≥8 vs ≤3 (symmetric) | **5** |
| `both_high_jealousy` | both ≥8 | **3** |

### 2. Interaction notes (locked)

| Case | Behavior |
|------|----------|
| Both ≥8 on jealousy | **`both_high_jealousy` fires**; `jealousy_security_gap` does **not** (gap predicate needs one ≤3) |
| One 9 / one 2 on jealousy | **`jealousy_security_gap` only** |
| Both low jealousy (≤3) | Neither jealousy **tension** rule fires (positive chip → Story 4) |
| Both high / mid stress aligned | No `stress_response_clash` |
| Multiple Exp-11 rules | May fire together (e.g. stress clash + jealousy gap) — penalties **stack** (clamped 0–10); highest penalty wins chip label |

Do **not** add mutual-exclusion logic beyond natural predicate exclusivity.

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `forgivenessStyle`:

```typescript
  /** Shadow Expansion-11 — from evaluationJson.self.signals when extracted. */
  stressResponse?: number | null;
  jealousySecurity?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  stress_response_clash: 'Pursue vs withdraw under stress',
  jealousy_security_gap: 'Trust & space mismatch',
  both_high_jealousy: 'Shared jealousy risk',
```

Exact strings locked (match sprint README).

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-11 | Distinction |
|---------------------|--------------|-------------|
| `emotional_volatility_gap` (`emotionalRegulation`) | `stress_response_clash` | Reactivity/steadiness ≠ pursue vs withdraw direction under stress |
| Attachment / fusion / independence tensions | `jealousy_security_gap` / `both_high_jealousy` | Closeness/autonomy ≠ jealousy/possessiveness specifically |
| Exp-10 repair / forgiveness | Exp-11 stress / jealousy | Post-conflict recovery ≠ stress-time support-seeking or jealousy |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort). When stress clash (5) and both-high jealousy (3) both fire, chip = stress label.

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each of the three Exp-11 rules alone can surface a chip (penalties 5 / 5 / 3)
- If multiple fire, highest penalty wins label

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-11 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| stress_response_clash fires | stress 9 / 2 | id + penalty **5** |
| stress reverse | 2 / 9 | same |
| stress null guard | 9 / `{}` | no fire |
| stress below threshold | 7 / 4 | no fire |
| stress boundary ≤3 | 8 / 3 | **fires** |
| jealousy_security_gap fires | jealousy 9 / 2 | penalty **5** |
| jealousy reverse | 2 / 9 | same |
| jealousy null guard | 9 / `{}` | no fire |
| jealousy below threshold | 7 / 4 | no fire |
| jealousy boundary ≤3 | 8 / 3 | **fires** |
| both_high_jealousy fires | 8 / 9 | penalty **3** |
| both_high boundary | 8 / 8 | **fires** |
| both_high null guard | 9 / `{}` | no fire |
| both_high one below | 8 / 7 | no fire |
| both_high does not also fire gap | 9 / 9 | `both_high_jealousy` yes; `jealousy_security_gap` **no** |

**`match-explainability.spec.ts`:**

- Assert three `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for `stress_response_clash` friction 5 → `'Pursue vs withdraw under stress'`
- Smoke for `jealousy_security_gap` friction 5 → `'Trust & space mismatch'`
- Smoke for `both_high_jealousy` friction 3 → `'Shared jealousy risk'`

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

No DTO shape changes. Existing fields may newly include Exp-11 rule ids / chip labels when rules fire.

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
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-11"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-11|Pursue vs withdraw|Trust & space mismatch|Shared jealousy risk"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `stressResponse` + `jealousySecurity` (§3).
2. Append **three** rules after `forgiveness_style_gap` (§1) — exact ids/penalties/predicates/explains.
3. Add **three** `TENSION_CHIP_BY_ID` entries (§4).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, scoring promote, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-11-stress-security/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-11 stressResponse and jealousySecurity shadow tension rules

Story 3 — three friction rules + English tension chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Three rules present with exact ids, penalties, thresholds
- [ ] `EnrichedSignals` has `stressResponse` + `jealousySecurity`
- [ ] Three `TENSION_CHIP_BY_ID` labels exact
- [ ] Null guards on all three rules
- [ ] `both_high_jealousy` and `jealousy_security_gap` correctly non-overlapping on both-high inputs
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n drift
- [ ] No regex / text-inference / extraction changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries + both-high exclusivity
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Support under pressure` aligned; both-low `Secure & trusting`) + i18n EN/HE/ES + onboarding prompt copy.
- **Story 5:** Live / compare E2E; Hebrew fixtures; >85%; optional promote.
- **Correlation risk:** monitor `stressResponse` vs `emotionalRegulation` / `attachmentSecurity`; `jealousySecurity` vs `independence` — do not hardcode anti-correlation in Story 3.

---

## Next agent

```text
--agent 1 expansion 11 story 3
```

**Notes:** Deterministic tension only — mirror Exp-10 Story 3 pattern with **three** rules. Keep shadow / no promote. All three ship (no soft-skip). Positive chips stay Story 4.
