# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_batch_unread_counts.md](../../STORY_04_batch_unread_counts.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Replace N `message.count` on inbox `list()` with one batched COUNT. Skip Agent 4 if unit specs cover multi-conversation semantics.

---

## Summary

`MeConversationsService.list` currently `Promise.all`s `countUnreadForMatchRow` → **N** `message.count` queries (different `senderId` + `lastReadAt` per row). Batch into **one** Postgres query that returns counts keyed by `conversationId`. Keep DTO/`unreadCount` semantics and sort. Leave single-conversation `countUnreadForParticipant` on the simple `count()` path.

---

## Current semantics (must preserve)

Per conversation (`unreadMessageCountWhere`):

- `conversationId` = mutual match id  
- `senderId` = **other** user (not viewer)  
- `status` = `SENT`  
- if viewer `lastReadAt` set → `createdAt > lastReadAt`; if null → all peer SENT messages count  

List sort: unread DESC, then `matchedAt` DESC. Response shape unchanged.

---

## Decisions (do not reverse without discussion)

### 1. Batch query shape (locked)

Use **`$queryRaw` + `Prisma.sql`** (same safety pattern as Sprint 27 eval batch). Prefer **UNNEST of parallel arrays** over N OR branches:

```sql
SELECT m."conversationId" AS "conversationId", COUNT(*)::int AS "cnt"
FROM "Message" m
INNER JOIN (
  SELECT *
  FROM UNNEST(
    $conversationIds::text[],
    $otherUserIds::text[],
    $lastReadAts::timestamptz[]
  ) AS t("conversationId", "otherUserId", "lastReadAt")
) AS v
  ON m."conversationId" = v."conversationId"
 AND m."senderId" = v."otherUserId"
 AND m.status = 'SENT'::"MessageStatus"
 AND (v."lastReadAt" IS NULL OR m."createdAt" > v."lastReadAt")
GROUP BY m."conversationId"
```

- Bind via Prisma tagged template / `Prisma.sql` (no string concat of ids).
- Result → `Map<conversationId, number>`; missing id → **0**.
- Empty `rows` → skip query (existing early return already handles empty inbox).

**Index:** Story 3 `(conversationId, senderId, status, createdAt)` supports this join/filter.

### 2. Code layout (locked)

| Piece | Change |
|-------|--------|
| New helper (preferred) | `me-conversations-unread-batch.ts` exporting `batchUnreadCountsByConversationId(prisma, specs)` |
| `MeConversationsService.list` | Build `specs` from rows; one batch call; map into DTOs |
| `countUnreadForMatchRow` / `countUnreadForParticipant` | **Keep** single `message.count` (detail/badge single-id path) |
| `unreadMessageCountWhere` | Keep for single-count path; batch SQL must match it |

Specs type:

```ts
{ conversationId: string; otherUserId: string; lastReadAt: Date | null }
```

### 3. Chunking (locked)

If `specs.length > 200`, chunk (default **200**) and merge Maps — same spirit as eval batch 500; inbox is usually small but guard unbounded growth.

### 4. DTO / FE (locked)

- **No** API field changes.  
- **No** denormalized `unreadCount` column.  
- **No** conversation cursor pagination (Sprint 29).

### 5. Tests (locked)

- Update `me-conversations.service.spec.ts` `list() unreadCount`: mock `$queryRaw` (or the batch helper) instead of N× `message.count`.
- Assert: multi-conversation unread numbers + sort; empty inbox no message query; lastReadAt null vs set semantics (via raw result fixtures).
- Keep `countUnreadForParticipant` specs on `message.count` if present.
- Fix `me-profile-http.integration.spec.ts` conversation unread cases that assume N× `message.count` on list — bridge `$queryRaw` → counts or mock batch.

### 6. Agent 4

- **Skip** if §5 unit/integration coverage lands.

---

## Artifacts

| Path | Change |
|------|--------|
| `me-conversations-unread-batch.ts` (+ optional `.spec.ts`) | Batch COUNT helper |
| `me-conversations.service.ts` | `list()` uses batch |
| `me-conversations.service.spec.ts` | Mock `$queryRaw` / helper |
| `me-profile-http.integration.spec.ts` | Only if list unread mocks break |

---

## Out of scope

- Denormalized unread column  
- Inbox pagination  
- Changing mark-as-read  

---

## Agent 1 instructions

1. Implement batch helper + wire `list()`.
2. Update specs per §5; `npm run build` + jest conversations/list unread.
3. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
perf(messaging): batch conversation unread counts in one query

Sprint 28 Story 4
```

---

## Agent 2 instructions

- [ ] `list()` does not N+1 `message.count`
- [ ] Semantics match `unreadMessageCountWhere` (peer SENT + lastReadAt)
- [ ] DTO unchanged; single-id count path still works
- [ ] Specs cover multi-conversation
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Prisma binding of `Date | null` arrays to `timestamptz[]` — if awkward, Agent 1 may use `Prisma.sql` VALUES rows with per-tuple nulls (still one round-trip); do not fall back to N counts.  
2. Transferring full message rows via findMany+JS count is **rejected** (can be large); stick to SQL `COUNT(*)`.
