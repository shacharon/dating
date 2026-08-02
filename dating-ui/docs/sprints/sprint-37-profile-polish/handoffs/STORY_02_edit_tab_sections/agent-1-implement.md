# Handoff: Agent 1 — Implement — Sprint 37 Story 2

**Agent:** 1 implement  
**Story:** Edit tab guided panes  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-02  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [STORY_02_edit_tab_sections.md](../../STORY_02_edit_tab_sections.md)

---

## Summary

Edit tab is **one pane at a time**: sticky Basics | Photos | Story nav + progress dots. Inactive panes stay mounted (`hidden`). Hashes `#basic` / `#photos` / `#story` select the pane. No accordion. Forms reused. **9 specs passed** (4 edit + 5 hub).

---

## Files

| Path | Change |
|------|--------|
| `components/profile/profile-edit-section-nav.tsx` | **new** sticky nav + dots |
| `components/profile/profile-edit-section-shell.tsx` | **new** pane chrome |
| `components/profile/profile-edit-tab.tsx` | Rewrite: active pane, hash sync, progress |
| `components/profile/profile-edit-tab.spec.tsx` | **new** |

---

## Specs run

```
npm test -- src/components/profile/profile-edit-tab.spec.tsx \
  "src/app/(authenticated)/profile/page.spec.tsx"
```

**9 passed.**

---

## Agent 2 notes

1. No Expand/Collapse — panes only.  
2. Order Basics → Photos → Story (photos up from old stack).  
3. Dirty-pane confirm skipped (lock optional).  
4. Commit this story when Agent 3 ACCEPT — do not leave uncommitted again.

**Next command:**

```
--agent 2 sprint 37 story 2
```
