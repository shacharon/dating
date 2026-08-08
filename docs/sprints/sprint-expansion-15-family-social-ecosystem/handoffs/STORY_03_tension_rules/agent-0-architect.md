# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **three** friction tension rules + English tension chip labels for Expansion-15 shadow signals. **No** compatibility scoring / positive chips / i18n / extraction changes / Phase 6 promote-all.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (tension is deterministic; do not invent extraction heuristics)

---

## Summary

- Append **three** Expansion-15 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`family_enmeshment_gap`, `friend_couple_balance_gap`, `alone_time_need_gap`).
- Extend `EnrichedSignals` with `familyEnmeshment` + `friendCoupleBalance` + `aloneTimeNeed`.
- Add **three** English labels to `TENSION_CHIP_BY_ID`.
- Rules fire **only when required signals are non-null**.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips (`Family style match`, `Friends & couple balance`, `Recharge style match`) / i18n / onboarding copy are **Story 4**.
- Phase 6 full rollout / promote-all — **Story 5**; **not** built here.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{familyEnmeshment\|friendCoupleBalance\|aloneTimeNeed}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-15 fields | **Not yet on `EnrichedSignals`** — Story 3 adds all three |
| Last tension rule today | `monogamy_alignment_mismatch` (Expansion-14) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-15 penalties **4 / 3 / 3**; each rule alone **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Adjacent tension | `traditionalism_structure_gap` / `traditional_vs_high_pace`; `social_battery_mismatch`; `independence_mismatch` — distinct from Exp-15 |
| Scale reminder | Family high = more enmeshed; friendCoupleBalance **low = friends-first, high = couple-centric** (Story 2 polarity lock — do not invert); aloneTime high = stronger solo recharge need |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Three tension rules + three chip labels | **Ship all three** in Story 3 (no soft-skip) |
| Positive chips (Family style match / Friends & couple balance / Recharge style match) | **Story 4** — do **not** implement in Story 3 (same deferral as Exp-13/14 positives) |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Chip labels resolve in explainability | **Yes** — English `TENSION_CHIP_BY_ID` only |
| Phase 6 full rollout / promote-all | **Out of scope** Story 3 — Story 5 / future promote |
| Extraction / prompts | Stories 1–2 complete — **do not** edit |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+3 fields); append **3** rules after `monogamy_alignment_mismatch` |
| `dating-api/src/matches/match-explainability.ts` | Add **3** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 3 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| Positive chips / Expansion-15 explainability overlay / `SHADOW_POSITIVE_CHIP_BY_SIGNAL` | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` / onboarding copy | Story 4 |
| Phase 6 promote-all / correlation / A/B / backfill | Story 5 / operator |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `monogamy_alignment_mismatch`, preserve existing order:

```typescript
{
  id: 'family_enmeshment_gap',
  name: 'Family enmeshment gap (MED-HIGH)',
  when: (a, b) => {
    const aF = getSignal(a, 'familyEnmeshment');
    const bF = getSignal(b, 'familyEnmeshment');
    if (aF == null || bF == null) return false;
    return (aF >= 8 && bF <= 3) || (bF >= 8 && aF <= 3);
  },
  penalty: 4,
  explain:
    'One is very close/involved with family decisions, the other more independent — boundary expectations may clash',
},
{
  id: 'friend_couple_balance_gap',
  name: 'Friend vs couple time gap (MED)',
  when: (a, b) => {
    const aB = getSignal(a, 'friendCoupleBalance');
    const bB = getSignal(b, 'friendCoupleBalance');
    if (aB == null || bB == null) return false;
    return (aB >= 8 && bB <= 3) || (bB >= 8 && aB <= 3);
  },
  penalty: 3,
  explain:
    'One prioritizes couple time heavily, the other prioritizes friends — time allocation may cause friction',
},
{
  id: 'alone_time_need_gap',
  name: 'Alone time need gap (MED)',
  when: (a, b) => {
    const aA = getSignal(a, 'aloneTimeNeed');
    const bA = getSignal(b, 'aloneTimeNeed');
    if (aA == null || bA == null) return false;
    return (aA >= 8 && bA <= 3) || (bA >= 8 && aA <= 3);
  },
  penalty: 3,
  explain:
    'One needs significant solo recharge time, the other prefers constant togetherness',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `family_enmeshment_gap` | ≥8 vs ≤3 (symmetric) | **4** |
| `friend_couple_balance_gap` | ≥8 vs ≤3 (symmetric) | **3** |
| `alone_time_need_gap` | ≥8 vs ≤3 (symmetric) | **3** |

**Critical polarity note for `friend_couple_balance_gap`:** High band (≥8) = **couple-centric**; low band (≤3) = **friends-first**. Explain text must keep that meaning — do **not** invert.

### 2. Interaction notes (locked)

| Case | Behavior |
|------|----------|
| One 9 / one 2 on familyEnmeshment | **`family_enmeshment_gap` fires** |
| Both high / mid family aligned | No family gap |
| One 9 couple-centric / one 2 friends-first | **`friend_couple_balance_gap` fires** |
| Both couple-centric or both friends-first | No friend/couple gap |
| One 9 / one 2 on aloneTimeNeed | **`alone_time_need_gap` fires** |
| Both high / mid alone-time aligned | No alone-time gap |
| Multiple Exp-15 rules | May fire together — penalties **stack** (clamped 0–10); highest penalty wins chip label (tie: existing sort order) |

Do **not** add mutual-exclusion logic beyond natural predicates. Do **not** invent extra rules (e.g. both-low alone-time, both-enmeshed) — README only ships these three.

When family gap (4) fires with friend/couple or alone-time gaps (3), **family chip wins** among Exp-15 peers unless a higher-penalty peer (≥4 from other expansions, or Exp-14 monogamy **8**) also fires.

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `monogamyAlignment`:

```typescript
  /** Shadow Expansion-15 — from evaluationJson.self.signals when extracted. */
  familyEnmeshment?: number | null;
  friendCoupleBalance?: number | null;
  aloneTimeNeed?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  family_enmeshment_gap: 'Family involvement gap',
  friend_couple_balance_gap: 'Friends vs couple time',
  alone_time_need_gap: 'Different alone-time needs',
```

Exact strings locked (match sprint README **Tension chips**).

**Do not confuse with:**

| Layer | String |
|-------|--------|
| Story 1 meta chip (`familyEnmeshment`) | `Family closeness` |
| Story 3 tension chip (gap) | `Family involvement gap` |
| Story 4 browse positive | `Family style match` |
| Story 1 meta / Story 4 browse (`friendCoupleBalance`) | `Friends & couple balance` (same string OK for meta/browse; tension is `Friends vs couple time`) |
| Story 1 meta (`aloneTimeNeed`) | `Alone time needs` |
| Story 3 tension | `Different alone-time needs` |
| Story 4 browse | `Recharge style match` |

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-15 | Distinction |
|---------------------|--------------|-------------|
| `traditionalism_structure_gap` / `traditional_vs_high_pace` | `family_enmeshment_gap` | Marriage/kids/traditional life-path ≠ day-to-day family-of-origin involvement/boundaries |
| `social_battery_mismatch` | `friend_couple_balance_gap` | Social-energy capacity ≠ friends-vs-couple *where* time goes |
| `independence_mismatch` | `alone_time_need_gap` | General autonomy/fusion ≠ specifically solo recharge need |
| Exp-14 patience / pacing / monogamy | Exp-15 family / friends-couple / alone-time | Orthogonal axes |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort).

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |
| Phase 6 promote-all | **None** this story |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each Exp-15 rule alone can surface a chip (penalties **4**, **3**, and **3**)
- If multiple fire, highest penalty wins label — family gap (**4**) dominates Exp-15 peers; Exp-14 monogamy (**8**) still dominates if also firing

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-15 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| family_enmeshment_gap fires | family 9 / 2 | id + penalty **4** |
| family reverse | 2 / 9 | same |
| family null guard | 9 / `{}` | no fire |
| family below threshold | 7 / 4 | no fire |
| family boundary ≤3 | 8 / 3 | **fires** |
| friend_couple_balance_gap fires | balance 9 / 2 | penalty **3** |
| friend/couple reverse | 2 / 9 | same |
| friend/couple null guard | 9 / `{}` | no fire |
| friend/couple below threshold | 7 / 4 | no fire |
| friend/couple boundary ≤3 | 8 / 3 | **fires** |
| alone_time_need_gap fires | alone 9 / 2 | penalty **3** |
| alone reverse | 2 / 9 | same |
| alone null guard | 9 / `{}` | no fire |
| alone below threshold | 7 / 4 | no fire |
| alone boundary ≤3 | 8 / 3 | **fires** |
| both high family aligned | 9 / 8 | **no fire** |
| both low friends-first aligned | 2 / 1 | **no fire** on friend_couple_balance_gap |

**`match-explainability.spec.ts`:**

- Assert three `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for `family_enmeshment_gap` friction 4 → `'Family involvement gap'`
- Smoke for `friend_couple_balance_gap` friction 3 → `'Friends vs couple time'`
- Smoke for `alone_time_need_gap` friction 3 → `'Different alone-time needs'`

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

No DTO shape changes. Existing fields may newly include Exp-15 rule ids / chip labels when rules fire.

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
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-15"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-15|Family involvement gap|Friends vs couple time|Different alone-time needs"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `familyEnmeshment` + `friendCoupleBalance` + `aloneTimeNeed` (§3).
2. Append **three** rules after `monogamy_alignment_mismatch` (§1) — exact ids/penalties/predicates/explains.
3. Add **three** `TENSION_CHIP_BY_ID` entries (§4).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, Phase 6 promote-all, scoring promote, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-15-family-social-ecosystem/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-15 family social ecosystem shadow tension rules

Story 3 — three friction rules + English tension chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Three rules present with exact ids, penalties, thresholds (≥8 vs ≤3 for all three)
- [ ] `friend_couple_balance_gap` polarity: high = couple-centric / low = friends-first (explain text not inverted)
- [ ] `EnrichedSignals` has `familyEnmeshment` + `friendCoupleBalance` + `aloneTimeNeed`
- [ ] Three `TENSION_CHIP_BY_ID` labels exact (`Family involvement gap`, `Friends vs couple time`, `Different alone-time needs`)
- [ ] Null guards on all three rules
- [ ] No invented extra rules / positive chips / Phase 6 promote-all
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / i18n drift
- [ ] No regex / text-inference / extraction changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries for all three rules
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Family style match`; `Friends & couple balance` dual-band; `Recharge style match`) + i18n EN/HE/ES + onboarding prompt copy + domain diversity wiring.
- **Story 5:** Live / compare E2E; Hebrew fixtures; >85%; Phase 6 full rollout checklist; optional promote.
- **Correlation risk:** monitor family vs traditionalism; friend/couple vs socialBattery; alone-time vs independence — do not hardcode anti-correlation in Story 3.

---

## Next agent

```text
--agent 1 expansion 15 story 3
```

**Notes:** Deterministic tension only — mirror Exp-14 Story 3 pattern with **three** high-vs-low gap rules (all ≥8 vs ≤3). Keep shadow / no promote. All three ship (no soft-skip). Positive chips stay Story 4. `friendCoupleBalance` polarity: low = friends-first, high = couple-centric.
