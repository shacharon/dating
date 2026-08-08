# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + browse i18n + optional onboarding writing prompts. Wire shadow domains **`relationship`** / **`social`** into chip diversity. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-14 Story 4 handoff — synthetic dual-band + assemble/resolution pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` master onboarding prompts)

---

## Summary

- Add Expansion-15 shadow positive chips via new `expansion-15-explainability.ts`:
  - **Aligned family** → synthetic **`Family style match`** when both `familyEnmeshment` ≥ 7 **or** both ≤ 3 — similar closeness/boundaries either direction; **not** raw pairScore mid-noise.
  - **Aligned friends/couple** → synthetic **`Friends & couple balance`** when both `friendCoupleBalance` ≥ 7 **or** both ≤ 3 — both couple-centric **or** both friends-first; polarity lock (low = friends-first, high = couple-centric) — do **not** invert.
  - **Aligned alone-time** → synthetic **`Recharge style match`** when both `aloneTimeNeed` ≥ 7 **or** both ≤ 3 — similar solo-recharge need either direction.
- Wire shadow breakdown merge in `assemble-result.ts` **after Exp-14**; resolve chips in `match-explainability.ts` (`_15` alias).
- Browse EN/HE/ES `chipEvidence` + `CHIP_EVIDENCE_KEYS` (**40 → 43**).
- Add Phase 6 onboarding writing-prompt questions (EN/HE required; ES locked for parity) into existing `writingPrompts.aboutMe.questions` — **no** new form fields / API.
- Domains: family chip → **`relationship`**; friend/couple + recharge chips → **`social`** (Story 1 promotion domains).
- Tension chips from Story 3 already English in API — tension i18n **out of scope**.
- **Do not** invent Expansion-08 chips here.
- **Do not** ship Story 1 metadata labels **`Family closeness`** / **`Alone time needs`** as browse positive chips (promote-meta only). Browse **`Friends & couple balance`** may equal Story 1 meta string — intentional OK (tension stays `Friends vs couple time`).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — domain diversity; candidates need pairScore ≥7/6/5 tiers |
| Expansion-01–07 / 10–14 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Expansion-08 overlay | **Does not exist** — do not create Exp-08 modules in this story |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-15 signals | In `evaluationJson.self.signals.{familyEnmeshment\|friendCoupleBalance\|aloneTimeNeed}` after Stories 1–2; **not** in compatibility breakdown |
| Tension chips | Story 3 English `TENSION_CHIP_BY_ID` — already live |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **40** (through Expansion-14) — Story 4 appends **3 → 43** |
| Domains (Story 1 meta) | family → **`relationship`**; friendCouple + aloneTime → **`social`** |
| Chip labels (README Story 4) | `Family style match` / `Friends & couple balance` / `Recharge style match` |
| Onboarding texts | `onboarding.writingPrompts.aboutMe.questions` — optional ideas, same free-text fields |
| `computePairScore` | Gap-based — both 9/9 and both 2/2 → pairScore 10 — OK for “similar” dual-band copy **only if** gated by dual-band predicates (do **not** emit on mid 5/5) |
| Story 3 tension | All three ≥8 vs ≤3 gaps — positives must **not** fire on those pairs (dual-band ≥7/≤3 naturally excludes 9 vs 2) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` / `match-explainability.ts` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-15-explainability.ts`; wire resolution only |
| `familyEnmeshment` (aligned) → Family style match | **Synthetic dual-band:** both ≥ 7 **or** both ≤ 3 |
| `friendCoupleBalance` (aligned) → Friends & couple balance | **Synthetic dual-band:** both ≥ 7 **or** both ≤ 3 (couple-centric ↔ friends-first) |
| `aloneTimeNeed` (aligned) → Recharge style match | **Synthetic dual-band:** both ≥ 7 **or** both ≤ 3 |
| Story 1 meta chips | **Not** browse positives except `Friends & couple balance` string may equal meta |
| Wire domains into chip-diversity | Via `SHADOW_SIGNAL_DOMAIN` on Exp-15 chip keys — **do not** extend scored `SIGNAL_DOMAIN: Record<SignalKey, string>` until promote |
| Profile onboarding copy | Append to **`writingPrompts.aboutMe.questions`** — **not** new DB fields / required form |
| Onboarding EN/HE | **Required**; also add **ES** (locale triad) |
| Tension chip i18n | **Out of scope** |
| Promote / scoring | **Forbidden** — Story 5 / future promote |
| Expansion-08 chips | **Out of scope** |
| Files list omits backend overlay / traits / assemble | **Ship full Exp-14 pattern** including `expansion-15-explainability.ts`, assemble merge, traits |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-15-explainability.ts` | **Create** — three synthetic pair chips + domains + builder |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-15 shadow keys (`isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey`) with `_15` alias |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion15ShadowBreakdown` **after** Exp-14 |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for three chip labels |
| `dating-api/src/matches/expansion-15-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 3 labels (**40 → 43**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` ×3 + 3 `writingPrompts.aboutMe.questions` |
| `dating-ui/src/lib/i18n/he.ts` | Same |
| `dating-ui/src/lib/i18n/es.ts` | Same |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Length **43** + Exp-15 labels |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Exp-15 chips |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`07` / `10`–`14-explainability.ts` maps | Prior sprints — do not edit maps/labels |
| Expansion-08 explainability / chips | Different unfinished sprint |
| `compatibility-score.ts` / `COMPATIBILITY_SIGNAL_KEYS` | Promote lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote |
| Scored `SIGNAL_DOMAIN` Record | Keys not `SignalKey` until promote |
| Tension chip i18n | Not Story 4 |
| New Prisma fields / onboarding API | Prompts are copy-only into existing About me |
| Live Hebrew fixtures / >85% / Phase 6 promote-all | Story 5 |
| Keyword / regex chip scoring | Forbidden |
| Extraction / tension-rules | Stories 1–3 complete |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip module (locked)

Create `expansion-15-explainability.ts`:

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';

/**
 * Virtual keys for Expansion-15 positive chips only (NOT extraction keys).
 * familyStyleMatch: both familyEnmeshment >= 7 OR both <= 3
 * friendCoupleAligned: both friendCoupleBalance >= 7 OR both <= 3
 * rechargeStyleMatch: both aloneTimeNeed >= 7 OR both <= 3
 */
export const EXPANSION_15_PAIR_CHIP_KEYS = [
  'familyStyleMatch',
  'friendCoupleAligned',
  'rechargeStyleMatch',
] as const;

export const EXPANSION_15_SHADOW_CHIP_KEYS = [
  ...EXPANSION_15_PAIR_CHIP_KEYS,
] as const;

export type Expansion15ShadowChipKey =
  (typeof EXPANSION_15_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion15ShadowChipKey,
  string
> = {
  familyStyleMatch: 'Family style match',
  friendCoupleAligned: 'Friends & couple balance',
  rechargeStyleMatch: 'Recharge style match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion15ShadowChipKey, string> = {
  familyStyleMatch: 'relationship',
  friendCoupleAligned: 'social',
  rechargeStyleMatch: 'social',
};

export function isExpansion15ShadowChipKey(
  key: string,
): key is Expansion15ShadowChipKey {
  return (EXPANSION_15_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion15ShadowChipKey): BreakdownEntry {
  return {
    key,
    self: 9,
    partner: 9,
    gap: 0,
    pairScore: 10,
  };
}

function dualBandAligned(
  a: number | null,
  b: number | null,
): boolean {
  return (
    a != null &&
    b != null &&
    ((a >= 7 && b >= 7) || (a <= 3 && b <= 3))
  );
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];

  if (
    dualBandAligned(
      finiteOrNull(signalsA.familyEnmeshment),
      finiteOrNull(signalsB.familyEnmeshment),
    )
  ) {
    out.push(syntheticPairEntry('familyStyleMatch'));
  }

  if (
    dualBandAligned(
      finiteOrNull(signalsA.friendCoupleBalance),
      finiteOrNull(signalsB.friendCoupleBalance),
    )
  ) {
    out.push(syntheticPairEntry('friendCoupleAligned'));
  }

  if (
    dualBandAligned(
      finiteOrNull(signalsA.aloneTimeNeed),
      finiteOrNull(signalsB.aloneTimeNeed),
    )
  ) {
    out.push(syntheticPairEntry('rechargeStyleMatch'));
  }

  return out;
}

export function buildExpansion15ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildPairChipEntries(signalsA, signalsB);
}
```

**Critical:**
- Do **not** add extraction keys as standalone chip keys.
- Do **not** change Story 3 tension rules.
- Dual-band ≥7 / ≤3 for **all three** — evidence is “similar style”, and both poles are valid (enmeshed↔independent; couple-centric↔friends-first; high alone↔low alone).
- Tension pairs (9 vs 2) must **not** emit positives.
- Mid aligned (5/5) must **not** emit positives.

### 2. Merge point (locked)

In `assemble-result.ts`, append **after** Expansion-14:

```typescript
...buildExpansion14ShadowBreakdown(signalsA, signalsB),
...buildExpansion15ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.  
**Do not** insert an Expansion-08 stub.

### 3. `match-explainability.ts` chip resolution (locked)

Import Expansion-15 with `_15` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_14`).

**Do not** add keys to `isSignalKey()`.

### 4. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Family style match` | Relationship structure | You have a similar sense of family closeness and boundaries | similar family closeness / boundaries |
| `Friends & couple balance` | Lifestyle match | You balance friends and couple time in a similar way | similar friends vs couple balance |
| `Recharge style match` | Lifestyle match | You have a similar need for alone time to recharge | similar alone-time / recharge needs |

### 5. i18n evidence (locked — from sprint README)

**chipEvidence** keys = English chip labels.

**en.ts:**

```typescript
"Family style match":
  "You have a similar sense of family closeness and boundaries",
"Friends & couple balance":
  "You balance friends and couple time in a similar way",
"Recharge style match":
  "You have a similar need for alone time to recharge",
```

**he.ts:**

```typescript
"Family style match":
  "יש לכם תחושה דומה של קרבה משפחתית וגבולות",
"Friends & couple balance":
  "אתם מאזנים בין חברים לזמן זוגי בצורה דומה",
"Recharge style match":
  "יש לכם צורך דומה בזמן לבד להיטען מחדש",
```

**es.ts:**

```typescript
"Family style match":
  "Tienen una sensación similar de cercanía familiar y límites",
"Friends & couple balance":
  "Equilibran el tiempo con amigos y en pareja de forma similar",
"Recharge style match":
  "Tienen una necesidad similar de tiempo a solas para recargar energías",
```

### 6. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Family style match',
'Friends & couple balance',
'Recharge style match',
```

Existing `chip-evidence.spec.ts` should assert length **43** + Exp-15 labels (update Exp-14 length assert from **40** if it hard-codes total).

### 7. Onboarding writing prompts (locked)

Append **exactly** these three strings to `onboarding.writingPrompts.aboutMe.questions` (after existing questions — do not remove prior prompts). Source: sprint README / Phase 6 master table.

| Locale | Prompt |
|--------|--------|
| EN | `How involved is your family in your day-to-day decisions?` |
| EN | `A great weekend for me balances friends, alone time, and us time like…` |
| EN | `How do you recharge after a long week?` |
| HE | `כמה המשפחה שלך מעורבת בהחלטות היומיומיות שלך?` |
| HE | `סוף שבוע מושלם בשבילי מאזן בין חברים, זמן לבד וזמן ביחד ב...` |
| HE | `איך את/ה נטען/ת מחדש אחרי שבוע ארוך?` |
| ES | `¿Cuánto se involucra tu familia en tus decisiones del día a día?` |
| ES | `Un gran fin de semana para mí equilibra amigos, tiempo a solas y tiempo juntos así…` |
| ES | `¿Cómo recargas energías después de una semana larga?` |

**Product locks:**
- Optional ideas only — same About me free-text field; **no** new schema / required step.
- Answers already feed LLM extractor (Story 2) when present in about-me text.
- Do **not** add dedicated UI widgets beyond the existing writing-prompts questions list.
- Ellipsis: EN/ES use `…` where README uses it; HE uses `...` / `?` as in Phase 6 / README table.

### 8. Chip display conditions (locked)

| Chip | When it appears |
|------|-----------------|
| `Family style match` | Both `familyEnmeshment` ≥ 7 **or** both ≤ 3 |
| `Friends & couple balance` | Both `friendCoupleBalance` ≥ 7 **or** both ≤ 3 |
| `Recharge style match` | Both `aloneTimeNeed` ≥ 7 **or** both ≤ 3 |
| None of the above | Null either side; tension gap pairs (high vs low); mid without dual-band |

Friend/couple + recharge chips share domain **`social`** — soft diversity may pick at most one of them when slots compete; that is OK. Family uses **`relationship`**.

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term | **None** |
| Friction (Story 3) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |
| Scored `SIGNAL_DOMAIN` | **Unchanged** — domains only on shadow overlay |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## Service signatures

```typescript
export function buildExpansion15ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[];
```

No new public HTTP methods.

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Family style match'` | `'Friends & couple balance'` | `'Recharge style match'`
- Tension chips unchanged from Story 3 (`Family involvement gap` / `Friends vs couple time` / `Different alone-time needs`)

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-15-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-15|Family style match|Friends & couple balance|Recharge style match"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Family style match|Friends & couple balance|Recharge style match"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-15|Family style match|Friends & couple balance|Recharge style match"
```

Architect: not run. (**dating-ui uses vitest**, not jest.)

### Minimum test cases

**`expansion-15-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| both family ≥7 | synthetic `familyStyleMatch` |
| both family ≤3 | synthetic `familyStyleMatch` |
| family 9 / 2 | **no** (tension territory) |
| family 5 / 5 | **no** (mid not dual-band) |
| family 7 / 7 | boundary fires |
| family 6 / 7 | **no** |
| both friendCouple ≥7 | `friendCoupleAligned` |
| both friendCouple ≤3 | `friendCoupleAligned` |
| friendCouple 9 / 2 | **no** |
| both alone ≥7 | `rechargeStyleMatch` |
| both alone ≤3 | `rechargeStyleMatch` |
| alone 9 / 2 | **no** |
| either side null | no entry for that chip |
| chip map labels exact | three README browse strings |
| domains | relationship / social / social |

**`match-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| synthetic family | positiveChips contains `Family style match` |
| synthetic friend/couple | contains `Friends & couple balance` |
| synthetic recharge | contains `Recharge style match` |

**Frontend:**

| Case | Expect |
|------|--------|
| chip-evidence | length **43**; three new keys EN/HE/ES |
| match-why-section | renders evidence for Exp-15 chip labels |
| optional | writing-prompt questions include new EN/HE/ES strings |

---

## Agent 1 instructions

1. Create `expansion-15-explainability.ts` (§1) + unit specs (include dual-band fire; tension-pair **no** chip; mid **no** chip).
2. Wire `assemble-result.ts` after Exp-14 + `match-explainability.ts` resolution (§2–3).
3. Add `CHIP_TO_TRAIT` (§4).
4. Append `CHIP_EVIDENCE_KEYS` + EN/HE/ES `chipEvidence` (§5–6).
5. Append onboarding `writingPrompts.aboutMe.questions` EN/HE/ES (§7).
6. Update frontend specs; run verification commands (**vitest** for UI).
7. **Do not** touch Exp-01–07/10–14 explainability maps, Exp-08, scoring promote, tension i18n, or extraction.
8. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-15-family-social-ecosystem/handoffs/STORY_04_chips_i18n/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-15 family social ecosystem positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Agent 2 CR checklist

- [ ] `expansion-15-explainability.ts` exists with exact labels/domains (`relationship` / `social` / `social`)
- [ ] Assembled after Exp-14; **no** Exp-08 stub invented
- [ ] Resolution wired in `match-explainability.ts` (`_15` alias)
- [ ] All three chips are **dual-band ≥7 / ≤3** (not both-high-only; not raw pairScore)
- [ ] Tension pairs (9 vs 2) and mid (5/5) do **not** emit positives
- [ ] No standalone extraction-key pairScore chip keys
- [ ] `CHIP_TO_TRAIT` + `CHIP_EVIDENCE_KEYS` (**43**) + EN/HE/ES evidence exact
- [ ] Onboarding prompts appended EN/HE/ES; no new schema fields
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` / scored `SIGNAL_DOMAIN` promote
- [ ] No keyword chip scoring / text-inference drift
- [ ] Prior expansion explainability files untouched
- [ ] `friendCoupleBalance` polarity not inverted in copy (friends-first ↔ couple-centric)
- [ ] Unit tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures; >85%; compare E2E; Phase 6 full checklist; optional promote; Exp-08 chips remain a separate sprint debt.
- **Domain diversity:** Two Exp-15 chips share `social` — they soft-compete with each other and other social-domain chips.
- **Label collision note:** Browse `Friends & couple balance` equals Story 1 meta string — intentional OK. Tension `Friends vs couple time` ≠ browse/meta. Meta `Family closeness` / `Alone time needs` ≠ browse `Family style match` / `Recharge style match`.

---

## Next agent

```text
--agent 1 expansion 15 story 4
```

**Notes:** Shadow overlay only. All three dual-band synthetics — not raw pairScore. Meta chips ≠ browse chips (except friends/couple string). Onboarding = writing-prompt copy into existing About me, not a new field. Domains via shadow overlay only until promote. Keep `friendCoupleBalance` polarity: low = friends-first, high = couple-centric.
