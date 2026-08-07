# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + browse i18n + optional onboarding writing prompts. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-01–07 Story 4 handoffs — same shadow overlay pattern (mirror Expansion-06 two-key simplicity; Exp-07 for assemble/resolution wiring).  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` master onboarding prompts)

---

## Summary

- Add **two** Expansion-10 shadow positive chips (`repairSkills`, `forgivenessStyle`) via new `expansion-10-explainability.ts`.
- Wire shadow breakdown merge in `assemble-result.ts` after Exp-07; resolve chips in `match-explainability.ts`.
- Browse EN/HE/ES `chipEvidence` + `CHIP_EVIDENCE_KEYS` (**29 → 31**).
- Add Phase 6 onboarding writing-prompt questions (EN/HE required; ES locked for parity) into existing `writingPrompts.aboutMe.questions` — **no** new form fields / API.
- Tension chips from Story 3 already English in API — tension i18n **out of scope**.
- **Do not** invent Expansion-08 chips here (Exp-08 Story 4 not shipped).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — max **5**, domain diversity |
| Expansion-01–07 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Expansion-08 overlay | **Does not exist** — do not create Exp-08 modules in this story |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-10 signals | In `evaluationJson.self.signals.{repairSkills\|forgivenessStyle}` after Stories 1–2; **not** in compatibility breakdown |
| Tension chips | Story 3 English `TENSION_CHIP_BY_ID` — already live |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **29** (through Expansion-07) — Story 4 appends **2 → 31** |
| Domains (Story 1 meta) | both keys → **`communication`** |
| Chip labels (Story 1 meta) | `Conflict recovery` / `Letting go & moving forward` |
| Onboarding texts | `onboarding.writingPrompts.aboutMe.questions` — optional ideas, same free-text fields |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` / `match-explainability.ts` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-10-explainability.ts`; wire resolution only |
| Profile onboarding copy “wherever About me prompts live” | Append to **`writingPrompts.aboutMe.questions`** in i18n — **not** new DB fields / required form |
| Onboarding EN/HE | **Required**; also add **ES** (Phase 6 cross-cut + existing locale triad) |
| Tension chip i18n | **Out of scope** |
| Promote / scoring | **Forbidden** — Story 5 gate |
| Expansion-08 education/integrity chips | **Out of scope** — separate unfinished sprint |

---

## Artifacts (agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-10-explainability.ts` | **Create** — shadow chip map + domain + `buildExpansion10ShadowBreakdown()` |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-10 shadow keys (`isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey`) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion10ShadowBreakdown` after Exp-07 |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for both chip labels |
| `dating-api/src/matches/expansion-10-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | High both-sides → positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 2 labels (**29 → 31**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` ×2 + 2 `writingPrompts.aboutMe.questions` |
| `dating-ui/src/lib/i18n/he.ts` | Same |
| `dating-ui/src/lib/i18n/es.ts` | Same |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Locale coverage picks up new keys |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Exp-10 chips |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`07-explainability.ts` | Prior sprints — do not edit maps/labels |
| Expansion-08 explainability / chips | Different unfinished sprint |
| `compatibility-score.ts` / `COMPATIBILITY_SIGNAL_KEYS` | Promote lock |
| `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | Requires promote |
| Tension chip i18n | Not Story 4 |
| New Prisma fields / onboarding API | Prompts are copy-only into existing About me |
| Live Hebrew fixtures / >85% / promote | Story 5 |
| Keyword / regex chip scoring | Forbidden |

---

## Decisions (do not reverse without discussion)

### 1. Shadow positive chip map (locked)

Create `expansion-10-explainability.ts` (mirror Expansion-06 layout):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

export const EXPANSION_10_SHADOW_CHIP_KEYS = [
  'repairSkills',
  'forgivenessStyle',
] as const;

export type Expansion10ShadowChipKey =
  (typeof EXPANSION_10_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion10ShadowChipKey,
  string
> = {
  repairSkills: 'Conflict recovery',
  forgivenessStyle: 'Letting go & moving forward',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion10ShadowChipKey, string> = {
  repairSkills: 'communication',
  forgivenessStyle: 'communication',
};

export function isExpansion10ShadowChipKey(
  key: string,
): key is Expansion10ShadowChipKey {
  return (EXPANSION_10_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

export function buildExpansion10ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  // same loop as Expansion-06 — computePairScore; skip null / non-finite
}
```

Exact chip labels locked (match sprint README + Story 1 `EXPANSION_10_PROMOTION_CHIP_LABELS`).

### 2. Merge point (locked)

In `assemble-result.ts`, append after Expansion-07:

```typescript
...buildExpansion07ShadowBreakdown(signalsA, signalsB),
...buildExpansion10ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.  
**Do not** insert an Expansion-08 stub.

### 3. `match-explainability.ts` chip resolution (locked)

Import Expansion-10 with `_10` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_07`).

**Do not** add keys to `isSignalKey()`.

### 4. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Conflict recovery` | How you communicate | You both know how to apologize and reconnect after disagreements | shared conflict recovery |
| `Letting go & moving forward` | How you communicate | You both let go of conflict and move forward at a similar pace | aligned forgiveness pace |

Group matches existing `Conflict approach` / `Direct communication` (“How you communicate”).

### 5. i18n evidence (locked — from sprint README)

**chipEvidence** keys = English chip labels.

**en.ts:**

```typescript
"Conflict recovery":
  "You both know how to apologize and reconnect after disagreements",
"Letting go & moving forward":
  "You both let go of conflict and move forward at a similar pace",
```

**he.ts:**

```typescript
"Conflict recovery":
  "שניכם יודעים להתנצל ולהתחבר מחדש אחרי ויכוחים",
"Letting go & moving forward":
  "שניכם משחררים קונפליקטים וממשיכים הלאה בקצב דומה",
```

**es.ts:**

```typescript
"Conflict recovery":
  "Ambos saben disculparse y reconectar después de un desacuerdo",
"Letting go & moving forward":
  "Ambos dejan ir los conflictos y siguen adelante a un ritmo similar",
```

### 6. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Conflict recovery',
'Letting go & moving forward',
```

Existing `chip-evidence.spec.ts` loop validates locale coverage (**29 → 31**).

### 7. Onboarding writing prompts (locked)

Append **exactly** these two strings to `onboarding.writingPrompts.aboutMe.questions` (after existing questions — do not remove prior prompts):

| Locale | Prompt |
|--------|--------|
| EN | `When we disagree, I usually…` |
| EN | `After a fight, I tend to…` |
| HE | `כשיש לנו חילוקי דעות, אני בדרך כלל...` |
| HE | `אחרי ריב, אני נוטה...` |
| ES | `Cuando discrepamos, normalmente…` |
| ES | `Después de una pelea, suelo…` |

**Product locks:**
- Optional ideas only — same About me free-text field; **no** new schema / required step.
- Answers already feed LLM extractor (Story 2) when present in about-me text.
- Do **not** add dedicated UI widgets beyond the existing writing-prompts questions list.
- Ellipsis character: use `…` (EN/ES) to match Phase 6 / README; HE uses `...` as in Phase 6 master table.

### 8. Chip display conditions (locked)

Same tier rules via merged breakdown:

- Chip eligible when both sides non-null and pair score / both-high rules in `pickPositiveChips` apply
- No chip when either side null (no shadow breakdown entry)
- Both keys share domain `communication` — picker diversity may prefer only one if other domains compete (acceptable)

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
export function buildExpansion10ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[];
```

No new public HTTP methods.

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Conflict recovery'` | `'Letting go & moving forward'`
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
npx jest src/matches/expansion-10-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-10|Conflict recovery|Letting go"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Conflict recovery|Letting go"
npm run typecheck

cd ../dating-ui
npx jest src/app/dating/me-matches/chip-evidence.spec.ts --runInBand
npx jest src/app/dating/me-matches/match-why-section.spec.tsx --runInBand -t "Conflict recovery|Letting go|Expansion-10"
```

Architect: not run.

### Minimum test cases

**`expansion-10-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| both repairSkills 8/9 | breakdown entry; pairScore high |
| either null | no entry for that key |
| both forgivenessStyle high | entry present |
| chip map labels exact | Conflict recovery / Letting go & moving forward |

**`match-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| merged breakdown both high repair | positiveChips contains `Conflict recovery` |
| merged breakdown both high forgiveness | contains `Letting go & moving forward` |

**Frontend:**

| Case | Expect |
|------|--------|
| chip-evidence locale loop | both new keys present EN/HE/ES |
| match-why-section | renders evidence for Exp-10 chip label |

Optional: assert writing-prompt questions arrays include the two new EN/HE/ES strings (small i18n unit or snapshot — agent 1 choice).

---

## Agent 1 instructions

1. Create `expansion-10-explainability.ts` (§1) + unit specs.
2. Wire `assemble-result.ts` + `match-explainability.ts` resolution (§2–3).
3. Add `CHIP_TO_TRAIT` (§4).
4. Append `CHIP_EVIDENCE_KEYS` + EN/HE/ES `chipEvidence` (§5–6).
5. Append onboarding `writingPrompts.aboutMe.questions` EN/HE/ES (§7).
6. Update frontend specs; run verification commands.
7. **Do not** touch Exp-01–07 explainability maps, Exp-08, scoring promote, tension i18n, or extraction.
8. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-10-conflict-recovery/handoffs/STORY_04_chips_i18n/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-10 conflict recovery positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Agent 2 CR checklist

- [ ] `expansion-10-explainability.ts` exists with exact labels/domains
- [ ] Assembled after Exp-07; **no** Exp-08 stub invented
- [ ] Resolution wired in `match-explainability.ts` (`_10` alias)
- [ ] `CHIP_TO_TRAIT` + `CHIP_EVIDENCE_KEYS` (**31**) + EN/HE/ES evidence exact
- [ ] Onboarding prompts appended EN/HE/ES; no new schema fields
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` promote
- [ ] No keyword chip scoring / text-inference drift
- [ ] Prior expansion explainability files untouched
- [ ] Unit tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures; >85%; compare E2E; optional promote; Exp-08 chips remain a separate sprint debt.
- **Domain diversity:** both Exp-10 chips share `communication` — picker may show one; acceptable for shadow display.

---

## Next agent

```text
--agent 1 expansion 10 story 4
```

**Notes:** Shadow overlay only — mirror Exp-06 file shape, Exp-07 merge position. Keep promote out. Onboarding = writing-prompt copy into existing About me, not a new field.
