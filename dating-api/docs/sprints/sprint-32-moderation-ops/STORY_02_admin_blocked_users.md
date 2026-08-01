# Story 02 — Admin blocked-users + full review

**Sprint 32 · Status: 🟡 IN PROGRESS — Agent 1 complete → run Agent 2**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** Story 01 (recipient fields available)  
**Handoffs:** [architect](./handoffs/STORY_02_admin_blocked_users/agent-0-architect.md) · [dev](./handoffs/STORY_02_admin_blocked_users/agent-1-dev.md)
---

## Objective

Give admins a **manual review queue** of people currently blocked/muted, with phrase + recipient, and keep Unblock.

---

## Scope

1. **API**
   - `GET /api/v1/admin/content-violations/blocked-users` — users with `contentViolationStatus` in `profile_edit_blocked` | `messaging_muted`
     - Include: user email/nickname, status, `mutedUntil`, `violationCount`, **latest** violation preview (or full text — Architect lock), recipient summary if latest was a message
   - Enrich existing violations list: optional `includeFullText=1` for admins **or** always return full text on admin routes (Architect lock; UI already admin-gated)
2. **UI** (`/admin/content-violations` or tab)
   - **Blocked users** table: user | status | mutedUntil | last phrase | sent to (recipient) | Unblock
   - Keep existing violations feed + filters
3. **Unblock** — reuse Sprint 30 endpoint; refresh both tables after success
4. **Tests** — HTTP list blocked users; Unblock clears row from blocked list

---

## Acceptance criteria

- [ ] Admin sees all currently blocked/muted users in one table
- [ ] Last blocked phrase + recipient visible for message cases
- [ ] Unblock works and is audited (`ADMIN_CONTENT_UNBLOCK`)
- [ ] Non-admin still 403

---

## Out of scope

- Soft policy (Story 03)
- Cron (Story 04)
- Ban / delete account
