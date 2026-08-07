# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + i18n evidence. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01 Story 4 handoff (`sprint-expansion-01-.../STORY_04_chips_i18n/agent-0-architect.md`) — same shadow overlay pattern.

---

## Summary

- Add user-facing **positive chip labels** and **i18n evidence** for Expansion-02 shadow signals.
- **Architect override:** Do **not** add keys to `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, …>` yet — shadow keys are absent from `computeCompatibility` breakdown.
- Instead: **shadow explainability overlay** via new `expansion-02-explainability.ts`; merge breakdown alongside Expansion-01 overlay in `assemble-result.ts`.
- Tension chips from Story 3 already work (English API strings); Story 4 focuses on **positive chips + browse i18n**.
- `computePairScore` already exported (Expansion-01 Story 4) — reuse, do not re-export.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` in `match-explainability.ts` |
| Expansion-01 overlay | `expansion-01-explainability.ts` + merge in `assemble-result.ts` — **do not modify Expansion-01 maps/labels** |
| Official breakdown | From `computeCompatibility` → only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Shadow signals | In `evaluationJson.self.signals` after Story 2; **not** in compatibility breakdown |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` (English evidence + listPhrase) |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | `dating-ui/.../chip-evidence.ts` — must list all chip labels for locale coverage tests |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-02-explainability.ts` |
| Chips from compatibility breakdown automatically | **Requires shadow breakdown merge** in `assemble-result.ts` |
| Tension chip i18n | **Out of scope** — existing tension chips English-only in API (Story 3) |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-02-explainability.ts` | **Create** — shadow chip maps + `buildExpansion02ShadowBreakdown()` |
| `dating-api/src/matches/match-explainability.ts` | Extend shadow key resolution for Expansion-02 (`chipLabelForKey`, `domainForKey`, `isExplainabilityChipKey`) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-02 shadow breakdown with Expansion-01 (chip picker input only) |
| `dating-api/src/matches/match-explanation-traits.ts` | Add `CHIP_TO_TRAIT` entries for 2 new chip labels |
| `dating-api/src/matches/expansion-02-explainability.spec.ts` | **Create** — shadow breakdown + chip pick tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Tests: high regulation/affection → positive chips |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips (if file exists / pattern from Expansion-01) |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Add 2 keys to `CHIP_EVIDENCE_KEYS` |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` entries |
| `dating-ui/src/lib/i18n/he.ts` | `chipEvidence` entries |
| `dating-ui/src/lib/i18n/es.ts` | `chipEvidence` entries |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01-explainability.ts` | Expansion-01 complete — do not edit maps/labels |
| `compatibility-score.ts` weights / `COMPATIBILITY_SIGNAL_KEYS` | Promote story — Story 1 lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote; use shadow map |
| Tension chip i18n | Not in Story 4 README |
| Live LLM validation | Story 5 |
| `match-engine.spec.ts` E2E | Story 5 (optional one case there) |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip maps (locked)

New file `expansion-02-explainability.ts`:

```typescript
export const EXPANSION_02_SHADOW_CHIP_KEYS = [
  'emotionalRegulation',
  'physicalAffectionStyle',
] as const;

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion02ShadowChipKey,
  string
> = {
  emotionalRegulation: 'Emotional balance',
  physicalAffectionStyle: 'Affection rhythm match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion02ShadowChipKey, string> = {
  emotionalRegulation: 'emotional',
  physicalAffectionStyle: 'intimacy',
};
```

Exact chip label strings locked (match sprint README + Story 1 promotion-ready constants).

**Domain note:** `physicalAffectionStyle` uses **`intimacy`** (not `lifestyle` / `emotional`) — improves chip diversity vs `emotionalDepth`, `empathyCompassion`, Expansion-01 emotional chips.

### 2. Shadow breakdown builder (locked)

Mirror Expansion-01:

```typescript
export function buildExpansion02ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // same loop pattern as buildExpansion01ShadowBreakdown
  // uses computePairScore from compatibility-score.ts
}
```

### 3. Merge point (locked)

In `assemble-result.ts`, extend existing shadow merge:

```typescript
const shadowBreakdown = [
  ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
  ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
];
const breakdownForChips = [
  ...(compatAB.breakdown ?? []),
  ...shadowBreakdown,
];
```

**Do not** merge shadow entries into `compatAB.breakdown` used for `alignments` DTO — official alignments stay on scored keys only.

**Do not** modify `buildExpansion01ShadowBreakdown` — concat at call site only.

### 4. `match-explainability.ts` chip resolution (locked)

Extend existing shadow resolution (keep Expansion-01 imports; add Expansion-02):

```typescript
import {
  isExpansion02ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_02,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_02,
} from './expansion-02-explainability';

function isExplainabilityChipKey(key: string): boolean {
  return (
    isSignalKey(key) ||
    isExpansion01ShadowChipKey(key) ||
    isExpansion02ShadowChipKey(key)
  );
}

function chipLabelForKey(key: string): string | undefined {
  if (isSignalKey(key)) return POSITIVE_CHIP_BY_SIGNAL[key];
  if (isExpansion01ShadowChipKey(key)) return SHADOW_POSITIVE_CHIP_BY_SIGNAL_01[key];
  if (isExpansion02ShadowChipKey(key)) return SHADOW_POSITIVE_CHIP_BY_SIGNAL_02[key];
  return undefined;
}

function domainForKey(key: string): string {
  if (isSignalKey(key)) return SIGNAL_DOMAIN[key];
  if (isExpansion01ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_01[key];
  if (isExpansion02ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_02[key];
  return 'unknown';
}
```

Use import aliases (`_01` / `_02`) to avoid name collisions between shadow modules.

**Do not** add shadow keys to `isSignalKey()` — keep official/scored boundary clear.

### 5. `CHIP_TO_TRAIT` entries (locked — detail page / list TLDR)

```typescript
'Emotional balance': {
  group: 'Emotional connection',
  evidence: 'You both handle emotions in balanced, non-reactive ways',
  listPhrase: 'balanced emotional handling together',
},
'Affection rhythm match': {
  group: 'Physical connection',
  evidence: 'Your needs for touch and physical closeness align well',
  listPhrase: 'aligned touch and closeness needs',
},
```

English only in `CHIP_TO_TRAIT` (existing pattern). Browse uses i18n `chipEvidence`.

### 6. i18n evidence strings (locked — from sprint README)

**en.ts** `matches.list.browse.chipEvidence`:

```typescript
"Emotional balance":
  "You both handle emotions in balanced, non-reactive ways",
"Affection rhythm match":
  "Your needs for touch and physical closeness align well",
```

**he.ts:**

```typescript
"Emotional balance":
  "שניכם מתמודדים עם רגשות בצורה מאוזנת ולא תגובתית",
"Affection rhythm match":
  "הצורך שלכם במגע ובקרבה פיזית מתאים",
```

**es.ts:**

```typescript
"Emotional balance":
  "Ambos manejan las emociones de forma equilibrada y no reactiva",
"Affection rhythm match":
  "Sus necesidades de tacto y cercanía física están alineadas",
```

### 7. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Emotional balance',
'Affection rhythm match',
```

Existing `chip-evidence.spec.ts` loop validates locale coverage.

### 8. Chip display conditions (locked)

Same tier rules as official signals via merged breakdown:

- High chip when both `self >= 7 && partner >= 7` on shadow key, or `pairScore >= 7`, etc.
- No chip when either side null (no shadow breakdown entry)
- Diversity: `emotionalRegulation` in `emotional` domain; `physicalAffectionStyle` in **`intimacy`** domain — distinct from `physicalPriority` (`lifestyle`)

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term in `finalScore` | **None** |
| Friction (Story 3) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## API contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Emotional balance'` | `'Affection rhythm match'`
- `explainability.tensionChip` unchanged (Story 3)

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-02-explainability.spec.ts src/matches/match-explainability.spec.ts src/matches/match-explanation-traits.spec.ts --runInBand -t "Expansion-02|Emotional balance|Affection rhythm"
npm run typecheck

cd dating-ui
npm test -- chip-evidence.spec.ts
```

### Minimum backend tests

| Test | Expect |
|------|--------|
| `buildExpansion02ShadowBreakdown` both high regulation | entry with `pairScore >= 7` |
| null on one side | empty / skip key |
| `pickPositiveChips` with shadow-only high regulation | includes `'Emotional balance'` |
| both high regulation + affection | may include both (diversity caps at 3 total with official entries) |
| `buildMatchExplanationTraits(['Emotional balance'], 70)` | trait with group `Emotional connection` |

Mirror Expansion-01 `expansion-01-explainability.spec.ts` structure.

### Minimum frontend tests

| Test | Expect |
|------|--------|
| `chip-evidence.spec.ts` all locales | new keys have non-empty evidence |
| Optional: extend `match-why-section.spec.tsx` with one EN/HE case per new chip (Expansion-01 has 3 tests) |

### Manual smoke (agent 1 note in handoff)

- Profile pair with extracted Expansion-02 shadow values → browse "See why" shows new chips in EN/HE/ES
- Deferred full visual QA to Story 5 if time-boxed

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Create `expansion-02-explainability.ts` with maps + breakdown builder (§1–2).
2. Extend shadow merge in `assemble-result.ts` (§3).
3. Extend `match-explainability.ts` label/domain resolution (§4).
4. Add `CHIP_TO_TRAIT` entries (§5).
5. Update UI i18n + `CHIP_EVIDENCE_KEYS` (§6–7).
6. Add tests; run commands above.
7. **Do not** modify Expansion-01 explainability module, compatibility weights, or `COMPATIBILITY_SIGNAL_KEYS`.
8. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(matches): Expansion-02 shadow positive chips and i18n evidence

Story 4 — display-only chip overlay; no compatibility scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Shadow keys **not** in `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` union
- [ ] Shadow breakdown merged **only** for explainability chip picker
- [ ] `alignments` DTO excludes shadow keys
- [ ] Chip labels exact: `Emotional balance`, `Affection rhythm match`
- [ ] Domains: `emotional`, `intimacy`
- [ ] i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` synced
- [ ] `CHIP_TO_TRAIT` entries present
- [ ] Expansion-01 overlay unchanged
- [ ] Tests pass

---

## Open questions / blockers

- None blocking Story 4.
- **Promote story (future):** Move shadow maps into official `POSITIVE_CHIP_BY_SIGNAL` when keys join `COMPATIBILITY_SIGNAL_KEYS`; consolidate overlay modules.

---

## Next agent

```text
--agent 1 expansion 02 story 4
```

**Notes:** Mirror Expansion-01 Story 4 file-by-file. Read Story 1 shadow lock before touching `compatibility-score.ts` arrays/weights.
