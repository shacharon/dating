# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **two** friction tension rules + English tension chip labels for Expansion-12 shadow signals. **No** compatibility scoring / positive chips / i18n / extraction changes.

---

## Summary

- Append **two** Expansion-12 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`listening_presence_gap`, `emotional_expression_gap`).
- Extend `EnrichedSignals` with `listeningPresence` + `emotionalExpression`.
- Add **two** English labels to `TENSION_CHIP_BY_ID`.
- Rules fire **only when required signals are non-null**.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips (`Feels heard` both-high listening; `Expressiveness match` aligned) / i18n / onboarding copy are **Story 4**.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{listeningPresence\|emotionalExpression}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-12 fields | **Not yet on `EnrichedSignals`** — Story 3 adds both |
| Last tension rule today | `both_high_jealousy` (Expansion-11) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-12 penalties **4 / 4**; each rule alone **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Adjacent tension | `empathy_gap` (`empathyCompassion`); affection / emotional-depth gaps — distinct from Exp-12 |
| Scale reminder | Listening high = more present; expression high = more outwardly expressive (Story 2 lock) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Two tension rules + two chip labels | **Ship both** in Story 3 (no soft-skip) |
| Positive chip both-high listening → Feels heard | **Story 4** — do **not** implement in Story 3 |
| Aligned expression → Expressiveness match | **Story 4** |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Chip labels resolve in explainability | **Yes** — English `TENSION_CHIP_BY_ID` only |
| Extraction / prompts | Stories 1–2 complete — **do not** edit |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+2 fields); append **2** rules after `both_high_jealousy` |
| `dating-api/src/matches/match-explainability.ts` | Add **2** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 2 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| Positive chips / Expansion-12 explainability overlay | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` / onboarding copy | Story 4 |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `both_high_jealousy`, preserve existing order:

```typescript
{
  id: 'listening_presence_gap',
  name: 'Listening presence gap (MED-HIGH)',
  when: (a, b) => {
    const aL = getSignal(a, 'listeningPresence');
    const bL = getSignal(b, 'listeningPresence');
    if (aL == null || bL == null) return false;
    return (aL >= 8 && bL <= 3) || (bL >= 8 && aL <= 3);
  },
  penalty: 4,
  explain:
    'One partner is highly attentive, the other may seem distracted — mismatch in feeling heard',
},
{
  id: 'emotional_expression_gap',
  name: 'Emotional expression gap (MED — "unmet expression" risk)',
  when: (a, b) => {
    const aE = getSignal(a, 'emotionalExpression');
    const bE = getSignal(b, 'emotionalExpression');
    if (aE == null || bE == null) return false;
    return (aE >= 8 && bE <= 3) || (bE >= 8 && aE <= 3);
  },
  penalty: 4,
  explain:
    'One partner expresses feelings openly and often, the other is more reserved — may feel unreciprocated',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `listening_presence_gap` | ≥8 vs ≤3 (symmetric) | **4** |
| `emotional_expression_gap` | ≥8 vs ≤3 (symmetric) | **4** |

### 2. Interaction notes (locked)

| Case | Behavior |
|------|----------|
| One 9 / one 2 on listening | **`listening_presence_gap` fires** |
| Both high / mid listening aligned | No listening gap |
| Both high listening (≥7) | No tension (positive chip → Story 4) |
| One 9 / one 2 on expression | **`emotional_expression_gap` fires** |
| Both reserved or both expressive aligned | No expression gap |
| Multiple Exp-12 rules | May fire together — penalties **stack** (clamped 0–10); highest penalty wins chip label (tie: existing sort order) |

Do **not** add mutual-exclusion logic beyond natural predicates. No third Exp-12 tension rule (unlike Exp-11 both-high).

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `jealousySecurity`:

```typescript
  /** Shadow Expansion-12 — from evaluationJson.self.signals when extracted. */
  listeningPresence?: number | null;
  emotionalExpression?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  listening_presence_gap: 'Different listening styles',
  emotional_expression_gap: 'Different expression styles',
```

Exact strings locked (match sprint README).

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-12 | Distinction |
|---------------------|--------------|-------------|
| `empathy_gap` (`empathyCompassion`) | `listening_presence_gap` | Caring/attunement ≠ behavioral attention/presence when partner speaks |
| Emotional-depth / vulnerability gaps | `emotional_expression_gap` | Capacity to feel/discuss deep emotion ≠ outward verbal expression frequency |
| Affection / touch gaps (`physicalAffectionStyle`) | `emotional_expression_gap` | Physical touch ≠ words-of-affirmation / saying feelings out loud |
| Exp-11 stress / jealousy | Exp-12 listening / expression | Stress pursue-withdraw / jealousy ≠ feeling heard / expressiveness |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort). When both Exp-12 rules fire (both penalty 4), existing tie-break / sort order decides which chip surfaces.

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each Exp-12 rule alone can surface a chip (penalty **4**)
- If multiple fire, highest penalty wins label

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-12 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| listening_presence_gap fires | listening 9 / 2 | id + penalty **4** |
| listening reverse | 2 / 9 | same |
| listening null guard | 9 / `{}` | no fire |
| listening below threshold | 7 / 4 | no fire |
| listening boundary ≤3 | 8 / 3 | **fires** |
| emotional_expression_gap fires | expression 9 / 2 | penalty **4** |
| expression reverse | 2 / 9 | same |
| expression null guard | 9 / `{}` | no fire |
| expression below threshold | 7 / 4 | no fire |
| expression boundary ≤3 | 8 / 3 | **fires** |

**`match-explainability.spec.ts`:**

- Assert two `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for `listening_presence_gap` friction 4 → `'Different listening styles'`
- Smoke for `emotional_expression_gap` friction 4 → `'Different expression styles'`

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

No DTO shape changes. Existing fields may newly include Exp-12 rule ids / chip labels when rules fire.

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
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-12"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-12|Different listening styles|Different expression styles"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `listeningPresence` + `emotionalExpression` (§3).
2. Append **two** rules after `both_high_jealousy` (§1) — exact ids/penalties/predicates/explains.
3. Add **two** `TENSION_CHIP_BY_ID` entries (§4).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, scoring promote, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-12-feeling-heard/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-12 listeningPresence and emotionalExpression shadow tension rules

Story 3 — two friction rules + English tension chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Two rules present with exact ids, penalties, thresholds
- [ ] `EnrichedSignals` has `listeningPresence` + `emotionalExpression`
- [ ] Two `TENSION_CHIP_BY_ID` labels exact
- [ ] Null guards on both rules
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n drift
- [ ] No regex / text-inference / extraction changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries for both rules
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Feels heard` both-high listening ≥7; `Expressiveness match` aligned) + i18n EN/HE/ES + onboarding prompt copy.
- **Story 5:** Live / compare E2E; Hebrew fixtures; >85%; optional promote.
- **Correlation risk:** monitor `listeningPresence` vs `empathyCompassion`; `emotionalExpression` vs `emotionalDepth` / `physicalAffectionStyle` — do not hardcode anti-correlation in Story 3.

---

## Next agent

```text
--agent 1 expansion 12 story 3
```

**Notes:** Deterministic tension only — mirror Exp-11 Story 3 pattern with **two** rules. Keep shadow / no promote. Both ship (no soft-skip). Positive chips stay Story 4.
