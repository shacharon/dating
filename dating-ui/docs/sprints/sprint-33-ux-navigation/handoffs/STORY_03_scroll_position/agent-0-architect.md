# Handoff: Agent 0 — Architect — Sprint 33 Story 3

**Agent:** 0 architect  
**Story:** Preserve match list scroll position  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** sessionStorage + restore flag; thin `Link scroll={false}`. **Skip Agent 4**.

---

## Summary

- Lock **Option A + thin B**: save `window.scrollY` and `restore=1` on match-card click; consume + `scrollTo` when list remounts ready; clear on fresh entry.
- **No** `router.events` (App Router).
- **No** layout context (Option C out).
- Extract testable `me-matches-scroll.ts` helpers.
- Deep infinite-scroll: best-effort Y only this story.

Full lock: [STORY_03_scroll_position.md](../STORY_03_scroll_position.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `me-matches/me-matches-scroll.ts` (+ spec) | **create** |
| `me-matches/match-list-item.tsx` | mark restore + `scroll={false}` |
| `me-matches/me-matches-page-client.tsx` | consume + scrollTo after load |
| specs | helper + light client if cheap |

---

## Decisions (do not reverse without discussion)

1. sessionStorage keys `dating.ui.meMatches.scrollY` / `.restore`
2. Set restore **only** on detail link click (not bare unmount)
3. Window scroll only
4. Skip Agent 4

---

## Agent 1 brief

1. Read `STORY_03_scroll_position.md`
2. Implement helpers + wire list item + list client
3. Unit test helpers
4. Do not expand pagination

**Next command:**

```
--agent 1 sprint 33 story 3
```
