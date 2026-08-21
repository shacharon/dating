# Story 04 — Match Repo ISP + Shared Rate-Limit

**Sprint:** 63  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Planned

---

## Objective

1. Fix god `IMatchRepository` (30+ methods, Prisma generics leak).
2. Collapse HTTP/WS rate-limit twin stacks into one shared factory.

---

## Part A — Match repository ISP

**Current:** `me-profile/repositories/match.repository.ts` — kitchen-sink port.

**Target split (names flexible):**

```typescript
MATCH_QUERY_REPOSITORY   // list/detail/eligibility reads
MATCH_ACTIONS_REPOSITORY // like/pass/block/mutual
MATCH_RANK_REPOSITORY    // rank snapshot persist/load
```

Or keep one facade token that **composes** three interfaces for Nest convenience, but stop leaking `Prisma.UserProfileSelect` / `WhereInput` into the port — use domain DTOs.

Migrate injectors gradually; adapters can still be one Prisma class implementing all three.

---

## Part B — Shared rate-limit

**Current twins:**

- `me-profile/conversation-message-rate-limit-*.ts`
- `messaging-realtime/messaging-ws-rate-limit-*.ts`

**Target:**

```
cache/rate-limit/   // or shared/
  sliding-window.store.ts
  redis-sliding-window.store.ts
  memory-sliding-window.store.ts
  rate-limit.module.factory.ts
```

HTTP and WS services only supply key prefix + limits.

---

## Success

- [ ] Match port no longer exposes Prisma select/where types
- [ ] Rate-limit duplication reduced to thin wrappers
- [ ] Specs for ranking, actions, message/WS rate-limit green
