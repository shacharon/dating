# Sprint 68 — Backend P0 Performance Fixes

**Status:** In Progress (Story 1 Done)  
**Priority:** 🟠 **P0 HIGH** — Performance issues that degrade mobile UX  
**Depends on:** Sprint 67 complete  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-api`

---

## Goal

Fix performance issues that cause slow/laggy mobile experience:
1. Inbox loads ALL matches before pagination
2. No send idempotency → duplicate messages
3. Match list re-runs full scoring on every page
4. Auth endpoint rate limiting missing

---

## Success Criteria

- [x] Inbox pagination works at DB level (no load-all-then-slice)
- [ ] Message send idempotency prevents duplicates
- [ ] Match list uses cached explainability (no re-score)
- [ ] Auth endpoints have rate limiting (10/5min for login)

---

## Stories

### Story 1 — Inbox DB-Level Pagination ✅ Done
**Doc:** [`STORY_01_inbox_db_pagination.md`](./STORY_01_inbox_db_pagination.md)  
Fix: `listInboxPage` SQL with cursor pagination; list path O(page) not O(n)

### Story 2 — Message Send Idempotency (4 hours)  
Fix: Add `clientMessageId` unique constraint, INSERT ON CONFLICT

### Story 3 — Match List Caching (2 days)
Fix: Persist explainability JSON on `MatchListRank`, hydrate without re-scoring

### Story 4 — Auth Rate Limiting (6 hours)
Fix: Add Redis-backed rate limit guards on `/auth/google`, `/auth/refresh`

---

## Detailed story docs in folder. All stories emphasize SOLID/OOP/KISS principles.
