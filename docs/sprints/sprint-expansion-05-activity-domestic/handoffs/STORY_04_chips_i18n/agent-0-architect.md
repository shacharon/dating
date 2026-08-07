# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + i18n evidence. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01–04 Story 4 handoffs — same shadow overlay pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).

---

## Summary

- Add user-facing **positive chip labels** and **i18n evidence** for `physicalActivityLevel` + `domesticComfort`.
- **Architect override:** Do **not** add keys to `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, …>` yet — shadow keys absent from `computeCompatibility` breakdown.
- Instead: **shadow explainability overlay** via new `expansion-05-explainability.ts`; concat with Expansion-01–04 in `assemble-result.ts`.
- Tension chips from Story 3 already work — English API only; Story 4 focuses on **positive chips + browse i18n**.
- `computePairScore` already exported — reuse, do not re-export.
- Both chip domains are **`lifestyle`** (README / Story 1 promotion-ready lock).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` in `match-explainability.ts` |
| Expansion-01–04 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Official breakdown | From `computeCompatibility` → only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Shadow signals | In `evaluationJson.self.signals` after Story 2; **not** in compatibility breakdown |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` (English evidence + listPhrase) |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **21** keys through Expansion-04 — append 2 → **23** |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-05-explainability.ts` |
| Chips from compatibility breakdown automatically | **Requires shadow breakdown merge** in `assemble-result.ts` |
| Tension chip i18n | **Out of scope** — tension chips English-only in API (Story 3) |
| Domain `lifestyle` both | **Locked** — both keys use `lifestyle` domain |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-05-explainability.ts` | **Create** — shadow chip map + `buildExpansion05ShadowBreakdown()` |
| `dating-api/src/matches/match-explainability.ts` | Extend shadow key resolution for Expansion-05 (`chipLabelForKey`, `domainForKey`, `isExplainabilityChipKey`) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-05 shadow breakdown with 01–04 (chip picker input only) |
| `dating-api/src/matches/match-explanation-traits.ts` | Add `CHIP_TO_TRAIT` entries for both chip labels |
| `dating-api/src/matches/expansion-05-explainability.spec.ts` | **Create** — shadow breakdown + chip pick tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Test: high Expansion-05 keys → positive chips |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for both new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Add both chip labels to `CHIP_EVIDENCE_KEYS` |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` entries |
| `dating-ui/src/lib/i18n/he.ts` | `chipEvidence` entries |
| `dating-ui/src/lib/i18n/es.ts` | `chipEvidence` entries |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN + HE for Expansion-05 chips (mirror Expansion-04) |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01/02/03/04-explainability.ts` | Prior sprints — do not edit maps/labels |
| `compatibility-score.ts` weights / `COMPATIBILITY_SIGNAL_KEYS` | Promote story — Story 1 lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote; use shadow map |
| Tension chip i18n | Not in Story 4 |
| Interest tag registries | Orthogonal |
| Live LLM validation | Story 5 |
| `match-engine.spec.ts` E2E | Story 5 |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip map (locked)

New file `expansion-05-explainability.ts` (mirror Expansion-04 two-key layout):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_05_SHADOW_CHIP_KEYS = [
  'physicalActivityLevel',
  'domesticComfort',
] as const;

export type Expansion05ShadowChipKey =
  (typeof EXPANSION_05_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion05ShadowChipKey,
  string
> = {
  physicalActivityLevel: 'Activity level match',
  domesticComfort: 'Home/out balance',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion05ShadowChipKey, string> = {
  physicalActivityLevel: 'lifestyle',
  domesticComfort: 'lifestyle',
};
```

Exact chip labels locked (match sprint README + Story 1 promotion-ready constants).

### 2. Shadow breakdown builder (locked)

Mirror Expansion-04:

```typescript
export function buildExpansion05ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // same loop pattern — uses computePairScore; skip null / non-finite
}
```

Plus `isExpansion05ShadowChipKey` type guard.

### 3. Merge point (locked)

In `assemble-result.ts`, extend existing shadow merge:

```typescript
const shadowBreakdown = [
  ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion03ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion04ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion05ShadowBreakdown(signalsA, signalsB),
];
```

**Do not** merge shadow entries into `compatAB.breakdown` used for `alignments` DTO.

**Do not** modify Expansion-01–04 builders — concat at call site only.

### 4. `match-explainability.ts` chip resolution (locked)

Extend existing shadow resolution (add Expansion-05 import with `_05` alias):

```typescript
import {
  isExpansion05ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_05,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_05,
} from './expansion-05-explainability';
```

Update `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` to include Expansion-05 (same pattern as `_04`).

**Do not** add shadow keys to `isSignalKey()`.

### 5. `CHIP_TO_TRAIT` entries (locked — detail page / list TLDR)

```typescript
'Activity level match': {
  group: 'Lifestyle match',
  evidence:
    'Your physical activity levels and fitness priorities align',
  listPhrase: 'aligned activity levels',
},
'Home/out balance': {
  group: 'Lifestyle match',
  evidence: "You're aligned on spending time at home vs going out",
  listPhrase: 'aligned home vs out preferences',
},
```

English only in `CHIP_TO_TRAIT` (existing pattern). Browse uses i18n `chipEvidence`. Evidence strings match sprint README EN column.

### 6. i18n evidence strings (locked — from sprint README)

**en.ts** `matches.list.browse.chipEvidence`:

```typescript
"Activity level match":
  "Your physical activity levels and fitness priorities align",
"Home/out balance":
  "You're aligned on spending time at home vs going out",
```

**he.ts:**

```typescript
"Activity level match":
  "רמות הפעילות הגופנית והעדפות הכושר שלכם מתאימות",
"Home/out balance":
  "אתם מיושרים על זמן בבית מול יציאה",
```

**es.ts:**

```typescript
"Activity level match":
  "Sus niveles de actividad física y prioridades de fitness están alineados",
"Home/out balance":
  "Están alineados en pasar tiempo en casa vs salir",
```

### 7. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Activity level match',
'Home/out balance',
```

(21 → **23** keys.)

### 8. Chip display conditions (locked)

Same tier rules as official signals via merged breakdown:

- High chip when both `self >= 7 && partner >= 7` on shadow key, or `pairScore >= 7`, etc.
- No chip when either side null (no shadow breakdown entry)
- Domain `lifestyle` for both — may compete with other lifestyle chips in diversity picker; acceptable per README

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term in `finalScore` | **None** |
| Friction (Story 3 rules) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## API contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Activity level match'` / `'Home/out balance'`
- `explainability.tensionChip` unchanged (Story 3)

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-05-explainability.spec.ts src/matches/match-explainability.spec.ts src/matches/match-explanation-traits.spec.ts --runInBand -t "Expansion-05|Activity level match|Home/out balance"
npm run typecheck

cd dating-ui
npm test -- chip-evidence.spec.ts match-why-section.spec.tsx
```

### Minimum backend tests

| Test | Expect |
|------|--------|
| `buildExpansion05ShadowBreakdown` both high physicalActivityLevel | entry with `pairScore >= 7` |
| both high domesticComfort | entry with `pairScore >= 7` |
| null on one side | empty / skip key |
| `pickPositiveChips` with shadow-only high physicalActivityLevel | includes `'Activity level match'` |
| `pickPositiveChips` with shadow-only high domesticComfort | includes `'Home/out balance'` |
| `buildMatchExplanationTraits(['Activity level match'], 70)` | trait with group `Lifestyle match` |
| `buildMatchExplanationTraits(['Home/out balance'], 70)` | trait with group `Lifestyle match` |

Mirror `expansion-04-explainability.spec.ts` structure (two keys).

### Minimum frontend tests

| Test | Expect |
|------|--------|
| `chip-evidence.spec.ts` all locales | both new keys have non-empty evidence |
| `match-why-section.spec.tsx` EN Activity + HE Home/out | Mirror Expansion-04 |

---

## E2E verification

N/A — browse visual QA deferred to Story 5 / operator.

---

## Agent 1 instructions

1. Create `expansion-05-explainability.ts` with map + breakdown builder (§1–2).
2. Extend shadow merge in `assemble-result.ts` (§3).
3. Extend `match-explainability.ts` label/domain resolution (§4).
4. Add `CHIP_TO_TRAIT` entries (§5).
5. Update UI i18n + `CHIP_EVIDENCE_KEYS` (§6–7).
6. Add tests; run commands above.
7. **Do not** modify Expansion-01–04 explainability modules, compatibility weights, or `COMPATIBILITY_SIGNAL_KEYS`.
8. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(matches): Expansion-05 shadow positive chips and i18n evidence

Story 4 — display-only chip overlay for Activity level match + Home/out balance; no compatibility scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Shadow keys **not** in `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` union
- [ ] Shadow breakdown merged **only** for explainability chip picker
- [ ] `alignments` DTO excludes shadow keys
- [ ] Chip labels exact: `Activity level match`, `Home/out balance`
- [ ] Domains: both `lifestyle`
- [ ] i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` synced (23 keys)
- [ ] `CHIP_TO_TRAIT` entries present
- [ ] Expansion-01–04 overlay unchanged
- [ ] Tests pass

---

## Open questions / blockers

- None blocking Story 4.
- **Promote story (future):** Move shadow map into official `POSITIVE_CHIP_BY_SIGNAL` when keys join `COMPATIBILITY_SIGNAL_KEYS`.
- **Story 5:** Live LLM validation + conflation regression vs wellness / socialBattery / lifestylePace.

---

## Next agent

```text
--agent 1 expansion 05 story 4
```

**Notes:** Mirror Expansion-04 Story 4 file-by-file (two keys). Both domains are `lifestyle` by README lock — do not invent `activity` / `domestic` domains. Do not confuse interest tags (`gym`, `hiking`, `home_life`) with these scored preference signals.
