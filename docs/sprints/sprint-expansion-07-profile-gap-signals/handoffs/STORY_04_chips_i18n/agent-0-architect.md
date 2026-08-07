# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips, i18n & Interest Overlap](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + pair support chips + interest-overlap chips + i18n. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01–06 Story 4 handoffs — same shadow overlay pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).

---

## Summary

- Add **three** standalone Expansion-07 shadow positive chips (`casualIntimacyIntent`, `supportExchangeOrientation`, `religiousObservance`).
- Add **two** pair-level support chips (`Financial support alignment`, `Non-transactional match`) via synthetic shadow breakdown entries (picker-compatible).
- **Do not** add standalone chips for `supportProviderOrientation` / `supportRecipientOrientation` (directional inputs only).
- Surface shared interests as **distinct interest-overlap chips** (max 2) via new DTO field — reuse existing `sharedInterestTags` pipeline; keep `sharedInterestNote` for narrative/list.
- Shadow overlay via new `expansion-07-explainability.ts`; concat in `assemble-result.ts`; EN/HE/ES browse evidence.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — max **3**, domain diversity |
| Expansion-01–06 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-07 signals | In `evaluationJson.self.signals.*` after Stories 1–2; **not** in compatibility breakdown |
| Interests today | `sharedInterestTags` → `sharedInterestNote` (“You both enjoy a, b.”) — **no dedicated chips** |
| Browse UI | `match-why-section.tsx` → signal chips via `chipToEvidence`; note may appear elsewhere via `match-display` |
| `CHIP_EVIDENCE_KEYS` | Currently **24** (through Expansion-06) — Story 4 appends **5 → 29** |
| Domains (Story 1 meta) | intimacy / relationship / values |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-07-explainability.ts` |
| 5 signal keys as chips | **3 standalone** + **2 pair-level** (provider/recipient are not standalone) |
| `sharedInterests` on explainability payload | Already have note; Story 4 adds **`interestOverlapTags`** (max 2) for chip UI |
| Distinct interest chip styling | **Yes** — separate list in `match-why-section.tsx` (not emerald signal chips) |
| Admin match-quality panel | **Defer to Story 5** unless trivial (note already available in many audit paths) |
| Tension chip i18n | **Out of scope** |
| Full expansion i18n audit | Story 4 guarantees Exp-07 chip EN/HE/ES + registry; broader audit Story 5 |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-07-explainability.ts` | **Create** — standalone + pair chip maps, breakdown builder, interest tag picker helper |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-07 shadow keys; add `interestOverlapTags?: string[]` to DTO; populate from shared interests (max 2) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion07ShadowBreakdown` |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for all 5 chip labels |
| `dating-api/src/matches/expansion-07-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | Exp-07 chip + interestOverlapTags tests |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/lib/me-matches-api.ts` | Add `interestOverlapTags?: string[]` to `MatchExplainabilityDto` |
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 5 labels (**24 → 29**) |
| `dating-ui/src/lib/i18n/en.ts` / `he.ts` / `es.ts` | `chipEvidence` ×5 + `interestOverlap` map for preferred tags |
| `dating-ui/src/lib/i18n/types.ts` | Type for `interestOverlap` if needed |
| `dating-ui/src/app/dating/me-matches/match-why-section.tsx` | Render interest-overlap chips (distinct style) |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Locale coverage + Exp-07 keys |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Signal chip + interest chip renders |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`06-explainability.ts` | Prior sprints — do not edit |
| `compatibility-score.ts` / `COMPATIBILITY_SIGNAL_KEYS` | Promote lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote |
| Tension chip i18n | Not Story 4 |
| Admin match-quality deep UI | Story 5 |
| Live Hebrew fixtures / promote | Story 5 |
| Keyword / regex interest matching | Forbidden — use existing normalized tag intersection only |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip map (locked)

Create `expansion-07-explainability.ts`:

```typescript
/** Standalone chips (pairScore from real signals). */
export const EXPANSION_07_STANDALONE_CHIP_KEYS = [
  'casualIntimacyIntent',
  'supportExchangeOrientation',
  'religiousObservance',
] as const;

/**
 * Virtual keys for pair-level chips only (NOT extraction / EnrichedSignals keys).
 * Injected as synthetic BreakdownEntry rows when pair predicates match.
 */
export const EXPANSION_07_PAIR_CHIP_KEYS = [
  'supportFinancialAlignment',
  'supportNonTransactional',
] as const;

export const EXPANSION_07_SHADOW_CHIP_KEYS = [
  ...EXPANSION_07_STANDALONE_CHIP_KEYS,
  ...EXPANSION_07_PAIR_CHIP_KEYS,
] as const;

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL = {
  casualIntimacyIntent: 'Intimacy expectations',
  supportExchangeOrientation: 'Support & arrangement style',
  religiousObservance: 'Religious practice',
  supportFinancialAlignment: 'Financial support alignment',
  supportNonTransactional: 'Non-transactional match',
} as const;

export const SHADOW_SIGNAL_DOMAIN = {
  casualIntimacyIntent: 'intimacy',
  supportExchangeOrientation: 'relationship',
  religiousObservance: 'values',
  supportFinancialAlignment: 'relationship',
  supportNonTransactional: 'relationship',
} as const;
```

Exact chip labels locked (match sprint README + Story 1 meta).

### 2. Shadow breakdown builder (locked)

```typescript
export function buildExpansion07ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // 1) Standalone keys — mirror Expansion-06 loop + computePairScore
  // 2) Pair synthetic entries (mutually exclusive in practice):
  //    - both supportExchangeOrientation <= 3 → supportNonTransactional (pairScore 10)
  //    - both exchange >= 7 AND provider↔recipient align → supportFinancialAlignment (pairScore 10)
  //    Alignment: (aProv>=7 && bRec>=7) || (bProv>=7 && aRec>=7); all four direction signals non-null
}
```

Pair predicates locked from README Story 3 helper (positive only — do **not** emit tension here).

Synthetic entry shape:

```typescript
{
  key: 'supportFinancialAlignment', // or supportNonTransactional
  self: 9,
  partner: 9,
  gap: 0,
  pairScore: 10,
}
```

### 3. Merge point (locked)

In `assemble-result.ts`, append after Expansion-06:

```typescript
...buildExpansion07ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.

### 4. `match-explainability.ts` chip resolution (locked)

Import Expansion-07 with `_07` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_06`).

**Do not** add keys to `isSignalKey()`.

### 5. Interest overlap tags (locked)

**DTO** (`MatchExplainabilityDto` backend + `dating-ui` `me-matches-api.ts`):

```typescript
/** Up to 2 shared interest tags for distinct overlap chips (canonical preferred). */
interestOverlapTags?: string[];
```

**Population** in `buildMatchExplainability`:

1. Start from `input.sharedInterests` (already normalized intersection from engine).
2. Prefer tags whose normalized form is in:

```typescript
export const INTEREST_OVERLAP_CHIP_PREFERRED_TAGS = [
  'books', 'travel', 'hiking', 'movies', 'cooking', 'music', 'gym', 'beach',
] as const;
```

3. Take preferred hits first (stable order of `sharedInterests`), then fill from remaining shared tags.
4. Cap at **max 2**.
5. Emit normalized lowercase underscore form (same as `normTag`) for stable i18n keys.
6. Keep existing `sharedInterestNote` behavior (may still use up to 3 labels) — do not remove.

Helper may live in `expansion-07-explainability.ts` as `pickInterestOverlapTags(shared: string[]): string[]` or next to `interest-alignment.ts` — prefer expansion-07 file to keep Story 4 localized, or `interest-alignment.ts` if cleaner; agent 1 choice OK if tests cover.

### 6. Frontend interest chips (locked)

In `match-why-section.tsx`:

- After signal/tension chips (or separate `ul`), render `interestOverlapTags` with **distinct** class (not emerald signal style — e.g. zinc/sky outline).
- Copy via `browse.interestOverlap[tag]` with fallback to tag or `You both enjoy ${tag}`.
- `data-testid="match-why-interest-chips"`.

### 7. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Intimacy expectations` | Physical connection | You're aligned on what physical intimacy means in your connection | aligned intimacy expectations |
| `Support & arrangement style` | Relationship structure | You share similar expectations about support and relationship structure | similar support expectations |
| `Financial support alignment` | Relationship structure | You're aligned on financial support in the relationship | aligned financial support |
| `Non-transactional match` | Relationship structure | You both want a relationship without financial arrangements | non-transactional relationship |
| `Religious practice` | Values match | Your level of religious practice is well-matched | matched religious practice |

### 8. i18n evidence (locked — from sprint README)

**chipEvidence** (EN / HE / ES) — exact README strings for the five chip labels.

**interestOverlap** (new map under `matches.list.browse`):

| Tag | EN | HE | ES |
|-----|----|----|-----|
| `travel` | You both love travel | שניכם אוהבים לטייל | A ambos les gusta viajar |
| `books` | You both enjoy reading | שניכם נהנים לקרוא | A ambos les gusta leer |
| `hiking` | You both enjoy hiking | שניכם נהנים מטיולים רגליים | A ambos les gusta hacer senderismo |
| `movies` | You both love movies | שניכם אוהבים סרטים | A ambos les gustan las películas |
| `cooking` | You both enjoy cooking | שניכם נהנים לבשל | A ambos les gusta cocinar |
| `music` | You both love music | שניכם אוהבים מוזיקה | A ambos les gusta la música |
| `gym` | You both enjoy the gym | שניכם נהנים מהחדר כושר | A ambos les gusta el gimnasio |
| `beach` | You both love the beach | שניכם אוהבים את הים | A ambos les gusta la playa |

Other tags (if any fill the max-2): UI fallback — do not require every canonical tag in i18n for Story 4.

### 9. `CHIP_EVIDENCE_KEYS` (locked)

Append (order):

```typescript
'Intimacy expectations',
'Support & arrangement style',
'Financial support alignment',
'Non-transactional match',
'Religious practice',
```

**24 → 29.** Update “10 expansion product chips” test to include Exp-07 chips **or** add a separate Exp-07 assert (keep Exp-01–06 “10” test intact; add Exp-07 five-chip assert).

### 10. Chip display conditions (locked)

- Standalone: same as prior expansions via `computePairScore` / picker (≥7 both or high pairScore).
- Pair synthetic: only when predicates match; `pairScore: 10` so they compete strongly in picker (may displace weaker chips — acceptable).
- Max **3** positive signal chips total still applies (pair chips count toward the 3).
- Interest chips are **outside** the 3-slot picker (separate field).

### 11. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| Compatibility / `COMPATIBILITY_SIGNAL_KEYS` | **None** |
| Friction (Story 3) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `explainability.interestOverlapTags` | **Yes** — display only |
| `alignments` DTO | **No** Exp-07 keys |

### 12. Agent 4

**Skip.**

---

## API / HTTP contracts

Additive optional field:

```typescript
interestOverlapTags?: string[]; // max 2
```

Existing `positiveChips` may include the five new English labels. `sharedInterestNote` unchanged.

Propagate DTO typing wherever list/detail explainability is typed (API + UI). If Nest DTO class exists for explainability, add optional property there too.

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-07-explainability.spec.ts src/matches/match-explainability.spec.ts src/matches/match-explanation-traits.spec.ts --runInBand -t "Expansion-07|Intimacy expectations|Financial support|Non-transactional|Religious practice|interestOverlap"
npm run typecheck

cd dating-ui
npm test -- chip-evidence.spec.ts match-why-section.spec.tsx
```

### Minimum backend tests

| Test | Expect |
|------|--------|
| Standalone both high casual / exchange / religious | breakdown entries + chips |
| Null one side | skip standalone key |
| Pair: exch 9/9, aProv 9 / bRec 9 | chip `Financial support alignment` |
| Pair: exch 2/2 | chip `Non-transactional match` |
| Pair: exch 9/9 both high provider | **no** financial alignment chip (tension Story 3 only) |
| `pickInterestOverlapTags(['travel','books','xyz'])` | `['travel','books']` max 2 preferred |
| `buildMatchExplainability` with sharedInterests | `interestOverlapTags` length ≤ 2 |

### Minimum frontend tests

| Test | Expect |
|------|--------|
| chip-evidence locales | 5 new keys non-empty EN/HE/ES |
| match-why-section | Exp-07 signal chip evidence renders |
| match-why-section | interest overlap chips render with distinct testid when tags present |

---

## E2E verification

N/A — Story 5 / operator browse QA.

---

## Agent 1 instructions

1. Create `expansion-07-explainability.ts` (§1–2) + specs.
2. Wire assemble-result + match-explainability resolution + `interestOverlapTags` (§3–5).
3. Add `CHIP_TO_TRAIT` entries (§7).
4. Frontend: DTO type, `CHIP_EVIDENCE_KEYS`, i18n, match-why-section interest chips (§6–9).
5. Run tests; write `agent-1-dev.md` under `docs/sprints/.../STORY_04_chips_i18n/`.
6. **Do not** promote scoring, edit Exp-01–06 explainability maps, or add provider/recipient standalone chips.
7. Do not commit unless user asks.

Suggested commit:

```
feat(matches): Expansion-07 shadow chips, pair support chips, interest overlap

Story 4 — display-only overlays + i18n; no compatibility scoring promote.
```

---

## Agent 2 CR checklist

- [ ] Shadow overlay only — no `COMPATIBILITY_SIGNAL_KEYS` / official `POSITIVE_CHIP_BY_SIGNAL`
- [ ] Three standalone + two pair chips; no provider/recipient standalone
- [ ] Pair predicates match README (exchange≤3 vs provider↔recipient)
- [ ] `assemble-result` concat includes Exp-07; alignments unchanged
- [ ] `interestOverlapTags` max 2; preferred tag set; distinct UI rendering
- [ ] `CHIP_EVIDENCE_KEYS` **29**; EN/HE/ES chipEvidence for five labels
- [ ] `CHIP_TO_TRAIT` for five labels
- [ ] No keyword interest matching
- [ ] Tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures, provider/recipient pair E2E, admin panel polish, full chip i18n audit, optional promote gate.

---

## Next agent

```text
--agent 1 expansion 07 story 4
```

**Notes:** Mirror Exp-06 overlay for standalone keys; pair chips via synthetic breakdown rows; interest chips via new DTO field (outside the 3-slot picker). Keep shadow / no scoring promote.
