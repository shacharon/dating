# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_llm_derived_context.md](../../STORY_03_llm_derived_context.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Persist** LLM-inferred dealbreaker context on **`EvaluateBatchResult.derivedContext`** (top-level sidecar, version `v1`) — **not** inside per-domain `ExtractedSignals` and **not** under `extendedSignals` (display-only, no scoring).
- **New evaluate-time LLM call** `inferDerivedContext()` in `EvaluateService`, parallel with summary + extended signals (same three texts as motivation inference).
- **Match pipeline** reads stored context via **`resolveDerivedContext(evaluation, texts)`**; **`deriveContextFromProfileTexts()`** remains regex fallback for legacy rows and LLM failure.
- **`dealbreakers.ts` unchanged** — still consumes `DerivedContext`; only upstream source changes.
- **Invalid LLM output** → sanitize to defaults (`visibilityNeed: 5`, `lifeStage: 5`, `occupationClass: null`) before persist; omit block entirely on hard LLM failure → runtime regex fallback.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/evaluate/evaluate-inference-schemas.ts` | `OCCUPATION_CLASS_VALUES`, `LlmDerivedContextSchema`, exported types |
| `dating-api/src/evaluate/evaluate-llm-prompts.ts` | `DERIVED_CONTEXT_SYSTEM_PROMPT` |
| `dating-api/src/evaluate/evaluate-batch.types.ts` | `DerivedContextV1` interface + optional `derivedContext` on `EvaluateBatchResult` |
| `dating-api/src/evaluate/derived-context-sanitize.ts` | **New** — `sanitizeDerivedContextForPersist()` |
| `dating-api/src/evaluate/derived-context-sanitize.spec.ts` | **New** — unit tests for clamp/enum/null |
| `dating-api/src/evaluate/evaluate.service.ts` | `inferDerivedContext()`; wire into `evaluateBatch` parallel bundle |
| `dating-api/src/evaluate/evaluate.service.spec.ts` | Mock LLM; assert `derivedContext` on result |
| `dating-api/src/domain/deriveContext.ts` | `resolveDerivedContext()`; export `OccupationClass` type alias |
| `dating-api/src/domain/deriveContext.spec.ts` | **New** — LLM-first vs regex fallback |
| `dating-api/src/matches/match-engine.ts` | Use `resolveDerivedContext` in `deriveProfileContextsAndEnrichedSignals` |
| `dating-api/src/matches/match-engine.spec.ts` | Fixture with `evaluation.derivedContext` beats regex on same texts |
| `dating-api/docs/match-engine-overview.md` | Short bullet: derived context source order |
| `handoffs/STORY_03_llm_derived_context/agent-1-dev.md` | created by agent 1 |

**Do not change (this story):**

| Path | Reason |
|------|--------|
| `dating-api/src/domain/dealbreakers.ts` | Consumer contract unchanged per AC |
| `dating-api/src/extraction/extraction.service.ts` | Domain signal extraction stays separate; context is profile-level |
| UI / match list DTOs | Out of scope |
| Remove regex in `deriveContextFromProfileTexts` | Deferred until backfill |

---

## Decisions (do not reverse without discussion)

### 1. Storage shape (locked)

Add to `EvaluateBatchResult`:

```typescript
/** v1 dealbreaker context from profile analysis LLM. Scoring-relevant. */
export interface DerivedContextV1 {
  version: 'v1';
  occupationClass: 'STANDARD' | 'SHIFT_UNPREDICTABLE' | 'TRAVEL_HEAVY' | null;
  visibilityNeed: number; // 0–10 integer
  lifeStage: number;    // 0–10 integer
  confidence?: number; // 0–1 optional
  evidence?: string[]; // max 5, optional observability
}

derivedContext?: DerivedContextV1;
```

**Rationale:** Single object per profile evaluation; `me-profile-engine.mapper` already passes full `evaluationJson` to `ProfileJsonPayload.evaluation` — no mapper change beyond type widening.

### 2. LLM placement: evaluate batch, not extraction domains (locked)

- **Do not** extend `SELF_EXTRACTOR_PROMPT` / partner / relationship prompts.
- **Do** add dedicated `inferDerivedContext(aboutMe, aboutPartner, aboutRelationship)` in `EvaluateService`, mirroring `inferRelationshipMotivation`.
- **Input:** all three profile texts (occupation cues often in `aboutMe`; visibility/life stage may appear in any section).
- **Parallelism:** start in `evaluateBatch` alongside `displayPromise` and `extendedSignalsPromise` (third promise `derivedContextPromise`).

**Failure policy:**

| Outcome | Persist | Match runtime |
|---------|---------|---------------|
| LLM + Zod OK | `derivedContext` sanitized | `resolveDerivedContext` uses LLM |
| LLM parse invalid | sanitized defaults in `derivedContext` | uses persisted defaults |
| LLM throws / timeout | **omit** `derivedContext` | regex fallback from `texts` |

Do **not** fail entire `evaluateBatch` when derived-context inference fails (same resilience as extended signals).

### 3. Zod schema + sanitize (locked)

```typescript
export const OCCUPATION_CLASS_VALUES = [
  'STANDARD',
  'SHIFT_UNPREDICTABLE',
  'TRAVEL_HEAVY',
] as const;

export const LlmDerivedContextRawSchema = z
  .object({
    occupationClass: z
      .enum(OCCUPATION_CLASS_VALUES)
      .nullable()
      .optional(),
    visibilityNeed: z.number().optional(),
    lifeStage: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
    evidence: z.array(z.string()).max(5).optional(),
  })
  .strict();
```

`sanitizeDerivedContextForPersist(raw: unknown): DerivedContextV1`:

| Field | Rule |
|-------|------|
| `occupationClass` | If missing/invalid enum → `null`. `STANDARD` is valid stored value. |
| `visibilityNeed` | Round/clamp to integer 0–10; invalid → **5** |
| `lifeStage` | Round/clamp to integer 0–10; invalid → **5** |
| `confidence` | Clamp 0–1 if present |
| `evidence` | Truncate to 5 strings if present |
| Always set `version: 'v1'` |

### 4. `resolveDerivedContext` (locked)

```typescript
export function resolveDerivedContext(
  evaluation: Pick<EvaluateBatchResult, 'derivedContext'> | undefined,
  texts: ProfileTexts,
): DerivedContext {
  const stored = evaluation?.derivedContext;
  if (stored?.version === 'v1') {
    return {
      occupationClass: mapOccupationForDealbreakers(stored.occupationClass),
      visibilityNeed: stored.visibilityNeed,
      lifeStage: stored.lifeStage,
    };
  }
  return deriveContextFromProfileTexts(texts);
}

/** STANDARD and null → undefined (regex never set STANDARD). */
function mapOccupationForDealbreakers(
  occ: DerivedContextV1['occupationClass'],
): string | undefined {
  if (occ === 'SHIFT_UNPREDICTABLE' || occ === 'TRAVEL_HEAVY') return occ;
  return undefined;
}
```

**Presence test:** use `stored?.version === 'v1'`, not truthy `occupationClass` — persisted defaults may have `occupationClass: null` but still valid LLM path.

### 5. `match-engine.ts` wiring (locked)

In `deriveProfileContextsAndEnrichedSignals`:

```typescript
const ctxA = resolveDerivedContext(profileA.evaluation, profileA.texts ?? {});
const ctxB = resolveDerivedContext(profileB.evaluation, profileB.texts ?? {});
```

Update `ProfileContextsAndEnriched` types to `ReturnType<typeof resolveDerivedContext>`.

**JSON file profiles / HG paths** that build `ProfileJsonPayload` with `evaluation` automatically pick up stored context after re-analyze.

### 6. Prompt definitions (locked content)

Add to `evaluate-llm-prompts.ts`:

**`DERIVED_CONTEXT_SYSTEM_PROMPT`** — instruct model to return JSON only:

| Field | Definitions for LLM |
|-------|---------------------|
| `occupationClass` | `SHIFT_UNPREDICTABLE`: rotating shifts, night shift, on-call, unpredictable schedule. `TRAVEL_HEAVY`: frequent travel, road warrior, nomad, flying weekly. `STANDARD`: stable/predictable schedule or no strong schedule signal. `null` only if texts are empty/generic. |
| `visibilityNeed` | 0 = very private/low visibility; 10 = highly visible/social/public life. Default 5 when unclear. |
| `lifeStage` | 0 = early/career-start; 10 = settled/established/empty-nest. Default 5 when unclear. |

**Rules:** explicit evidence only; no guessing from job title alone without schedule/visibility/life-stage cues; integers 0–10.

**`purpose`:** `evaluate-derived-context`  
**`maxTokens`:** 400 · **`temperature`:** 0.2 · **`timeoutMs`:** 15_000 · **`modelKey`:** `fast`

### 7. Enum alignment with dealbreakers (locked)

Dealbreaker rule #2 checks:

```typescript
aOcc === 'SHIFT_UNPREDICTABLE' || aOcc === 'TRAVEL_HEAVY'
```

LLM must emit **exact** strings `SHIFT_UNPREDICTABLE` and `TRAVEL_HEAVY` (already in story AC). Do not introduce new enum values in this story.

Regex fallback today never emits `STANDARD` — only optional `TRAVEL_HEAVY` / `SHIFT_UNPREDICTABLE`. Mapping `STANDARD` → `undefined` keeps dealbreaker behavior identical to “no special occupation.”

### 8. Observability (recommended)

Add optional trace on `_evaluateLlmTraces`:

```typescript
derivedContext?: EvaluateLlmCallTrace;
```

Not required for AC; mirror motivation/attraction if low effort.

---

## Regression tests (required)

### `derived-context-sanitize.spec.ts`

| Case | Expect |
|------|--------|
| Valid full payload | unchanged values, `version: 'v1'` |
| `visibilityNeed: 12` | clamped to 10 |
| `occupationClass: 'NURSE'` | → `null` |
| missing numerics | `5` / `5` |
| `STANDARD` | stored as `STANDARD`; `mapOccupationForDealbreakers` → `undefined` |

### `deriveContext.spec.ts`

| Case | Expect |
|------|--------|
| `derivedContext` with `SHIFT_UNPREDICTABLE` | returns that class even if texts lack shift keywords |
| no `derivedContext` + texts with "night shift" | regex returns `SHIFT_UNPREDICTABLE` |
| `derivedContext` v1 with defaults 5/5 | **does not** call regex (no accidental override) |

### `evaluate.service.spec.ts`

| Case | Expect |
|------|--------|
| Mock `completeJSON` for derived-context purpose | `result.derivedContext` present after `evaluateBatch` |
| Mock throws for derived-context only | batch still `ok: true`; `derivedContext` absent |

### `match-engine.spec.ts`

| Case | Expect |
|------|--------|
| Pair A has LLM `visibilityNeed: 2`, B has `8` | `VISIBILITY_NEED_MISMATCH` in dealbreakers |
| Same texts but **no** `derivedContext` on evaluation | same flag via regex if keywords present (legacy path) |

---

## Documentation (`match-engine-overview.md`)

Add under dealbreaker / context section:

```text
Derived context (occupationClass, visibilityNeed, lifeStage):
1. Use evaluation.derivedContext v1 when present (LLM at analyze time).
2. Else deriveContextFromProfileTexts(texts) keyword fallback (legacy evaluations).
```

---

## Backward compatibility

| Scenario | Expected |
|----------|----------|
| Existing `evaluationJson` without `derivedContext` | Identical dealbreakers via regex (until re-analyze) |
| New analyses | LLM fields stored; regex not used when `version === 'v1'` |
| Stored match rows | Unchanged until recompute — context read at compare time from live evaluation |
| `computeCompatibility().overallScore` | Unchanged |

---

## Backfill (optional, not blocking)

Document in story PM handoff / `dating-api/scripts/` note:

```bash
# Re-run profile analysis for profiles that need LLM context (operator)
# via existing analyze endpoint or batch tool — no new script required for engineering gate
```

Removing regex entirely = follow-up after bulk re-analyze.

---

## Verification commands

```bash
cd dating-api
npx jest src/evaluate/derived-context-sanitize.spec.ts src/domain/deriveContext.spec.ts src/evaluate/evaluate.service.spec.ts src/matches/match-engine.spec.ts
npm test
npm run build
rg "deriveContextFromProfileTexts" src/matches/match-engine.ts
# expect only via resolveDerivedContext import usage
```

---

## Open questions / blockers

- None for Agent 1.
- **Operator:** re-analyze profiles to populate `derivedContext` in DB (not blocking engineering gate).
- **Cost:** +1 fast LLM call per `evaluateBatch` (~400 tokens); acceptable for Sprint 6.

---

## Next agent

```text
--agent 1 sprint 6 story 3
```
