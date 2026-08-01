# Handoff: Agent 1 — Implement — Sprint 33 Story 1

**Agent:** 1 implement  
**Story:** Global Navigation Shell  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md) + [STORY_01_nav_design.md](../../STORY_01_nav_design.md)

---

## Summary

- Replaced top text `DatingMainNav` with `AppNav` (desktop sticky + mobile bottom tabs).
- Primary destinations: **Matches · Conversations · Profile** (Home / Analysis removed from primary).
- Analysis reachable from profile page link.
- Unread pill preserved (`nav-conversations-unread`); optional `newMatchCount` wired (default 0).
- Mobile content padded (`pb-20 md:pb-0`).

---

## Artifacts

| Path | Change |
|------|--------|
| `src/components/nav/app-nav.tsx` | **create** |
| `src/components/nav/app-nav-desktop.tsx` | **create** |
| `src/components/nav/app-nav-mobile.tsx` | **create** |
| `src/components/nav/nav-item.tsx` | **create** |
| `src/components/nav/nav-icons.tsx` | **create** |
| `src/components/nav/nav-active.ts` (+ spec) | **create** |
| `src/components/authenticated-app-shell.tsx` | wire `AppNav`, drop inline nav |
| `src/components/authenticated-app-shell.spec.tsx` | update for dual nav + no Home/Analysis |
| `src/app/dating/profile/profile-page-client.tsx` | Analysis link |
| `src/lib/i18n/{types,en,he,es}.ts` | `brand`, `mainAria`, `primaryAria`, `matchesNewLabel`, `analysisLinkCta` |

---

## Verification

```
npx vitest run src/components/authenticated-app-shell.spec.tsx src/components/nav/nav-active.spec.ts
```

13 passed.

---

## Agent 2 next

```
--agent 2 sprint 33 story 1
```

Focus: broader regression (profile analysis link, i18n typecheck, a11y smoke).
