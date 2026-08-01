# Handoff: Agent 0 — Architect — Sprint 33 Story 1

**Agent:** 0 architect  
**Story:** Global Navigation Shell (design)  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Design lock only. **No code.** Agent 1 implements.

---

## Summary

- Redesign primary nav around **Matches · Conversations · Profile**.
- **Desktop:** sticky top horizontal bar (evolve existing `AuthenticatedAppShell` / `DatingMainNav`).
- **Mobile:** fixed **bottom tab bar** with outline/filled icons; thin top strip keeps `NavAuth`.
- **Remove** Home and Analysis from primary nav.
- Keep existing conversation unread pill; reserve optional `newMatchCount` for Matches.
- Full mock + component spec: [STORY_01_nav_design.md](../STORY_01_nav_design.md)

---

## Artifacts

| Path | Change |
|------|--------|
| `docs/sprints/sprint-33-ux-navigation/STORY_01_nav_design.md` | **create** — locked design + mocks + component spec |
| `docs/sprints/sprint-33-ux-navigation/handoffs/STORY_01_global_nav/agent-0-architect.md` | **create** — this handoff |

---

## Decisions (do not reverse without discussion)

1. Desktop = top sticky bar (not sidebar).
2. Mobile = bottom tabs (not hamburger).
3. Primary = 3 items only (Matches, Conversations, Profile).
4. Icons = outline / filled SVG (no emoji).
5. Badge = existing circular emerald pill, `99+` cap.
6. Breakpoint = `md` (768px).
7. Analysis / Home out of primary nav this story.

---

## Agent 1 brief

1. Read `STORY_01_nav_design.md`.
2. Extract `DatingMainNav` into `components/nav/*` as specified.
3. Wire into `AuthenticatedAppShell`.
4. Preserve unread context + auth gating.
5. Add mobile content bottom padding.
6. Tests: active states, badge, responsive smoke.

**Next command:**

```
--agent 1 sprint 33 story 1
```
