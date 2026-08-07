# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + i18n evidence. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01–05 Story 4 handoffs — same shadow overlay pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).

---

## Summary

- Add user-facing **positive chip label** and **i18n evidence** for `adventureNovelty`.
- **Architect override:** Do **not** add key to `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, …>` yet — shadow key absent from `computeCompatibility` breakdown.
- Instead: **shadow explainability overlay** via new `expansion-06-explainability.ts`; concat with Expansion-01–05 in `assemble-result.ts`.
- Tension chip from Story 3 already works — English API only; Story 4 focuses on **positive chip + browse i18n**.
- `computePairScore` already exported — reuse, do not re-export.
- Chip domain is **`lifestyle`** (README / Story 1 promotion-ready lock).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` in `match-explainability.ts` |
| Expansion-01–05 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Official breakdown | From `computeCompatibility` → only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Shadow signal | In `evaluationJson.self.signals.adventureNovelty` after Stories 1–2; **not** in compatibility breakdown |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` (English evidence + listPhrase) |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **23** keys through Expansion-05 — append 1 → **24** |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-06-explainability.ts` |
| Chips from compatibility breakdown automatically | **Requires shadow breakdown merge** in `assemble-result.ts` |
| Tension chip i18n | **Out of scope** — tension chips English-only in API (Story 3) |
| Domain `lifestyle` | **Locked** |
| Final i18n audit: all 10 new chips | **Story 5** full audit; Story 4 only guarantees Expansion-06 chip EN/HE/ES + registry sync |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-06-explainability.ts` | **Create** — shadow chip map + `buildExpansion06ShadowBreakdown()` |
| `dating-api/src/matches/match-explainability.ts` | Extend shadow key resolution for Expansion-06 (`chipLabelForKey`, `domainForKey`, `isExplainabilityChipKey`) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-06 shadow breakdown with 01–05 (chip picker input only) |
| `dating-api/src/matches/match-explanation-traits.ts` | Add `CHIP_TO_TRAIT` entry for chip label |
| `dating-api/src/matches/expansion-06-explainability.spec.ts` | **Create** — shadow breakdown + chip pick tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Test: high `adventureNovelty` → positive chip |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait for new chip |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append `'Adventure & novelty'` to `CHIP_EVIDENCE_KEYS` (**23 → 24**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` entry |
| `dating-ui/src/lib/i18n/he.ts` | `chipEvidence` entry |
| `dating-ui/src/lib/i18n/es.ts` | `chipEvidence` entry |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Expansion-06 chip |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01/02/03/04/05-explainability.ts` | Prior sprints — do not edit maps/labels |
| `compatibility-score.ts` weights / `COMPATIBILITY_SIGNAL_KEYS` | Promote story — Story 1 lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote; use shadow map |
| Tension chip i18n | Not in Story 4 |
| Interest tag registries | Orthogonal |
| Live LLM validation / full 10-chip i18n audit | Story 5 |
| `match-engine.spec.ts` E2E | Story 5 |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip map (locked)

New file `expansion-06-explainability.ts` (mirror Expansion-03 single-key / Expansion-05 layout):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_06_SHADOW_CHIP_KEYS = ['adventureNovelty'] as const;

export type Expansion06ShadowChipKey =
  (typeof EXPANSION_06_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion06ShadowChipKey,
  string
> = {
  adventureNovelty: 'Adventure & novelty',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion06ShadowChipKey, string> = {
  adventureNovelty: 'lifestyle',
};
```

Exact chip label locked (match sprint README + Story 1 promotion-ready constants).

### 2. Shadow breakdown builder (locked)

Mirror Expansion-05:

```typescript
export function buildExpansion06ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // same loop pattern — uses computePairScore; skip null / non-finite
}
```

Plus `isExpansion06ShadowChipKey` type guard.

### 3. Merge point (locked)

In `assemble-result.ts`, extend existing shadow merge:

```typescript
const shadowBreakdown = [
  ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion03ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion04ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion05ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion06ShadowBreakdown(signalsA, signalsB),
];
```

**Do not** merge shadow entries into `compatAB.breakdown` used for `alignments` DTO.

**Do not** modify Expansion-01–05 builders — concat at call site only.

### 4. `match-explainability.ts` chip resolution (locked)

Extend existing shadow resolution (add Expansion-06 import with `_06` alias):

```typescript
import {
  isExpansion06ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_06,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_06,
} from './expansion-06-explainability';
```

Update `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` to include Expansion-06 (same pattern as `_05`).

**Do not** add shadow keys to `isSignalKey()`.

### 5. `CHIP_TO_TRAIT` entry (locked — detail page / list TLDR)

```typescript
'Adventure & novelty': {
  group: 'Lifestyle match',
  evidence: "You're both excited by new experiences and variety",
  listPhrase: 'shared adventure and novelty',
},
```

English only in `CHIP_TO_TRAIT` (existing pattern). Browse uses i18n `chipEvidence`. Evidence string matches sprint README EN column.

### 6. i18n evidence strings (locked — from sprint README)

**en.ts** `matches.list.browse.chipEvidence`:

```typescript
"Adventure & novelty":
  "You're both excited by new experiences and variety",
```

**he.ts:**

```typescript
"Adventure & novelty":
  "שניכם מתרגשים מחוויות חדשות וגיוון",
```

**es.ts:**

```typescript
"Adventure & novelty":
  "Ambos se emocionan con nuevas experiencias y variedad",
```

### 7. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Adventure & novelty',
```

(23 → **24** keys.)

### 8. Chip display conditions (locked)

Same tier rules as official signals via merged breakdown:

- High chip when both `self >= 7 && partner >= 7` on shadow key, or `pairScore >= 7`, etc.
- No chip when either side null (no shadow breakdown entry)
- Domain `lifestyle` — may compete with other lifestyle chips in diversity picker; acceptable per README

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term in `finalScore` | **None** |
| Friction (Story 3 `novelty_routine_clash`) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## API contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Adventure & novelty'`
- `explainability.tensionChip` unchanged (Story 3) — may be `'Novelty vs routine'`

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-06-explainability.spec.ts src/matches/match-explainability.spec.ts src/matches/match-explanation-traits.spec.ts --runInBand -t "Expansion-06|Adventure & novelty"
npm run typecheck

cd dating-ui
npm test -- chip-evidence.spec.ts match-why-section.spec.tsx
```

### Minimum backend tests

| Test | Expect |
|------|--------|
| `buildExpansion06ShadowBreakdown` both high adventureNovelty | entry with `pairScore >= 7` |
| null on one side | empty / skip key |
| `pickPositiveChips` with shadow-only high adventureNovelty | includes `'Adventure & novelty'` |
| `buildMatchExplanationTraits(['Adventure & novelty'], 70)` | trait with group `Lifestyle match` |

Mirror `expansion-05-explainability.spec.ts` / Expansion-03 single-key structure.

### Minimum frontend tests

| Test | Expect |
|------|--------|
| `chip-evidence.spec.ts` all locales | new key has non-empty evidence |
| `match-why-section.spec.tsx` EN Adventure & novelty (+ HE optional) | Mirror Expansion-05 |

---

## E2E verification

N/A — browse visual QA deferred to Story 5 / operator.

---

## Agent 1 instructions

1. Create `expansion-06-explainability.ts` with map + breakdown builder (§1–2).
2. Extend shadow merge in `assemble-result.ts` (§3).
3. Extend `match-explainability.ts` label/domain resolution (§4).
4. Add `CHIP_TO_TRAIT` entry (§5).
5. Update UI i18n + `CHIP_EVIDENCE_KEYS` (§6–7).
6. Add tests; run commands above.
7. **Do not** modify Expansion-01–05 explainability modules, compatibility weights, or `COMPATIBILITY_SIGNAL_KEYS`.
8. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(matches): Expansion-06 shadow positive chip and i18n evidence

Story 4 — display-only chip overlay for Adventure & novelty; no compatibility scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Shadow key **not** in `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` union
- [ ] Shadow breakdown merged **only** for explainability chip picker
- [ ] `alignments` DTO excludes shadow keys
- [ ] Chip label exact: `Adventure & novelty`
- [ ] Domain: `lifestyle`
- [ ] i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` synced (**24** keys)
- [ ] `CHIP_TO_TRAIT` entry present
- [ ] Expansion-01–05 overlay unchanged
- [ ] Tests pass

---

## Open questions / blockers

- None blocking Story 4.
- **Promote story (future):** Move shadow map into official `POSITIVE_CHIP_BY_SIGNAL` when key joins `COMPATIBILITY_SIGNAL_KEYS`.
- **Story 5:** Live LLM validation + full expansion i18n audit (10 chips) + match-engine E2E.

---

## Next agent

```text
--agent 1 expansion 06 story 4
```

**Notes:** Mirror Expansion-05 Story 4 file-by-file (single key like Expansion-03). Domain is `lifestyle` by README lock. Do not confuse interest tags (`travel`, `adventure`) with this scored preference signal.
