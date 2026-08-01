# Story 01 — Message violation context

**Sprint 32 · Status: 🟡 IN PROGRESS — Agent 0 architect complete → run Agent 1**  
**Priority:** P0  
**Estimated effort:** 0.5 day  
**Dependencies:** Sprint 30 Done  
**Handoffs:** [architect](./handoffs/STORY_01_message_violation_context/agent-0-architect.md)
---

## Objective

When a **message** is blocked by moderation, persist enough context for ops to answer: *who sent what to whom*.

---

## Scope

1. **Prisma** — extend `UserContentViolation` (nullable for profile surfaces):
   - `conversationId String?`
   - `recipientUserId String?` (+ optional FK to `User`, index `(recipientUserId, createdAt)`)
2. **Message gate** — on `recordViolation` for `surface=message`, pass conversation + recipient (other participant).
3. **Profile gates** — leave new fields null.
4. **Admin list DTO** — expose `conversationId`, `recipientUserId`, `recipientEmail`, `recipientNickname` (join) when present.
5. **Tests** — unit/HTTP assert message violations include context; profile violations omit it.

---

## Acceptance criteria

- [ ] Migration applied; backfill not required (null OK for old rows)
- [ ] New message blocks store conversation + recipient
- [ ] Admin list returns recipient fields for message rows
- [ ] No extra PII in observability logs (ids only if needed)

---

## Out of scope

- Blocked-users table UI (Story 02)
- Soft policy (Story 03)
