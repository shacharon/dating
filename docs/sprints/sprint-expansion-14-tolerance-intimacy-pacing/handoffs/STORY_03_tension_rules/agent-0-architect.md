# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** Add **three** friction tension rules + English tension chip labels for Expansion-14 shadow signals. **No** compatibility scoring / positive chips / i18n / extraction changes.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (tension is deterministic; do not invent extraction heuristics)

---

## Summary

- Append **three** Expansion-14 rules to `tension-rules.ts` with locked thresholds/penalties from sprint README (`patience_tolerance_gap`, `intimacy_pacing_clash`, `monogamy_alignment_mismatch`).
- Extend `EnrichedSignals` with `patienceTolerance` + `intimacyPacing` + `monogamyAlignment`.
- Add **three** English labels to `TENSION_CHIP_BY_ID`.
- Rules fire **only when required signals are non-null**.
- Friction penalties **do** affect `finalScore` when rules fire; compatibility breakdown unchanged (keys still not in `COMPATIBILITY_SIGNAL_KEYS`).
- Positive chips (`Patience match`, `Pace of closeness` aligned, `Aligned on relationship structure`) / i18n / onboarding copy are **Story 4**.
- Holy-Grail hard filter for extreme monogamy mismatch — **product flag only**; **not** built here.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Friction pipeline | `derive-contexts` → `applyKeywordTriggers(signals, texts)` → `computeFriction(enrichedA, enrichedB)` → `tensionRules` |
| Signal source | `profile.evaluation.self.signals.{patienceTolerance\|intimacyPacing\|monogamyAlignment}` after Stories 1–2 |
| `EnrichedSignals` | Explicit interface; `{ ...signals }` spread — new keys need interface fields for typed `getSignal` |
| Current Exp-14 fields | **Not yet on `EnrichedSignals`** — Story 3 adds all three |
| Last tension rule today | `both_low_self_awareness` (Expansion-13) |
| Explainability | `topTensionChip(friction, tensionMatrix)` maps rule `id` → label via `TENSION_CHIP_BY_ID` |
| Friction chip gate | `friction >= 3` required for `tensionChip` — Exp-14 penalties **3 / 4 / 8**; each rule alone **can** surface |
| Compatibility | Keys **not** in `COMPATIBILITY_SIGNAL_KEYS` (Story 1 lock) |
| Adjacent tension | `casual_intimacy_clash` (`casualIntimacyIntent`); `relationship_clarity_flow_gap` (`relationshipClarity`); conflict-style gaps — distinct from Exp-14 |
| Scale reminder | Patience high = more tolerant; pacing high = faster to closeness; monogamy **low = mono / exclusive, high = open/poly** (Story 2 polarity lock — do not invert) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Three tension rules + three chip labels | **Ship all three** in Story 3 (no soft-skip) |
| Positive chip aligned monogamy → Aligned on relationship structure | **Story 4** — do **not** implement in Story 3 (same deferral as Exp-13 positives) |
| Patience / pacing aligned browse positives | **Story 4** |
| Wire into `COMPATIBILITY_SIGNAL_KEYS` | **Forbidden** — shadow lock |
| Chip labels resolve in explainability | **Yes** — English `TENSION_CHIP_BY_ID` only |
| HG-style hard filter for extreme monogamy mismatch | **Out of scope** — product discussion only; do not build |
| Extraction / prompts | Stories 1–2 complete — **do not** edit |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | Extend `EnrichedSignals` (+3 fields); append **3** rules after `both_low_self_awareness` |
| `dating-api/src/matches/match-explainability.ts` | Add **3** `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | Unit tests per §8 |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip label resolution for the 3 ids + smoke |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Shadow lock |
| Positive chips / Expansion-14 explainability overlay / `SHADOW_POSITIVE_CHIP_BY_SIGNAL` | Story 4 |
| i18n `en.ts` / `he.ts` / `es.ts` / onboarding copy | Story 4 |
| Holy-Grail hard filter / admission gate for monogamy | Later product story |
| `extraction/*` | Stories 1–2 complete |
| `engine/signal-post-processing/text-inference.ts` | No new regex |
| Prisma / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Rule definitions (locked — from sprint README)

Append to `tensionRules` **after** `both_low_self_awareness`, preserve existing order:

```typescript
{
  id: 'patience_tolerance_gap',
  name: 'Patience/tolerance gap (MED)',
  when: (a, b) => {
    const aP = getSignal(a, 'patienceTolerance');
    const bP = getSignal(b, 'patienceTolerance');
    if (aP == null || bP == null) return false;
    return (aP >= 8 && bP <= 3) || (bP >= 8 && aP <= 3);
  },
  penalty: 3,
  explain:
    'One is highly tolerant of quirks and flaws, the other more critical — daily friction likely',
},
{
  id: 'intimacy_pacing_clash',
  name: 'Intimacy pacing clash (MED-HIGH)',
  when: (a, b) => {
    const aI = getSignal(a, 'intimacyPacing');
    const bI = getSignal(b, 'intimacyPacing');
    if (aI == null || bI == null) return false;
    return (aI >= 8 && bI <= 3) || (bI >= 8 && aI <= 3);
  },
  penalty: 4,
  explain:
    'One moves quickly toward closeness, the other prefers to take things slow',
},
{
  id: 'monogamy_alignment_mismatch',
  name: 'Monogamy alignment mismatch (HIGH — structural dealbreaker territory)',
  when: (a, b) => {
    const aM = getSignal(a, 'monogamyAlignment');
    const bM = getSignal(b, 'monogamyAlignment');
    if (aM == null || bM == null) return false;
    return (aM <= 2 && bM >= 8) || (bM <= 2 && aM >= 8);
  },
  penalty: 8,
  explain:
    'One expects strict exclusivity, the other seeks an open/non-monogamous structure',
},
```

**Thresholds (locked):**

| Rule | Condition | Penalty |
|------|-----------|---------|
| `patience_tolerance_gap` | ≥8 vs ≤3 (symmetric) | **3** |
| `intimacy_pacing_clash` | ≥8 vs ≤3 (symmetric) | **4** |
| `monogamy_alignment_mismatch` | ≤2 vs ≥8 (symmetric) | **8** |

**Critical polarity note:** For `monogamy_alignment_mismatch`, low band (≤2) = **strict mono/exclusive**; high band (≥8) = **open/poly**. Do **not** invert the predicate or explain text.

**Do not** soften monogamy low threshold to ≤3 — README uses **≤2** intentionally (stricter than typical gap rules).

### 2. Interaction notes (locked)

| Case | Behavior |
|------|----------|
| One 9 / one 2 on patience | **`patience_tolerance_gap` fires** |
| Both high / mid patience aligned | No patience gap |
| One 9 / one 2 on pacing | **`intimacy_pacing_clash` fires** |
| Both high / mid pacing aligned | No pacing clash |
| One ≤2 mono / one ≥8 open | **`monogamy_alignment_mismatch` fires** |
| Both mono (≤2) or both open (≥7) | No monogamy mismatch (aligned positive chip → Story 4) |
| Monogamy mid (5–6) vs extreme | **No fire** unless other side meets ≤2 / ≥8 pair |
| Multiple Exp-14 rules | May fire together — penalties **stack** (clamped 0–10); highest penalty wins chip label (tie: existing sort order) |

Do **not** add mutual-exclusion logic beyond natural predicates. Do **not** invent extra rules (e.g. both-low patience, both-fast pacing) — README only ships these three.

When monogamy mismatch (8) fires with pacing clash (4) and/or patience gap (3), **monogamy chip wins** unless another ≥8 peer also fires.

### 3. `EnrichedSignals` extension (locked)

Add optional fields after `selfAwareness`:

```typescript
  /** Shadow Expansion-14 — from evaluationJson.self.signals when extracted. */
  patienceTolerance?: number | null;
  intimacyPacing?: number | null;
  monogamyAlignment?: number | null;
```

No changes to `applyKeywordTriggers` — shadow values already flow via `{ ...signals }`.

Partner-domain extracted values are **not** used by friction today (pipeline reads self signals) — same as prior expansions. Do not change that in Story 3.

### 4. Tension chip labels (locked)

In `match-explainability.ts` `TENSION_CHIP_BY_ID`:

```typescript
  patience_tolerance_gap: 'Different tolerance levels',
  intimacy_pacing_clash: 'Different pace to closeness',
  monogamy_alignment_mismatch: 'Relationship structure mismatch',
```

Exact strings locked (match sprint README **Tension chips**).

**Do not confuse with:**

| Layer | String |
|-------|--------|
| Story 1 meta chip (`monogamyAlignment`) | `Relationship structure` |
| Story 3 tension chip (mismatch) | `Relationship structure mismatch` |
| Story 4 browse positive | `Aligned on relationship structure` |

`KNOWN_TENSION_CHIP_LABELS` updates via `Object.values(TENSION_CHIP_BY_ID)`.

### 5. Distinct from existing rules (locked)

| Existing / adjacent | Expansion-14 | Distinction |
|---------------------|--------------|-------------|
| Conflict-style / during-fight gaps | `patience_tolerance_gap` | Fight behavior ≠ day-to-day tolerance for quirks outside fights |
| Regulation / calm-under-stress gaps | `patience_tolerance_gap` | Own reactivity ≠ tolerance threshold for partner's imperfections |
| `casual_intimacy_clash` (`casualIntimacyIntent`) | `intimacy_pacing_clash` | Casual vs committed *type* ≠ *speed* to closeness |
| `relationship_clarity_flow_gap` (`relationshipClarity`) | `monogamy_alignment_mismatch` | Labels/approach clarity ≠ exclusive-vs-open/poly *structure* |
| Exp-13 growth / awareness | Exp-14 patience / pacing / monogamy | Orthogonal axes |

Multiple rules **may fire together** — penalties stack (clamped 0–10). Do not dedupe. Highest penalty wins chip label (existing sort).

### 6. Shadow mode + scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility breakdown | **None** — keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Friction / tensionMatrix | **Yes** when predicates pass |
| `finalScore` | Reduced by friction penalties when rules fire |
| Profiles without shadow keys | **Unchanged** — null guards |
| HG hard filter / admission | **None** this story |

### 7. Explainability display (locked)

- `friction >= 3` required for `tensionChip`
- Each Exp-14 rule alone can surface a chip (penalties **3**, **4**, and **8**)
- If multiple fire, highest penalty wins label — monogamy mismatch (**8**) dominates Exp-14 peers

### 8. Tests (agent 1 minimum)

Add to `compute-friction.spec.ts` — `describe('Expansion-14 shadow tension rules')`:

| Case | Inputs | Expect |
|------|--------|--------|
| patience_tolerance_gap fires | patience 9 / 2 | id + penalty **3** |
| patience reverse | 2 / 9 | same |
| patience null guard | 9 / `{}` | no fire |
| patience below threshold | 7 / 4 | no fire |
| patience boundary ≤3 | 8 / 3 | **fires** |
| intimacy_pacing_clash fires | pacing 9 / 2 | penalty **4** |
| pacing reverse | 2 / 9 | same |
| pacing null guard | 9 / `{}` | no fire |
| pacing below threshold | 7 / 4 | no fire |
| pacing boundary ≤3 | 8 / 3 | **fires** |
| monogamy_alignment_mismatch fires | mono 2 / open 9 | penalty **8** |
| monogamy reverse | open 9 / mono 2 | same |
| monogamy null guard | 2 / `{}` | no fire |
| monogamy below high band | 2 / 7 | **no fire** (needs ≥8) |
| monogamy low band boundary | 2 / 8 | **fires** |
| monogamy soft-low not enough | 3 / 9 | **no fire** (needs ≤2) |
| both mono aligned | 2 / 1 | **no fire** |
| both open aligned | 9 / 8 | **no fire** |

**`match-explainability.spec.ts`:**

- Assert three `TENSION_CHIP_BY_ID` strings exact
- `buildMatchExplainability` smoke for `patience_tolerance_gap` friction 3 → `'Different tolerance levels'`
- Smoke for `intimacy_pacing_clash` friction 4 → `'Different pace to closeness'`
- Smoke for `monogamy_alignment_mismatch` friction 8 → `'Relationship structure mismatch'`

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

No DTO shape changes. Existing fields may newly include Exp-14 rule ids / chip labels when rules fire.

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
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-14"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-14|Different tolerance levels|Different pace to closeness|Relationship structure mismatch"
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `EnrichedSignals` with `patienceTolerance` + `intimacyPacing` + `monogamyAlignment` (§3).
2. Append **three** rules after `both_low_self_awareness` (§1) — exact ids/penalties/predicates/explains (monogamy uses ≤2 vs ≥8).
3. Add **three** `TENSION_CHIP_BY_ID` entries (§4).
4. Add unit tests (§8); run commands above.
5. **Do not** implement positive chips, overlay modules, i18n, HG hard filter, scoring promote, or extraction changes.
6. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-14-tolerance-intimacy-pacing/handoffs/STORY_03_tension_rules/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-14 patience pacing monogamy shadow tension rules

Story 3 — three friction rules + English tension chip labels; no scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Three rules present with exact ids, penalties, thresholds
- [ ] `monogamy_alignment_mismatch` uses ≤2 vs ≥8 (not ≤3) and polarity low=mono / high=open
- [ ] `EnrichedSignals` has `patienceTolerance` + `intimacyPacing` + `monogamyAlignment`
- [ ] Three `TENSION_CHIP_BY_ID` labels exact (`Different tolerance levels`, `Different pace to closeness`, `Relationship structure mismatch`)
- [ ] Null guards on all three rules
- [ ] No invented extra rules / positive chips / HG hard filter
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / i18n drift
- [ ] No regex / text-inference / extraction changes
- [ ] Unit tests cover fire / reverse / null / below / boundaries for all three rules + monogamy soft-low no-fire
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Positive chips (`Patience match`; aligned `Pace of closeness`; `Aligned on relationship structure` both ≤2 or both ≥7) + i18n EN/HE/ES + onboarding prompt copy + domain diversity wiring.
- **Story 5:** Live / compare E2E; Hebrew fixtures; >85%; optional promote.
- **Product later:** Whether extreme `monogamy_alignment_mismatch` should feed a Holy-Grail hard filter / admission gate — **not** Story 3.
- **Correlation risk:** monitor patience vs conflict/regulation; pacing vs casual intimacy; monogamy vs relationship clarity — do not hardcode anti-correlation in Story 3.

---

## Next agent

```text
--agent 1 expansion 14 story 3
```

**Notes:** Deterministic tension only — mirror Exp-13 Story 3 pattern with **three** gap/clash rules (all high-vs-low style; monogamy uses stricter ≤2). Keep shadow / no promote. All three ship (no soft-skip). Positive chips stay Story 4. HG hard filter stays deferred.
