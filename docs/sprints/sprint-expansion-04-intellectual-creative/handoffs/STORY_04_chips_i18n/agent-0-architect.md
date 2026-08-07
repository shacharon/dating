# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-04-intellectual-creative  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + i18n evidence. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01/02/03 Story 4 handoffs — same shadow overlay pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).

---

## Summary

- Add user-facing **positive chip labels** and **i18n evidence** for `intellectualCuriosity` + `creativeExpression`.
- **Architect override:** Do **not** add keys to `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, …>` yet — shadow keys absent from `computeCompatibility` breakdown.
- Instead: **shadow explainability overlay** via new `expansion-04-explainability.ts`; concat with Expansion-01/02/03 in `assemble-result.ts`.
- Tension chips from Story 3 already work — English API only; Story 4 focuses on **positive chips + browse i18n**.
- `computePairScore` already exported — reuse, do not re-export.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` in `match-explainability.ts` |
| Expansion-01/02/03 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Official breakdown | From `computeCompatibility` → only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Shadow signals | In `evaluationJson.self.signals` after Story 2; **not** in compatibility breakdown |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` (English evidence + listPhrase) |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | `dating-ui/.../chip-evidence.ts` — must list chip labels for locale coverage tests |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-04-explainability.ts` |
| Chips from compatibility breakdown automatically | **Requires shadow breakdown merge** in `assemble-result.ts` |
| Tension chip i18n | **Out of scope** — tension chips English-only in API (Story 3) |
| “Update all chip mapping layers” | Shadow overlay + `CHIP_TO_TRAIT` + browse i18n only |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-04-explainability.ts` | **Create** — shadow chip map + `buildExpansion04ShadowBreakdown()` |
| `dating-api/src/matches/match-explainability.ts` | Extend shadow key resolution for Expansion-04 (`chipLabelForKey`, `domainForKey`, `isExplainabilityChipKey`) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-04 shadow breakdown with 01/02/03 (chip picker input only) |
| `dating-api/src/matches/match-explanation-traits.ts` | Add `CHIP_TO_TRAIT` entries for both chip labels |
| `dating-api/src/matches/expansion-04-explainability.spec.ts` | **Create** — shadow breakdown + chip pick tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Test: high Expansion-04 keys → positive chips |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for both new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Add both chip labels to `CHIP_EVIDENCE_KEYS` |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` entries |
| `dating-ui/src/lib/i18n/he.ts` | `chipEvidence` entries |
| `dating-ui/src/lib/i18n/es.ts` | `chipEvidence` entries |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Optional: EN + HE for both chips (mirror Expansion-03) |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01/02/03-explainability.ts` | Prior sprints — do not edit maps/labels |
| `compatibility-score.ts` weights / `COMPATIBILITY_SIGNAL_KEYS` | Promote story — Story 1 lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote; use shadow map |
| Tension chip i18n | Not in Story 4 |
| Interest tag registries | Orthogonal — Story 5 coexistence |
| Live LLM validation | Story 5 |
| `match-engine.spec.ts` E2E | Story 5 |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip map (locked)

New file `expansion-04-explainability.ts` (mirror Expansion-02 two-key layout; keep formatting clean — no double blank lines):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_04_SHADOW_CHIP_KEYS = [
  'intellectualCuriosity',
  'creativeExpression',
] as const;

export type Expansion04ShadowChipKey =
  (typeof EXPANSION_04_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion04ShadowChipKey,
  string
> = {
  intellectualCuriosity: 'Mental stimulation',
  creativeExpression: 'Creative expression',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion04ShadowChipKey, string> = {
  intellectualCuriosity: 'intellectual',
  creativeExpression: 'creative',
};
```

Exact chip labels locked (match sprint README + Story 1 promotion-ready constants).

**Domain note:** New domains `intellectual` and `creative` — distinct from `emotional`, `intimacy`, `connection`, `lifestyle`, `social`. Supports chip diversity (Story 5).

### 2. Shadow breakdown builder (locked)

Mirror Expansion-02:

```typescript
export function buildExpansion04ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // same loop pattern — uses computePairScore; skip null / non-finite
}
```

Plus `isExpansion04ShadowChipKey` type guard.

### 3. Merge point (locked)

In `assemble-result.ts`, extend existing shadow merge:

```typescript
const shadowBreakdown = [
  ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion03ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion04ShadowBreakdown(signalsA, signalsB),
];
```

**Do not** merge shadow entries into `compatAB.breakdown` used for `alignments` DTO.

**Do not** modify Expansion-01/02/03 builders — concat at call site only.

### 4. `match-explainability.ts` chip resolution (locked)

Extend existing shadow resolution (add Expansion-04 import with `_04` alias):

```typescript
import {
  isExpansion04ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_04,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_04,
} from './expansion-04-explainability';
```

Update `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` to include Expansion-04 (same pattern as `_03`).

**Do not** add shadow keys to `isSignalKey()`.

### 5. `CHIP_TO_TRAIT` entries (locked — detail page / list TLDR)

```typescript
'Mental stimulation': {
  group: 'Ideas & growth',
  evidence: 'You both value ideas, learning, and intellectual growth',
  listPhrase: 'shared intellectual growth',
},
'Creative expression': {
  group: 'Creativity & making',
  evidence: 'You both value creativity and making things',
  listPhrase: 'shared creative expression',
},
```

English only in `CHIP_TO_TRAIT` (existing pattern). Browse uses i18n `chipEvidence`. Evidence strings match sprint README EN column.

### 6. i18n evidence strings (locked — from sprint README)

**en.ts** `matches.list.browse.chipEvidence`:

```typescript
"Mental stimulation":
  "You both value ideas, learning, and intellectual growth",
"Creative expression":
  "You both value creativity and making things",
```

**he.ts:**

```typescript
"Mental stimulation":
  "שניכם מעריכים רעיונות, למידה וצמיחה אינטלקטואלית",
"Creative expression":
  "שניכם מעריכים יצירתיות ויצירה",
```

**es.ts:**

```typescript
"Mental stimulation":
  "Ambos valoran ideas, aprendizaje y crecimiento intelectual",
"Creative expression":
  "Ambos valoran la creatividad y crear cosas",
```

### 7. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Mental stimulation',
'Creative expression',
```

### 8. Chip display conditions (locked)

Same tier rules as official signals via merged breakdown:

- High chip when both `self >= 7 && partner >= 7` on shadow key, or `pairScore >= 7`, etc.
- No chip when either side null (no shadow breakdown entry)
- Domains `intellectual` / `creative` — diversity vs stacked `emotional` / `connection` chips

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

- `explainability.positiveChips` may include `'Mental stimulation'` / `'Creative expression'`
- `explainability.tensionChip` unchanged (Story 3)

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-04-explainability.spec.ts src/matches/match-explainability.spec.ts src/matches/match-explanation-traits.spec.ts --runInBand -t "Expansion-04|Mental stimulation|Creative expression"
npm run typecheck

cd dating-ui
npm test -- chip-evidence.spec.ts
```

### Minimum backend tests

| Test | Expect |
|------|--------|
| `buildExpansion04ShadowBreakdown` both high intellectualCuriosity | entry with `pairScore >= 7` |
| both high creativeExpression | entry with `pairScore >= 7` |
| null on one side | empty / skip key |
| `pickPositiveChips` with shadow-only high intellectualCuriosity | includes `'Mental stimulation'` |
| `pickPositiveChips` with shadow-only high creativeExpression | includes `'Creative expression'` |
| `buildMatchExplanationTraits(['Mental stimulation'], 70)` | trait with group `Ideas & growth` |
| `buildMatchExplanationTraits(['Creative expression'], 70)` | trait with group `Creativity & making` |

Mirror `expansion-02-explainability.spec.ts` structure (two keys).

### Minimum frontend tests

| Test | Expect |
|------|--------|
| `chip-evidence.spec.ts` all locales | both new keys have non-empty evidence |
| Optional: `match-why-section.spec.tsx` EN + HE for both chips | Mirror Expansion-03 |

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Create `expansion-04-explainability.ts` with map + breakdown builder (§1–2). Prefer clean formatting (single blank lines).
2. Extend shadow merge in `assemble-result.ts` (§3).
3. Extend `match-explainability.ts` label/domain resolution (§4).
4. Add `CHIP_TO_TRAIT` entries (§5).
5. Update UI i18n + `CHIP_EVIDENCE_KEYS` (§6–7).
6. Add tests; run commands above.
7. **Do not** modify Expansion-01/02/03 explainability modules, compatibility weights, or `COMPATIBILITY_SIGNAL_KEYS`.
8. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(matches): Expansion-04 shadow positive chips and i18n evidence

Story 4 — display-only chip overlay for Mental stimulation + Creative expression; no compatibility scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Shadow keys **not** in `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` union
- [ ] Shadow breakdown merged **only** for explainability chip picker
- [ ] `alignments` DTO excludes shadow keys
- [ ] Chip labels exact: `Mental stimulation`, `Creative expression`
- [ ] Domains: `intellectual`, `creative`
- [ ] i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` synced
- [ ] `CHIP_TO_TRAIT` entries present
- [ ] Expansion-01/02/03 overlay unchanged
- [ ] Tests pass

---

## Open questions / blockers

- None blocking Story 4.
- **Promote story (future):** Move shadow map into official `POSITIVE_CHIP_BY_SIGNAL` when keys join `COMPATIBILITY_SIGNAL_KEYS`.
- **Story 5:** Interest-tag coexistence + live LLM validation; chip diversity benefits from new domains.

---

## Next agent

```text
--agent 1 expansion 04 story 4
```

**Notes:** Mirror Expansion-02 Story 4 file-by-file (two keys). Read Story 1 shadow lock before touching `compatibility-score.ts`. Do not confuse interest tags (`art_visual`, `books_reading`) with these scored need signals.
