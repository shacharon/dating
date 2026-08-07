# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + browse i18n + optional onboarding writing prompts. Wire domain string **`personal`** into shadow chip diversity. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-12 Story 4 handoff — hybrid synthetic both-high + assemble/resolution pattern.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` master onboarding prompts)

---

## Summary

- Add Expansion-13 shadow positive chips via new `expansion-13-explainability.ts`:
  - **Both-high growth** → synthetic pair chip **`Grows together`** when both `growthMindset` ≥ 7 — **not** raw `growthMindset` pairScore (both-low fixed would falsely look “aligned”).
  - **Both-high self-awareness** → synthetic pair chip **`Self-awareness match`** when both `selfAwareness` ≥ 7 — **not** raw pairScore (both-low would clash with Story 3 `both_low_self_awareness` tension and contradict evidence copy).
- Wire shadow breakdown merge in `assemble-result.ts` **after Exp-12**; resolve chips in `match-explainability.ts` (`_13` alias).
- Browse EN/HE/ES `chipEvidence` + `CHIP_EVIDENCE_KEYS` (**35 → 37**).
- Add Phase 6 onboarding writing-prompt questions (EN/HE required; ES locked for parity) into existing `writingPrompts.aboutMe.questions` — **no** new form fields / API.
- Domain **`personal`** lands on both shadow chip keys for picker diversity (not on scored `SIGNAL_DOMAIN` until promote).
- Tension chips from Story 3 already English in API — tension i18n **out of scope**.
- **Do not** invent Expansion-08 chips here.
- **Do not** ship Story 1 metadata labels **`Openness to growth`** / **`Self-awareness`** as browse positive chips (promote-meta only).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — domain diversity; candidates need pairScore ≥7/6/5 tiers |
| Expansion-01–07 / 10–12 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Expansion-08 overlay | **Does not exist** — do not create Exp-08 modules in this story |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-13 signals | In `evaluationJson.self.signals.{growthMindset\|selfAwareness}` after Stories 1–2; **not** in compatibility breakdown |
| Tension chips | Story 3 English `TENSION_CHIP_BY_ID` — already live (`Different growth pace` / `Self-insight gap`) |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **35** (through Expansion-12) — Story 4 appends **2 → 37** |
| Domains (Story 1 meta) | both keys → **`personal`** |
| Chip labels (README Story 4) | `Grows together` / `Self-awareness match` |
| Onboarding texts | `onboarding.writingPrompts.aboutMe.questions` — optional ideas, same free-text fields |
| `computePairScore` | Gap-based — **both 9/9 and both 2/2 → pairScore 10** — cannot use raw keys for these browse positives |
| Story 3 tension | `both_low_self_awareness` when both ≤3 — positive chip must **not** fire on both-low |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` / `match-explainability.ts` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-13-explainability.ts`; wire resolution only |
| Both high growth → Grows together | **Synthetic pair entry** when both `growthMindset` ≥ 7 — mirror Exp-12 `listeningFeelsHeard` |
| `selfAwareness` (aligned) → Self-awareness match | **Synthetic both-high ≥ 7** (not pairScore “aligned” mid/low). README evidence implies clear insight; both-low is a **tension** |
| Story 1 meta chips `Openness to growth` / `Self-awareness` | **Not** browse positive chips this story |
| Wire `personal` into chip-diversity | Via `SHADOW_SIGNAL_DOMAIN` on Exp-13 chip keys — **do not** extend scored `SIGNAL_DOMAIN: Record<SignalKey, string>` until promote |
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
| `dating-api/src/matches/expansion-13-explainability.ts` | **Create** — two synthetic both-high pair chips + domains + builder |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-13 shadow keys (`isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey`) with `_13` alias |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion13ShadowBreakdown` **after** Exp-12 |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for both chip labels |
| `dating-api/src/matches/expansion-13-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 2 labels (**35 → 37**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` ×2 + 2 `writingPrompts.aboutMe.questions` |
| `dating-ui/src/lib/i18n/he.ts` | Same |
| `dating-ui/src/lib/i18n/es.ts` | Same |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Length **37** + Exp-13 labels |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Exp-13 chips |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`07` / `10`–`12-explainability.ts` maps | Prior sprints — do not edit maps/labels |
| Expansion-08 explainability / chips | Different unfinished sprint |
| `compatibility-score.ts` / `COMPATIBILITY_SIGNAL_KEYS` | Promote lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote |
| Scored `SIGNAL_DOMAIN` Record | Keys not `SignalKey` until promote |
| Tension chip i18n | Not Story 4 |
| New Prisma fields / onboarding API | Prompts are copy-only into existing About me |
| Live Hebrew fixtures / >85% / promote | Story 5 |
| Keyword / regex chip scoring | Forbidden |
| Extraction / tension-rules | Stories 1–3 complete |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip module (locked)

Create `expansion-13-explainability.ts` — **both chips synthetic both-high** (no standalone pairScore keys):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';

/**
 * Virtual keys for both-high positive chips only (NOT extraction keys).
 * Injected as synthetic BreakdownEntry when both growthMindset / selfAwareness >= 7.
 */
export const EXPANSION_13_PAIR_CHIP_KEYS = [
  'growthGrowsTogether',
  'selfAwarenessMatch',
] as const;

export const EXPANSION_13_SHADOW_CHIP_KEYS = [
  ...EXPANSION_13_PAIR_CHIP_KEYS,
] as const;

export type Expansion13ShadowChipKey =
  (typeof EXPANSION_13_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion13ShadowChipKey,
  string
> = {
  growthGrowsTogether: 'Grows together',
  selfAwarenessMatch: 'Self-awareness match',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion13ShadowChipKey, string> = {
  growthGrowsTogether: 'personal',
  selfAwarenessMatch: 'personal',
};

export function isExpansion13ShadowChipKey(
  key: string,
): key is Expansion13ShadowChipKey {
  return (EXPANSION_13_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion13ShadowChipKey): BreakdownEntry {
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
  const aG = finiteOrNull(signalsA.growthMindset);
  const bG = finiteOrNull(signalsB.growthMindset);
  if (aG != null && bG != null && aG >= 7 && bG >= 7) {
    out.push(syntheticPairEntry('growthGrowsTogether'));
  }
  const aS = finiteOrNull(signalsA.selfAwareness);
  const bS = finiteOrNull(signalsB.selfAwareness);
  if (aS != null && bS != null && aS >= 7 && bS >= 7) {
    out.push(syntheticPairEntry('selfAwarenessMatch'));
  }
  return out;
}

export function buildExpansion13ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildPairChipEntries(signalsA, signalsB);
}
```

**Critical:**
- Do **not** add `growthMindset` or `selfAwareness` as standalone chip keys (both-low would falsely look “aligned” via `computePairScore`).
- Do **not** invent `self_awareness_gap` or change Story 3 tension rules.

### 2. Merge point (locked)

In `assemble-result.ts`, append **after** Expansion-12:

```typescript
...buildExpansion12ShadowBreakdown(signalsA, signalsB),
...buildExpansion13ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.  
**Do not** insert an Expansion-08 stub.

### 3. `match-explainability.ts` chip resolution (locked)

Import Expansion-13 with `_13` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_12`).

**Do not** add keys to `isSignalKey()`.

### 4. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Grows together` | Ideas & growth | You both value feedback and growing as partners | both value growth and feedback |
| `Self-awareness match` | Ideas & growth | You both have clear insight into your own patterns | shared self-insight |

### 5. i18n evidence (locked — from sprint README)

**chipEvidence** keys = English chip labels.

**en.ts:**

```typescript
"Grows together":
  "You both value feedback and growing as partners",
"Self-awareness match":
  "You both have clear insight into your own patterns",
```

**he.ts:**

```typescript
"Grows together":
  "שניכם מעריכים משוב וצמיחה כבני זוג",
"Self-awareness match":
  "לשניכם יש תובנה ברורה לגבי הדפוסים שלכם",
```

**es.ts:**

```typescript
"Grows together":
  "Ambos valoran el feedback y crecer como pareja",
"Self-awareness match":
  "Ambos tienen buena comprensión de sus propios patrones",
```

### 6. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Grows together',
'Self-awareness match',
```

Existing `chip-evidence.spec.ts` should assert length **37** + Exp-13 labels.

### 7. Onboarding writing prompts (locked)

Append **exactly** these two strings to `onboarding.writingPrompts.aboutMe.questions` (after existing questions — do not remove prior prompts). Source: sprint README / Phase 6 master table.

| Locale | Prompt |
|--------|--------|
| EN | `A time I changed my mind about something important…` |
| EN | `One thing I'm working on about myself…` |
| HE | `פעם ששיניתי את דעתי בנושא חשוב...` |
| HE | `דבר אחד שאני עובד/ת עליו בעצמי...` |
| ES | `Una vez que cambié de opinión sobre algo importante…` |
| ES | `Una cosa en la que estoy trabajando sobre mí…` |

**Product locks:**
- Optional ideas only — same About me free-text field; **no** new schema / required step.
- Answers already feed LLM extractor (Story 2) when present in about-me text.
- Do **not** add dedicated UI widgets beyond the existing writing-prompts questions list.
- Ellipsis: EN/ES use `…`; HE uses `...` as in Phase 6 master table / Exp-12 pattern.

### 8. Chip display conditions (locked)

| Chip | When it appears |
|------|-----------------|
| `Grows together` | Both `growthMindset` ≥ 7 (synthetic pairScore 10) |
| `Self-awareness match` | Both `selfAwareness` ≥ 7 (synthetic pairScore 10) |
| Neither | Either side null; growth gap (Story 3 tension); awareness both-low (Story 3 tension); one high one low/mid; both mid without both ≥7 |

Both chips share domain **`personal`** — soft diversity may pick at most one Exp-13 chip when other domains already fill slots; that is OK.

### 9. Scoring impact (locked)

| Layer | Impact |
|-------|--------|
| `computeCompatibility` / compatibility term | **None** |
| Friction (Story 3) | Unchanged |
| `explainability.positiveChips` | **Yes** — display only |
| `alignments` DTO | **No shadow keys** |
| Scored `SIGNAL_DOMAIN` | **Unchanged** — `personal` only on shadow overlay |

### 10. Agent 4

**Skip** — display-only; no eligibility/ranking formula change.

---

## Service signatures

```typescript
export function buildExpansion13ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[];
```

No new public HTTP methods.

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Grows together'` | `'Self-awareness match'`
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
npx jest src/matches/expansion-13-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-13|Grows together|Self-awareness match"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Grows together|Self-awareness match"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-13|Grows together|Self-awareness match"
```

Architect: not run. (**dating-ui uses vitest**, not jest.)

### Minimum test cases

**`expansion-13-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| both growthMindset ≥7 | synthetic `growthGrowsTogether` entry |
| both growthMindset ≤3 | **no** growth synthetic |
| growth 9 / 2 | **no** growth synthetic |
| growth 7 / 7 | synthetic fires (boundary) |
| growth 6 / 7 | **no** growth synthetic |
| both selfAwareness ≥7 | synthetic `selfAwarenessMatch` entry |
| both selfAwareness ≤3 | **no** awareness synthetic |
| awareness 7 / 7 | boundary fires |
| awareness 6 / 7 | **no** |
| either side null | no entry for that chip |
| chip map labels exact | Grows together / Self-awareness match |
| domains | both `personal` |

**`match-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| synthetic both-high growth | positiveChips contains `Grows together` |
| synthetic both-high awareness | contains `Self-awareness match` |

**Frontend:**

| Case | Expect |
|------|--------|
| chip-evidence | length **37**; both new keys EN/HE/ES |
| match-why-section | renders evidence for Exp-13 chip labels |
| optional | writing-prompt questions include new EN/HE/ES strings |

---

## Agent 1 instructions

1. Create `expansion-13-explainability.ts` (§1) + unit specs (include both-low growth/awareness **no** positive chips).
2. Wire `assemble-result.ts` after Exp-12 + `match-explainability.ts` resolution (§2–3).
3. Add `CHIP_TO_TRAIT` (§4).
4. Append `CHIP_EVIDENCE_KEYS` + EN/HE/ES `chipEvidence` (§5–6).
5. Append onboarding `writingPrompts.aboutMe.questions` EN/HE/ES (§7).
6. Update frontend specs; run verification commands (**vitest** for UI).
7. **Do not** touch Exp-01–07/10–12 explainability maps, Exp-08, scoring promote, tension i18n, or extraction.
8. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-13-growth-self-awareness/handoffs/STORY_04_chips_i18n/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-13 growth and self-awareness positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Agent 2 CR checklist

- [ ] `expansion-13-explainability.ts` exists with exact labels/domains (`personal` / `personal`)
- [ ] Assembled after Exp-12; **no** Exp-08 stub invented
- [ ] Resolution wired in `match-explainability.ts` (`_13` alias)
- [ ] Both chips are **synthetic both-high (≥7)**; both-low does **not** emit either positive
- [ ] No standalone `growthMindset` / `selfAwareness` pairScore chip keys
- [ ] `CHIP_TO_TRAIT` + `CHIP_EVIDENCE_KEYS` (**37**) + EN/HE/ES evidence exact
- [ ] Onboarding prompts appended EN/HE/ES; no new schema fields
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` / scored `SIGNAL_DOMAIN` promote
- [ ] No keyword chip scoring / text-inference drift
- [ ] Prior expansion explainability files untouched
- [ ] Unit tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures; >85%; compare E2E; optional promote; Exp-08 chips remain a separate sprint debt.
- **Domain diversity:** Both Exp-13 chips share `personal` — first new domain string in picker; they soft-compete with each other only.

---

## Next agent

```text
--agent 1 expansion 13 story 4
```

**Notes:** Shadow overlay only. Both chips both-high (≥7) synthetic — not pairScore. Meta chips ≠ browse chips. Onboarding = writing-prompt copy into existing About me, not a new field. `personal` via shadow domains only until promote.
