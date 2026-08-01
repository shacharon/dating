# Handoff: Agent 1 — Implement — Sprint 33 Story 3

**Agent:** 1 implement  
**Story:** Preserve match list scroll position  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [STORY_03_scroll_position.md](../../STORY_03_scroll_position.md)

---

## Summary

- Added `me-matches-scroll.ts` helpers (mark / consume / clear / apply).
- Match card `Link`: `scroll={false}` + `markMatchesScrollForRestore()` on click.
- List client: after `!loading`, consume restore flag and `window.scrollTo` (rAF).
- Fresh visits clear stale keys when restore flag absent.

---

## Artifacts

| Path | Change |
|------|--------|
| `me-matches/me-matches-scroll.ts` | **create** |
| `me-matches/me-matches-scroll.spec.ts` | **create** |
| `me-matches/match-list-item.tsx` | mark + `scroll={false}` |
| `me-matches/me-matches-page-client.tsx` | consume + apply |
| `me-matches/page.spec.tsx` | Link mock ignores `scroll` |

---

## Verification

```text
npx vitest run src/app/dating/me-matches/me-matches-scroll.spec.ts src/app/dating/me-matches/page.spec.tsx
— 26 passed
```

---

## Agent 2 next

```
--agent 2 sprint 33 story 3
```
