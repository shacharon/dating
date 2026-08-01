# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_missing_indexes.md](../../STORY_03_missing_indexes.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Add three compound indexes via Prisma migration + schema. Skip Agent 4 (no HTTP/DTO change).

---

## Summary

Scale CR called out missing indexes for unread `message.count`, photo APPROVED gate, and admin MatchFeedback negatives. Confirm existing indexes, add only what is still missing, document CONCURRENTLY for large prod.

---

## Existing (do not duplicate / do not drop this story)

| Table | Existing | Notes |
|-------|----------|--------|
| `Message` | `(conversationId, createdAt)`, `(senderId)` | History / sender lookups; **not** ideal for unread (needs status + sender) |
| `UserProfilePhoto` | `(profileId)`, `(status, createdAt)` | Admin queue by status+time; **not** `(profileId, status)` / `(status, profileId)` for gate |
| `MatchFeedback` | `(userId, createdAt)`, `(matchProfileId)` | Per-user history; **no** `(sentiment, createdAt)` |

---

## Decisions (do not reverse without discussion)

### 1. Indexes to add (locked)

| # | Model | Prisma `@@index` | Serves |
|---|--------|------------------|--------|
| A | `Message` | `@@index([conversationId, senderId, status, createdAt])` | Unread path: `conversationId` + `senderId` + `status: SENT` + optional `createdAt > lastReadAt` ([`unreadMessageCountWhere`](../../../../src/me-profile/me-conversations.service.ts)) |
| B | `UserProfilePhoto` | `@@index([profileId, status])` | `countApprovedPhotosForProfile` / EXISTS-style `{ profileId, status: APPROVED }` and nested `photos: { some: { status: APPROVED } }` |
| C | `MatchFeedback` | `@@index([sentiment, createdAt])` | Admin negative window: `sentiment = NEGATIVE AND createdAt >= windowStart` |

**Names (Prisma default map OK):** e.g. `Message_conversationId_senderId_status_createdAt_idx`, `UserProfilePhoto_profileId_status_idx`, `MatchFeedback_sentiment_createdAt_idx`.

**Not this story:**

- Partial index `WHERE status = 'APPROVED'` — nicer for EXISTS; skip for Prisma simplicity; `(profileId, status)` is enough.
- Dropping redundant `UserProfilePhoto_profileId` — expand/contract later.
- Message index only `(conversationId, status, createdAt)` without `senderId` — unread always filters `senderId`; include it.

### 2. Migration approach (locked)

1. Update `prisma/schema.prisma` with the three `@@index` lines.
2. `npx prisma migrate dev --name add_scale_hot_path_indexes` (or equivalent dated folder) generating standard `CREATE INDEX` (non-CONCURRENT).
3. Apply locally with `migrate deploy` / test DB as usual.

**CONCURRENTLY (ops note only — not default migrate SQL):**

Prisma migrations run in a transaction; `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. For large production tables later:

1. Prefer a maintenance window + normal migrate if tables are still small.
2. Or: apply the three indexes manually with `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...`, then `prisma migrate resolve --applied <migration_name>` so history matches schema.
3. Document this in a short section of the migration README comment **or** one paragraph in `docs/ops/PRISMA_CONNECTION_POOL.md` Related / new `docs/ops/INDEX_MIGRATIONS.md` — Agent 1 pick one short ops note (prefer inline SQL comment block at top of migration.sql + 5 lines in story handoff).

### 3. Tests (locked)

- No behavior tests required (indexes are transparent).
- Agent 1: `npx prisma validate` / migrate apply on CI or local + `npm run build`.
- Optional: assert migration SQL contains the three `CREATE INDEX` names.

### 4. Agent 4

- **Skip.**

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | Three `@@index` |
| `prisma/migrations/<ts>_add_scale_hot_path_indexes/migration.sql` | CREATE INDEX |
| Short CONCURRENTLY note | Migration header and/or tiny ops doc |

---

## Out of scope

- Story 4 batch unread (N+1 counts) — indexes help each count; batching is separate  
- Partial APPROVED-only photo index  
- Changing query code  

---

## Agent 1 instructions

1. Add indexes to schema per §1.
2. Create migration; include CONCURRENTLY ops comment per §2.
3. Validate + build; write `agent-1-dev.md`; commit.

Suggested commit message:

```
perf(db): add indexes for unread, photo gate, and match feedback

Sprint 28 Story 3
```

---

## Agent 2 instructions

- [ ] Exactly the three locked indexes; no accidental drops
- [ ] Schema + migration aligned
- [ ] CONCURRENTLY documented for large prod
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Index build time on large Message table — use CONCURRENTLY path in prod if needed.  
2. `(profileId, status)` slightly overlaps `(profileId)` — acceptable until expand/contract cleanup.
