# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_wire_and_cache.md](../../STORY_02_wire_and_cache.md)  
**Sprint:** sprint-22-llm-match-narrative  
**Date:** 2026-07-29  
**Status:** complete  

---

## Summary

- Wire Story 1 `MatchNarrativeGenerator` into **`MeMatchesService.getById` only** (after `compareWithStatus`), with a new Prisma `MatchNarrativeCache` keyed by evaluation pair + prompt version.
- Keep `compare()` sync/deterministic — **no LLM inside match-engine**.
- List path must not call LLM or require `matchNarrative`.
- **Do not cache fallback** narratives (retry can succeed later).
- Agent 4 applies (matches detail endpoint) — E2E plan below.

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | design — add `MatchNarrativeCache` |
| `prisma/migrations/...` | Agent 1 creates + `migrate deploy` |
| `src/matches/match-narrative/match-narrative-cache.service.ts` | design — Agent 1 creates |
| `src/me-profile/me-matches.service.ts` | design — wire `getById` |
| `src/me-profile/me-profile.module.ts` | design — import `LlmModule`, register providers |
| `src/logging/error-codes.ts` | design — new narrative obs codes |

---

## Decisions (do not reverse without discussion)

### 1. Where `matchNarrative` lives on the wire

- Add **`matchNarrative?: string`** on **`MeMatchDetailDto`** (detail only).
- Do **not** add it to `MatchRecommendationDto` / list `MeMatchItemDto` for v1 (avoids list clients requiring a long field; keeps list free of LLM).
- When `compareWithStatus` returns a guard (`status` present) or score is null → omit `matchNarrative` (undefined).
- Keep `recommendation.primaryTakeaway` and `explainability.reasonShort` unchanged for list/short UI.

### 2. Attachment point (service layer only)

In `MeMatchesService.getById`, **after** successful compare (`!('status' in result)`), once `explainability`, `recommendation`, and `matchExplanationTraits` exist:

1. `viewerEvaluationId = viewerEval.id`, `candidateEvaluationId = candidateEval.id` (already loaded via `latestEvaluationForProfile`).
2. Cache lookup → hit: use cached text.
3. Miss: `buildMatchNarrativeFactPack({ finalScore, explainability, recommendation: { caution, suggestedNextAction }, traits: matchExplanationTraits, sharedInterests? })` → `generator.generate(pack, { requestId })`.
4. If `source === 'llm'` → upsert cache. If `source === 'fallback'` → **do not write cache**.
5. Set `matchNarrative` on the returned `MeMatchDetailDto`.

`list()` must remain unchanged regarding narrative (no generator calls).

### 3. Prisma model

```prisma
model MatchNarrativeCache {
  id                   String   @id @default(cuid())
  viewerProfileId      String
  candidateProfileId   String
  viewerEvaluationId   String
  candidateEvaluationId String
  promptVersion        String
  narrative            String   @db.Text
  /// Optional model id string from LLM config (diagnostics only).
  model                String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([
    viewerProfileId,
    candidateProfileId,
    viewerEvaluationId,
    candidateEvaluationId,
    promptVersion
  ])
  @@index([viewerProfileId, candidateProfileId])
  @@index([createdAt])
}
```

- Place near other match models (`MatchFeedback` cluster) in `schema.prisma`.
- **No FK** to `UserProfile` / `UserProfileEvaluation` required for v1 (eval rows are append-only; orphaned cache rows are harmless). Optional FKs deferred.
- `promptVersion` = `MATCH_NARRATIVE_PROMPT_VERSION` (`'v1'`) from Story 1 barrel — bumping the constant forces miss without migration.

**Migration:** standard Prisma migrate; no backfill. Rollback = drop table.

### 4. Cache service API

```ts
@Injectable()
export class MatchNarrativeCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async find(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
  }): Promise<string | null>;

  async upsert(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
    narrative: string;
    model?: string | null;
  }): Promise<void>;
}
```

Use `prisma.matchNarrativeCache.findUnique` on the composite unique; `upsert` on same key.

### 5. Module / DI

In `MeProfileModule`:

- `imports`: add **`LlmModule`** (required — `EvaluateServiceModule` does **not** re-export `LLMRouterService`).
- `providers`: add `MatchNarrativeGenerator`, `MatchNarrativeCacheService`.
- Inject both into `MeMatchesService`.

Do **not** put this in legacy `MatchesModule`.

### 6. `requestId`

Inside `getById` (no controller signature change):

```ts
const requestId =
  getRequestLogFields()?.requestId ?? randomUUID();
```

Pass to `generator.generate(pack, { requestId })`.

### 7. Observability (no narrative body / fact pack at info)

Add error codes (names locked):

| Code | When |
|------|------|
| `ME_MATCHES_NARRATIVE_CACHE_HIT` | cache hit |
| `ME_MATCHES_NARRATIVE_CACHE_MISS` | cache miss before LLM |
| `ME_MATCHES_NARRATIVE_LLM_OK` | `source === 'llm'` |
| `ME_MATCHES_NARRATIVE_FALLBACK` | `source === 'fallback'` |
| `ME_MATCHES_NARRATIVE_CACHE_STORE_OK` | after successful upsert of LLM result |
| `ME_MATCHES_NARRATIVE_CACHE_STORE_FAIL` | upsert threw (still return narrative) |

Trace messages: include `viewerProfileId`, `candidateProfileId`, `promptVersion`, `source` — **never** full narrative or fact-pack JSON at info/trace.

If cache upsert fails after LLM success: still return narrative; log store fail; next request may regenerate (acceptable).

### 8. Shared interests on fact pack

Pass `sharedInterests` when available from compare path if already computed; otherwise rely on `explainability.sharedInterestNote` already on the DTO. Prefer passing tags if `compare` result or local helpers expose them without re-parsing — if not easily available, `sharedInterestNote` alone is enough for Story 2 (do not block on re-deriving Jaccard).

### 9. Scoring / HG

**Untouched.** No blend weight, eligibility, or ranker changes.

### 10. Failure modes

| Case | Behavior |
|------|----------|
| Cache hit | return cached string; no LLM |
| Cache miss + LLM ok | upsert + return |
| Cache miss + fallback | return fallback; **no** upsert |
| Cache read throws | treat as miss; continue |
| Cache write throws | return narrative; log `…_STORE_FAIL` |
| Compare guard / no recommendation | omit `matchNarrative` |

---

## API contract (detail)

```
GET /api/v1/me/matches/:id
Auth: SessionGuard (unchanged)

Response 200 (scored excerpt — additive field only):
{
  ...existing MeMatchDetailDto fields...,
  "matchNarrative"?: string   // present when scored + narrative resolved
}

List GET /api/v1/me/matches:
- Must NOT include matchNarrative (or leave undefined forever)
- Must NOT invoke MatchNarrativeGenerator
```

Status codes unchanged. Scores unchanged.

---

## Service signatures (copy-paste)

```ts
// MeMatchDetailDto — add:
matchNarrative?: string;

// MeMatchesService.getById — after compare success:
const matchNarrative = await this.resolveMatchNarrative({
  viewerProfileId: viewer.id,
  candidateProfileId: candidate.id,
  viewerEvaluationId: viewerEval.id,
  candidateEvaluationId: candidateEval.id,
  finalScore: result.finalScore,
  explainability: result.explainability,
  recommendation: result.recommendation,
  traits: matchExplanationTraits,
  requestId,
});

// private helper preferred for testability
private async resolveMatchNarrative(...): Promise<string>
```

---

## Integration points

| Component | Action |
|-----------|--------|
| Story 1 `match-narrative/` | Reuse generator + fact pack + `MATCH_NARRATIVE_PROMPT_VERSION` |
| `MeMatchesService.getById` | Attach narrative |
| `MeMatchesService.list` | No change for narrative |
| `MeProfileModule` | `LlmModule` import + providers |
| Prisma | New model + migration |
| `ErrorCodes` | New ME_MATCHES_NARRATIVE_* codes |
| UI | Story 3 |

---

## Migration plan

1. Add model to `schema.prisma`.
2. `npx prisma migrate dev --name match_narrative_cache` (or create SQL migration in repo style).
3. Agent 1: `npx prisma migrate deploy` on local before smoke.
4. Rollback: drop `MatchNarrativeCache` table / revert migration.

No data backfill.

---

## Runtime topology (REST / proxy)

- Browser → same-origin `http://localhost:3000/api/...` → Next rewrite → `127.0.0.1:3001`.
- Session cookie on UI host (`localhost`).
- Story adds latency on **first** detail open (LLM); subsequent opens should be fast (DB cache).
- Expected Network: one `GET /api/v1/me/matches/:id` — no extra browser LLM calls.
- Socket: **unchanged**.

Agent 1 smoke: open a scored match detail twice; second response should not imply new LLM wait (obs: CACHE_HIT). Optional: force LLM fail and confirm fallback still returns 200 with short-ish deterministic prose.

---

## E2E verification plan (Agent 4 required)

Story touches **`GET /api/v1/me/matches/:id`** → Agent 4 applies.

| Item | Plan |
|------|------|
| Baseline | Keep existing `me-new-model-e2e*.integration.spec.ts` green (no eligibility math change). |
| New scenario | Integration/unit around narrative cache: (1) first detail → generator called once; (2) second detail same eval IDs → generator not called; (3) new evaluation id → miss + call again; (4) mocked LLM throw → fallback string present, no cache row; (5) list response has no `matchNarrative` / does not call generator. |
| Ranking / eligibility | **Unaffected** — Agent 4 confirms baselines still pass; no new HG scenarios required unless a regression appears. |
| Harness | Prefer extending `me-profile-http.integration.spec.ts` or a focused `match-narrative` integration with mocked `LLMRouterService` / generator; full live OpenAI not required for CI. |

---

## Tests / verification

- [ ] Unit: cache service find/upsert; `resolveMatchNarrative` hit/miss/fallback (Agent 1 + 2)
- [ ] Integration: detail includes `matchNarrative`; list does not (Agent 1/2/4)
- [ ] `prisma migrate deploy`: yes (Agent 1)
- [ ] Browser Network smoke: deferred to Agent 1/4 notes (detail open ×2)
- [ ] Socket: N/A

---

## Open questions / blockers

- None blocking. Optional later: FK cascade on profile delete (out of scope).

---

## Next agent

```text
--agent 1 sprint 22 story 2
```

**Notes for next agent:**

- Implement schema + migration first, then cache service, then `getById` wiring + module DI.
- Do not put LLM inside `compare()`.
- Do not cache fallbacks.
- Do not add `matchNarrative` to list DTO.
- Export nothing new from Story 1 beyond what's already in the barrel.
- After CR → **`--agent 4 sprint 22 story 2`** then `--agent 3`.
