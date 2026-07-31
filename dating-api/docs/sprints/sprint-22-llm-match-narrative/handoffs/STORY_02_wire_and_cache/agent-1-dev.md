# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_wire_and_cache.md](../../STORY_02_wire_and_cache.md)  
**Sprint:** sprint-22-llm-match-narrative  
**Date:** 2026-07-29  
**Status:** complete  

---

## Summary

- Wired Story 1 `MatchNarrativeGenerator` into **`MeMatchesService.getById` only** via `resolveMatchNarrative()` (after successful `compareWithStatus`).
- Added Prisma `MatchNarrativeCache` + migration; `MatchNarrativeCacheService` find/upsert on evaluation-pair + `MATCH_NARRATIVE_PROMPT_VERSION`.
- **Do not cache fallback** (`source === 'fallback'` skips upsert). Cache read failures → miss; upsert failures still return narrative.
- `matchNarrative?: string` on detail DTO only; list unchanged / must not invoke generator.
- `MeProfileModule` imports `LlmModule` and registers generator + cache. Scoring / `compare()` untouched.

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | `MatchNarrativeCache` model (single-line `@@unique` — multiline rejected by Prisma 6.19 validate) |
| `prisma/migrations/20260729220000_match_narrative_cache/migration.sql` | created + **deployed** locally |
| `src/matches/match-narrative/match-narrative-cache.service.ts` | created |
| `src/matches/match-narrative/match-narrative-cache.service.spec.ts` | created |
| `src/matches/match-narrative/index.ts` | export cache service |
| `src/logging/error-codes.ts` | `ME_MATCHES_NARRATIVE_*` |
| `src/me-profile/me-profile.module.ts` | `LlmModule` + providers |
| `src/me-profile/me-matches.service.ts` | DI + `resolveMatchNarrative` + detail field |
| `src/me-profile/me-matches.service.spec.ts` | ctor mocks + cache hit/miss/LLM upsert/guard tests |
| `src/me-profile/me-matches.v1-contract.spec.ts` | list omits / detail includes `matchNarrative` |

---

## Decisions (do not reverse without discussion)

- Narrative only on **detail** (`MeMatchDetailDto.matchNarrative?`); not on list / `MatchRecommendationDto`.
- Fallback narratives are **never** persisted (architect lock).
- No FKs on cache rows for v1.
- Shared interests: fact pack uses explainability already on compare path; no extra Jaccard re-parse.
- Prisma `@@unique([...])` must stay **one line** in this repo’s Prisma version (multiline failed validate).

---

## Runtime topology (architect — realtime / proxy / cookies only)

- Browser → `localhost:3000/api/...` → Next rewrite → `127.0.0.1:3001`.
- First scored detail open may wait on LLM; second open with same eval IDs should hit DB cache (obs: `ME_MATCHES_NARRATIVE_CACHE_HIT`).
- Socket: unchanged.

---

## Tests / verification

- [x] Unit: `npx jest --testPathPatterns "match-narrative-cache|me-matches.service.spec|me-matches.v1-contract" --no-coverage` → **98/98 pass**
- [x] `npx tsc --noEmit -p tsconfig.json` → **pass**
- [x] `npx prisma migrate deploy` → applied `20260729220000_match_narrative_cache`
- [ ] Browser Network smoke: deferred to Agent 4 (detail ×2; CACHE_HIT on second)
- [x] Socket transport: N/A (unchanged)

---

## E2E verification (agent 4 — eligibility / preference / ranking stories only, else N/A)

**Required** — story touches `GET /api/v1/me/matches/:id`.

See architect E2E plan: cache hit skips generator; eval id change forces miss; fallback not cached; list has no `matchNarrative`; baseline me-new-model e2e still green. Prefer mocked LLM in integration (no live OpenAI required).

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 22 story 2
```

**Notes for next agent:**

- Confirm no LLM inside `compare()` / list path.
- Confirm fallback never upserts.
- After CR → **`--agent 4 sprint 22 story 2`** then `--agent 3`.
