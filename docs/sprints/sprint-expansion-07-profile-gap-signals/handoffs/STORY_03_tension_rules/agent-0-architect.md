# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add five friction tension rules + English tension chip labels for Expansion-07 shadow signals. **No** compatibility scoring / positive chips / i18n / interest overlap.

---

## Summary

- Append **five** Expansion-07 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README.
- Extend `EnrichedSignals` so `getSignal()` can read all five Profile Gap keys from `evaluationJson.self.signals` (already spread via `applyKeywordTriggers`).
- Add five English labels to `TENSION_CHIP_BY_ID` in `match-explainability.ts`.
- Rules fire **only when required signals are non-null** — no impact on legacy profiles until re-analyzed.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- **Positive** pair chips (`Financial support alignment` / `Non-transactional match`) are **Story 4** — not this story (even though README embeds helper under Story 3).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{casualIntimacyIntent\|support*\|religiousObservance}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-07 fields | **Not yet on `EnrichedSignals`** — Story 3 adds all five |
| Last tension rule today | `novelty_routine_clash` (Expansion-06) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| UI | Displays `explainability.tensionChip` string from API as-is (English) until Story 4 i18n |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Friction chip gate | `friction >= 3` required for `tensionChip` — all Exp-07 penalties are **≥4** so each can surface alone |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Five tension rules + chip labels | **In scope** Story 3 |
| `hasSupportAlignment` / positive pair chips | **Story 4** — do not implement in Story 3 |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Interest overlap | **Story 4** |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+5 fields); append 5 rules after `novelty_routine_clash` |
| `dating-api/src/matches/match-explainability.ts` | Add 5 `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for all 5 ids |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| `matches/expansion-07-explainability.ts` | Story 4 (positive / pair / interest chips) |
| `POSITIVE_CHIP_BY_SIGNAL` / pair `hasSupportAlignment` | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Interest tag registries | Story 4 |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `novelty_routine_clash`, preserve existing order:

```typescript
{
  id: 'casual_intimacy_clash',
  name: 'Casual vs committed intimacy clash (HIGH)',
  when: (a, b) => {
    const aCas = getSignal(a, 'casualIntimacyIntent');
    const bCas = getSignal(b, 'casualIntimacyIntent');
    if (aCas == null || bCas == null) return false;
    return (aCas >= 8 && bCas <= 3) || (bCas >= 8 && aCas <= 3);
  },
  penalty: 6,
  explain:
    'One seeks casual physical intimacy, the other needs commitment before intimacy',
},
{
  id: 'support_exchange_mismatch',
  name: 'Support exchange mismatch (HIGH)',
  when: (a, b) => {
    const aSup = getSignal(a, 'supportExchangeOrientation');
    const bSup = getSignal(b, 'supportExchangeOrientation');
    if (aSup == null || bSup == null) return false;
    return (aSup >= 8 && bSup <= 3) || (bSup >= 8 && aSup <= 3);
  },
  penalty: 6,
  explain:
    'One seeks a support/arrangement dynamic, the other wants a non-transactional relationship',
},
{
  id: 'support_both_provider',
  name: 'Both want to provide support (MED)',
  when: (a, b) => {
    const aEx = getSignal(a, 'supportExchangeOrientation');
    const bEx = getSignal(b, 'supportExchangeOrientation');
    const aProv = getSignal(a, 'supportProviderOrientation');
    const bProv = getSignal(b, 'supportProviderOrientation');
    if (aEx == null || bEx == null || aProv == null || bProv == null)
      return false;
    if (aEx < 7 || bEx < 7) return false; // only when both open to exchange
    return aProv >= 7 && bProv >= 7;
  },
  penalty: 4,
  explain:
    'You both want to be the one providing financial support — roles may clash',
},
{
  id: 'support_both_recipient',
  name: 'Both seek financial support (MED)',
  when: (a, b) => {
    const aEx = getSignal(a, 'supportExchangeOrientation');
    const bEx = getSignal(b, 'supportExchangeOrientation');
    const aRec = getSignal(a, 'supportRecipientOrientation');
    const bRec = getSignal(b, 'supportRecipientOrientation');
    if (aEx == null || bEx == null || aRec == null || bRec == null)
      return false;
    if (aEx < 7 || bEx < 7) return false;
    return aRec >= 7 && bRec >= 7;
  },
  penalty: 4,
  explain:
    'You both seek financial support from a partner — expectations may not align',
},
{
  id: 'religious_observance_gap',
  name: 'Religious observance gap (MED-HIGH)',
  when: (a, b) => {
    const aRel = getSignal(a, 'religiousObservance');
    const bRel = getSignal(b, 'religiousObservance');
    if (aRel == null || bRel == null) return false;
    const gap = Math.abs(aRel - bRel);
    return gap >= 6 && (aRel >= 7 || bRel >= 7);
  },
  penalty: 5,
  explain:
    'Very different levels of religious practice — may affect daily life compatibility',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `casual_intimacy_clash` | ≥8 vs ≤3 (symmetric) | **6** |
| `support_exchange_mismatch` | ≥8 vs ≤3 (symmetric) | **6** |
| `support_both_provider` | both exchange ≥7 **and** both provider ≥7 | **4** |
| `support_both_recipient` | both exchange ≥7 **and** both recipient ≥7 | **4** |
| `religious_observance_gap` | `|a−b| ≥ 6` **and** at least one ≥7 | **5** |

Do **not** invent additional rules (e.g. provider↔recipient “good” alignment is a **positive** Story 4 chip, not a tension).

### 2. `EnrichedSignals` extension (locked)

Add optional fields after `adventureNovelty`:

```typescript
/** Shadow Expansion-07 — from evaluationJson.self.signals when extracted. */
casualIntimacyIntent?: number | null;
supportExchangeOrientation?: number | null;
supportProviderOrientation?: number | null;
supportRecipientOrientation?: number | null;
religiousObservance?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 3. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
casual_intimacy_clash: 'Casual vs committed intimacy',
support_exchange_mismatch: 'Arrangement vs romance',
support_both_provider: 'Both want to provide',
support_both_recipient: 'Both seek support',
religious_observance_gap: 'Religious practice gap',
```

Exact strings locked (match sprint README). `KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 4. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-07 | Distinction |
|---------------------|--------------|-------------|
| `relationship_clarity` / commitment tensions | `casual_intimacy_clash` | Labels/exclusivity ≠ casual vs committed **intimacy** boundary |
| `physical_priority` mismatch | `casual_intimacy_clash` | Looks importance ≠ hookup vs committed-only stance |
| Financial / status rules | `support_*` | Save/spend/status ≠ arrangement openness or give/receive direction |
| Spirituality (if any) | `religious_observance_gap` | Inner meaning ≠ practical ritual practice gap |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort). Exp-07 HIGH rules (penalty **6**) outrank Exp-06 (`novelty_routine_clash` = 4) when both fire.

### 5. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |

### 6. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each Exp-07 rule alone can surface a chip (penalties 4–6)
- If multiple fire, highest penalty wins label

### 7. Agent 4

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

No DTO shape changes. Existing fields may newly include Exp-07 rule ids / chip labels when rules fire.

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-07"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-07|casual_intimacy|Arrangement vs romance|Religious practice gap"
npm run typecheck
```

### Minimum unit tests

**`compute-friction.spec.ts`** — `describe('Expansion-07 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| casual_intimacy_clash fires | cas 9 / 2 | id + penalty **6** |
| casual reverse | 2 / 9 | same |
| casual null guard | 9 / `{}` | no fire |
| casual below threshold | 7 / 4 | no fire |
| casual boundary ≤3 | 8 / 3 | **fires** |
| support_exchange_mismatch fires | exch 9 / 2 | penalty **6** |
| exchange null / below | | no fire |
| support_both_provider fires | both exch 8, both prov 8 | penalty **4** |
| both_provider blocked when exch mid | exch 5/5, prov 9/9 | no fire |
| both_provider null guard | missing prov | no fire |
| support_both_recipient fires | both exch 8, both rec 8 | penalty **4** |
| both_recipient blocked when exch mid | | no fire |
| religious_observance_gap fires | 9 / 2 (gap 7) | penalty **5** |
| religious gap exactly 6 with one ≥7 | 8 / 2 | **fires** |
| religious gap 5 | 9 / 4 | no fire |
| religious both mid, gap ≥6 but neither ≥7 | 6 / 0 invalid — use 6 / 1 if valid ints, or 6 vs null | if both &lt;7 even with large gap → **no fire** (e.g. 6 vs 0 not valid scale; use **6 vs 1** only if 1 is allowed — prefer **assert `6` vs null** no; and **6 vs 1` with gap 5** no; dedicated case: **6 vs 1` gap 5**; case **neither ≥7**: construct via **5 vs 1` gap 4**; better: **`aRel: 6, bRel: 1`** gap 5 no; for neither≥7 with gap≥6 impossible on 1–10 if max of pair &lt;7 and gap≥6 ⇒ other ≤0. So use **`aRel: 6, bRel: 0`** if 0 never appears — instead document: **`aRel: 6, bRel: 1`** does not fire (gap 5). Add **`aRel: 9, bRel: 4`** gap 5 no. Null: **9 / {}** no. |

Simplify religious neither≥7: on 1–10 scale, if both &lt;7, max gap with both ≤6 is 5 (6−1). So “neither ≥7” with gap≥6 is **impossible**. Skip that case; rely on gap&lt;6 and null/below tests.

**`match-explainability.spec.ts`:**

- Assert all five `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for highest-penalty id (`casual_intimacy_clash` friction 6 → chip `'Casual vs committed intimacy'`)
- Optional second smoke for `religious_observance_gap` → `'Religious practice gap'`

Optional: `match-engine.spec.ts` E2E — Story 5.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with five Exp-07 optional fields (§2).
2. Append five rules after `novelty_routine_clash` (§1) — exact ids/penalties/predicates.
3. Add five `TENSION_CHIP_BY_ID` entries (§3).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive support alignment, overlay modules, i18n, scoring promote, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-07-profile-gap-signals/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-07 profile-gap shadow tension rules

Story 3 — five friction rules + chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Five rules present with exact ids, penalties, thresholds
- [ ] `EnrichedSignals` has all five Exp-07 fields
- [ ] Five `TENSION_CHIP_BY_ID` labels exact
- [ ] Null guards / exchange≥7 gate for both-provider/recipient
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n drift
- [ ] No regex / text-inference changes
- [ ] Unit tests cover fire / reverse / null / below / key boundaries
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (standalone + pair support alignment + interest overlap) + i18n.
- **Story 5:** Live / compare E2E with extracted shadow values; stacking behavior with Exp-06 rules.

---

## Next agent

```text
--agent 1 expansion 07 story 3
```

**Notes:** Deterministic tension only — mirror Exp-05/06 Story 3 pattern. Keep shadow / no promote. Positive `hasSupportAlignment` waits for Story 4.
