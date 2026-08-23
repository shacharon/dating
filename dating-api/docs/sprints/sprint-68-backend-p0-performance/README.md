# Sprint 68 — Backend P0 Performance Fixes

**Status:** Done (Stories 1–4 complete)  
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
- [x] Message send idempotency prevents duplicates
- [x] Match list uses cached explainability (no re-score)
- [x] Auth endpoints have rate limiting (10/5min for login)

---

## Stories

### Story 1 — Inbox DB-Level Pagination ✅ Done
**Doc:** [`STORY_01_inbox_db_pagination.md`](./STORY_01_inbox_db_pagination.md)  
Fix: `listInboxPage` SQL with cursor pagination; list path O(page) not O(n)

### Story 2 — Message Send Idempotency ✅ Done
**Doc:** [`STORY_02_message_send_idempotency.md`](./STORY_02_message_send_idempotency.md)  
Fix: Optional `clientMessageId` + unique constraint; idempotent replay, side-effect gate

### Story 3 — Match List Caching ✅ Done
**Doc:** [`STORY_03_match_list_caching.md`](./STORY_03_match_list_caching.md)  
Fix: `presentationJson` on `MatchListRank`; profile-only page hydrate, no per-page re-score

### Story 4 — Auth Rate Limiting ✅ Done
**Doc:** [`STORY_04_auth_rate_limiting.md`](./STORY_04_auth_rate_limiting.md)  
Fix: Fixed-window RL guards on `/auth/google` (10/5min) and `/auth/refresh` (5/1min) per IP

---

## Detailed story docs in folder. All stories emphasize SOLID/OOP/KISS principles.
