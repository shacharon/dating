# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_llm_narrative_generator.md](../../STORY_01_llm_narrative_generator.md)  
**Sprint:** sprint-22-llm-match-narrative  
**Date:** 2026-07-29  
**Status:** complete  

---

## Summary

- Design a **pure, unit-testable** `match-narrative` module: fact pack → constrained LLM JSON → validated narrative → deterministic fallback.
- **No HTTP wiring, no Prisma, no cache** in Story 1 (those are Story 2). Scoring / HG / blend weights untouched.
- Existing LLM stack only exposes `completeJSON` → narrative must return Zod `{ narrative: string }` under purpose `match_narrative`.
- Reuse `MatchExplainabilityDto`, `MatchRecommendationDto`, and `buildMatchExplanationTraits` as inputs; **forbid** `aboutMe` / `aboutPartner` / `aboutRelationship` on the fact-pack type.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/match-narrative/` (new folder) | design only — Agent 1 creates |
| `prisma/schema.prisma` | **N/A** this story (cache = Story 2) |
| Match list/detail HTTP | **N/A** this story |

---

## Decisions (do not reverse without discussion)

1. **Module layout (new folder under matches):**
   ```
   src/matches/match-narrative/
     match-narrative.types.ts          # FactPack, ScoreBand, GenerateResult
     match-narrative-fact-pack.ts      # buildMatchNarrativeFactPack (pure)
     match-narrative-prompt.ts         # system + user prompt builders (pure)
     match-narrative-validate.ts       # validateLlmNarrative (pure)
     match-narrative-fallback.ts       # buildFallbackMatchNarrative (pure, deterministic)
     match-narrative.generator.ts      # Nest injectable OR plain class with injected LLM
     match-narrative.generator.spec.ts
     match-narrative-fact-pack.spec.ts
     match-narrative-fallback.spec.ts
     match-narrative-validate.spec.ts
     match-narrative-prompt.spec.ts
     index.ts                          # barrel exports for Story 2
   ```

2. **`MatchNarrativeFactPack` (allowed fields only — TypeScript enforces no about\*):**
   ```ts
   export type MatchNarrativeScoreBand =
     | 'strong'    // finalScore >= 80
     | 'solid'     // >= 60
     | 'moderate'  // >= 50
     | 'partial'   // >= 40
     | 'weak';     // else

   export interface MatchNarrativeTraitFact {
     group: string;
     label: string;
     evidence: string;
     strength: 'strong' | 'moderate';
   }

   export interface MatchNarrativeFactPack {
     finalScore: number;
     scoreBand: MatchNarrativeScoreBand;
     positiveChips: string[];
     traits: MatchNarrativeTraitFact[];
     tensionChip?: string;
     sharedInterests?: string[];
     sharedInterestNote?: string;
     caution?: string;
     suggestedNextAction?: string;
   }
   // Intentionally NO aboutMe / aboutPartner / aboutRelationship
   ```

3. **Score-band mapping** (align with `buildPrimaryTakeaway` bands in `match-recommendation.ts`):
   | Band | `finalScore` |
   |------|----------------|
   | strong | ≥ 80 |
   | solid | ≥ 60 |
   | moderate | ≥ 50 |
   | partial | ≥ 40 |
   | weak | else |

4. **Builder signature (pure):**
   ```ts
   export function buildMatchNarrativeFactPack(input: {
     finalScore: number;
     explainability: MatchExplainabilityDto;
     recommendation?: Pick<
       MatchRecommendationDto,
       'caution' | 'suggestedNextAction'
     >;
     /** Prefer prebuilt traits from detail path; if omitted, call buildMatchExplanationTraits(chips, score). */
     traits?: MatchExplanationTrait[];
   }): MatchNarrativeFactPack
   ```
   - Copy `positiveChips`, `tensionChip`, parse shared interests from `sharedInterestNote` **or** accept optional `sharedInterests?: string[]` on input if Story 2 will pass them — for Story 1, derive from note via a simple `"You both enjoy X, Y."` parser **or** add optional `sharedInterests?: string[]` on builder input (preferred: optional array on builder input so Story 2 can pass `sharedInterestTags` without parsing).
   - **Locked preference:** builder input includes optional `sharedInterests?: string[]`; if present use it; else leave `sharedInterests` undefined and still pass through `sharedInterestNote` if set.
   - Never accept free-text profile fields.

5. **Prompt version constant** (Story 2 cache key will include this):
   ```ts
   export const MATCH_NARRATIVE_PROMPT_VERSION = 'v1';
   ```

6. **LLM contract:**
   - Inject `LLMRouterService` from `LlmModule`.
   - `modelKey`: `'fast'` (same as evaluate path; falls back to `mini`).
   - `purpose`: `'match_narrative'`.
   - Zod schema:
     ```ts
     z.object({ narrative: z.string().min(1) })
     ```
   - Suggested knobs: `temperature: 0.4`, `maxTokens: 900`, `timeoutMs: 20_000` (tune in impl; document final in Agent 1 notes).
   - `requestId`: caller-supplied (Story 2 will pass HTTP requestId); unit tests use a fixed id.

7. **Generator API (Story 1 public surface):**
   ```ts
   export type GenerateMatchNarrativeResult = {
     narrative: string;
     source: 'llm' | 'fallback';
     promptVersion: typeof MATCH_NARRATIVE_PROMPT_VERSION;
   };

   // Nest @Injectable() preferred so Story 2 can DI it
   export class MatchNarrativeGenerator {
     constructor(private readonly llm: LLMRouterService) {}

     async generate(
       factPack: MatchNarrativeFactPack,
       opts: { requestId: string },
     ): Promise<GenerateMatchNarrativeResult>
   }
   ```
   Flow:
   1. Build system + user prompts from fact pack.
   2. `try { completeJSON(...) }` → validate narrative string.
   3. On throw / empty / validation fail → `buildFallbackMatchNarrative(factPack)` with `source: 'fallback'`.

8. **Prompt rules (system text must encode):**
   - Use **only** facts in the user JSON; do not invent signals, quotes, or scores.
   - Write **5–12 English sentences**; length scales with fact count (chips/traits/interests/tension); never pad.
   - Prefer human phrasing over chip jargon.
   - If `tensionChip` present → 1–2 honest sentences about that tension.
   - Forbidden in output: numeric scores, "%", words `compatibility` / `friction` / `score` as metrics.
   - Output JSON `{ "narrative": "..." }` only (schema-enforced).

9. **User prompt shape:** serialize fact pack as JSON (pretty) under a short header. No profile free-text keys exist on the type → cannot appear.

10. **Validator (soft band):**
    - Reject: empty / whitespace-only.
    - Soft sentence count: split on `[.!?]+` after trim; prefer 5–12.
    - If count `< 3` or `> 16` → fail validation → fallback (avoid brittle exact 5–12 on LLM variance).
    - Optional grounding: at least one trait `label` or chip substring (case-insensitive) appears in narrative **OR** at least one distinctive word from a trait `evidence` — if zero chips/traits, skip grounding check.
    - Do **not** require exact chip strings (human rephrase is the point).

11. **Fallback (deterministic):**
    - Assemble multi-sentence paragraph from scoreBand opener + up to 5 trait evidence lines + optional sharedInterestNote + optional tensionChip + closer from `suggestedNextAction` / band.
    - Must always return non-empty string.
    - Same inputs → same output (unit-test).

12. **`Conflict approach` trait gap:** `POSITIVE_CHIP_BY_SIGNAL.conflictStyle = 'Conflict approach'` exists, but `CHIP_TO_TRAIT` lacks that key → traits drop it. **In scope for Story 1:** add `'Conflict approach'` to `CHIP_TO_TRAIT` (group: `How you communicate`, evidence: e.g. conflict-handling alignment). Small additive fix; improves fact pack richness.

13. **Nest module:** do **not** create a new Nest module unless needed for DI in Story 1 tests. Prefer:
    - Pure functions exported from barrel.
    - `MatchNarrativeGenerator` as `@Injectable()` registered later in Story 2 inside `MeProfileModule` (or MatchesModule).
    - Story 1 unit tests: instantiate generator with a mock `{ completeJSON: jest.fn() }` (no Nest testing module required).

14. **Out of scope reminders:** no Prisma, no `getById` wiring, no UI, no raw about\* text, no i18n of narrative.

---

## Prisma schema

**N/A for Story 1.** Cache table designed in Story 2.

---

## API contracts

**N/A for Story 1** (no new HTTP endpoints).

Story 2 will add `matchNarrative` on match **detail** DTO only — do not invent list-field behavior here.

---

## Service signatures (copy-paste ready for Agent 1)

```ts
// match-narrative.types.ts
export const MATCH_NARRATIVE_PROMPT_VERSION = 'v1' as const;

export type MatchNarrativeScoreBand =
  | 'strong'
  | 'solid'
  | 'moderate'
  | 'partial'
  | 'weak';

export interface MatchNarrativeTraitFact {
  group: string;
  label: string;
  evidence: string;
  strength: 'strong' | 'moderate';
}

export interface MatchNarrativeFactPack {
  finalScore: number;
  scoreBand: MatchNarrativeScoreBand;
  positiveChips: string[];
  traits: MatchNarrativeTraitFact[];
  tensionChip?: string;
  sharedInterests?: string[];
  sharedInterestNote?: string;
  caution?: string;
  suggestedNextAction?: string;
}

export type GenerateMatchNarrativeResult = {
  narrative: string;
  source: 'llm' | 'fallback';
  promptVersion: typeof MATCH_NARRATIVE_PROMPT_VERSION;
};

// match-narrative-fact-pack.ts
export function scoreBandFromFinalScore(finalScore: number): MatchNarrativeScoreBand;

export function buildMatchNarrativeFactPack(input: {
  finalScore: number;
  explainability: MatchExplainabilityDto;
  recommendation?: { caution?: string; suggestedNextAction?: string };
  traits?: MatchExplanationTrait[];
  sharedInterests?: string[];
}): MatchNarrativeFactPack;

// match-narrative-prompt.ts
export function buildMatchNarrativeSystemPrompt(): string;
export function buildMatchNarrativeUserPrompt(factPack: MatchNarrativeFactPack): string;

// match-narrative-validate.ts
export function validateLlmNarrative(
  narrative: string,
  factPack: MatchNarrativeFactPack,
): { ok: true } | { ok: false; reason: string };

// match-narrative-fallback.ts
export function buildFallbackMatchNarrative(
  factPack: MatchNarrativeFactPack,
): string;

// match-narrative.generator.ts
@Injectable()
export class MatchNarrativeGenerator {
  constructor(private readonly llm: LLMRouterService) {}
  async generate(
    factPack: MatchNarrativeFactPack,
    opts: { requestId: string },
  ): Promise<GenerateMatchNarrativeResult>;
}
```

Zod (inline in generator or `match-narrative.schema.ts`):

```ts
export const MatchNarrativeLlmSchema = z.object({
  narrative: z.string().min(1),
});
```

---

## Integration points

| Component | Story 1 action |
|-----------|----------------|
| `LlmModule` / `LLMRouterService` | Reuse; purpose `match_narrative` |
| `match-explainability.ts` | Read-only input |
| `match-recommendation.ts` | Read-only tone hints; keep `primaryTakeaway` as list short text |
| `match-explanation-traits.ts` | Reuse + add `Conflict approach` to `CHIP_TO_TRAIT` |
| `match-engine.compare()` | **Do not call LLM here** (stays sync). Story 2 wires after compare. |
| Prisma / me-matches HTTP | Story 2 |

---

## Runtime topology (realtime / proxy / cookies)

**N/A** — Story 1 is an in-process library module; no browser/socket/cookie changes.

---

## E2E verification plan (eligibility / ranking)

**N/A for Agent 4.** Story 1 does not touch eligibility, preference dimensions, ranking order, or `/me/matches` HTTP. Agent 4 is **skipped**; after Agent 2 go to `--agent 3`.

Unit verification for Agent 1 (not E2E):

```bash
cd dating-api
npx jest --testPathPatterns "match-narrative" --no-coverage
npx tsc --noEmit -p tsconfig.json
```

---

## Tests / verification

- [ ] Unit/integration command: `npx jest --testPathPatterns "match-narrative" --no-coverage` (Agent 1)
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: **N/A**
- [ ] Browser Network smoke: **N/A**
- [ ] Socket transport: not checked

**Required unit cases (Agent 1):**

1. Fact pack has no `about*` keys; builder ignores any accidental extra fields if cast.
2. User prompt JSON includes chips/traits/band; never contains `aboutMe` string keys.
3. Mocked LLM success → `source: 'llm'`, narrative non-empty.
4. Mocked LLM throw / empty / bad validation → `source: 'fallback'`, deterministic string.
5. Fallback identical for identical fact packs.
6. `Conflict approach` appears in traits when chip present (after CHIP_TO_TRAIT fix).

---

## Open questions / blockers

- None blocking Story 1.  
- Optional later (not Story 1): whether to cache fallbacks (Story 2 already leans **do not cache fallback**).

---

## Next agent

```text
--agent 1 sprint 22 story 1
```

**Notes for next agent:**

- Implement exactly the folder + signatures above; keep `compare()` free of LLM.
- Register Nest provider only if needed for your tests; Story 2 will wire DI into `MeProfileModule`.
- Do not add Prisma models or HTTP fields in this story.
- Add `Conflict approach` to `CHIP_TO_TRAIT` as part of this story.
- Export `MATCH_NARRATIVE_PROMPT_VERSION` from the barrel for Story 2.
