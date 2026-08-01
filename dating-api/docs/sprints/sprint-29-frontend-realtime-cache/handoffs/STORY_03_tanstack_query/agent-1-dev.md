# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_tanstack_query.md](../../STORY_03_tanstack_query.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Added `@tanstack/react-query` v5 with `QueryClientProvider` (30s staleTime, focus refetch, retry 1). Migrated **unread-total** (`useQuery` behind `ConversationUnreadProvider`) and **conversations list** (`useInfiniteQuery`). Logout clears the query cache. Manual visibility refetch removed from messaging shell + conversations list (Query owns focus). Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Migrate only unread-total + conversations list | Pass |
| auth/me + matches untouched | Pass |
| Keys `['me','conversations','unread-total']` / `list` | Pass |
| staleTime 30s; refetchOnWindowFocus; retry 1 | Pass |
| Context API preserved; no badge sum from pages | Pass |
| Logout `queryClient.clear()` | Pass |
| Specs: provider smoke + unread remount + list load-more | Pass |

---

## Invalidation (implemented)

| Event | Action |
|-------|--------|
| Tab focus | TanStack `refetchOnWindowFocus` |
| `message.new` bump | Optimistic `setQueryData` on unread-total; list uses local optimistic overlay cleared on `dataUpdatedAt` |
| `refresh()` / mark-read nav refresh | `invalidateQueries` unread-total |
| Logout | `queryClient.clear()` |

List invalidate on mark-read deferred (follow-up); unread refresh still runs.

---

## Changes

| Path | Change |
|------|--------|
| `package.json` | `@tanstack/react-query` |
| `app/providers.tsx` | `QueryClientProvider` wraps `AuthProvider` |
| `lib/query-keys.ts`, `lib/create-app-query-client.ts` | Keys + defaults |
| `conversation-unread-context.tsx` | `useQuery` + optimistic bump |
| `conversations-page-client.tsx` | `useInfiniteQuery` + load more |
| `auth-context.tsx` | Clear cache on logout |
| `messaging-shell-provider.tsx` | Drop visibility → refresh |
| `test/query-client-wrapper.tsx` (+spec) | Test helper |

---

## Verification

- Vitest: query wrapper, unread context, conversations page, messaging shell, authenticated shell — **39 passed**

---

## Agent 2 notes

- Toast nicknames still warm via `reconcileFromList` only.  
- Detail-page list invalidate on mark-read not wired (unread invalidate only).  
- Pre-existing detail page duplicate-message specs still flaky on current main; not part of this diff.
