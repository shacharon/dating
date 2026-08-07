# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-03-humor-playfulness  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chip + i18n evidence. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01/02 Story 4 handoffs — same shadow overlay pattern.

---

## Summary

- Add user-facing **positive chip label** and **i18n evidence** for `humorPlayfulness`.
- **Architect override:** Do **not** add key to `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, …>` yet — shadow key absent from `computeCompatibility` breakdown.
- Instead: **shadow explainability overlay** via new `expansion-03-explainability.ts`; concat with Expansion-01/02 in `assemble-result.ts`.
- Tension chip from Story 3 (`Playfulness mismatch`) already works — English API only; Story 4 focuses on **positive chip + browse i18n**.
- `computePairScore` already exported — reuse, do not re-export.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` in `match-explainability.ts` |
| Expansion-01/02 overlay | `expansion-01-explainability.ts`, `expansion-02-explainability.ts` + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Official breakdown | From `computeCompatibility` → only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Shadow signal | In `evaluationJson.self.signals` after Story 2; **not** in compatibility breakdown |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` (English evidence + listPhrase) |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | `dating-ui/.../chip-evidence.ts` — must list chip label for locale coverage tests |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-03-explainability.ts` |
| Chips from compatibility breakdown automatically | **Requires shadow breakdown merge** in `assemble-result.ts` |
| Tension chip i18n | **Out of scope** — tension chips English-only in API (Story 3) |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-03-explainability.ts` | **Create** — shadow chip map + `buildExpansion03ShadowBreakdown()` |
| `dating-api/src/matches/match-explainability.ts` | Extend shadow key resolution for Expansion-03 (`chipLabelForKey`, `domainForKey`, `isExplainabilityChipKey`) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-03 shadow breakdown with Expansion-01/02 (chip picker input only) |
| `dating-api/src/matches/match-explanation-traits.ts` | Add `CHIP_TO_TRAIT` entry for `Shared playfulness` |
| `dating-api/src/matches/expansion-03-explainability.spec.ts` | **Create** — shadow breakdown + chip pick tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Test: high humorPlayfulness → positive chip |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait for new chip (if pattern exists from Expansion-02) |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Add `'Shared playfulness'` to `CHIP_EVIDENCE_KEYS` |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` entry |
| `dating-ui/src/lib/i18n/he.ts` | `chipEvidence` entry |
| `dating-ui/src/lib/i18n/es.ts` | `chipEvidence` entry |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Optional: EN + HE cases (mirror Expansion-02) |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01-explainability.ts`, `expansion-02-explainability.ts` | Prior sprints — do not edit maps/labels |
| `compatibility-score.ts` weights / `COMPATIBILITY_SIGNAL_KEYS` | Promote story — Story 1 lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote; use shadow map |
| Tension chip i18n | Not in Story 4 |
| Live LLM validation / Phase 1 gate | Story 5 |
| `match-engine.spec.ts` E2E | Story 5 |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip map (locked)

New file `expansion-03-explainability.ts`:

```typescript
export const EXPANSION_03_SHADOW_CHIP_KEYS = ['humorPlayfulness'] as const;

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion03ShadowChipKey,
  string
> = {
  humorPlayfulness: 'Shared playfulness',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion03ShadowChipKey, string> = {
  humorPlayfulness: 'connection',
};
```

Exact chip label locked (match sprint README + Story 1 promotion-ready constants).

**Domain note:** `connection` is new — distinct from `emotional` (Expansion-01/02), `intimacy` (Expansion-02 affection), `lifestyle`, `social`. Improves chip diversity vs emotional-domain dominance (Phase 1 gate concern in Story 5).

### 2. Shadow breakdown builder (locked)

Mirror Expansion-01/02:

```typescript
export function buildExpansion03ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // same loop pattern — uses computePairScore
}
```

### 3. Merge point (locked)

In `assemble-result.ts`, extend existing shadow merge:

```typescript
const shadowBreakdown = [
  ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion03ShadowBreakdown(signalsA, signalsB),
];
const breakdownForChips = [
  ...(compatAB.breakdown ?? []),
  ...shadowBreakdown,
];
```

**Do not** merge shadow entries into `compatAB.breakdown` used for `alignments` DTO.

**Do not** modify Expansion-01/02 builders — concat at call site only.

### 4. `match-explainability.ts` chip resolution (locked)

Extend existing shadow resolution (add Expansion-03 import with `_03` alias):

```typescript
import {
  isExpansion03ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_03,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_03,
} from './expansion-03-explainability';

function isExplainabilityChipKey(key: string): boolean {
  return (
    isSignalKey(key) ||
    isExpansion01ShadowChipKey(key) ||
    isExpansion02ShadowChipKey(key) ||
    isExpansion03ShadowChipKey(key)
  );
}

function chipLabelForKey(key: string): string | undefined {
  // ... existing _01, _02 ...
  if (isExpansion03ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_03[key];
  }
  return undefined;
}

function domainForKey(key: string): string {
  // ... existing _01, _02 ...
  if (isExpansion03ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_03[key];
  return 'unknown';
}
```

**Do not** add shadow keys to `isSignalKey()`.

### 5. `CHIP_TO_TRAIT` entry (locked — detail page / list TLDR)

```typescript
'Shared playfulness': {
  group: 'Connection & play',
  evidence: 'You bring out lightness and laughter in each other',
  listPhrase: 'lightness and laughter together',
},
```

English only in `CHIP_TO_TRAIT` (existing pattern). Browse uses i18n `chipEvidence`.

### 6. i18n evidence strings (locked — from sprint README)

**en.ts** `matches.list.browse.chipEvidence`:

```typescript
"Shared playfulness":
  "You bring out lightness and laughter in each other",
```

**he.ts:**

```typescript
"Shared playfulness":
  "אתם מביאים קלילות וצחוק אחד לשני",
```

**es.ts:**

```typescript
"Shared playfulness":
  "Se traen ligereza y risas mutuamente",
```

### 7. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Shared playfulness',
```

### 8. Chip display conditions (locked)

Same tier rules as official signals via merged breakdown:

- High chip when both `self >= 7 && partner >= 7` on shadow key, or `pairScore >= 7`, etc.
- No chip when either side null (no shadow breakdown entry)
- Domain `connection` — diversity vs stacked `emotional` chips from Expansion-01/02

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term in `finalScore` | **None** |
| Friction (Story 3 `humor_mismatch`) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## API contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Shared playfulness'`
- `explainability.tensionChip` unchanged (Story 3)

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-03-explainability.spec.ts src/matches/match-explainability.spec.ts src/matches/match-explanation-traits.spec.ts --runInBand -t "Expansion-03|Shared playfulness"
npm run typecheck

cd dating-ui
npm test -- chip-evidence.spec.ts
```

### Minimum backend tests

| Test | Expect |
|------|--------|
| `buildExpansion03ShadowBreakdown` both high playfulness | entry with `pairScore >= 7` |
| null on one side | empty / skip key |
| `pickPositiveChips` with shadow-only high humorPlayfulness | includes `'Shared playfulness'` |
| `buildMatchExplanationTraits(['Shared playfulness'], 70)` | trait with group `Connection & play` |

Mirror `expansion-02-explainability.spec.ts` structure (single key).

### Minimum frontend tests

| Test | Expect |
|------|--------|
| `chip-evidence.spec.ts` all locales | new key has non-empty evidence |
| Optional: `match-why-section.spec.tsx` EN + HE for `Shared playfulness` | Mirror Expansion-02 Affection rhythm tests |

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Create `expansion-03-explainability.ts` with map + breakdown builder (§1–2).
2. Extend shadow merge in `assemble-result.ts` (§3).
3. Extend `match-explainability.ts` label/domain resolution (§4).
4. Add `CHIP_TO_TRAIT` entry (§5).
5. Update UI i18n + `CHIP_EVIDENCE_KEYS` (§6–7).
6. Add tests; run commands above.
7. **Do not** modify Expansion-01/02 explainability modules, compatibility weights, or `COMPATIBILITY_SIGNAL_KEYS`.
8. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(matches): Expansion-03 shadow positive chip and i18n evidence

Story 4 — display-only chip overlay; no compatibility scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Shadow key **not** in `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` union
- [ ] Shadow breakdown merged **only** for explainability chip picker
- [ ] `alignments` DTO excludes shadow keys
- [ ] Chip label exact: `Shared playfulness`
- [ ] Domain: `connection`
- [ ] i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` synced
- [ ] `CHIP_TO_TRAIT` entry present
- [ ] Expansion-01/02 overlay unchanged
- [ ] Tests pass

---

## Open questions / blockers

- None blocking Story 4.
- **Promote story (future):** Move shadow map into official `POSITIVE_CHIP_BY_SIGNAL` when key joins `COMPATIBILITY_SIGNAL_KEYS`.
- **Story 5:** Phase 1 gate includes chip diversity check — `connection` domain helps vs emotional stacking.

---

## Next agent

```text
--agent 1 expansion 03 story 4
```

**Notes:** Mirror Expansion-02 Story 4 file-by-file — single key this sprint. Read Story 1 shadow lock before touching `compatibility-score.ts`.
