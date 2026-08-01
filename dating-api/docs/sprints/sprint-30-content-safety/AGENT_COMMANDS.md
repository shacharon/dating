# Sprint 30 — Agent commands (4 agents × 6 stories)

**Purpose:** Paste into Cursor chat **one at a time**, in order.  
**Pattern:** Agent 0 → 1 → 2 → 3 per story (same as Sprints 22–27).  
**Agent 4:** skip unless Architect requires live HTTP/e2e harness.

**Story folder:** `dating-api/docs/sprints/sprint-30-content-safety/`  
**Handoffs:** `handoffs/STORY_0X_*/agent-N-*.md`

> **Order:** **0 → 1 → 2 → 3 → 4 → 5**  
> Story 00 (consent/privacy) first. Stories 02 + 03 can run in parallel **after** Story 01 Agent 3.  
> Deploy Story 00 policies to prod **≥7 days** before enabling moderation in prod.

---

## How to use

1. Finish current story’s Agent 3 before starting the next story’s Agent 0 (except 02∥03 after 01).
2. Paste only the short `--agent N …` line unless the agent needs the expanded prompt.

---

## Story 0 — Consent + privacy (legal prerequisite)

Story: `STORY_00_consent_and_privacy.md`

```text
--agent 0 sprint 30 story 0
```

```text
--agent 1 sprint 30 story 0
```

```text
--agent 2 sprint 30 story 0
```

```text
--agent 3 sprint 30 story 0
```

**Expanded (if needed):**

```
Execute Sprint 30 Story 0 — Agent 0 Architect.
Read STORY_00_consent_and_privacy.md. Lock privacy/terms copy sections, GDPR/CCPA/Israeli checklist, DPA verification steps, optional consent vs disclosure-only. Write handoffs/STORY_00_consent_and_privacy/agent-0-architect.md. Skip Agent 4.
```

```
Execute Sprint 30 Story 0 — Agent 1 Dev.
Follow architect lock. Update privacy + terms pages, docs/legal compliance notes, optional disclosure UI. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 30 Story 0 — Agent 2 CR.
Review vs lock (disclosures complete, no missing legal surfaces). Write agent-2-cr.md.
```

```
Execute Sprint 30 Story 0 — Agent 3 PM.
Accept/reject. Confirm 7-day notice plan before moderation go-live. Update story + README status. Write agent-3-pm.md.
```

---

## Story 1 — OpenAI moderation client + violation storage

Story: `STORY_01_moderation_client.md`

```text
--agent 0 sprint 30 story 1
```

```text
--agent 1 sprint 30 story 1
```

```text
--agent 2 sprint 30 story 1
```

```text
--agent 3 sprint 30 story 1
```

**Expanded (if needed):**

```
Execute Sprint 30 Story 1 — Agent 0 Architect.
Read STORY_01_moderation_client.md. Lock Prisma schema, OpenAI moderation client contract, fail-open timeout, violation service API. Write handoffs/STORY_01_moderation_client/agent-0-architect.md. Skip Agent 4.
```

```
Execute Sprint 30 Story 1 — Agent 1 Dev.
Follow architect lock. Implement migration + moderation client + violation service + module + specs. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 30 Story 1 — Agent 2 CR.
Review vs lock (schema, fail-open, no PII in logs, tests). Write agent-2-cr.md.
```

```
Execute Sprint 30 Story 1 — Agent 3 PM.
Accept/reject. Update story + README status. Write agent-3-pm.md.
```

---

## Story 2 — Profile field moderation gate

Story: `STORY_02_profile_field_gate.md`

```text
--agent 0 sprint 30 story 2
```

```text
--agent 1 sprint 30 story 2
```

```text
--agent 2 sprint 30 story 2
```

```text
--agent 3 sprint 30 story 2
```

**Expanded (if needed):**

```
Execute Sprint 30 Story 2 — Agent 0 Architect.
Read STORY_02_profile_field_gate.md. Lock sync gate on aboutMe/aboutPartner/aboutRelationship, error shape, 3-strike profile_edit_blocked. Write handoffs/STORY_02_profile_field_gate/agent-0-architect.md. Skip Agent 4.
```

```
Execute Sprint 30 Story 2 — Agent 1 Dev.
Follow architect lock. Wire MeProfileService gate + tests. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 30 Story 2 — Agent 2 CR.
Review vs lock (all fields gated, 403 when blocked, no raw text in logs). Write agent-2-cr.md.
```

```
Execute Sprint 30 Story 2 — Agent 3 PM.
Accept/reject. Update story + README status. Write agent-3-pm.md.
```

---

## Story 3 — Message moderation gate

Story: `STORY_03_message_gate.md`

```text
--agent 0 sprint 30 story 3
```

```text
--agent 1 sprint 30 story 3
```

```text
--agent 2 sprint 30 story 3
```

```text
--agent 3 sprint 30 story 3
```

**Expanded (if needed):**

```
Execute Sprint 30 Story 3 — Agent 0 Architect.
Read STORY_03_message_gate.md. Lock sync message gate, mute thresholds (3/hr, 10/day, 20 lifetime), remove placeholder profanity. Write handoffs/STORY_03_message_gate/agent-0-architect.md. Skip Agent 4.
```

```
Execute Sprint 30 Story 3 — Agent 1 Dev.
Follow architect lock. Wire MeConversationMessagesService gate + delete placeholder profanity + tests. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 30 Story 3 — Agent 2 CR.
Review vs lock (thresholds, mute expiry, rate-limit order, tests). Write agent-2-cr.md.
```

```
Execute Sprint 30 Story 3 — Agent 3 PM.
Accept/reject. Update story + README status. Write agent-3-pm.md.
```

---

## Story 4 — Violation counting + progressive blocks

Story: `STORY_04_violation_enforcement.md`

```text
--agent 0 sprint 30 story 4
```

```text
--agent 1 sprint 30 story 4
```

```text
--agent 2 sprint 30 story 4
```

```text
--agent 3 sprint 30 story 4
```

**Expanded (if needed):**

```
Execute Sprint 30 Story 4 — Agent 0 Architect.
Read STORY_04_violation_enforcement.md. Lock enforceViolationThreshold + isUserBlocked + clearExpiredMutes + stats. Write handoffs/STORY_04_violation_enforcement/agent-0-architect.md. Skip Agent 4.
```

```
Execute Sprint 30 Story 4 — Agent 1 Dev.
Follow architect lock. Consolidate enforcement into ContentViolationService; simplify profile/message callers. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 30 Story 4 — Agent 2 CR.
Review vs lock (no duplicated threshold logic). Write agent-2-cr.md.
```

```
Execute Sprint 30 Story 4 — Agent 3 PM.
Accept/reject. Update story + README status. Write agent-3-pm.md.
```

---

## Story 5 — Admin violations surface

Story: `STORY_05_admin_violations.md`

```text
--agent 0 sprint 30 story 5
```

```text
--agent 1 sprint 30 story 5
```

```text
--agent 2 sprint 30 story 5
```

```text
--agent 3 sprint 30 story 5
```

**Expanded (if needed):**

```
Execute Sprint 30 Story 5 — Agent 0 Architect.
Read STORY_05_admin_violations.md. Lock admin list/stats/unblock APIs + /admin/content-violations UI. Write handoffs/STORY_05_admin_violations/agent-0-architect.md. Skip Agent 4 unless e2e required.
```

```
Execute Sprint 30 Story 5 — Agent 1 Dev.
Follow architect lock. Implement admin APIs + UI + tests. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 30 Story 5 — Agent 2 CR.
Review vs lock (AdminAuthGuard, filters, unblock audit log). Write agent-2-cr.md.
```

```
Execute Sprint 30 Story 5 — Agent 3 PM.
Accept/reject. Update story + README status. Write agent-3-pm.md.
```

---

## Copy-paste sheet (all short cmds)

### Story 0
```text
--agent 0 sprint 30 story 0
--agent 1 sprint 30 story 0
--agent 2 sprint 30 story 0
--agent 3 sprint 30 story 0
```

### Story 1
```text
--agent 0 sprint 30 story 1
--agent 1 sprint 30 story 1
--agent 2 sprint 30 story 1
--agent 3 sprint 30 story 1
```

### Story 2
```text
--agent 0 sprint 30 story 2
--agent 1 sprint 30 story 2
--agent 2 sprint 30 story 2
--agent 3 sprint 30 story 2
```

### Story 3
```text
--agent 0 sprint 30 story 3
--agent 1 sprint 30 story 3
--agent 2 sprint 30 story 3
--agent 3 sprint 30 story 3
```

### Story 4
```text
--agent 0 sprint 30 story 4
--agent 1 sprint 30 story 4
--agent 2 sprint 30 story 4
--agent 3 sprint 30 story 4
```

### Story 5
```text
--agent 0 sprint 30 story 5
--agent 1 sprint 30 story 5
--agent 2 sprint 30 story 5
--agent 3 sprint 30 story 5
```

---

## Parallel note

After Story 1 Agent 3 is done, you may run Story 2 and Story 3 in parallel (separate chats). Then Story 4, then Story 5.

Also: `dating-api/docs/sprints/sprint-30-content-safety/AGENT_COMMANDS.md`
