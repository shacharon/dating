# Sprint 3: Messaging

**Epic:** [Mutual Match & Messaging](../../epics/EPIC_MUTUAL_MATCH_MESSAGING.md)  
**Duration:** ~1-1.5 weeks (6 stories)  
**Goal:** Enable 1:1 text messaging within conversations with real-time updates.  
**Status:** **Complete** — 6/6 stories done

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Send a text message](./STORY_01_send_message.md) | Done | Sprint 2 |
| 2 | [Load message history](./STORY_02_message_history.md) | Done | Story 1 |
| 3 | [Real-time message updates](./STORY_03_realtime_updates.md) | Done | Story 2 |
| 4 | [Mark messages as read](./STORY_04_mark_read.md) | Done | Story 2 |
| 5 | [Show unread count](./STORY_05_unread_count.md) | Done | Story 4 |
| 6 | [Message safety guardrails](./STORY_06_safety_guardrails.md) | Done | Story 1 |

**Recommended order:** 1 → 2 → 3 → 6 → 4 → 5

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

## Sprint outcome (when complete)

Users can send and receive text messages in real-time:

| Feature | API | UI | Notes |
|---------|-----|-----|-------|
| Send message | POST `/api/v1/me/conversations/:id/messages` | Input + send button | **shipped (Story 1)** |
| Message history | GET `/api/v1/me/conversations/:id/messages` | Scrollable list | **shipped (Story 2)** |
| Real-time updates | GET `?after=` polling | 3s when tab visible | **shipped (Story 3)** |
| Mark as read | PUT `/api/v1/me/conversations/:id/read` | Auto on view | **shipped (Story 4)** |
| Unread count | GET list `unreadCount` | Badge on each row | **shipped (Story 5)** |
| Safety | Validation + rate limit | Char counter | **shipped (Story 6)** |

**Deferred to future:** WebSocket (replace polling), typing indicators, media attachments, reactions, nav unread total.

---

## Manual smoke (end user)

1. Two tabs on same conversation → messages appear in both within ~3s (**Story 3**)  
2. Hide tab → polling stops; show tab → catch-up poll  
3. Open conversation → `PUT .../read` fires (**Story 4**)  
4. List shows unread badge; clears after viewing (**Story 5**)  
5. Rate limit 11 msg/min (**Story 6**)  
6. 2001-char validation (**Story 1**)  
7. Load earlier with 50+ messages (**Story 2**)  

---

## Sprint complete

All six stories shipped. Optional backlog:

```text
--agent 2 sprint 3 story 3
```

(Real-time polling UI/integration test backfill.)
