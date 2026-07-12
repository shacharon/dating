# Sprint 1: Match Actions

**Epic:** [Match Actions (Phase 1)](../../epics/EPIC_MATCH_ACTIONS.md)  
**Duration:** ~1 week (5 stories)  
**Goal:** Users can like, pass, block, see their action, and undo like/pass.  
**Status:** **Complete** — all 5 stories shipped.

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Like a match](./STORY_01_like.md) | Done | — |
| 2 | [Pass on a match](./STORY_02_pass.md) | Done | Story 1 |
| 3 | [See my action on a match](./STORY_03_view_action.md) | Done | Story 1 |
| 4 | [Undo like or pass](./STORY_04_undo.md) | Done | Story 1, 3 |
| 5 | [Block a match](./STORY_05_block.md) | Done | Story 1 |

**Recommended order:** 1 → 3 → 2 → 4 → 5 (or 1 → 2 → 3 → 4 → 5).

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time**:

```text
--agent 0 story 1   → .cursor/skills/dating-agent-run/agent-0/  → dating-architect
--agent 1 story 1   → .cursor/skills/dating-agent-run/agent-1/  → dating-senior-dev
--agent 2 story 1   → .cursor/skills/dating-agent-run/agent-2/  → dating-code-review
--agent 3 story 1   → .cursor/skills/dating-agent-run/agent-3/  → dating-pm-contractor
```

Handoffs: `handoffs/<story-slug>/agent-*.md`

| Agent | Role |
|-------|------|
| 0 | Architect |
| 1 | Senior dev |
| 2 | Code review |
| 3 | PM / close |

---

## Sprint outcome

All match-action flows are live:

| Action | API | UI | Notes |
|--------|-----|-----|-------|
| Like | POST `LIKE` | Detail button | Upsert user-to-user |
| Pass | POST `PASS` | Detail button | Stays on list with badge |
| View action | GET actions + list `yourAction` | Badges + detail state | |
| Undo | DELETE actions | Undo on detail | LIKE/PASS only |
| Block | POST `BLOCK` | Confirm + redirect | Hidden from list/detail |

**Phase 2 deferred:** mutual-like detection, messaging, two-way block visibility, notifications.

---

## Manual smoke (end user)

Run once in browser after starting API + UI:

1. Like → undo → like again  
2. Pass → undo → pass again  
3. Block → confirm → row gone from list → direct detail URL 404  

---

## Current story

Sprint **complete**. No further stories in this sprint.

Next epic work: **Phase 2** — mutual match detection + conversation shell (see [EPIC_MATCH_ACTIONS.md](../../epics/EPIC_MATCH_ACTIONS.md)).
