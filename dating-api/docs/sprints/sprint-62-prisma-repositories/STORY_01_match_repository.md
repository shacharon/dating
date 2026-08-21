# Story 01 — Match Repository Port

**Sprint:** 62  
**Effort:** 3–4 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Done

---

## Objective

Centralize Prisma access for product match paths behind a Nest-injected repository port.

---

## Hot call sites (migrate these)

| Service | Path | Models (typical) |
|---------|------|------------------|
| Ranking | `me-profile/matches/match-ranking.service.ts` | `matchListRank`, `matchAction`, `userProfile`, `mutualMatch` |
| Detail | `me-profile/matches/match-detail.service.ts` | profile / photo / action |
| Eligibility / list query | `match-eligibility.service.ts`, `match-list-query.service.ts` | profile / actions |
| Actions | `me-profile/me-match-actions.service.ts` | `matchAction`, `mutualMatch` |
| Cache / facade (if prisma) | `match-list-cache.service.ts`, `me-profile-matches.service.ts` | as needed |

**Do not** expand unused POC `MatchesRepository` under profiles — create a **me-profile/match** port named clearly, e.g. `IMatchListRepository` / `MatchWriteRepository`.

---

## Design sketch

```typescript
export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');

export interface MatchRepository {
  // Start from methods ranking/actions actually call — grow from call sites
  loadViewerContext(userId: string): Promise<ViewerMatchContext | null>;
  listCandidateProfiles(...): Promise<CandidateRow[]>;
  replaceRankSnapshot(viewerId: string, rows: RankRow[]): Promise<void>;
  findAction(viewerId: string, targetId: string): Promise<MatchActionRow | null>;
  upsertAction(...): Promise<void>;
  findMutual(...): Promise<MutualRow | null>;
  // ...
}
```

Prefer **one port that mirrors current queries** over a perfect DDD model. Split read/write later if the interface gets fat (ISP).

---

## Tasks

1. Inventory all `this.prisma.*` in match-related services → method list.
2. Add interface + `PrismaMatchRepository` adapter.
3. Wire token in `MeProfileModule` (or Match submodule).
4. Migrate ranking first, then actions, then detail/query.
5. Keep transactions inside repository methods that already use `$transaction`.

---

## Success

- [x] `MatchRankingService` / `MeMatchActionsService` / detail+query no longer inject `PrismaService`
- [x] Specs for ranking, actions, list, detail green
- [x] No behavior change to eligibility/ranking rules

---

## Follow-up

Story 02 — Conversation / message repository.

Deferred from S01: legacy `me-profile-matches.service.ts` still on `PrismaService`.

---

## Shipped

`feature/sprint-62-story-1` @ `06321ff` (close commit follows)

- `cf7a5f0` — feat: match repository MATCH_REPOSITORY port
- `06321ff` — test: guard match repository wiring

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A — persistence peel only)
