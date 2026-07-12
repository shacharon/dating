# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_topic_taxonomy_and_classifier.md](../../STORY_01_topic_taxonomy_and_classifier.md)  
**Sprint:** sprint-17-natural-language-dealbreaker-classifier  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Story 1 is a **pure Layer-1 classifier**: revive closed taxonomy + deterministic free-text → `DealbreakerSignal[]`. **No** Holy Grail evaluator / ranking / matches / API / Prisma changes.
- Mirror `interest-tags-text.extract.ts` / `personality-traits-text.extract.ts` discipline (allowlist, `isNegatedBefore`, sparse output, table-driven specs).
- Persistence + analysis wiring + eligibility (`NEVER_BLOCKS`) are **Story 2**. Agent 4 is **not required** for this story (no live matches behavior change).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/holy-grail-matching/dealbreaker-taxonomy.ts` | **create** — versioned taxonomy + types |
| `dating-api/src/holy-grail-matching/dealbreaker-signals-text.extract.ts` | **create** — pure deterministic extractor |
| `dating-api/src/holy-grail-matching/dealbreaker-signals-text.extract.spec.ts` | **create** — table-driven unit tests |
| `dating-api/src/holy-grail-matching/index.ts` | **update** — export public types + extract fn |
| `dating-api/src/extraction/extracted-negatives.interface.ts` | **update** — deprecate; re-export from new taxonomy for any stale imports (do not keep two divergent lists) |
| Prisma / API / UI / `eligibility.evaluator.ts` / `me-matches.service.ts` | **N/A — Story 2+** |

---

## Decisions (do not reverse without discussion)

### 1. Scope boundary — pure function only

Story 1 ships:

```ts
extractDealbreakerSignalsFromFreeText(input: {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}): DealbreakerSignalsTextExtraction
```

plus optional companion:

```ts
extractSelfFactHintsFromFreeText(input: /* same */): SelfFactHint[]
```

**Do not** call these from `MeProfileAnalysisService` yet, **do not** persist JSON, **do not** touch evaluator. Story 2 owns wiring.

### 2. Module placement — Holy Grail extractors, not dead extraction cluster

Put new files under `dating-api/src/holy-grail-matching/` next to `interest-tags-text.extract.ts` / `personality-traits-text.extract.ts` / `lifestyle-signals-text.extract.ts`. Do **not** revive the frozen V2 extraction cluster as a live pipeline; only revive the **taxonomy content** from `extracted-negatives.interface.ts`.

### 3. Taxonomy version + extensions

```ts
export const DEALBREAKER_TAXONOMY_VERSION = 'v1' as const;

export type DealbreakerCategory = 'behavioral' | 'lifestyle' | 'values' | 'social';

export type DealbreakerClassification =
  | 'HARD_EXCLUDE'
  | 'HARD_REQUIRE'
  | 'SOFT'
  | 'NEUTRAL'; // NEUTRAL = absent from output, never emitted as a row

export const DEALBREAKER_TAGS = {
  behavioral: [
    'smoking',
    'drugs',
    'excessive_drinking',
    'vaping',
    // requirement counterparts (Story AC + README)
    'only_non_smokers',
    'only_smokers',
    'only_non_drinkers',
    'only_non_vapers',
  ],
  lifestyle: [
    'no_kids',
    'kids_required',
    'no_pets',
    'pets_required',
    'no_remote_work',
    'must_be_local',
    'long_distance_impossible',
  ],
  values: [
    'political_incompatibility',
    'religious_incompatibility',
    'moral_incompatibility',
  ],
  social: [
    'jealousy',
    'control',
    'clingy',
    'drama',
    'emotional_unavailability',
    'commitment_phobic',
  ],
} as const;

export const ALL_DEALBREAKER_TAGS = [ /* flatten */ ] as const;
export type DealbreakerTag = (typeof ALL_DEALBREAKER_TAGS)[number];
export const DEALBREAKER_TAG_SET = new Set<string>(ALL_DEALBREAKER_TAGS);
```

**Values/social stay exclude-only** — no `*_required` invent for jealousy/control/etc.

### 4. Tag vs classification — smoking family (literal story examples win)

Story AC literal cases use **one topic tag** + classification:

| Input | Output |
|-------|--------|
| `"I smoke"` | **no** `DealbreakerSignal` (self-fact hint only) |
| `"I don't want smokers"` | `{ tag: 'smoking', classification: 'HARD_EXCLUDE' }` |
| `"I don't care about smoking"` | `{ tag: 'smoking', classification: 'SOFT' }` |
| `"Only smokers"` / `"must be a smoker"` | `{ tag: 'smoking', classification: 'HARD_REQUIRE' }` |

Canonicalization rule for behavioral counterparts:

- Prefer emitting the **base topic tag** (`smoking` / `excessive_drinking` / `vaping` / `drugs`) + `classification` for the story examples.
- Treat `only_non_smokers` as an **alias** that normalizes to `{ tag: 'smoking', classification: 'HARD_EXCLUDE' }` (and `only_smokers` → `HARD_REQUIRE`) so the closed set includes the README counterparts without double-firing two tags for one phrase.
- Lifestyle directional tags (`no_kids` / `kids_required`) already encode direction — emit the directional tag + `HARD_EXCLUDE` or `HARD_REQUIRE` as appropriate (soft phrasing on kids/pets → `SOFT` on the matched directional or nearest topic tag; pick one rule and keep tests consistent).

### 5. Output shape

```ts
export interface DealbreakerSignal {
  readonly tag: DealbreakerTag;
  readonly classification: Exclude<DealbreakerClassification, 'NEUTRAL'>;
  readonly evidence: string; // exact quote / matched phrase window
  readonly confidence: number; // 0-1
}

export type DealbreakerSignalsTextExtraction = {
  readonly version: typeof DEALBREAKER_TAXONOMY_VERSION;
  /** Partner-preference signals only (never self-facts). */
  readonly signals: readonly DealbreakerSignal[];
  /** Optional audit: which field(s) contributed. */
  readonly sourceFields?: ReadonlyArray<'aboutMe' | 'aboutPartner' | 'aboutRelationship'>;
};
```

`NEUTRAL` = tag absent from `signals` (do not emit zero rows).

### 6. Domain split — linguistic, not “field name only”

Scan `aboutMe` + `aboutPartner` + `aboutRelationship`.

| Linguistic class | Destination |
|------------------|-------------|
| First-person **self-trait** (“I smoke”, “I’m a smoker”) | `SelfFactHint` only → maps toward existing columns (`smokingFrequency`, `alcoholUse`, `childrenStatus`, `wantsChildren`, `religion`, …). **Never** a `DealbreakerSignal`. |
| **Partner-directed** preference (“don’t want smokers”, “looking for a non-smoker”, “must want kids”) | `DealbreakerSignal` |
| Soft / don’t-care partner topic | `SOFT` signal |
| Ambiguous | `SOFT` (precision over recall for hard classes) |

Reuse / copy `isNegatedBefore` window from `interest-tags-text.extract.ts` (same regex discipline). Add polarity detectors:

- **HARD_EXCLUDE cues:** `don't want`, `won't date`, `dealbreaker`, `no <trait>`, `never date`, etc.
- **HARD_REQUIRE cues:** `only`, `must`, `non-negotiable`, `have to be`
- **SOFT cues:** `prefer not`, `not a huge fan`, `would be nice`, `don't care about`, `doesn't matter`

Hard classes require unambiguous cue + topic hit; else fall back to `SOFT` or omit.

### 7. Self-fact hints (Story 1 produces shape; Story 2 may persist)

```ts
export type SelfFactHint = {
  readonly field:
    | 'smokingFrequency'
    | 'alcoholUse'
    | 'childrenStatus'
    | 'wantsChildren'
    | 'religion'
    | string; // only existing UserProfile columns — do not invent new columns in Story 1
  readonly value: string; // enum-compatible string when possible
  readonly evidence: string;
  readonly confidence: number;
};
```

Story 1 **unit-tests** that “I smoke” yields a smoking self-fact hint and **zero** dealbreaker signals. Do **not** write Prisma updates in Story 1.

### 8. Confidence

- Exact / near-exact allowlisted phrase match → high confidence (e.g. `0.9`–`1.0`)
- Weaker topic + soft cue → lower (e.g. `0.5`–`0.7`)
- Do **not** invent a magic threshold gate here beyond “hard cues must be high-confidence patterns”; Story 3 owns kill-switch + hard-floor policy for production.

### 9. No Prisma / API / UI

No migration. No DTO/endpoint changes. No UI strings. Classifier is library-only until Story 2.

### 10. Deprecate old interface without dual source of truth

`extracted-negatives.interface.ts`: mark `@deprecated`, re-export tag sets from `dealbreaker-taxonomy.ts`, or thin-wrap. Agent 1 must not leave two independently editable tag lists.

---

## Service / function signatures (copy-paste ready)

```ts
// dealbreaker-taxonomy.ts
export const DEALBREAKER_TAXONOMY_VERSION = 'v1';
export type DealbreakerClassification = 'HARD_EXCLUDE' | 'HARD_REQUIRE' | 'SOFT' | 'NEUTRAL';
export type DealbreakerTag = /* union from ALL_DEALBREAKER_TAGS */;
export const DEALBREAKER_TAG_SET: ReadonlySet<string>;
export function isDealbreakerTag(x: string): x is DealbreakerTag;

// dealbreaker-signals-text.extract.ts
export function extractDealbreakerSignalsFromFreeText(input: {
  readonly aboutMe?: string | null;
  readonly aboutPartner?: string | null;
  readonly aboutRelationship?: string | null;
}): DealbreakerSignalsTextExtraction;

export function extractSelfFactHintsFromFreeText(input: {
  readonly aboutMe?: string | null;
  readonly aboutPartner?: string | null;
  readonly aboutRelationship?: string | null;
}): readonly SelfFactHint[];
```

**Module:** pure functions, no Nest providers, no DI, no Prisma, no LLM, no network.

**Exports:** add to `holy-grail-matching/index.ts`.

---

## Migration plan

- **Forward:** N/A (no schema)
- **Backfill:** N/A
- **Rollback:** delete new files / revert exports (no DB)

---

## Integration points

| Component | Story 1 | Later |
|-----------|---------|--------|
| `dealbreaker-*.ts` | implement | — |
| `MeProfileAnalysisService` | **do not wire** | Story 2 |
| HG structured JSON / canonical mapper | **do not touch** | Story 2 |
| `eligibility.evaluator.ts` + `NEVER_BLOCKS` | **do not touch** | Story 2 |
| UI / audit / kill switch | **do not touch** | Story 3 |

---

## Runtime topology

N/A — no realtime / proxy / cookie / browser transport changes.

---

## E2E verification plan

**Live effect this story:** **none** (classifier not on the matches path yet).

| Item | Plan |
|------|------|
| Affects eligibility gating? | **No** (deferred Story 2) |
| Affects ranking order? | **No** (deferred Story 2; ranking hook still an open sprint decision A/B/C) |
| Baseline keep green | `me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts`, `me-new-model-e2e.integration.spec.ts` — must stay green **unmodified** (no accidental coupling) |
| New E2E scenarios | **None in Story 1** — dealbreaker HTTP scenarios belong in Story 2 |
| Agent 4 | **Skip** after agent 2 → go to `--agent 3` (orchestrator: Agent 4 only when story touches eligibility/ranking/matches) |

Agent 1 verification is **unit** table-driven specs + full `dating-api` jest green, not new harness scenarios.

---

## Tests / verification (for agent 1)

- [ ] Unit: `npx jest src/holy-grail-matching/dealbreaker-signals-text.extract.spec.ts --runInBand`
- [ ] Table-driven: every tag family × HARD_EXCLUDE / HARD_REQUIRE / SOFT + at least one negation + one disambiguation case; literal smoking examples from story AC
- [ ] “I smoke” → self-fact hint, empty signals
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: **N/A**
- [ ] Browser Network smoke: **N/A**
- [ ] Socket transport: **N/A**

---

## E2E verification (agent 4)

N/A for Story 1 — skip Agent 4.

---

## Open questions / blockers

- **Sprint README open decision A/B/C (soft ranking)** — **does not block Story 1.** Leave undecided; Story 2 ranking half still blocked later.
- Hebrew / non-English phrase packs — **out of scope** Story 1 (match existing EN-first extractors); note as fast-follow if needed.

---

## Next agent

```text
--agent 1 sprint 17 story 1
```

**Notes for next agent:**

- Implement taxonomy + extractors + specs only; do not wire analysis or evaluator.
- Follow `interest-tags-text.extract.ts` patterns (`isNegatedBefore`, allowlisted phrases, sparse output).
- Smoking AC examples are the golden contract for the smoking family; normalize `only_non_smokers` / `only_smokers` aliases to `smoking` + classification.
- Keep baseline E2E specs untouched; Agent 4 is skipped for this story.
- After CR (`--agent 2`), next is `--agent 3` (skip 4).
