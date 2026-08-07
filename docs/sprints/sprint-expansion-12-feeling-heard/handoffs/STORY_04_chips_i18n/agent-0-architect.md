# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + browse i18n + optional onboarding writing prompts. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-07/10/11 Story 4 handoffs — shadow overlay + Exp-11 synthetic pair pattern for both-high listening.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` master onboarding prompts)

---

## Summary

- Add Expansion-12 shadow positive chips via new `expansion-12-explainability.ts`:
  - **Both-high listening** → synthetic pair chip **`Feels heard`** when both `listeningPresence` ≥ 7 — **not** a raw `listeningPresence` pairScore chip (both-low would falsely look “aligned”).
  - **`emotionalExpression`** → standalone aligned chip **`Expressiveness match`** (pairScore path).
- Wire shadow breakdown merge in `assemble-result.ts` **after Exp-11**; resolve chips in `match-explainability.ts` (`_12` alias).
- Browse EN/HE/ES `chipEvidence` + `CHIP_EVIDENCE_KEYS` (**33 → 35**).
- Add Phase 6 onboarding writing-prompt questions (EN/HE required; ES locked for parity) into existing `writingPrompts.aboutMe.questions` — **no** new form fields / API.
- Tension chips from Story 3 already English in API — tension i18n **out of scope**.
- **Do not** invent Expansion-08 chips here.
- **Do not** ship Story 1 metadata labels **`Quality listening`** / **`Expressiveness`** as browse positive chips (promote-meta only).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — max **5**, domain diversity; candidates need pairScore ≥7/6/5 tiers |
| Expansion-01–07 / 10–11 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Expansion-08 overlay | **Does not exist** — do not create Exp-08 modules in this story |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-12 signals | In `evaluationJson.self.signals.{listeningPresence\|emotionalExpression}` after Stories 1–2; **not** in compatibility breakdown |
| Tension chips | Story 3 English `TENSION_CHIP_BY_ID` — already live |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **33** (through Expansion-11) — Story 4 appends **2 → 35** |
| Domains (Story 1 meta) | `listeningPresence` → **`communication`**; `emotionalExpression` → **`emotional`** |
| Chip labels (README Story 4) | `Feels heard` / `Expressiveness match` |
| Onboarding texts | `onboarding.writingPrompts.aboutMe.questions` — optional ideas, same free-text fields |
| `computePairScore` | Gap-based — **both 9/9 and both 2/2 → pairScore 10** — cannot use raw `listeningPresence` for “Feels heard” |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` / `match-explainability.ts` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-12-explainability.ts`; wire resolution only |
| Both high listening → Feels heard | **Synthetic pair entry** when both `listeningPresence` ≥ 7 — mirror Exp-11 both-low jealousy |
| emotionalExpression (aligned) → Expressiveness match | Standalone key via `computePairScore` (aligned high **or** low **or** mid) |
| Story 1 meta chips `Quality listening` / `Expressiveness` | **Not** browse positive chips this story |
| Profile onboarding copy | Append to **`writingPrompts.aboutMe.questions`** — **not** new DB fields / required form |
| Onboarding EN/HE | **Required**; also add **ES** (locale triad) |
| Tension chip i18n | **Out of scope** |
| Promote / scoring | **Forbidden** — Story 5 / future promote |
| Expansion-08 chips | **Out of scope** |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-12-explainability.ts` | **Create** — synthetic both-high listening + standalone expression + domains + builders |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-12 shadow keys (`isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey`) with `_12` alias |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion12ShadowBreakdown` **after** Exp-11 |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for both chip labels |
| `dating-api/src/matches/expansion-12-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 2 labels (**33 → 35**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` ×2 + 2 `writingPrompts.aboutMe.questions` |
| `dating-ui/src/lib/i18n/he.ts` | Same |
| `dating-ui/src/lib/i18n/es.ts` | Same |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Length **35** + Exp-12 labels |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Exp-12 chips |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`07` / `10`–`11-explainability.ts` maps | Prior sprints — do not edit maps/labels |
| Expansion-08 explainability / chips | Different unfinished sprint |
| `compatibility-score.ts` / `COMPATIBILITY_SIGNAL_KEYS` | Promote lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote |
| Tension chip i18n | Not Story 4 |
| New Prisma fields / onboarding API | Prompts are copy-only into existing About me |
| Live Hebrew fixtures / >85% / promote | Story 5 |
| Keyword / regex chip scoring | Forbidden |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip module (locked)

Create `expansion-12-explainability.ts` (Exp-11 synthetic pair + standalone hybrid):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

/** Standalone: aligned expression via pairScore. */
export const EXPANSION_12_STANDALONE_CHIP_KEYS = [
  'emotionalExpression',
] as const;

/**
 * Virtual key for both-high listening positive chip only (NOT an extraction key).
 * Injected as synthetic BreakdownEntry when both listeningPresence >= 7.
 */
export const EXPANSION_12_PAIR_CHIP_KEYS = ['listeningFeelsHeard'] as const;

export const EXPANSION_12_SHADOW_CHIP_KEYS = [
  ...EXPANSION_12_STANDALONE_CHIP_KEYS,
  ...EXPANSION_12_PAIR_CHIP_KEYS,
] as const;

export type Expansion12ShadowChipKey =
  (typeof EXPANSION_12_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion12ShadowChipKey,
  string
> = {
  emotionalExpression: 'Expressiveness match',
  listeningFeelsHeard: 'Feels heard',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion12ShadowChipKey, string> = {
  emotionalExpression: 'emotional',
  listeningFeelsHeard: 'communication',
};

export function isExpansion12ShadowChipKey(
  key: string,
): key is Expansion12ShadowChipKey {
  return (EXPANSION_12_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion12ShadowChipKey): BreakdownEntry {
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
  const aL = finiteOrNull(signalsA.listeningPresence);
  const bL = finiteOrNull(signalsB.listeningPresence);
  if (aL == null || bL == null) return [];
  if (aL >= 7 && bL >= 7) {
    return [syntheticPairEntry('listeningFeelsHeard')];
  }
  return [];
}

export function buildExpansion12ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of EXPANSION_12_STANDALONE_CHIP_KEYS) {
    const self = signalsA[key];
    const partner = signalsB[key];
    if (self == null || partner == null) continue;
    if (!Number.isFinite(self) || !Number.isFinite(partner)) continue;
    const gap = Math.abs(self - partner);
    out.push({
      key,
      self,
      partner,
      gap,
      pairScore: computePairScore(self, partner),
    });
  }
  out.push(...buildPairChipEntries(signalsA, signalsB));
  return out;
}
```

**Critical:** Do **not** add `listeningPresence` as a standalone chip key (both-low distracted would falsely look “aligned”).

### 2. Merge point (locked)

In `assemble-result.ts`, append **after** Expansion-11:

```typescript
...buildExpansion11ShadowBreakdown(signalsA, signalsB),
...buildExpansion12ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.  
**Do not** insert an Expansion-08 stub.

### 3. `match-explainability.ts` chip resolution (locked)

Import Expansion-12 with `_12` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_11`).

**Do not** add keys to `isSignalKey()`.

### 4. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Feels heard` | How you communicate | You both show up fully present and listen deeply | both listen with presence |
| `Expressiveness match` | Emotional connection | You express feelings and affection in similar ways | compatible emotional expression |

### 5. i18n evidence (locked — from sprint README)

**chipEvidence** keys = English chip labels.

**en.ts:**

```typescript
"Feels heard":
  "You both show up fully present and listen deeply",
"Expressiveness match":
  "You express feelings and affection in similar ways",
```

**he.ts:**

```typescript
"Feels heard":
  "שניכם נוכחים לגמרי ומקשיבים לעומק",
"Expressiveness match":
  "שניכם מבטאים רגשות וחיבה בדרכים דומות",
```

**es.ts:**

```typescript
"Feels heard":
  "Ambos están presentes y escuchan profundamente",
"Expressiveness match":
  "Expresan sentimientos y afecto de forma similar",
```

### 6. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Feels heard',
'Expressiveness match',
```

Existing `chip-evidence.spec.ts` should assert length **35** + Exp-12 labels.

### 7. Onboarding writing prompts (locked)

Append **exactly** these two strings to `onboarding.writingPrompts.aboutMe.questions` (after existing questions — do not remove prior prompts):

| Locale | Prompt |
|--------|--------|
| EN | `I feel most loved when my partner…` |
| EN | `A partner really listens to me when they…` |
| HE | `אני מרגיש/ה הכי אהוב/ה כש...` |
| HE | `בן/בת זוג באמת מקשיב/ה לי כש...` |
| ES | `Me siento más amado/a cuando mi pareja…` |
| ES | `Una pareja realmente me escucha cuando…` |

**Product locks:**
- Optional ideas only — same About me free-text field; **no** new schema / required step.
- Answers already feed LLM extractor (Story 2) when present in about-me text.
- Do **not** add dedicated UI widgets beyond the existing writing-prompts questions list.
- Ellipsis: EN/ES use `…`; HE uses `...` as in Phase 6 master table.

### 8. Chip display conditions (locked)

| Chip | When it appears |
|------|-----------------|
| `Feels heard` | Both `listeningPresence` ≥ 7 (synthetic pairScore 10) |
| `Expressiveness match` | Both `emotionalExpression` non-null; pairScore high enough for picker (≥5–7 tiers) — includes both-high, both-low, or close mid alignment |
| Neither | Either side null for that signal; listening gap / one high one low (tension); listening both mid/low without both ≥7 |

Both chips use different domains (`communication` / `emotional`) — helps picker diversity vs Exp-11 emotional-only pair.

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term | **None** |
| Friction (Story 3) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## Service signatures

```typescript
export function buildExpansion12ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[];
```

No new public HTTP methods.

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Feels heard'` | `'Expressiveness match'`
- Tension chips unchanged from Story 3

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
npx jest src/matches/expansion-12-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-12|Feels heard|Expressiveness match"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Feels heard|Expressiveness match"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-12|Feels heard|Expressiveness match"
```

Architect: not run. (**dating-ui uses vitest**, not jest.)

### Minimum test cases

**`expansion-12-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| both emotionalExpression 8/9 | breakdown entry; pairScore high |
| both emotionalExpression 2/2 | entry present (aligned low) |
| either expression null | no expression entry |
| both listeningPresence ≥7 | synthetic `listeningFeelsHeard` entry |
| both listeningPresence ≤3 | **no** synthetic entry |
| listening 9 / 2 | **no** synthetic entry |
| listening 7 / 7 | synthetic fires (boundary) |
| listening 6 / 7 | **no** synthetic (one below 7) |
| chip map labels exact | Expressiveness match / Feels heard |

**`match-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| merged breakdown high expression | positiveChips contains `Expressiveness match` |
| synthetic both-high listening | contains `Feels heard` |

**Frontend:**

| Case | Expect |
|------|--------|
| chip-evidence | length **35**; both new keys EN/HE/ES |
| match-why-section | renders evidence for Exp-12 chip labels |
| optional | writing-prompt questions include new EN/HE/ES strings |

---

## Agent 1 instructions

1. Create `expansion-12-explainability.ts` (§1) + unit specs (include both-low listening **no** Feels heard).
2. Wire `assemble-result.ts` after Exp-11 + `match-explainability.ts` resolution (§2–3).
3. Add `CHIP_TO_TRAIT` (§4).
4. Append `CHIP_EVIDENCE_KEYS` + EN/HE/ES `chipEvidence` (§5–6).
5. Append onboarding `writingPrompts.aboutMe.questions` EN/HE/ES (§7).
6. Update frontend specs; run verification commands (**vitest** for UI).
7. **Do not** touch Exp-01–07/10–11 explainability maps, Exp-08, scoring promote, tension i18n, or extraction.
8. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-12-feeling-heard/handoffs/STORY_04_chips_i18n/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-12 feeling-heard positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Agent 2 CR checklist

- [ ] `expansion-12-explainability.ts` exists with exact labels/domains (`communication` / `emotional`)
- [ ] Assembled after Exp-11; **no** Exp-08 stub invented
- [ ] Resolution wired in `match-explainability.ts` (`_12` alias)
- [ ] Both-high listening is **synthetic** (≥7); both-low listening does **not** emit `Feels heard`
- [ ] `CHIP_TO_TRAIT` + `CHIP_EVIDENCE_KEYS` (**35**) + EN/HE/ES evidence exact
- [ ] Onboarding prompts appended EN/HE/ES; no new schema fields
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` promote
- [ ] No keyword chip scoring / text-inference drift
- [ ] Prior expansion explainability files untouched
- [ ] Unit tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures; >85%; compare E2E; optional promote; Exp-08 chips remain a separate sprint debt.
- **Domain diversity:** Exp-12 splits `communication` / `emotional` — better coexistence with Exp-11 emotional chips than Exp-11 alone.

---

## Next agent

```text
--agent 1 expansion 12 story 4
```

**Notes:** Shadow overlay only. Listening both-high (≥7) → `Feels heard`; expression aligned via pairScore → `Expressiveness match`. Meta chips ≠ browse chips. Onboarding = writing-prompt copy into existing About me, not a new field.
