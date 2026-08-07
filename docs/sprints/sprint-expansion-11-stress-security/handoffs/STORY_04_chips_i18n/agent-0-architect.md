# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** Display-only positive chips + browse i18n + optional onboarding writing prompts. **No** promote to `COMPATIBILITY_SIGNAL_KEYS` / scoring weights.

**Mandatory read:** Expansion-06/07/10 Story 4 handoffs — shadow overlay + Exp-07 pair-chip pattern for both-low jealousy.  
**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md` (no keyword chip scoring).  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` master onboarding prompts)

---

## Summary

- Add Expansion-11 shadow positive chips via new `expansion-11-explainability.ts`:
  - **`stressResponse`** → standalone aligned chip **`Support under pressure`** (pairScore path).
  - **Both-low jealousy** → synthetic pair chip **`Secure & trusting`** (Exp-07 pair pattern) — **not** a high×high pairScore chip on `jealousySecurity`.
- Wire shadow breakdown merge in `assemble-result.ts` **after Exp-10**; resolve chips in `match-explainability.ts` (`_11` alias).
- Browse EN/HE/ES `chipEvidence` + `CHIP_EVIDENCE_KEYS` (**31 → 33**).
- Add Phase 6 onboarding writing-prompt questions (EN/HE required; ES locked for parity) into existing `writingPrompts.aboutMe.questions` — **no** new form fields / API.
- Tension chips from Story 3 already English in API — tension i18n **out of scope**.
- **Do not** invent Expansion-08 chips here.
- **Do not** ship Story 1 metadata label **`Trust & security`** as a positive chip (promote-meta only).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Positive chips source | `pickPositiveChips(breakdown)` — max **5**, domain diversity; candidates need pairScore ≥7/6/5 tiers |
| Expansion-01–07 / 10 overlay | Existing modules + merge in `assemble-result.ts` — **do not modify their maps/labels** |
| Expansion-08 overlay | **Does not exist** — do not create Exp-08 modules in this story |
| Official breakdown | Only `COMPATIBILITY_SIGNAL_KEYS` (15) |
| Exp-11 signals | In `evaluationJson.self.signals.{stressResponse\|jealousySecurity}` after Stories 1–2; **not** in compatibility breakdown |
| Tension chips | Story 3 English `TENSION_CHIP_BY_ID` — already live |
| Browse UI | `match-why-section.tsx` → `chipToEvidence(chip, browse.chipEvidence)` |
| Detail traits | `match-explanation-traits.ts` `CHIP_TO_TRAIT` |
| i18n contract | `matches.list.browse.chipEvidence` in `en.ts` / `he.ts` / `es.ts` |
| `CHIP_EVIDENCE_KEYS` | Currently **31** (through Expansion-10) — Story 4 appends **2 → 33** |
| Domains (Story 1 meta) | both keys → **`emotional`** |
| Chip labels (README Story 4) | `Support under pressure` / `Secure & trusting` |
| Onboarding texts | `onboarding.writingPrompts.aboutMe.questions` — optional ideas, same free-text fields |
| `computePairScore` | Gap-based — **both 9/9 and both 2/2 → pairScore 10** — cannot use raw `jealousySecurity` for positive chip |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` / `match-explainability.ts` | **Wrong while shadow** — use `SHADOW_POSITIVE_CHIP_BY_SIGNAL` in `expansion-11-explainability.ts`; wire resolution only |
| Both low jealousy → Secure & trusting | **Synthetic pair entry** when both `jealousySecurity` ≤ 3 — mirror Exp-07 `supportNonTransactional` |
| stressResponse (aligned) → Support under pressure | Standalone key via `computePairScore` (aligned high **or** low **or** mid) |
| Story 1 meta chip `Trust & security` | **Not** a browse positive chip this story |
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
| `dating-api/src/matches/expansion-11-explainability.ts` | **Create** — standalone stress + pair both-low jealousy + domains + builders |
| `dating-api/src/matches/match-explainability.ts` | Resolve Exp-11 shadow keys (`isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey`) with `_11` alias |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat `buildExpansion11ShadowBreakdown` **after** Exp-10 |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` for both chip labels |
| `dating-api/src/matches/expansion-11-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Traits for new chips |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | Append 2 labels (**31 → 33**) |
| `dating-ui/src/lib/i18n/en.ts` | `chipEvidence` ×2 + 2 `writingPrompts.aboutMe.questions` |
| `dating-ui/src/lib/i18n/he.ts` | Same |
| `dating-ui/src/lib/i18n/es.ts` | Same |
| `dating-ui/src/app/dating/me-matches/chip-evidence.spec.ts` | Length **33** + Exp-11 labels |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN (+ optional HE) for Exp-11 chips |

### Handoff

| Path | Change |
|------|--------|
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `expansion-01`…`07` / `10-explainability.ts` maps | Prior sprints — do not edit maps/labels |
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

Create `expansion-11-explainability.ts` (Exp-07 pair + Exp-06 standalone hybrid):

```typescript
import type { BreakdownEntry } from '../compatibility/compatibility-score';
import { computePairScore } from '../compatibility/compatibility-score';

/** Standalone: aligned stress direction via pairScore. */
export const EXPANSION_11_STANDALONE_CHIP_KEYS = ['stressResponse'] as const;

/**
 * Virtual key for both-low jealousy positive chip only (NOT an extraction key).
 * Injected as synthetic BreakdownEntry when both jealousySecurity <= 3.
 */
export const EXPANSION_11_PAIR_CHIP_KEYS = [
  'jealousySecureTrusting',
] as const;

export const EXPANSION_11_SHADOW_CHIP_KEYS = [
  ...EXPANSION_11_STANDALONE_CHIP_KEYS,
  ...EXPANSION_11_PAIR_CHIP_KEYS,
] as const;

export type Expansion11ShadowChipKey =
  (typeof EXPANSION_11_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<
  Expansion11ShadowChipKey,
  string
> = {
  stressResponse: 'Support under pressure',
  jealousySecureTrusting: 'Secure & trusting',
};

export const SHADOW_SIGNAL_DOMAIN: Record<Expansion11ShadowChipKey, string> = {
  stressResponse: 'emotional',
  jealousySecureTrusting: 'emotional',
};

export function isExpansion11ShadowChipKey(
  key: string,
): key is Expansion11ShadowChipKey {
  return (EXPANSION_11_SHADOW_CHIP_KEYS as readonly string[]).includes(key);
}

function finiteOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function syntheticPairEntry(key: Expansion11ShadowChipKey): BreakdownEntry {
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
  const aJ = finiteOrNull(signalsA.jealousySecurity);
  const bJ = finiteOrNull(signalsB.jealousySecurity);
  if (aJ == null || bJ == null) return [];
  if (aJ <= 3 && bJ <= 3) {
    return [syntheticPairEntry('jealousySecureTrusting')];
  }
  return [];
}

export function buildExpansion11ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];
  for (const key of EXPANSION_11_STANDALONE_CHIP_KEYS) {
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

**Critical:** Do **not** add `jealousySecurity` as a standalone chip key (both-high would falsely look “aligned”).

### 2. Merge point (locked)

In `assemble-result.ts`, append **after** Expansion-10:

```typescript
...buildExpansion10ShadowBreakdown(signalsA, signalsB),
...buildExpansion11ShadowBreakdown(signalsA, signalsB),
```

**Do not** merge into `compatAB.breakdown` / `alignments`.  
**Do not** insert an Expansion-08 stub.

### 3. `match-explainability.ts` chip resolution (locked)

Import Expansion-11 with `_11` alias; extend `isExplainabilityChipKey`, `chipLabelForKey`, `domainForKey` (same pattern as `_10`).

**Do not** add keys to `isSignalKey()`.

### 4. `CHIP_TO_TRAIT` (locked — English detail/list)

| Chip label | group | evidence (EN = README) | listPhrase |
|------------|-------|------------------------|------------|
| `Support under pressure` | Emotional connection | You handle stress in compatible ways | compatible stress support styles |
| `Secure & trusting` | Emotional connection | You're both secure and trusting in relationships | shared secure trusting stance |

Group matches existing `Emotional balance` / `Understanding & care` (“Emotional connection”).

### 5. i18n evidence (locked — from sprint README)

**chipEvidence** keys = English chip labels.

**en.ts:**

```typescript
"Support under pressure":
  "You handle stress in compatible ways",
"Secure & trusting":
  "You're both secure and trusting in relationships",
```

**he.ts:**

```typescript
"Support under pressure":
  "אתם מתמודדים עם לחץ בדרכים תואמות",
"Secure & trusting":
  "שניכם בטוחים ונותנים אמון במערכת יחסים",
```

**es.ts:**

```typescript
"Support under pressure":
  "Manejan el estrés de forma compatible",
"Secure & trusting":
  "Ambos son seguros y confiados en la relación",
```

### 6. `CHIP_EVIDENCE_KEYS` (locked)

Append to `chip-evidence.ts`:

```typescript
'Support under pressure',
'Secure & trusting',
```

Existing `chip-evidence.spec.ts` should assert length **33** + Exp-11 labels.

### 7. Onboarding writing prompts (locked)

Append **exactly** these two strings to `onboarding.writingPrompts.aboutMe.questions` (after existing questions — do not remove prior prompts):

| Locale | Prompt |
|--------|--------|
| EN | `When I'm stressed, I need my partner to…` |
| EN | `Do you get jealous easily? What helps you feel secure?` |
| HE | `כשאני לחוץ/ה, אני צריך/ה שבן/בת הזוג...` |
| HE | `את/ה מתקנא/ת בקלות? מה עוזר לך להרגיש בטוח/ה?` |
| ES | `Cuando estoy estresado/a, necesito que mi pareja…` |
| ES | `¿Te pones celoso/a fácilmente? ¿Qué te ayuda a sentirte seguro/a?` |

**Product locks:**
- Optional ideas only — same About me free-text field; **no** new schema / required step.
- Answers already feed LLM extractor (Story 2) when present in about-me text.
- Do **not** add dedicated UI widgets beyond the existing writing-prompts questions list.
- Ellipsis: EN/ES use `…`; HE uses `...` as in Phase 6 master table.

### 8. Chip display conditions (locked)

| Chip | When it appears |
|------|-----------------|
| `Support under pressure` | Both `stressResponse` non-null; pairScore high enough for picker (≥5–7 tiers) — includes both-high, both-low, or close mid alignment |
| `Secure & trusting` | Both `jealousySecurity` ≤ 3 (synthetic pairScore 10) |
| Neither | Either side null for that signal; jealousy gap / both-high (tension rules handle both-high) |

Both chips share domain `emotional` — picker diversity may prefer only one if other domains compete (acceptable).

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
export function buildExpansion11ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[];
```

No new public HTTP methods.

---

## API / HTTP contracts

No DTO shape changes. Existing fields:

- `explainability.positiveChips` may include `'Support under pressure'` | `'Secure & trusting'`
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
npx jest src/matches/expansion-11-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-11|Support under pressure|Secure & trusting"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Support under pressure|Secure & trusting"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-11|Support under pressure|Secure & trusting"
```

Architect: not run. (**dating-ui uses vitest**, not jest.)

### Minimum test cases

**`expansion-11-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| both stressResponse 8/9 | breakdown entry; pairScore high |
| both stressResponse 2/2 | entry present (aligned low) |
| either stress null | no stress entry |
| both jealousySecurity ≤3 | synthetic `jealousySecureTrusting` entry |
| both jealousySecurity ≥8 | **no** synthetic entry |
| jealousy 9 / 2 | **no** synthetic entry |
| chip map labels exact | Support under pressure / Secure & trusting |

**`match-explainability.spec.ts`:**

| Case | Expect |
|------|--------|
| merged breakdown high stress | positiveChips contains `Support under pressure` |
| synthetic both-low jealousy | contains `Secure & trusting` |

**Frontend:**

| Case | Expect |
|------|--------|
| chip-evidence | length **33**; both new keys EN/HE/ES |
| match-why-section | renders evidence for Exp-11 chip labels |
| optional | writing-prompt questions include new EN/HE/ES strings |

---

## Agent 1 instructions

1. Create `expansion-11-explainability.ts` (§1) + unit specs (include both-high jealousy **no** positive chip).
2. Wire `assemble-result.ts` after Exp-10 + `match-explainability.ts` resolution (§2–3).
3. Add `CHIP_TO_TRAIT` (§4).
4. Append `CHIP_EVIDENCE_KEYS` + EN/HE/ES `chipEvidence` (§5–6).
5. Append onboarding `writingPrompts.aboutMe.questions` EN/HE/ES (§7).
6. Update frontend specs; run verification commands (**vitest** for UI).
7. **Do not** touch Exp-01–07/10 explainability maps, Exp-08, scoring promote, tension i18n, or extraction.
8. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-11-stress-security/handoffs/STORY_04_chips_i18n/`. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-11 stress and security positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Agent 2 CR checklist

- [ ] `expansion-11-explainability.ts` exists with exact labels/domains (`emotional`)
- [ ] Assembled after Exp-10; **no** Exp-08 stub invented
- [ ] Resolution wired in `match-explainability.ts` (`_11` alias)
- [ ] Both-low jealousy is **synthetic**; both-high jealousy does **not** emit positive chip
- [ ] `CHIP_TO_TRAIT` + `CHIP_EVIDENCE_KEYS` (**33**) + EN/HE/ES evidence exact
- [ ] Onboarding prompts appended EN/HE/ES; no new schema fields
- [ ] No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` promote
- [ ] No keyword chip scoring / text-inference drift
- [ ] Prior expansion explainability files untouched
- [ ] Unit tests + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- **Story 5:** Live Hebrew fixtures; >85%; compare E2E; optional promote; Exp-08 chips remain a separate sprint debt.
- **Domain diversity:** both Exp-11 chips share `emotional` — picker may show one; acceptable for shadow display.

---

## Next agent

```text
--agent 1 expansion 11 story 4
```

**Notes:** Shadow overlay only. Jealousy polarity: high = jealous → both-high is tension (Story 3), both-low is positive chip (this story). Onboarding = writing-prompt copy into existing About me, not a new field.
