# Story 34.5 — Conversation List Search & Filters (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 5 — Search / filter / sort on conversations inbox  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` (frontend only).  
**Prerequisite:** Story 34.1 **ACCEPT** (list has `lastMessage` + previews).  
**Needs mockup:** no  

---

## Goal

Let users find conversations faster with **client-side** name search, All/Unread/Recent filters, and Recent/A–Z sort — without API changes and without breaking infinite scroll, previews, or WS optimistic updates.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Page | `conversations-page-client.tsx` + `page.tsx` |
| Fetch | `useInfiniteQuery` + `fetchMyConversations` (cursor); flatten pages |
| Row | photo, primary label, preview, time, emerald unread badge |
| Label | `conversationPrimaryLabel` (nickname **or** gender·age·location fallback) |
| `otherUser.nickname` | **`string \| null`** — do not call `.toLowerCase()` on it raw |
| Activity time | Prefer `lastMessage.sentAt`, else `matchedAt` |
| WS | Optimistic `lastMessage` / unread via `conversation-list-unread` |
| Filters today | **None** |

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ Search/sort only on `nickname` (null-unsafe; misses fallback labels)  
- ❌ Emoji in search chrome (🔍)  
- ❌ Hardcoded blue “●” unread — keep emerald **count** badge  
- ❌ Server-side filter API this story  
- ❌ Mutating `.sort` on a filtered array without copy  

---

## Locked UX

```
Conversations
[ Search by name…        ✕ ] [ All ▼ ] [ Recent first ▼ ]

(rows unchanged: preview + time + emerald badge)
```

| Control | Behavior |
|---------|----------|
| Search | Filters by **primary label** (case-insensitive substring). Debounce **300ms**. Clear (✕) when non-empty. |
| Filter | `all` \| `unread` \| `recent` — default `all` |
| Sort | `recent` \| `alphabetical` — default `recent` |
| Empty (true list) | Keep existing no-matches empty state |
| Empty (filtered) | Dedicated “no conversations match” copy + suggest clearing filters |
| Mobile | Controls wrap / stack; full-width search; selects don’t overflow |
| Dark mode | Zinc tokens consistent with inbox |

**Do not** change row chrome (preview / badge / time) except that the **visible list** is the filtered/sorted subset.

---

## Locked semantics

### Pipeline (order)

1. Flatten infinite-query pages (+ existing optimistic overlay).  
2. **Filter** (search ∩ type).  
3. **Sort** (stable enough; copy array before sort).  
4. Render.  

`Load more` stays available when `hasMore` (even if current filtered view is empty) so users can load more pages then match.

### Search

- Match against `conversationPrimaryLabel(item.otherUser)` (and optionally also raw nickname if present — label alone is enough).  
- Trim query; empty query = no search constraint.  
- Debounce input → applied query at 300ms (UI may show typed value immediately).

### Filter type

| Value | Keep row when |
|-------|----------------|
| `all` | always |
| `unread` | `unreadCount > 0` |
| `recent` | activity time within last **24 hours** |

**Activity time** = `lastMessage?.sentAt ?? matchedAt` (ISO parse). Invalid dates → exclude from `recent`.

### Sort

| Value | Order |
|-------|--------|
| `recent` | activity time **desc** (newest first); tie-break `id` asc |
| `alphabetical` | `conversationPrimaryLabel` `localeCompare` with active app locale; tie-break `id` |

Default API order is replaced by explicit client sort when this UI is present (default control = `recent`).

### Persistence

- **`sessionStorage`** key: `dating.conversations.listControls.v1`  
- Persist `{ searchQuery, filterType, sortBy }` (search = committed/debounced query or raw — lock: persist **raw input** so refresh mid-debounce still restores typing).  
- Restore on mount; ignore corrupt JSON.  
- No URL params this story.

---

## Locked code touchpoints

| Path | Change |
|------|--------|
| `src/lib/conversation-list-controls.ts` (+ spec) | **new** pure `filterAndSortConversations` (+ types); optional debounce helper |
| `src/components/conversation-list-filters.tsx` (+ spec) | **new** presentational controls |
| `conversations-page-client.tsx` | state, debounce, persist, wire filtered list + empty |
| `page.spec.tsx` | search / unread / recent / sort / empty / clear |
| `i18n` types + en/he/es | chrome + filtered-empty copy |

Optional: colocate filter UI under `app/dating/conversations/` — **prefer** `src/components/conversation-list-filters.tsx` per plan.

No dating-api changes.

---

## Locked i18n (EN intents)

Under `conversations.list` (or `conversations.listControls`):

| Key | EN |
|-----|-----|
| `searchPlaceholder` | Search by name… |
| `searchClear` | Clear search |
| `searchAria` | Search conversations by name |
| `filterLabel` / `filterAria` | Filter |
| `filterAll` | All |
| `filterUnread` | Unread |
| `filterRecent` | Recent (24h) |
| `sortLabel` / `sortAria` | Sort |
| `sortRecent` | Recent first |
| `sortAlphabetical` | A–Z |
| `filteredEmptyTitle` | No conversations match |
| `filteredEmptyBody` | Try another name or clear filters. |

Also i18n **Load more** if still hardcoded (nice-to-have; not blocking if out of touch).

---

## Out of scope

- Backend search/filter query params  
- Persisting across browser sessions (`localStorage`)  
- Filtering by message body text  
- Changing unread badge design  
- New WS events  

---

## Tests (required)

- Pure helper: search (case-insensitive, null nickname via label), unread, recent 24h, sorts, combinations  
- UI: debounce applied filter; clear search; filtered empty; controls restore from sessionStorage  
- Existing list/WS/preview specs still green  
- Specs green  

---

## Acceptance criteria

- [x] Search by name (primary label), case-insensitive, debounced 300ms, clear control  
- [x] Filter All / Unread / Recent (24h on activity time)  
- [x] Sort Recent first / A–Z  
- [x] sessionStorage persistence for the session  
- [x] Filtered-empty vs true-empty distinguished  
- [x] Infinite load-more + WS optimistic path still work  
- [x] en/he/es chrome  
- [x] Mobile OK; no emoji  
- [x] Specs green  

---

## Done

Story **34.5 ACCEPT**. Sprint 34 complete. See [agent-3-pm.md](./handoffs/STORY_05_conversation_filters/agent-3-pm.md).
