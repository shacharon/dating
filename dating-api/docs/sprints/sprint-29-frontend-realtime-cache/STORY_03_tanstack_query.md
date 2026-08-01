# Story 03 — TanStack Query cache

**Sprint 29 · Status: Dev complete → Agent 2 CR**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** Prefer Story 01 (realtime) locked; Story 02 DTOs if caching conversations

**Handoff:** [`handoffs/STORY_03_tanstack_query/agent-0-architect.md`](./handoffs/STORY_03_tanstack_query/agent-0-architect.md) · [`agent-1-dev.md`](./handoffs/STORY_03_tanstack_query/agent-1-dev.md)

---

## Objective

Add TanStack Query (QueryClient provider + keyed caches) for hot dating-ui fetches so tab focus / remounts dedupe and respect `staleTime`.

## Why

SCALE CR: redundant refetches (conversations, profile, matches) with no shared cache.

## Scope / tasks

1. Architect locks: which queries migrate first (conversations list, unread-total, auth/me — pick 2–3); `staleTime`; invalidation on WS/message events. ✅
2. Add `@tanstack/react-query` + provider in app shell.
3. Migrate locked call sites; leave others for follow-up.
4. Specs: provider smoke; at least one hook/query unit or page test with mocked QueryClient.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Migrate | **unread-total** + **conversations list** (`useInfiniteQuery`) only |
| Skip | `auth/me`, matches, messages, profile |
| Package | `@tanstack/react-query` v5 |
| staleTime | **30s** global default; `refetchOnWindowFocus: true` |
| Keys | `['me','conversations','unread-total']`, `['me','conversations','list']` |
| Context | Keep `ConversationUnreadProvider` API; back with Query |
| Logout | `queryClient.clear()` (or invalidate `['me']`) |

## Acceptance criteria

- [ ] QueryClient provider wired
- [ ] Locked routes use Query (not ad-hoc duplicate fetch on remount within staleTime)
- [ ] Invalidation strategy documented for realtime events (even if partial)
- [ ] Tests for migrated path(s)

## Commit message

```
feat(ui): add TanStack Query for shared client cache

Sprint 29 Story 3
```
