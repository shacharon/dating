# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + browse i18n + optional onboarding writing prompts. Wire shadow domains **`relationship`** / **`intimacy`** into chip diversity. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-13 Story 4 handoff — synthetic both-high / dual-band + assemble/resolution pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` master onboarding prompts)

---

## Summary

- Add Expansion-14 shadow positive chips via new `expansion-14-explainability.ts`:
  - **Both-high patience** → synthetic **`Patience match`** when both `patienceTolerance` ≥ 7 — **not** raw pairScore (both-critical would falsely match evidence “both patient”).
  - **Aligned pacing** → synthetic **`Pace of closeness`** when both `intimacyPacing` ≥ 7 **or** both ≤ 3 — similar pace either direction; **not** raw pairScore mid-noise.
  - **Aligned monogamy** → synthetic **`Aligned on relationship structure`** when both `monogamyAlignment` ≤ 2 **or** both ≥ 7 (Story 3 PM lock) — mono–mono or open–open; **not** mono vs open (that is Story 3 tension).
- Wire shadow breakdown merge in `assemble-result.ts` **after Exp-13**; resolve chips in `match-explainability.ts` (`_14` alias).
- Browse EN/HE/ES `chipEvidence` + `CHIP_EVIDENCE_KEYS` (**37 → 40**).
- Add Phase 6 onboarding writing-prompt questions (EN/HE required; ES locked for parity) into existing `writingPrompts.aboutMe.questions` — **no** new form fields / API.
- Domains: patience + monogamy chips → **`relationship`**; pacing chip → **`intimacy`** (Story 1 promotion domains).
- Tension chips from Story 3 already English in API — tension i18n **out of scope**.
- **Do not** invent Expansion-08 chips here.
- **Do not** ship Story 1 metadata labels **`Patience with differences`** / **`Relationship structure`** as browse positive chips (promote-meta only). Browse pacing label **`Pace of closeness`** may match meta string — that is OK.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — domain diversity; candidates need pairScore ≥7/6/5 tiers |
| Expansion-01–07 / 10–13 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Expansion-08 overlay | **Does not exist** — do not create Exp-08 modules in this story |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-14 signals | In `evaluationJson.self.signals.{patienceTolerance\|intimacyPacing\|monogamyAlignment}` after Stories 1–2; **not** in compatibility breakdown |
| Tension chips | Story 3 English `TENSION_CHIP_BY_ID` — already live |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **37** (through Expansion-13) — Story 4 appends **3 → 40** |
| Domains (Story 1 meta) | patience/monogamy → **`relationship`**; pacing → **`intimacy`** |
| Chip labels (README Story 4) | `Patience match` / `Pace of closeness` / `Aligned on relationship structure` |
| Onboarding texts | `onboarding.writingPrompts.aboutMe.questions` — optional ideas, same free-text fields |
| `computePairScore` | Gap-based — both 9/9 and both 2/2 → pairScore 10 — unsafe for patience “both patient” copy |
| Story 3 tension | Monogamy ≤2 vs ≥8 mismatch; patience/pacing ≥8 vs ≤3 gaps — positives must not fire on those pairs |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` / `match-explainability.ts` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-14-explainability.ts`; wire resolution only |
| `patienceTolerance` (aligned) → Patience match | **Synthetic both-high ≥ 7** — evidence says “both patient”; both-critical must **not** fire |
| `intimacyPacing` (aligned) → Pace of closeness | **Synthetic dual-band:** both ≥ 7 **or** both ≤ 3 (similar pace either direction) |
| Monogamy aligned → Aligned on relationship structure | **Synthetic dual-band:** both ≤ 2 **or** both ≥ 7 (Story 3 PM) |
| Story 1 meta chips | **Not** browse positives except pacing string may equal meta `Pace of closeness` |
| Wire domains into chip-diversity | Via `SHADOW_SIGNAL_DOMAIN` on Exp-14 chip keys — **do not** extend scored `SIGNAL_DOMAIN: Record<SignalKey, string>` until promote |
| Profile onboarding copy | Append to **`writingPrompts.aboutMe.questions`** — **not** new DB fields / required form |
| Onboarding EN/HE | **Required**; also add **ES** (locale triad) |
| Tension chip i18n | **Out of scope** |
| Promote / scoring | **Forbidden** — Story 5 / future promote |
| Expansion-08 chips | **Out of scope** |
| HG hard filter | **Out of scope** (product later) |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-14-explainability.ts` | **Create** — three synthetic pair chips + domains + builder |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-14 shadow keys (`isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey`) with `_14` alias |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion14ShadowBreakdown` **after** Exp-13 |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for three chip labels |
| `dating-api/src/matches/expansion-14-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 3 labels (**37 → 40**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` ×3 + 3 `writingPrompts.aboutMe.questions` |
| `dating-ui/src/lib/i18n/he.ts` | Same |
| `dating-ui/src/lib/i18n/es.ts` | Same |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Length **40** + Exp-14 labels |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Exp-14 chips |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`07` / `10`–`13-explainability.ts` maps | Prior sprints — do not edit maps/labels |
| Expansion-08 explainability / chips | Different unfinished sprint |
| `compatibility-score.ts` / `COMPATIBILITY_SIGNAL_KEYS` | Promote lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote |
| Scored `SIGNAL_DOMAIN` Record | Keys not `SignalKey` until promote |
| Tension chip i18n | Not Story 4 |
| New Prisma fields / onboarding API | Prompts are copy-only into existing About me |
| Live Hebrew fixtures / >85% / promote | Story 5 |
| Keyword / regex chip scoring | Forbidden |
| Extraction / tension-rules | Stories 1–3 complete |
| HG hard filter | Product later |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip module (locked)

Create `expansion-14-explainability.ts`:

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';

/**
 * Virtual keys for Expansion-14 positive chips only (NOT extraction keys).
 * patienceMatch: both patienceTolerance >= 7
 * intimacyPaceAligned: both intimacyPacing >= 7 OR both <= 3
 * monogamyStructureAligned: both monogamyAlignment <= 2 OR both >= 7
 */
export const EXPANSION_14_PAIR_CHIP_KEYS = [
  'patienceMatch',
  'intimacyPaceAligned',
  'monogamyStructureAligned',
] as const;

export const EXPANSION_14_SHADOW_CHIP_KEYS = [
  ...EXPANSION_14_PAIR_CHIP_KEYS,
] as const;

export type Expansion14ShadowChipKey =
  (typeof EXPANSION_14_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion14ShadowChipKey,
  string
> = {
  patienceMatch: 'Patience match',
  intimacyPaceAligned: 'Pace of closeness',
  monogamyStructureAligned: 'Aligned on relationship structure',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion14ShadowChipKey, string> = {
  patienceMatch: 'relationship',
  intimacyPaceAligned: 'intimacy',
  monogamyStructureAligned: 'relationship',
};

export function isExpansion14ShadowChipKey(
  key: string,
): key is Expansion14ShadowChipKey {
  return (EXPANSION_14_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion14ShadowChipKey): BreakdownEntry {
  return {
    key,
    self: 9,
    partner: 9,
    gap: 0,
    pairScore: 10,
  };
}

function buildPairChipEntries(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];

  const aP = finiteOrNull(signalsA.patienceTolerance);
  const bP = finiteOrNull(signalsB.patienceTolerance);
  if (aP != null && bP != null && aP >= 7 && bP >= 7) {
    out.push(syntheticPairEntry('patienceMatch'));
  }

  const aI = finiteOrNull(signalsA.intimacyPacing);
  const bI = finiteOrNull(signalsB.intimacyPacing);
  if (
    aI != null &&
    bI != null &&
    ((aI >= 7 && bI >= 7) || (aI <= 3 && bI <= 3))
  ) {
    out.push(syntheticPairEntry('intimacyPaceAligned'));
  }

  const aM = finiteOrNull(signalsA.monogamyAlignment);
  const bM = finiteOrNull(signalsB.monogamyAlignment);
  if (
    aM != null &&
    bM != null &&
    ((aM <= 2 && bM <= 2) || (aM >= 7 && bM >= 7))
  ) {
    out.push(syntheticPairEntry('monogamyStructureAligned'));
  }

  return out;
}

export function buildExpansion14ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildPairChipEntries(signalsA, signalsB);
}
```

**Critical:**
- Do **not** add extraction keys as standalone chip keys.
- Do **not** change Story 3 tension rules.
- Monogamy low band for **positive** is ≤2 (aligned mono); tension mismatch is ≤2 vs ≥8 — keep consistent.
- Patience both-low (critical) must **not** emit `Patience match`.

### 2. Merge point (locked)

In `assemble-result.ts`, append **after** Expansion-13:

```typescript
...buildExpansion13ShadowBreakdown(signalsA, signalsB),
...buildExpansion14ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.  
**Do not** insert an Expansion-08 stub.

### 3. `match-explainability.ts` chip resolution (locked)

Import Expansion-14 with `_14` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_13`).

**Do not** add keys to `isSignalKey()`.

### 4. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Patience match` | Emotional connection | You're both patient and accepting of each other's quirks | both patient with quirks |
| `Pace of closeness` | Physical connection | You move toward closeness at a similar pace | similar pace to closeness |
| `Aligned on relationship structure` | Relationship structure | You're aligned on what exclusivity means to you | aligned on exclusivity / structure |

### 5. i18n evidence (locked — from sprint README)

**chipEvidence** keys = English chip labels.

**en.ts:**

```typescript
"Patience match":
  "You're both patient and accepting of each other's quirks",
"Pace of closeness":
  "You move toward closeness at a similar pace",
"Aligned on relationship structure":
  "You're aligned on what exclusivity means to you",
```

**he.ts:**

```typescript
"Patience match":
  "שניכם סבלניים ומקבלים את הייחודיות של השני",
"Pace of closeness":
  "אתם מתקדמים לקרבה בקצב דומה",
"Aligned on relationship structure":
  "אתם מסונכרנים לגבי המשמעות של בלעדיות עבורכם",
```

**es.ts:**

```typescript
"Patience match":
  "Ambos son pacientes y aceptan las diferencias del otro",
"Pace of closeness":
  "Avanzan hacia la cercanía a un ritmo similar",
"Aligned on relationship structure":
  "Están alineados sobre lo que significa la exclusividad",
```

### 6. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Patience match',
'Pace of closeness',
'Aligned on relationship structure',
```

Existing `chip-evidence.spec.ts` should assert length **40** + Exp-14 labels (and keep Exp-13 length assert updated if it hard-codes **37**).

### 7. Onboarding writing prompts (locked)

Append **exactly** these three strings to `onboarding.writingPrompts.aboutMe.questions` (after existing questions — do not remove prior prompts). Source: sprint README / Phase 6 master table.

| Locale | Prompt |
|--------|--------|
| EN | `Something about my partner that would test my patience, and how I'd handle it…` |
| EN | `How fast do you like to move emotionally/physically in a new relationship?` |
| EN | `What does an exclusive relationship mean to you?` |
| HE | `משהו בבן/בת הזוג שהיה מאתגר את הסבלנות שלי, ואיך הייתי מתמודד/ת...` |
| HE | `כמה מהר את/ה אוהב/ת להתקדם רגשית/פיזית בקשר חדש?` |
| HE | `מה זוגיות בלעדית אומרת עבורך?` |
| ES | `Algo de mi pareja que pondría a prueba mi paciencia, y cómo lo manejaría…` |
| ES | `¿Qué tan rápido te gusta avanzar emocional/físicamente en una relación nueva?` |
| ES | `¿Qué significa para ti una relación exclusiva?` |

**Product locks:**
- Optional ideas only — same About me free-text field; **no** new schema / required step.
- Answers already feed LLM extractor (Story 2) when present in about-me text.
- Do **not** add dedicated UI widgets beyond the existing writing-prompts questions list.
- Ellipsis: EN/ES use `…` where README uses it; HE uses `...` / `?` as in Phase 6 / README table.

### 8. Chip display conditions (locked)

| Chip | When it appears |
|------|-----------------|
| `Patience match` | Both `patienceTolerance` ≥ 7 |
| `Pace of closeness` | Both `intimacyPacing` ≥ 7 **or** both ≤ 3 |
| `Aligned on relationship structure` | Both `monogamyAlignment` ≤ 2 **or** both ≥ 7 |
| None of the above | Null either side; patience gap / pacing clash / monogamy mismatch tension pairs; patience both-low; monogamy mid without dual-band |

Patience + monogamy chips share domain **`relationship`** — soft diversity may pick at most one of them when slots compete; that is OK. Pacing uses **`intimacy`**.

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
export function buildExpansion14ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[];
```

No new public HTTP methods.

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Patience match'` | `'Pace of closeness'` | `'Aligned on relationship structure'`
- Tension chips unchanged from Story 3 (`Relationship structure mismatch` etc.)

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
npx jest src/matches/expansion-14-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-14|Patience match|Pace of closeness|Aligned on relationship structure"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Patience match|Pace of closeness|Aligned on relationship structure"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-14|Patience match|Pace of closeness|Aligned on relationship structure"
```

Architect: not run. (**dating-ui uses vitest**, not jest.)

### Minimum test cases

**`expansion-14-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| both patience ≥7 | synthetic `patienceMatch` |
| both patience ≤3 | **no** patience synthetic |
| patience 9 / 2 | **no** |
| patience 7 / 7 | boundary fires |
| patience 6 / 7 | **no** |
| both pacing ≥7 | `intimacyPaceAligned` |
| both pacing ≤3 | `intimacyPaceAligned` |
| pacing 9 / 2 | **no** |
| pacing 5 / 5 | **no** (mid not dual-band) |
| both monogamy ≤2 | `monogamyStructureAligned` |
| both monogamy ≥7 | `monogamyStructureAligned` |
| mono 2 / open 9 | **no** (tension territory) |
| monogamy 3 / 3 | **no** (soft-low not ≤2) |
| either side null | no entry for that chip |
| chip map labels exact | three README browse strings |
| domains | relationship / intimacy / relationship |

**`match-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| synthetic patience | positiveChips contains `Patience match` |
| synthetic pacing | contains `Pace of closeness` |
| synthetic monogamy | contains `Aligned on relationship structure` |

**Frontend:**

| Case | Expect |
|------|--------|
| chip-evidence | length **40**; three new keys EN/HE/ES |
| match-why-section | renders evidence for Exp-14 chip labels |
| optional | writing-prompt questions include new EN/HE/ES strings |

---

## Agent 1 instructions

1. Create `expansion-14-explainability.ts` (§1) + unit specs (include both-critical patience **no** chip; mono vs open **no** chip).
2. Wire `assemble-result.ts` after Exp-13 + `match-explainability.ts` resolution (§2–3).
3. Add `CHIP_TO_TRAIT` (§4).
4. Append `CHIP_EVIDENCE_KEYS` + EN/HE/ES `chipEvidence` (§5–6).
5. Append onboarding `writingPrompts.aboutMe.questions` EN/HE/ES (§7).
6. Update frontend specs; run verification commands (**vitest** for UI).
7. **Do not** touch Exp-01–07/10–13 explainability maps, Exp-08, scoring promote, tension i18n, HG filter, or extraction.
8. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-14-tolerance-intimacy-pacing/handoffs/STORY_04_chips_i18n/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-14 patience pacing monogamy positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Agent 2 CR checklist

- [ ] `expansion-14-explainability.ts` exists with exact labels/domains (`relationship` / `intimacy` / `relationship`)
- [ ] Assembled after Exp-13; **no** Exp-08 stub invented
- [ ] Resolution wired in `match-explainability.ts` (`_14` alias)
- [ ] Patience is **both-high ≥7 only**; pacing dual-band ≥7/≤3; monogamy dual-band ≤2/≥7
- [ ] Both-critical patience and mono-vs-open do **not** emit positives
- [ ] No standalone extraction-key pairScore chip keys
- [ ] `CHIP_TO_TRAIT` + `CHIP_EVIDENCE_KEYS` (**40**) + EN/HE/ES evidence exact
- [ ] Onboarding prompts appended EN/HE/ES; no new schema fields
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` / scored `SIGNAL_DOMAIN` promote
- [ ] No keyword chip scoring / text-inference drift
- [ ] Prior expansion explainability files untouched
- [ ] Unit tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures; >85%; compare E2E; optional promote; Exp-08 chips remain a separate sprint debt.
- **Domain diversity:** Two Exp-14 chips share `relationship` — they soft-compete with each other and other relationship-domain chips.
- **Label collision note:** Browse `Pace of closeness` equals Story 1 meta string — intentional OK. Tension `Relationship structure mismatch` ≠ browse `Aligned on relationship structure`.

---

## Next agent

```text
--agent 1 expansion 14 story 4
```

**Notes:** Shadow overlay only. Patience both-high; pacing + monogamy dual-band synthetics — not raw pairScore. Meta chips ≠ browse chips (except pacing string). Onboarding = writing-prompt copy into existing About me, not a new field. Domains via shadow overlay only until promote.
