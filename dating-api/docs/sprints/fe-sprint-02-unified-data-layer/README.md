# FE Sprint 02 — Unified Data Layer (React Query + SDK)

**Status:** ✅ Complete (Stories 1–5 Done)  
**Priority:** 🟡 **P1 IMPORTANT** — Not a launch blocker, but greatly improves mobile UX  
**Depends on:** FE-01 Story 3 (apiClient)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-ui` (frontend)  
**Target:** Better mobile perf, offline support foundation, consistent error handling

---

## Problem

**Current state:** Data fetching is manual, inconsistent, and lacks caching.

```typescript
// dating-ui/src/app/dating/me-matches/page.tsx
const [matches, setMatches] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  fetchMatches();
}, []);
```

**Problems:**
- **No caching:** Every page visit refetches (wastes bandwidth, slow on mobile)
- **Manual loading/error states:** Boilerplate everywhere
- **No optimistic updates:** Liking a match doesn't update UI until server responds
- **No background refetch:** Stale data if user leaves app and returns
- **Race conditions:** Rapid navigation can cause stale data

**Mobile impact:**
- Slow load times on 3G/4G
- Poor offline UX
- Battery drain (redundant requests)

---

## Goal

Implement **React Query** for:
- ✅ Automatic caching (reduce network requests 50%+)
- ✅ Loading/error states handled globally
- ✅ Optimistic updates (instant UI feedback)
- ✅ Background refetch (fresh data on app focus)
- ✅ Deduplication (parallel requests merge into one)

**Secondary goal:** Extract a clean **API SDK** so all data access goes through a typed, centralized client.

---

## Success Criteria

### React Query Integration

- [x] `QueryClientProvider` wraps app (Sprint 29 + FE-02 Story 1 DevTools)
- [x] Matches list uses `useInfiniteQuery` with caching (5 min stale; cursor pagination)
- [x] Conversations list uses `useInfiniteQuery` with caching (Sprint 29)
- [x] Profile uses `useQuery` with caching (Story 5 — `queryKeys.me.profile.detail`, 5 min stale)
- [x] Match like/pass/block/undo use `useMutation` with optimistic cache patches (Story 3)
- [x] Send message uses `useMutation` with optimistic updates (Story 4 — `useSendConversationMessage`)
- [x] Cache updates after match mutations (patch `yourAction`; mutual match → invalidate conversations list + unread)
- [x] Profile patch/create/submit use `useMutation` with cache updates (Story 5 — no optimistic patch)
- [x] Cache updates after send/unmatch (invalidate conversations list; message thread cached 5 min)
- [x] Background refetch on window focus (global default `refetchOnWindowFocus: true`)

### API SDK

- [x] Typed API client (`datingApi` namespace + `DatingApiClient` type alias) — **3 product domains**
- [x] Core endpoints centralized (matches, conversations, profile):
  - Matches: `fetchMyMatches()`, `likeMatch()`, `passMatch()`, …
  - Conversations: `fetchMyConversations()`, `fetchConversationMessages()`, `sendConversationMessage()`, …
  - Profile: `fetchMyProfile()`, `createMyProfile()`, `patchMyProfile()`, …
- [ ] All app endpoints centralized (admin, photos, analysis — out of Story 2 scope)
- [x] Response types in `api-types/` (domain split)
- [ ] Generic typed error hierarchy (deferred; domain throws preserved)

### Performance

- [x] Matches list loads from cache on repeat visits (5 min stale; Story 3)
- [x] Like/pass updates UI optimistically on matches list (cache patch + `useMatchActions`; Story 3)
- [x] Conversation messages cached on navigation (5 min stale; WS/poll still merge live; Story 4)
- [x] Profile hub loads from shared cache on repeat visit (5 min stale; dedupes multi-tab GET storm; Story 5)

---

## Stories

### Story 1 — Install React Query + Provider ✅ Done
**Effort:** 0.5 day  
**Risk:** 🟢 LOW  
**Handoff:** [`handoffs/STORY_01_install_react_query_provider/`](./handoffs/STORY_01_install_react_query_provider/)

**Note:** Core provider landed in **Sprint 29 Story 3**; FE-02 Story 1 gap-fill added DevTools, `APP_QUERY_DEFAULTS`, and factory specs.

**Tasks:**
1. [x] Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
2. [x] Create `QueryClientProvider` wrapper (`providers.tsx` → `AppQueryProvider`)
3. [x] Add React Query DevTools (dev only)
4. [x] Configure default options (`staleTime: 30s`, `refetchOnWindowFocus`, `retry: 1`)

**Files (actual):**
- `dating-ui/package.json` — `@tanstack/react-query` (dep), `@tanstack/react-query-devtools` (devDep)
- `dating-ui/src/lib/create-app-query-client.ts` — `APP_QUERY_DEFAULTS` + factory
- `dating-ui/src/app/providers.tsx` — `QueryClientProvider` + DevTools panel
- `dating-ui/src/components/react-query-devtools-panel.tsx` — dynamic dev-only DevTools
- `dating-ui/src/app/layout.tsx` — wraps `<Providers>` (unchanged wiring)

**Global defaults (locked):** 30s `staleTime`, `refetchOnWindowFocus: true`, `retry: 1`. Per-query 5 min stale for matches/profile → Stories 3–5.

---

### Story 2 — API SDK Extraction ✅ Done
**Effort:** 1 day  
**Risk:** 🟢 LOW  
**Handoff:** [`handoffs/STORY_02_api_sdk_extraction/`](./handoffs/STORY_02_api_sdk_extraction/)

**Note:** README “class” → implemented as **`datingApi` namespace** (not OOP). Legacy `@/lib/*-api` paths are **re-export shims**; consumer migration deferred to Stories 3–5.

**Tasks:**
1. [x] Create `datingApi` module (`DatingApiClient` = `typeof datingApi`)
2. [x] Move matches / conversations / profile implementations into SDK
3. [x] Add TypeScript types in `api-types/` (domain split)
4. [x] Use `authenticatedFetch` from FE-01 Story 3 (via `api-sdk/*`)

**Files (actual):**
- `dating-ui/src/lib/api-sdk/` — `index.ts`, `matches.ts`, `conversations.ts`, `profile.ts`, `internal.ts`
- `dating-ui/src/lib/api-types/` — `matches.ts`, `conversations.ts`, `profile.ts`, `index.ts`
- `dating-ui/src/lib/me-matches-api.ts` — shim (re-exports)
- `dating-ui/src/lib/conversations-api.ts` — shim
- `dating-ui/src/lib/me-profile-api.ts` — shim

**Entry point:**

```typescript
import { datingApi } from '@/lib/api-sdk';
await datingApi.matches.fetchMyMatches();
```

---

### Story 3 — Migrate Matches to React Query ✅ Done
**Effort:** 1 day  
**Risk:** 🟢 LOW  
**Handoff:** [`handoffs/STORY_03_migrate_matches_react_query/`](./handoffs/STORY_03_migrate_matches_react_query/)

**Note:** List is **cursor-paginated** → **`useInfiniteQuery`** (not plain `useQuery`). Public hook name **`useInfiniteMatches`** kept for stable page API. Match detail fetch + `use-match-feedback` remain manual (Story 3 scope).

**Tasks:**
1. [x] Create `hooks/use-matches.ts` with `useInfiniteQuery` + `queryKeys.me.matches.list`
2. [x] Export `useLikeMatch`, `usePassMatch`, `useBlockMatch`, `useUndoMatchAction` mutations
3. [x] Optimistic `yourAction` cache patches (list badges; cards stay visible on pass)
4. [x] Refactor `useMatchActions` to consume mutations (public API unchanged)
5. [x] Update `me-matches-page-client.tsx` import; shim legacy `use-infinite-matches.ts`

**Files (actual):**
- `dating-ui/src/hooks/use-matches.ts` — infinite query, mutations, `patchMatchYourActionInCache`
- `dating-ui/src/hooks/use-matches.spec.ts` — 4 tests
- `dating-ui/src/hooks/use-match-actions.ts` — mutation-backed actions
- `dating-ui/src/lib/query-keys.ts` — `me.matches.list`
- `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx` — imports `@/hooks/use-matches`
- `dating-ui/src/app/dating/me-matches/use-infinite-matches.ts` — re-export shim

**Query config (locked):** `staleTime: 300_000` (5 min) per matches list query; fetch via `datingApi.matches.fetchMyMatches`.

**CR fix:** Pass mutation awaits `fetchMatchAction` in `mutationFn` (reconciliation before `mutateAsync` resolves).

---

### Story 4 — Migrate Conversations to React Query ✅ Done
**Effort:** 1 day  
**Risk:** 🟢 LOW  
**Handoff:** [`handoffs/STORY_04_migrate_conversations_react_query/`](./handoffs/STORY_04_migrate_conversations_react_query/)

**Note:** List already on **`useInfiniteQuery`** (Sprint 29). Story 4 migrated **message thread + send** — **`useQuery`** + custom cache (not `useInfiniteQuery`; bidirectional cursors). Public hook **`useConversationMessages`** unchanged. Detail header `fetchMyConversationById` remains manual.

**Tasks:**
1. [x] ~~List hook~~ — done (Sprint 29)
2. [x] Refactor `use-conversation-messages.ts` → `useQuery` + `queryKeys.me.conversations.messages(id)`
3. [x] Export `useSendConversationMessage` with optimistic `pending-*` messages
4. [x] Cache helpers in `conversation-messages-cache.ts`; WS/poll/loadEarlier via cache
5. [x] Unmatch → invalidate conversations list

**Files (actual):**
- `dating-ui/src/hooks/conversation-messages-cache.ts` — cache shape + append/prepend/replace helpers
- `dating-ui/src/hooks/conversation-messages-cache.spec.ts` — 5 tests
- `dating-ui/src/hooks/use-conversation-messages.ts` — useQuery + send mutation + realtime
- `dating-ui/src/hooks/use-conversation-messages.spec.ts` — 12 tests
- `dating-ui/src/hooks/use-conversation-actions.ts` — `datingApi` + list invalidation on unmatch
- `dating-ui/src/lib/query-keys.ts` — `me.conversations.messages(id)`
- `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` — QueryClient wrapper + api-sdk mock

**Query config (locked):** `staleTime: 300_000` (5 min) per message thread; fetch/send via `datingApi.conversations.*`.

**CR fix:** `getLastPersistedMessageId` — poll/WS catch-up skips optimistic `pending-*` rows.

**Not created:** `hooks/use-messages.ts` (README drift — refactor in place).

---

### Story 5 — Migrate Profile to React Query ✅ Done
**Effort:** 0.5 day  
**Risk:** 🟢 LOW  
**Handoff:** [`handoffs/STORY_05_migrate_profile_react_query/`](./handoffs/STORY_05_migrate_profile_react_query/)

**Note:** README proposed `useUpdateProfile` → implemented as **`usePatchProfile`**, **`useCreateProfile`**, **`useSubmitProfileForAnalysis`**. Hub lives at **`(authenticated)/profile/profile-hub-client.tsx`** (not `dating/profile/page.tsx` redirect stub). **No optimistic patch** — cache updated on mutation success only.

**Tasks:**
1. [x] Create `hooks/use-profile.ts` with `useQuery` + `queryKeys.me.profile.detail`
2. [x] Export `usePatchProfile`, `useCreateProfile`, `useSubmitProfileForAnalysis` mutations
3. [x] Migrate P0 consumers (hub, edit/settings tabs, onboarding hooks)
4. [x] Migrate P1 consumers (match prefs, chapter prefs, empty state, onboarding index, matches submit)
5. [x] Remove `resolveEditableProfile()` network export; fix onboarding index imports

**Files (actual):**
- `dating-ui/src/hooks/use-profile.ts` — `useProfile`, mutations, cache helpers
- `dating-ui/src/hooks/use-profile.spec.ts` — 6 tests
- `dating-ui/src/lib/query-keys.ts` — `me.profile.detail`
- `dating-ui/src/lib/profile-form.ts` — removed `resolveEditableProfile()`
- `dating-ui/src/app/(authenticated)/profile/profile-hub-client.tsx` — `useProfile()` + derived draft
- `dating-ui/src/components/profile/profile-edit-tab.tsx` — `useProfile()` + `refetch`
- `dating-ui/src/components/profile/profile-settings-tab.tsx` — `useProfile()`
- `dating-ui/src/hooks/use-onboarding-basic-form.ts` — `useProfile` + patch/create
- `dating-ui/src/hooks/use-onboarding-texts-form.ts` — `useProfile` + patch/submit
- `dating-ui/src/components/match-preferences-form.tsx` — RQ
- `dating-ui/src/components/dating-chapter-preferences-section.tsx` — RQ
- `dating-ui/src/components/match-list-empty-state.tsx` — `useProfile()` for location
- `dating-ui/src/app/(authenticated)/onboarding/onboarding-index-client.tsx` — import fix + RQ
- `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx` — `useSubmitProfileForAnalysis`
- 8 spec files — `QueryClientTestProvider` + `@/lib/api-sdk` profile mock

**Query config (locked):** `staleTime: 300_000` (5 min); fetch/mutations via `datingApi.profile.*`.

**Out of scope:** `use-analysis-page.ts` (legacy shim), `profile-resolve.ts`, photos/quality meter APIs.

---

## Example: Before → After

### Before (Manual)

```typescript
// dating-ui/src/app/dating/me-matches/page.tsx
export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getMatches();
        setMatches(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
```

### After (React Query)

```typescript
// dating-ui/src/app/dating/me-matches/page.tsx
import { useMatches, useLikeMatch } from '@/hooks/use-matches';

export default function MatchesPage() {
  const { data: matches, isLoading, error } = useMatches();
  const likeMutation = useLikeMatch();

  const handleLike = (matchId: string) => {
    likeMutation.mutate(matchId); // ← Optimistic UI update
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {matches?.map((match) => (
        <MatchCard key={match.id} match={match} onLike={handleLike} />
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ Cached (instant load on repeat visits)
- ✅ Auto refetch on window focus (fresh data)
- ✅ Optimistic updates (instant like)
- ✅ Less boilerplate (no manual loading state)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Over-caching stale data | Global **30s** `staleTime` (Sprint 29 lock); optional **5 min** per-query in Stories 3–5; `refetchOnWindowFocus: true` |
| Optimistic updates fail (like rejected) | React Query auto-rollback on mutation error |
| Large cache memory usage (mobile) | TanStack v5 default `gcTime`; tune per-query in Stories 3–5 if needed |
| Breaking existing pages during migration | Migrate incrementally (Story 3 → 4 → 5) |

---

## Dependencies

- **Requires:** FE-01 Story 3 (`apiClient`)
- **Before FE-03 (Socket Auth):** Optional, but recommended (unified data patterns)
- **Before FE-04 (Component Cleanup):** Yes, clean data fetching enables component simplification

---

## Testing Checklist

**React Query:**
- [x] Matches list loads from cache on repeat visit (5 min stale — Story 3)
- [ ] Network request deduplication (2 components fetch matches → 1 request)
- [x] Background refetch on window focus (global default)
- [x] Optimistic update: like/pass on matches list → `yourAction` patched in cache
- [x] Rollback: match action fails → cache + local state revert
- [x] Mutual match → conversations list + unread invalidated (not full matches refetch)
- [x] Optimistic send: pending message visible before server response (Story 4)
- [x] Message thread cached on repeat visit within stale window (Story 4)
- [x] Profile hub: shared `useProfile()` cache across hub/edit/onboarding embeds (Story 5)
- [x] Profile cached on repeat visit within stale window (Story 5)
- [x] Patch/create/submit update profile cache on success (Story 5)
- [x] Submit analysis invalidates matches list (Story 5)

**API SDK:**
- [ ] All endpoints accessible via `sdk.*`
- [ ] TypeScript types work (no `any`)
- [ ] Error responses typed correctly

**Performance:**
- [x] Matches page: cached load on 2nd visit within stale window (Story 3)
- [x] Conversation detail: message thread cached on back navigation (Story 4)
- [x] Profile hub: single GET shared across tabs/forms within stale window (Story 5)

---

## Launch Readiness

**Can launch Android without this?** ⚠️ **YES, but UX will be poor**

React Query is **not required** to launch, but mobile users will notice:
- Slow load times (no caching)
- Stale data (no background refresh)
- Laggy interactions (no optimistic updates)

**Recommendation:** **FE-02 complete (Stories 1–5).** Matches, conversations messaging, and profile all on React Query — ready for launch UX. Optional follow-ups: analysis page shim, full SDK coverage for admin/photos.

---

## References

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [React Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
