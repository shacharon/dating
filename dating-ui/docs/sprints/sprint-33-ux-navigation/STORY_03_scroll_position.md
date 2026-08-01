# Story 33.3 — Preserve Match List Scroll Position (LOCKED)

**Sprint:** 33 — UX Navigation  
**Story:** 3 — Preserve scroll position in match list  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** Done (Agent 3 ACCEPT)  
**Skip Agent 4:** yes (unit + light component tests enough)

---

## Problem

List → detail → back resets to top. Users lose place in infinite list.

---

## Decision (locked)

| Option | Choice |
|--------|--------|
| **A** sessionStorage + explicit restore flag | **IN** (primary) |
| **B** Next.js `scroll={false}` on detail `Link` | **IN** (thin complement) |
| **C** layout / React context | **OUT** this story |

**Do not** use Pages Router `router.events` — this app is **App Router** only.

### Why A + thin B

- List client remounts when leaving `/dating/me-matches` for `/dating/me-matches/[id]`; App Router does not magically keep window Y.
- Flag distinguishes **return from detail** (preserve) vs **fresh entry** from Conversations/Profile/nav (reset) vs **reload** (reset).
- `scroll={false}` on match card links avoids unnecessary scroll-to-top when opening detail.

---

## Behavior contract

| Flow | Expected |
|------|----------|
| Scroll → open detail → Back link / browser back | **Restore** prior `window.scrollY` |
| After like/pass/block then back to list | **Restore** (same as back) |
| Scroll → Conversations/Profile → Matches again | **Top** (no restore) |
| Full page refresh on list | **Top** (no restore) |
| Deep scroll past first page of infinite list | **Best-effort** Y after first paint; do **not** change pagination API this story |

Scroll surface: **`window`** (page scroll). No inner list scroller today.

---

## Storage keys (sessionStorage)

```text
dating.ui.meMatches.scrollY   // stringified integer px
dating.ui.meMatches.restore   // "1" when return-from-detail should restore
```

### Write / clear rules

1. **On match detail link click** (capture before navigation):
   - `scrollY` = `String(Math.round(window.scrollY))`
   - `restore` = `'1'`
2. **On list mount** when `restore === '1'`:
   - After list ready (`!loading` and content rendered): `window.scrollTo(0, y)` (clamp if `y` > max scroll)
   - Then **remove** `restore` (and may remove `scrollY`)
3. **On list mount** when `restore` absent:
   - Remove any stale `scrollY` / `restore` (fresh visit)
4. **Never** set `restore` on unmount alone (would wrongly restore after Conversations → Matches)

SSR-safe: guard `typeof window !== 'undefined'` / sessionStorage availability.

---

## Implementation plan (Agent 1)

### Create

```text
dating-ui/src/app/dating/me-matches/me-matches-scroll.ts
dating-ui/src/app/dating/me-matches/me-matches-scroll.spec.ts
```

Pure helpers (no React), e.g.:

- `MATCHES_SCROLL_Y_KEY` / `MATCHES_SCROLL_RESTORE_KEY`
- `markMatchesScrollForRestore()`
- `consumeMatchesScrollRestore(): number | null`
- `clearMatchesScrollState()`

### Modify

| File | Change |
|------|--------|
| `match-list-item.tsx` | `onClick` on detail `Link` → `markMatchesScrollForRestore()`; `scroll={false}` |
| `me-matches-page-client.tsx` | After load ready, `consumeMatchesScrollRestore()` + `scrollTo`; clear if no flag |
| `page.spec.tsx` (and/or small hook tests) | Cover mark/consume/clear; optional client restore mock |

Optional: shared “Back to matches” already uses `<Link href="/dating/me-matches">` — restore flag set on outbound detail click is enough; no change required on detail page.

---

## Out of scope

- Rehydrating full infinite-scroll pages to guarantee deep item visibility
- Scroll containers other than `window`
- Match list virtualization
- Changing nav shell
- Story 33.4 route cleanup

---

## Acceptance criteria

- [x] Detail → back restores prior scroll Y (Back link + browser back)
- [x] Fresh nav to Matches from other sections starts at top
- [x] Refresh list starts at top
- [x] `scroll={false}` on match detail links
- [x] No Pages Router APIs
- [x] Helper unit tests for storage mark/consume/clear
- [x] Works with existing infinite scroll (best-effort)

---

## Agent 1 next

```
--agent 1 sprint 33 story 3
```
