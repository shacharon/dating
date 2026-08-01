# Handoff: Agent 3 — PM — Sprint 37 Story 3

**Agent:** 3 PM  
**Story:** Settings tab cleanup  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-01  
**Status:** complete  
**Decision:** **ACCEPT**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-implement.md](./agent-1-implement.md), [agent-2-cr.md](./agent-2-cr.md), [STORY_03_settings_cleanup.md](../../STORY_03_settings_cleanup.md)

---

## Summary

Story **37.3 accepted**. Profile Settings is Notifications + match-prefs preview card; Account/Language duplicates removed from the tab. CR **PASS**.

---

## Acceptance

| Criterion | PM call |
|-----------|---------|
| Account/Language removed from Settings tab | **Met** |
| Prefs preview shows age / distance / partner genders | **Met** |
| CTA `/settings/preferences` + existing testid | **Met** |
| Notifications unchanged; no dating-api | **Met** |
| Specs green; CR PASS | **Met** |

---

## Commit scope

Included: settings tab + preview card/display + specs, Story 03 lock + handoffs 0–3.

Excluded: Story 37.2 edit-tab files, `.env.bak`, `.next`, `node_modules/.vite/`, unrelated docs.

---

## Carry-forward

1. **Still owed:** `--agent 3 sprint 37 story 2` — Edit tab ACCEPT/commit (if CR already PASS).  
2. Optional: dedicated fetch-error copy; card title “Who you want to see” i18n.

---

**Sprint 37 stories:** 37.1 ACCEPT · 37.2 pending Agent 3 · 37.3 ACCEPT
