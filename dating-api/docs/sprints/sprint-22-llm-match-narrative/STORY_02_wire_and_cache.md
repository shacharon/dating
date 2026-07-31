# Story 2: Wire into match detail path + evaluation-keyed cache

**Sprint:** 22  
**Status:** Done  
**Depends on:** Story 1

---

## Why

Story 1 gives us a pure generator. Product needs it on the live match **detail** path, with caching so opening the same match does not re-bill the LLM, and so a re-analysis of either profile naturally invalidates the narrative.

---

## What

**As a** user  
**I want** the match detail API to return a stable, human `matchNarrative`  
**So that** the UI can show a real explanation without waiting on the LLM every click.

### Acceptance criteria

- [x] Extend recommendation / detail DTO with `matchNarrative: string` (long-form). Keep `primaryTakeaway` / `reasonShort` for list cards — do not replace them with the long text.
- [x] On match detail (`MeMatchesService.getById` / compare path that builds `recommendation`), after deterministic explainability + recommendation are computed:
  1. Resolve `viewerEvaluationId` + `candidateEvaluationId` (latest evaluations already loaded for compare).
  2. Look up cache by `(viewerProfileId, candidateProfileId, viewerEvaluationId, candidateEvaluationId)` (+ prompt version constant if used).
  3. On miss → call Story 1 generator → store → return.
  4. On hit → return cached string (no LLM).
- [x] Persistence: prefer a Prisma model (e.g. `MatchNarrativeCache`) or an agreed JSON store — must survive API restart. Include `createdAt`, optional `model` / `promptVersion`, and the narrative text. Migration required if new table.
- [x] Lazy only — do **not** enqueue narrative jobs from analysis worker in this story.
- [x] LLM / generator failure → serve fallback narrative; still may optionally cache the fallback (product choice: **do not cache fallback** so a later retry can succeed — document the choice in implementation notes).
- [x] List endpoint must **not** call the LLM or require `matchNarrative` (omit field or leave undefined on list rows).
- [x] Observability: trace cache hit/miss + LLM success/fail with purpose `match_narrative`; do not log full fact pack or narrative body at info.
- [x] Integration / unit tests: cache hit skips LLM; evaluation id change forces miss; detail includes `matchNarrative`; list does not require it; scores unchanged.

### Out of scope (this story)

- UI rendering (Story 3).
- Eager generation after analysis.
- TTL-based expiry.
- Backfilling narratives for all historical pairs.

---

## Definition of done

- [x] Detail API returns `matchNarrative` for scored matches.
- [x] Second detail fetch with same evaluation IDs does not invoke the LLM client.
- [x] After either side gets a new evaluation, next detail fetch regenerates.
- [x] Fallback path covered by test (mocked LLM throw).

## Suggested touchpoints

- `src/me-profile/me-matches.service.ts` (`getById`)
- `src/matches/match-engine.ts` / `match-recommendation.ts` (DTO extension — prefer attaching narrative at service layer after compare, not inside pure `compare()`, so compare stays sync/deterministic)
- New Prisma model + migration under `prisma/`
- New cache repository/service under `src/matches/` or `src/me-profile/`

## Implementation notes

**Handoffs:** architect → dev → CR → E2E → PM.

**Delivered:**
- Prisma `MatchNarrativeCache` + migration `20260729220000_match_narrative_cache` (evaluation pair + `promptVersion` unique).
- `MatchNarrativeCacheService` + Nest DI in `MeProfileModule` (`LlmModule`, `MatchNarrativeGenerator`).
- `MeMatchesService.getById` → `resolveMatchNarrative()` after successful `compareWithStatus`; `matchNarrative?: string` on detail DTO only.
- **Do not cache fallback** (`source === 'fallback'` skips upsert) — documented in service + tests.
- Obs codes `ME_MATCHES_NARRATIVE_*` (hit/miss/llm ok/fallback/store ok/fail); no narrative body at info.
- CR: harness stubs so HTTP/E2E never hit live OpenAI via missing Prisma delegate.
- E2E: `me-new-model-e2e-match-narrative.integration.spec.ts` + baselines green (316 integration tests).

**Deferred to Story 3:** UI types + match detail rendering of `matchNarrative`.  
**Deferred (optional):** browser Network smoke with live OpenAI key; optional `model` column on upsert.
