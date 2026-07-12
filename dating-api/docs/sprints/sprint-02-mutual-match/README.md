# Sprint 2: Mutual Match + Conversation Shell

**Epic:** [Mutual Match & Messaging](../../epics/EPIC_MUTUAL_MATCH_MESSAGING.md)  
**Duration:** ~1 week (5 stories)  
**Goal:** Detect reciprocal likes, create conversation foundation (no messaging yet).  
**Status:** **Complete** — 5/5 stories done

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Detect mutual match](./STORY_01_detect_mutual.md) | Done | Sprint 1 |
| 2 | [List my conversations](./STORY_02_list_conversations.md) | Done | Story 1 |
| 3 | [View conversation shell](./STORY_03_conversation_shell.md) | Done | Story 2 |
| 4 | [Mutual match notification](./STORY_04_match_notification.md) | Done | Story 1 |
| 5 | [Unmatch action](./STORY_05_unmatch.md) | Done | Story 2 |

**Recommended order:** 1 → 2 → 3 → 4 → 5

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

## Sprint outcome (shipped)

Users who like each other can see conversations, but messaging is not yet functional:

| Feature | API | UI | Notes |
|---------|-----|-----|-------|
| Mutual detection | Auto on LIKE | N/A | Creates `MutualMatch` record |
| Conversation list | GET `/api/v1/me/conversations` | `/dating/conversations` | ACTIVE mutual matches only |
| Conversation detail | GET `/api/v1/me/conversations/:id` | `/dating/conversations/:id` | Shell + "Messaging coming soon" |
| Match notification | `mutualMatch` on match actions | Modal + badge | "It's a match!" |
| Unmatch | DELETE `/api/v1/me/conversations/:id` | Confirm + redirect | Soft delete via `UNMATCHED` |

**Deferred to Sprint 3:** Actual messaging, real-time updates, unread counts.

---

## Manual smoke (end user)

Run once in browser after starting API + UI:

1. User A likes User B  
2. User B likes User A → "It's a match!" modal  
3. Navigate to Conversations → see mutual match listed  
4. Click conversation → see match card, "Messaging coming soon"  
5. Unmatch → conversation disappears from list for both users  

---

## Next up

**Sprint 3 — Messaging** (6 stories). Start with:

```text
--agent 0 sprint 3 story 1
```

See [sprint-03-messaging/README.md](../sprint-03-messaging/README.md).
