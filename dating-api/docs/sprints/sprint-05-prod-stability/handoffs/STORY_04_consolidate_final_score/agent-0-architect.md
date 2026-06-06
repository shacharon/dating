# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_consolidate_final_score.md](../../STORY_04_consolidate_final_score.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Canonical match headline score:** `finalScore` only on engine output, persisted records, list/detail API, and UI.
- **Hard remove** duplicate fields in this story (no `@deprecated` alias on wire) — sprint README already locked `finalScore` canonical.
- Two legacy names exist today; both go away on **write**, with a **read-only** fallback for old JSON:
  - `CompareResultDto.overallScore` (engine mirror)
  - `MatchRecordDto.overall` / `MatchListItemDto.overall` (persistence + list API)
- **Do not touch** `computeCompatibility().overallScore`, `compatAB.overallScore`, evaluation `selfVsPartner.overallScore`, or HG `overallHardEligibility` — different semantics.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-score.util.ts` | **New** — `resolveEngineFinalScore()` for legacy read fallback |
| `dating-api/src/matches/match-engine.ts` | Remove `overallScore` from `CompareResultDto` + return object; guard DTOs use `finalScore: null` not `overall: null` |
| `dating-api/src/matches/match.types.ts` | Remove deprecated `overall` from `MatchRecordDto`, `MatchListItemDto`, `MatchIndexItemDto`; `finalScore` required on write |
| `dating-api/src/matches/matches.service.ts` | Stop writing `overall`; use resolver on read/sort |
| `dating-api/src/matches/matches-list.pipeline.ts` | Stop writing `overall`; list items emit `finalScore` only |
| `dating-api/src/matches/matches-api.controller.ts` | `finalScore` only (already mostly there) |
| `dating-api/src/matches/match-daemon.service.ts` | Resolver instead of `?? r.overall` |
| `dating-api/src/matches/matches-analytics.service.ts` | Resolver |
| `dating-api/src/matches/matches-scan.service.ts` | Resolver |
| `dating-api/src/matches/matches.controller.ts` | Resolver |
| `dating-api/src/matches/match-detail-ui.mapper.ts` | `finalScore` only |
| `dating-api/src/matches/match-preview.mapper.ts` | Resolver |
| `dating-api/src/matches/children-unsure.helpers.ts` | Resolver on `overall` field in type |
| `dating-api/src/scripts/recompute-matches.ts` | Stop persisting `overall` |
| `dating-api/scripts/merge-profiles.ts` | If writes match records, align |
| `dating-api/scripts/review-explainability.ts` | Resolver for loaded records |
| `dating-api/src/scripts/score-stats.ts` | Resolver |
| `dating-ui/src/app/dating/_lib/matches-list.ts` | `MatchListItemApi.finalScore` required; remove `overall` |
| `dating-ui/src/app/dating/_lib/children-unsure.ts` | `getDisplayScore` uses `finalScore` path only |
| `dating-ui/src/app/matches/matches-page-client.tsx` | `finalScore` only |
| `dating-ui/src/app/auto-matches/page.tsx` | `finalScore` only |
| `dating-ui/src/lib/matches-api-list-mapper.ts` | Map API `finalScore` → view model (drop duplicate `overall` or set from finalScore once) |
| `dating-ui/scripts/audit-score-only-causes.ts` | Resolver |
| `dating-api/docs/match-engine-overview.md` | §6 outputs: `finalScore` canonical; no `overallScore` on compare result |
| `dating-api/docs/MATCH_ENGINE_V1_CONTRACT.md` | If it references match-result `overall` / `overallScore`, update |
| `handoffs/STORY_04_consolidate_final_score/agent-1-dev.md` | created by agent 1 |

**Do not change:**

| Path | Reason |
|------|--------|
| `compatibility/compatibility-score.ts` `overallScore` | Directional compat sub-score |
| `match-engine.ts` `compatAB.overallScore` / `compatBA.overallScore` | Input to directionals |
| Profile evaluation JSON `selfVsPartner.overallScore` | Evaluate layer |
| HG `overallHardEligibility`, `hgOverallStatus` | HG domain naming |

---

## Decisions (do not reverse without discussion)

### 1. Hard remove on wire (locked)

| Layer | Remove | Keep |
|-------|--------|------|
| `CompareResultDto` | `overallScore` | `finalScore` |
| `MatchRecordDto` / list / index | `overall` | `finalScore` (required when serializing new records) |
| `MatchListItemDto` (API list) | `overall` | `finalScore`, `rankingScore`, `engineFinalScore` |
| Guard failures (`NOT_ANALYZED`, `INSUFFICIENT_DATA`) | `overall: null` | `finalScore: null` |

**No** dual-field responses after this story. Breaking for external consumers of `overall` / `overallScore` on match payloads — document in PM handoff.

### 2. Legacy read helper (internal only)

```typescript
// dating-api/src/matches/match-score.util.ts

/** Canonical engine headline score. Legacy persisted records may only have `overall`. */
export function resolveEngineFinalScore(record: {
  finalScore?: number;
  overall?: number;
}): number {
  const raw = record.finalScore ?? record.overall;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}
```

- Use **only** when **reading** stored match JSON / in-memory records built from old data.
- **Never** write `overall` or `overallScore` on match results again.
- Sorting, analytics, daemon, mappers: `resolveEngineFinalScore(r)` instead of `r.finalScore ?? r.overall`.

### 3. Engine `buildFinalResultDto` return shape

Remove line:

```typescript
overallScore: finalScoreClamped,
```

`CompareResultDto` interface drops `overallScore`. Tests that assert `overallScore === finalScore` → **delete**; add:

```typescript
expect(result).toHaveProperty('finalScore');
expect(result).not.toHaveProperty('overallScore');
```

### 4. Persistence writes

`matches.service.ts` / `matches-list.pipeline.ts` / `recompute-matches.ts`:

```typescript
// Before
overall: compareResult.finalScore,
finalScore: compareResult.finalScore,

// After
finalScore: compareResult.finalScore,
// no overall
```

### 5. List API (`MatchListItemDto`)

```typescript
// Before
overall: r.overall,
finalScore,

// After
finalScore: resolveEngineFinalScore(r),
// no overall on DTO
```

`GET /api/matches` (`MatchesApiItemDto`) already exposes `finalScore` only — keep; ensure resolver on read.

### 6. UI product path

| Surface | Change |
|---------|--------|
| `MatchListItemApi` | `finalScore: number` required; remove `overall` |
| `getDisplayScore` | `rankingScore ?? finalScore` (drop `overall`) |
| Match cards / admin matches page | `item.finalScore` only |
| `matches-api-list-mapper` | View model may keep `overall` as **display alias** = `finalScore` for POC typings, or rename to score-only — prefer **single `finalScore`** on view model |

### 7. No scoring formula change

`finalScore` numeric values **identical** before/after for same profile inputs. This is a **field rename / dedup** story only.

---

## Regression tests (required)

### `match-engine.spec.ts`

- Remove `overallScore equals finalScore (backward compat)` test.
- Add: successful `compare()` has `finalScore`, no `overallScore`.
- Guard tests: `finalScore` is `null`, not `overall`.

### `match-score.util.spec.ts` (new)

| Case | Expect |
|------|--------|
| `{ finalScore: 72 }` | 72 |
| `{ overall: 65 }` (legacy) | 65 |
| `{ finalScore: 80, overall: 10 }` | 80 (prefer finalScore) |
| `{}` | 0 |

### `matches-list.pipeline.spec.ts` or service spec

- List item JSON shape includes `finalScore`, excludes `overall`.

### UI

- Update `matches-list` / page specs if they fixture `overall`.

---

## Grep acceptance (agent 1)

After implementation:

```bash
# Match-result duplicates gone (allowed: compatAB.overallScore, compatibility-score.ts)
rg "overallScore" dating-api/src/matches/match-engine.ts
# → only compatAB.overallScore / compatBA.overallScore lines

rg "^\s+overall:" dating-api/src/matches/match.types.ts
# → no MatchRecordDto/MatchListItemDto overall field

rg "overallScore: finalScore" dating-api/src/matches
# → no writes

rg "finalScore \?\? .*overall" dating-api/src
# → only inside match-score.util.ts (resolver)
```

---

## Documentation

**match-engine-overview.md §6 Outputs:**

- List `finalScore` as canonical headline score.
- Remove any note that `overallScore` mirrors `finalScore`.

**Release note (PM):**

- Breaking: match API/engine payloads no longer include `overall` or `overallScore` for headline score. Use `finalScore`.

---

## Verification commands

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts src/matches/match-score.util.spec.ts
npm test
npm run build

cd ../dating-ui
npm test   # or targeted specs for matches-list / matches-page
```

---

## Open questions / blockers

- None for Agent 1.
- **Optional operator:** bulk rewrite stored match JSON to drop `overall` keys — **not required** if resolver handles read; recompute-matches naturally writes new shape.

---

## Next agent

```text
--agent 1 sprint 5 story 4
```
