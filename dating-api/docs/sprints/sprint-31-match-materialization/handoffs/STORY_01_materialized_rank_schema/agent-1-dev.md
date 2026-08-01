# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_materialized_rank_schema.md](../../STORY_01_materialized_rank_schema.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Added Prisma model **`MatchListRank`** + migration. Thin viewer×candidate rank rows only. List path / Redis **unchanged** (Redis remains SoT until Story 04/05). Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Model `MatchListRank` + unique pair | Pass |
| `matchScore` Float; unscored → `-1` helper | Pass (`toStoredMatchListScore`) |
| `hardBlocked` + `builtAt` + indexes | Pass |
| No `sourceJobId` / DTO blobs | Pass |
| No list/Redis cutover | Pass |
| Specs create / unique / −1 | Pass |

---

## Redis vs table (SoT)

| Until Story 04/05 | After cutover |
|-------------------|---------------|
| **Redis** `match:list:{userId}` | **`MatchListRank`** + page hydrate |

Table may be empty; rebuild lands in Story 02.

---

## Changes

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | `MatchListRank` + User/UserProfile relations |
| `prisma/migrations/20260801140000_add_match_list_rank/` | Migration (applied locally) |
| `src/me-profile/match-list-rank-score.ts` | `-1` encoding helper |
| `src/me-profile/match-list-rank.schema.spec.ts` | Contract + create/unique mock + score helper |
| `.env.example` | Note table unused until Story 04 |

---

## Verification

- `prisma migrate deploy` — applied `20260801140000_add_match_list_rank`
- `jest match-list-rank.schema.spec.ts` — **5 passed**
- `prisma generate` — EPERM rename on Windows if Nest holds query engine DLL; client already exposes `MatchListRank` (tests green). Restart API then re-run generate if needed.
