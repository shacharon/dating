# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_tanstack_query.md](../../STORY_03_tanstack_query.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Add TanStack Query (v5) + migrate **two** hot paths only: conversations unread-total + conversations list (infinite). Skip Agent 4 if provider smoke + migrated-path vitest land. No API changes.

---

## Summary

SCALE CR: dating-ui refetches conversations / badge with no shared cache (tab focus, remount, shell + page). Story 01 defaults WS; Story 02 paginated list + `unread-total`. This story introduces `@tanstack/react-query` and wires those two surfaces so remounts within `staleTime` dedupe and focus refetch is Query-owned.

**Not this story:** migrate `auth/me`, match list (`useInfiniteMatches`), message history, profile CRUD.

---

## Current consumers (must not break)

| Surface | Today | After |
|---------|--------|--------|
| `ConversationUnreadProvider.refresh` | `fetchConversationsUnreadTotal()` | `useQuery` + same public context API |
| Nav badge / shell visibility | Calls `refresh()` | Query `refetchOnWindowFocus` (+ keep optimistic `bumpFromMessage`) |
| `conversations-page-client` | Local state + `fetchMyConversations` + manual visibility reload | `useInfiniteQuery` (first page + `fetchNextPage`) |
| `AuthProvider` | Owns session state machine + retry | **Unchanged** |
| `useInfiniteMatches` | Custom infinite | **Unchanged** |

---

## Decisions (do not reverse without discussion)

### 1. Migrate these queries only (locked)

| Query key | Fetcher | Hook shape |
|-----------|---------|------------|
| `['me', 'conversations', 'unread-total']` | `fetchConversationsUnreadTotal` | `useQuery` → `{ totalUnread }` |
| `['me', 'conversations', 'list']` | `fetchMyConversations({ cursor })` | `useInfiniteQuery`; `pageParam` = cursor (`undefined` = first page) |

Centralize keys in e.g. `dating-ui/src/lib/query-keys.ts` (or `src/queries/keys.ts`) — Agent 1 picks path; **no** ad-hoc string keys at call sites.

**Out of scope (locked):**

- `auth/me` — `AuthProvider` has bootstrap/silent retry + status (`loading` / `error` / `unauthenticated`); migrating risks double-fetch and gate regressions. Follow-up sprint.
- `me/matches` — already `useInfiniteMatches`; leave alone.
- Conversation messages / match detail / profile — leave alone.

### 2. Package + provider (locked)

- Dependency: `@tanstack/react-query` **v5** (React 19 compatible).
- Wire `QueryClientProvider` in [`dating-ui/src/app/providers.tsx`](../../../../../dating-ui/src/app/providers.tsx) **outside** `AuthProvider` (or wrapping it — either OK; preferred: **QueryClientProvider wraps AuthProvider** so auth can later use Query without reshuffle).

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>…</AuthProvider>
</QueryClientProvider>
```

- Create `QueryClient` once per browser session (`useState(() => new QueryClient({ defaultOptions: … }))` in a small client component — do **not** put a module-singleton client that breaks SSR/HMR badly; Next App Router pattern).

**Default options (locked):**

| Option | Value |
|--------|--------|
| `queries.staleTime` | **30_000** ms (global default for this story) |
| `queries.refetchOnWindowFocus` | **true** |
| `queries.retry` | **1** (product already has auth-specific retries elsewhere) |

Per-query overrides only if needed; unread-total and list use the 30s default.

### 3. Unread-total + context facade (locked)

- Keep [`ConversationUnreadProvider`](../../../../../dating-ui/src/contexts/conversation-unread-context.tsx) **public API** (`totalUnread`, `refresh`, `reconcileFromList`, `bumpFromMessage`) so nav/shell/specs stay stable.
- Internals:
  - `totalUnread` from `useQuery` data (default `0` while loading/error).
  - `refresh()` → `queryClient.invalidateQueries({ queryKey: unreadTotalKey })` (or `refetchQueries`) — **not** a parallel ad-hoc fetch that bypasses cache.
  - `bumpFromMessage` → optimistic `setQueryData` on unread-total (reuse `bumpUnreadTotal` helper).
  - `reconcileFromList` → nickname/`onConversationsFetched` only (Story 02 lock — **do not** sum pages into badge).
- Enable query when session user exists if easy to plumb; otherwise keep current “fetch on mount inside provider” (provider only mounts when authenticated via shell).

Remove the **duplicate** `visibilitychange` → `refresh()` in [`messaging-shell-provider.tsx`](../../../../../dating-ui/src/components/messaging-shell-provider.tsx) once Query `refetchOnWindowFocus` covers it (avoid double refetch).

### 4. Conversations list infinite query (locked)

- Replace local `useState` + `loadFirstPage` / `loadMore` fetch orchestration with `useInfiniteQuery`:
  - `initialPageParam`: `undefined` / `null`
  - `queryFn`: `({ pageParam }) => fetchMyConversations({ cursor: pageParam ?? undefined })`
  - `getNextPageParam`: `(last) => (last.hasMore ? last.nextCursor : undefined)`
- Flatten `data.pages[].conversations` for render.
- Load more button → `fetchNextPage` while `hasNextPage` / `!isFetchingNextPage`.
- Optimistic row unread bump (`incrementUnreadForConversation`) may update **local overlay** or `setQueryData` on infinite cache — Agent 1 may keep a thin local patch on top of query data **or** `setQueryData`; must not break Load more.
- Remove page-level `visibilitychange` → `loadFirstPage` once focus refetch is Query-owned; on focus, invalidate/refetch **first page** semantics = default infinite refetch (acceptable if whole infinite cache refetches first page — prefer `refetchType: 'active'`). Do **not** reintroduce full-inbox fetch.

After mark-as-read (detail page) / when list needs truth: callers that today call unread `refresh()` should also `invalidateQueries` for `['me', 'conversations', 'list']` if they already refresh badge — Agent 1: at minimum invalidate **unread-total** from existing refresh paths; list invalidate from mark-as-read if a call site is obvious, else document as follow-up.

### 5. Realtime invalidation strategy (locked — document + minimal wire)

| Event | Action |
|-------|--------|
| `message.new` (peer, should bump) | Optimistic `setQueryData` unread-total (existing bump path). **Optionally** invalidate conversations list key (cheap correctness). |
| Tab focus | TanStack `refetchOnWindowFocus` (no manual duplicate listeners on migrated surfaces). |
| Mark conversation read | Invalidate unread-total (required if mark-read already triggers badge refresh; extend to list key when touching that path). |
| Logout | `queryClient.clear()` on successful logout in `AuthProvider` (or invalidate all `['me', …]` keys) so next user does not see cached inbox. |

Partial OK: optimistic unread + focus refetch is enough for PASS; list invalidate on every `message.new` is nice-to-have, not blocking.

### 6. Tests (locked)

| Test | Expectation |
|------|-------------|
| Provider smoke | Render with `QueryClientProvider` + tiny child that uses `useQueryClient()` |
| Unread path | Context/hook: initial fetch uses query; second mount / remount within staleTime does **not** call fetcher again (fake timers or shared client) **or** assert `fetchConversationsUnreadTotal` call count ≤ 1 across remount with long staleTime in test client |
| Conversations list | Page (or hook) Load more still appends; wrap with test `QueryClient` (`staleTime: Infinity` / mocked fetchers) |

Update existing mocks that break under provider (shell/page specs may need `QueryClientProvider` wrapper helper — e.g. `src/test/query-client-wrapper.tsx`).

### 7. Agent 4

- **Skip** if §6 vitest coverage lands (no new API).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/package.json` | Add `@tanstack/react-query` |
| `dating-ui/src/app/providers.tsx` | `QueryClientProvider` |
| `dating-ui/src/lib/query-keys.ts` (or `queries/`) | Locked keys |
| `conversation-unread-context.tsx` | Backed by `useQuery` |
| `conversations-page-client.tsx` | `useInfiniteQuery` |
| `messaging-shell-provider.tsx` | Drop redundant visibility refresh if Query handles focus |
| Specs + test QueryClient wrapper | §6 |

---

## Out of scope

- Migrating auth, matches, messages, profile  
- PersistQueryClient / localStorage cache  
- React Query Devtools required in prod (optional local-only if Agent 1 wants)  
- Changing Story 02 API contracts  

---

## Agent 1 instructions

1. Install `@tanstack/react-query` v5; wire provider + default options per §2.  
2. Add query keys; migrate unread context + conversations list per §3–4.  
3. Wire logout cache clear + document invalidation table in handoff (and minimal WS/focus behavior per §5).  
4. Specs per §6; keep shell/nav public behavior.  
5. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(ui): add TanStack Query for shared client cache

Sprint 29 Story 3
```

---

## Agent 2 instructions

- [ ] QueryClientProvider in app providers  
- [ ] Only unread-total + conversations list migrated (auth/matches untouched)  
- [ ] staleTime 30s; no duplicate visibility refetch on migrated surfaces  
- [ ] Context API preserved; badge still not sum of partial list  
- [ ] Specs for provider + at least one migrated path  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 4 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Infinite query + optimistic list patch can fight — prefer invalidate list on bump if patch is messy.  
2. Specs that mock fetchers without `QueryClientProvider` will break — add wrapper early.  
3. Double AuthenticatedAppShell mounts (`dating` + `(authenticated)` layouts) already exist; shared QueryClient at root is what makes cache share work.
