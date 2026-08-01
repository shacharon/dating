# Story 04 — Mute expiry cron + ops polish

**Sprint 32 · Status: 🟡 IN PROGRESS — Agent 2 CR PASS → run Agent 3**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** Sprint 30 `clearExpiredMutes()` exists  
**Handoffs:** [architect](./handoffs/STORY_04_mute_cron_ops/agent-0-architect.md) · [dev](./handoffs/STORY_04_mute_cron_ops/agent-1-dev.md) · [CR](./handoffs/STORY_04_mute_cron_ops/agent-2-cr.md) 

---

## Objective

Don’t rely only on next-send `isUserBlocked` to clear temporary mutes; polish admin ops.

---

## Scope

1. **Schedule** `ContentViolationService.clearExpiredMutes()` (Bull repeatable / existing worker pattern — match codebase).
2. Log `CONTENT_MUTES_EXPIRED` when count > 0 (already in service).
3. **Ops polish (pick in Architect):**
   - Admin filter: status / has-recipient
   - Optional `opsNote` on Unblock persisted (table or reuse log-only if time-boxed)
   - Link conversation id in UI (copyable) for message violations
4. Tests for job/service invocation; no duplicate clears of indefinite mutes (`mutedUntil` null).

---

## Acceptance criteria

- [ ] Temporary mutes cleared on a schedule without requiring a send
- [ ] Indefinite mutes untouched by cron
- [ ] At least one Architect-locked polish item shipped
- [ ] Tests green

---

## Out of scope

- User appeal portal
- Soft policy (Story 03)
