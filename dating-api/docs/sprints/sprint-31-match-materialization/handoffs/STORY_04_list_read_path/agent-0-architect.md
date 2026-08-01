# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_list_read_path.md](../../STORY_04_list_read_path.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Serve `GET /api/v1/me/matches` from `MatchListRank` when flagged: DB cursor + **page-only** hydrate. **No** sync `buildFullRankedList` on the flagged path. Empty ranks → enqueue + empty page (no 202). Flag **default off** (Story 05 flips default). Skip Agent 4 if unit specs land.

---

## Summary

Stories 01–03 persist and refresh ranks async. List still uses Redis + full rebuild on miss. This story adds a **flagged** read path: order/membership from Postgres, hydrate ≤`limit` candidates, same cursor shape `{ b, s, id }`. Legacy path stays for flag-off and until Story 05 cutover.

---

## Inventory (current)

| Piece | Behavior |
|-------|----------|
| List | `MeMatchesService.list` → `getOrBuildRankedList` (Redis) → miss `buildFullRankedList` → in-memory `paginateRankedMatches` |
| Cursor | `decodeMatchListCursor` / `encodeMatchListCursor` — `{ b, s, id }` |
| Ranks | `MatchListRank` written by rebuild; triggers enqueue (Story 03) |
| Detail | `getById` / `assertMatchCandidateVisible` — live path (unchanged this story) |
| Cap | `MATCH_LIST_CANDIDATE_CAP` still bounds **legacy** miss hydrate; rebuild uses `MATCH_LIST_REBUILD_CANDIDATE_CAP` |

---

## Decisions (do not reverse without discussion)

### 1. Feature flag (locked)

| Item | Lock |
|------|------|
| Env | **`MATCH_LIST_MATERIALIZED`** |
| On | `1` / `true` / `yes` (case-insensitive trim) |
| Default this story | **Off** (unset / other → legacy Redis+rebuild path) |
| Story 05 | Flip default on / require explicit off for escape hatch |

Helper: e.g. `isMatchListMaterializedEnabled()` next to candidate-cap helpers (pure env read). Document in `.env.example`.

### 2. Flag-off path (locked)

**Unchanged:** Redis `match:list:{userId}`, miss → `buildFullRankedList`, in-memory paginate. No requirement to call `enqueueRebuild` from GET.

### 3. Flag-on path — request flow (locked)

```
list(userId, query)
  → decode cursor (same helper; invalid → 400)
  → resolveViewerListGate(userId)   // lightweight; see §4
       not_ready → return same shape as today (no rank query)
  → pageRankRows from MatchListRank (§5)
  → if no rows and cursor == null:
       maybeEnqueueListEmpty(userId)  // §6
       return ready + matches=[] + nextCursor=null + hasMore=false
  → if no rows and cursor != null:
       return ready + matches=[] + nextCursor=null + hasMore=false
         (stale cursor / drained list — do not sync rebuild)
  → hydrateMatchPage(viewer, rankRows)  // §7 — only those IDs
  → nextCursor / hasMore from rank rows (§5)
  → return MeMatchesListResponseDto
```

**Forbidden on flag-on path:** `getOrBuildRankedList`, `buildFullRankedList`, writing Redis full-list payload for this request.

### 4. Viewer readiness gate (locked)

Reuse the **same** `not_ready` reasons as `buildFullRankedList` today:

| Reason | Meaning |
|--------|---------|
| `no_profile` | No `UserProfile` |
| `not_analyzed` | Profile not ANALYZED (same status checks as today) |
| `no_photo` | No approved photo |

Implement as a **small** shared helper (extract from `buildFullRankedList` or duplicate minimal checks) — **must not** load the candidate pool.

On `ready`, response must still include viewer meta used today when cheap: `viewerProfileId`, `viewerGender`, `viewerAcceptedPartnerGenders`, `viewerProfileAnalysisStale` (from viewer + latest eval only).

### 5. DB pagination (locked)

**Order** (must match Story 01 / app sort):

1. `hardBlocked ASC` (false first)  
2. `matchScore DESC`  
3. `candidateProfileId ASC`

**Cursor:** reuse `MatchListCursorPayload` / encode-decode unchanged.

| Cursor field | Rank column |
|--------------|-------------|
| `b` | `hardBlocked ? 1 : 0` |
| `s` | `matchScore` (already −1 when unscored) |
| `id` | `candidateProfileId` |

**Query:** `viewerUserId = ?` + “after cursor” predicate + `ORDER BY` above + `take: limit + 1`.

Predicate (same semantics as `isAfterMatchListCursor`):

- `hardBlocked` bucket after cursor `b`, or  
- same bucket and `matchScore` strictly less than `s`, or  
- same bucket + score and `candidateProfileId` strictly greater than `id`

Implement with Prisma `where`/`OR` or `$queryRaw` if boolean/`Float` OR is awkward — **prefer Prisma** if readable.

**nextCursor / hasMore:** from the **rank row** (stored score / hardBlocked / id), **not** from recomputed DTO score — so pagination stays stable if hydrate score drifts.

**limit:** same as today (default 20, max 50).

### 6. Empty ranks / fallback (locked)

| Situation | Behavior |
|-----------|----------|
| Viewer not_ready | §4 response; **no** enqueue from list |
| Ready + **zero** rank rows + **no** cursor | `status: 'ready'`, `matches: []`, enqueue rebuild reason **`list_empty`**, return 200 (not 202) |
| Ready + zero rows + cursor present | Empty page; **no** enqueue required |
| Ready + rows | Serve page; **never** sync full rebuild |

**Thrash guard (locked):** before enqueue from list, `SET` Redis key `match:rank:list-empty-enq:{userId}` NX with TTL **120s**. If SET fails (key exists), skip enqueue. Clear this key inside existing `invalidateMatchListCache` (same place as list cache delete) so real eligibility changes can re-enqueue promptly.

**Do not** return a new top-level API status like `building` this story (DTO stays `ready` \| `not_ready`). Empty list is the “pending/stale” UX until rebuild fills rows.

### 7. Page hydrate (locked)

Input: ordered `MatchListRank` rows for the page (≤ limit).  
Output: `MeMatchItemDto[]` in **the same order**.

| Field | Source |
|-------|--------|
| Order / membership | Rank rows only |
| `id` | `candidateProfileId` |
| List `matchScore` / `hardBlocked` presence | Prefer **live recompute** for DTO parity with explainability (same engine helpers as list loop); if candidate disappeared mid-flight, **skip** that id (do not fail whole list) |
| `explainability` / `recommendation` / photos / nickname / `yourAction` / hardBlocked **DTO** | Compute for **page IDs only** (load viewer once + those candidates + actions/mutual for those targets) |
| `nextCursor` | Always from **rank row** values (§5) |

**Refactor guidance:** extract scoring/DTO mapping for a **bounded id set** (new private method). Do **not** call `buildFullRankedList` and slice.

**Pool meta (locked optional):** `totalCandidatesBeforeFilter` / `filteredNoPhotoCandidates` may be **omitted** (`undefined`) on materialized path — document in Dev handoff. Do not run full-pool counts to fill them.

### 8. Redis when flag on (locked)

| Concern | Lock |
|---------|------|
| Full-list cache read/write on flagged GET | **Off** |
| `invalidateMatchListCache` on writes / rebuild | **Keep** (legacy path + list-empty NX key clear) |
| Page-level Redis cache | **Out of scope** this story |

### 9. Non-goals this story (locked)

- `getById` / narrative / assert visibility cutover  
- Default flag on (Story 05)  
- Removing `buildFullRankedList` or `MATCH_LIST_CANDIDATE_CAP`  
- Candidate→viewer fan-out  
- Changing cursor wire format  
- HTTP 202 / polling protocol  

### 10. Observability (locked)

- Keep `recordMatchListLoadTimeMs` on both paths.  
- Optional: log `source=materialized|legacy` and `pageSize`.  
- Analytics: emit `MATCH_LIST_VIEWED` on materialized path **only when cursor is null** (first page), with `matchCount` = `MatchListRank` count for viewer (cheap `count`) or hydrated page length — **prefer count of rank rows**.

### 11. Tests (locked)

| Case | Expect |
|------|--------|
| Flag off | Still uses cache/build path (mock); no `matchListRank.findMany` required |
| Flag on + not_ready | Same reason; no rank query / no enqueue |
| Flag on + empty ranks | Enqueue `list_empty` once; second call within TTL skips enqueue (mock Redis NX) |
| Flag on + seeded ranks | `findMany`/`query` with order; hydrate called with page ids only; `hasMore` / cursor from ranks |
| Cursor page 2 | Stable after-cursor predicate; no full rebuild |
| Invalid cursor | 400 |
| Hydrate bound | Assert candidate load / score loop bounded by `limit` (spy counts or mock call arity) |

Skip Agent 4.

### 12. Agent 4

- **Skip** if §11 specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `match-list-materialized-flag.ts` (or cap file sibling) | Env helper |
| `me-matches.service.ts` (+spec) | Branch list; gate helper; DB page; page hydrate |
| `match-list-cache.ts` (or invalidate helper) | Clear list-empty NX key with invalidate |
| `MatchListRankQueueService` | Called with `list_empty` from list only when §6 |
| `.env.example` | Document `MATCH_LIST_MATERIALIZED` |

---

## Out of scope

- Story 05 default-on / backfill ops  
- Dropping legacy rebuild  
- Storing explainability on `MatchListRank`  

---

## Agent 1 instructions

1. Implement flag + §3–§7 flow; extract page hydrate; no sync full rebuild on flag-on.  
2. Empty → enqueue `list_empty` + NX thrash guard; cursor from rank rows.  
3. Specs §11; `.env.example`; handoff `agent-1-dev.md`.  
4. Commit with suggested message below.

Suggested commit message:

```
feat(matches): serve match list from materialized ranks

Sprint 31 Story 4
```

---

## Agent 2 instructions

- [ ] Flag off unchanged; flag on never calls `buildFullRankedList`  
- [ ] DB order + cursor semantics match `{ b, s, id }`  
- [ ] Empty: enqueue + empty 200; NX guard; no 202  
- [ ] Page hydrate bounded; nextCursor from rank rows  
- [ ] Specs mock ranks / flag / enqueue  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 5 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Brief empty list after analysis until rebuild finishes — accepted; triggers + `list_empty` shorten the window.  
2. Recomputed DTO score vs stored rank score can drift until next rebuild — cursor still uses stored values.  
3. Rebuild cap still bounds who appears in ranks (fairness until Story 05 docs / ops backfill).  
4. Hard-deleted candidate between rebuild and GET → skip row in hydrate (page may be shorter than limit briefly).
