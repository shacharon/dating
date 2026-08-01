# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_materialized_rank_schema.md](../../STORY_01_materialized_rank_schema.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Add Prisma model + migration for durable viewer×candidate match-list ranks. No Bull job, no list cutover, no Redis behavior change this story. Skip Agent 4 if create + unique-constraint specs land.

---

## Summary

Today `GET /api/v1/me/matches` rebuilds a full ranked array on Redis miss (`match:list:{userId}`, TTL 3600s), capped by `MATCH_LIST_CANDIDATE_CAP`, then paginates in memory with cursor `{ b, s, id }` (eligible bucket → hard-blocked bucket; score DESC; profile id ASC). Sprint 31 persists that **order identity** in Postgres so Story 02 can write async and Story 04 can read with DB cursor + page hydrate.

This story lands **schema only**. Redis remains source of truth for list until Stories 04–05.

---

## Inventory (current)

| Piece | Behavior |
|-------|----------|
| Rank build | `MeMatchesService.buildFullRankedList` |
| Cache | `match:list:{userId}` → full `MeMatchItemDto[]` |
| Cursor | `b` 0\|1, `s` score\|-1, `id` = `UserProfile.id` |
| Sort | `hardBlocked` asc, then `matchScore` DESC (null→-1), then `id` ASC |
| Cap | `MATCH_LIST_CANDIDATE_CAP` (default 1000) on hydrate — temporary |
| Bull | `profile-analysis`, `photo-moderation` only — no rank queue yet |
| Existing tables | No rank materialization; `MatchNarrativeCache` is detail LLM only |

---

## Decisions (do not reverse without discussion)

### 1. Model name (locked)

| Item | Lock |
|------|------|
| Prisma model | **`MatchListRank`** |
| Table name | default (`MatchListRank`) |
| Not | `MatchRankMaterialized` (verbose); not reuse `MatchNarrativeCache` |

### 2. Identity + FKs (locked)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `String @id @default(cuid())` | Surrogate PK (same pattern as `MatchFeedback`) |
| `viewerUserId` | `String` | FK → `User.id`, **`onDelete: Cascade`** |
| `candidateProfileId` | `String` | FK → `UserProfile.id`, **`onDelete: Cascade`** |

**Uniqueness:** `@@unique([viewerUserId, candidateProfileId])` — one row per pair.

Do **not** store `viewerProfileId` (derive via `User.profile` when needed). Do **not** FK to evaluations (rebuild overwrites scores when evals change).

### 3. Rank / order columns (locked) — thin row

Only fields required to reproduce **list order + cursor**, not the full `MeMatchItemDto`.

| Column | Type | Lock |
|--------|------|------|
| `matchScore` | `Float` | Engine final score 0–100. **Unscored / null engine → store `-1`** (same as cursor `s`). Never SQL NULL for score. |
| `hardBlocked` | `Boolean @default(false)` | Maps cursor `b` / sort bucket (`false` = eligible = 0, `true` = 1). |
| `builtAt` | `DateTime` | When this row was last written by a rebuild. |
| `createdAt` | `DateTime @default(now())` | First insert. |
| `updatedAt` | `DateTime @updatedAt` | |

**Explicitly out of this table (hydrate on read in Story 04):** nickname, photos, explainability, recommendation, `yourAction`, `hardBlocked` reason DTO, stale flags, narratives.

**Optional later (Story 02 may add via follow-up migration if needed — not this story):** `sourceJobId`, `rebuildGeneration`. Agent 1 **must not** add them unless Architect reopens.

### 4. Indexes (locked)

```prisma
@@unique([viewerUserId, candidateProfileId])
@@index([viewerUserId, hardBlocked, matchScore(sort: Desc), candidateProfileId])
@@index([candidateProfileId]) // candidate-side cleanup / future “who ranks me”
@@index([viewerUserId, builtAt])
```

List read (Story 04) order must match app sort:

1. `hardBlocked ASC` (false first)  
2. `matchScore DESC`  
3. `candidateProfileId ASC`

The composite index above supports that filter/order for a single `viewerUserId`.

### 5. Retention / TTL (locked)

| Policy | Lock |
|--------|------|
| Row TTL | **None** — rows live until rebuild replaces them or FKs cascade |
| Rebuild write (Story 02) | Upsert all current pairs; **delete** viewer rows whose `candidateProfileId` is no longer in the new set |
| User/profile delete | Cascade removes ranks |

No pg_cron / expiresAt column this sprint.

### 6. Redis relationship (locked — docs only this story)

| Phase | Source of truth for `GET /me/matches` |
|-------|--------------------------------------|
| After Story 01–03 | **Redis** full list cache (unchanged) |
| After Story 04 (flag) / 05 (default) | **`MatchListRank`** + page hydrate; Redis may remain optional accelerator (Architect Story 04) |

Story 01: add a short comment on the Prisma model + one paragraph in Dev handoff. Do **not** change `match-list-cache.ts` or `MeMatchesService` list path.

### 7. Cursor compatibility (forward lock for Story 04)

DB cursor should remain semantically compatible with `{ b, s, id }`:

- `b` ← `hardBlocked ? 1 : 0`  
- `s` ← `matchScore` (already −1 when unscored)  
- `id` ← `candidateProfileId`

Agent 1 does **not** implement DB cursor this story.

### 8. Tests (locked)

| Case | Expect |
|------|--------|
| Create row | Succeeds with required fields |
| Duplicate `(viewerUserId, candidateProfileId)` | Unique violation / Prisma `P2002` |
| `matchScore: -1` | Allowed (unscored encoding) |

No HTTP / list integration this story. Prefer a focused Prisma/repository spec (or existing prisma test pattern in repo).

### 9. Agent 4

- **Skip** if §8 specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | `MatchListRank` + relations on `User` / `UserProfile` |
| `prisma/migrations/…` | Migration |
| Spec | Create + unique constraint |
| `.env.example` | Optional one-liner: table unused until Story 04 — **not** required if model comment is enough |

---

## Out of scope

- Bull `match.rank.rebuild` (Story 02)  
- Triggers / cache invalidation (Story 03)  
- List read path / feature flag (Story 04)  
- Cutover / remove cap as browse policy (Story 05)  
- Storing full DTO JSON blobs in Postgres  

---

## Agent 1 instructions

1. Add `MatchListRank` per §1–5; wire `User.matchListRanks` and `UserProfile.matchListRanksAsCandidate` (names free if clear).  
2. Generate + apply migration (dev).  
3. Specs per §8.  
4. Document Redis-vs-table SoT in handoff (§6).  
5. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(matches): add materialized match rank schema

Sprint 31 Story 1
```

---

## Agent 2 instructions

- [ ] Model/columns/unique match §1–3  
- [ ] Indexes support viewer ordered reads (§4)  
- [ ] No list/Redis cutover sneak-in  
- [ ] Specs cover create + unique  
- [ ] Retention = rebuild replace + cascade (§5)  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 2 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Float score ties — broken by `candidateProfileId` ASC (same as today).  
2. Large per-viewer row counts — Story 02 must bound job work; schema itself has no cap.  
3. Dual-write emptiness until Story 02 — expected; empty table OK.
