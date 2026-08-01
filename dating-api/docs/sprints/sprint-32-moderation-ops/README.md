# Sprint 32 — Content Moderation Ops

**Status:** 🟡 **IN PROGRESS** — Stories 01–02 Done; next Story 03  
**Priority:** P1 (post-launch ops; improves Sprint 30 admin + policy gaps)  
**Depends on:** Sprint 30 Done (gates + `UserContentViolation` + `/admin/content-violations`)  
**Does not block:** Sprint 31 match materialization (run in parallel / after as capacity allows)

**Prior:** [Sprint 30 — Content Safety](../sprint-30-content-safety/README.md)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

---

## Goal

Make moderation **operable by humans**:

1. Store **who** a blocked message was aimed at (recipient + conversation)
2. Admin **blocked/muted users** table with phrase + recipient for manual review / Unblock
3. Optional **middle tier** (warn / soft policy) for content OpenAI leaves unflagged
4. Ops hygiene: mute expiry cron, richer admin review UX

**Non-goals:** Replacing OpenAI Moderation; photo moderation; full user appeal product (thin stub only if time); rewriting thresholds from Sprint 30 without evidence.

---

## Why (gap after Sprint 30)

| Have today | Missing |
|------------|---------|
| Violations list + preview + Unblock + **recipient/conversation** on message blocks | Soft / dating middle tier (Story 03) |
| **Blocked/muted users** review queue with full phrase + recipient | Soft / dating middle tier |
| Stats cards for muted/blocked counts | Soft / dating middle tier |
| Binary OpenAI `flagged` | Soft / dating-specific middle step (`wanna fuck` often passes) |
| `clearExpiredMutes()` API | No cron / scheduled clear |

---

## Stories

| # | Story | Priority | Est | Status |
|---|-------|----------|-----|--------|
| 01 | [Message violation context](./STORY_01_message_violation_context.md) | P0 | 0.5d | ✅ Done |
| 02 | [Admin blocked-users + full review](./STORY_02_admin_blocked_users.md) | P0 | 1d | ✅ Done |
| 03 | [Soft / dating policy layer](./STORY_03_soft_policy_layer.md) | P1 | 1d | PLANNED |
| 04 | [Mute expiry cron + ops polish](./STORY_04_mute_cron_ops.md) | P1 | 0.5d | PLANNED |

**Order:** 01 → 02 → 03 → 04  
**Agents:** 0 architect → 1 dev → 2 CR → 3 PM per story (same as Sprint 30). Skip Agent 4 unless Architect requires live HTTP.

---

## Acceptance criteria (sprint-level)

- [x] Message blocks persist `conversationId` + `recipientUserId` (nullable for profile surfaces)
- [x] Admin can see blocked/muted users with latest flagged phrase + recipient identity
- [x] Admin can Unblock with reason (keep Sprint 30 audit code)
- [ ] Soft policy or documented “no soft tier” decision shipped in Story 03
- [ ] Temporary mutes cleared on a schedule (or Architect-locked equivalent)
- [ ] Unit + admin HTTP tests green; no raw flagged text in **application** logs (admin API/UI only)

---

## Privacy

- Full flagged text remains **admin-only** (existing ops access model: `ADMIN_USER_IDS` + UI gate)
- Recipient PII in admin UI — same bar as reports queue; document in ops access notes if needed
- No change to user-facing privacy copy required unless Story 03 adds user-visible “warning” UX (then update disclosure)

---

## Out of scope / later

- Automated ban / account disable from violation count
- User self-serve appeal portal
- Retroactive scan of historical messages
- Per-category custom OpenAI score thresholds without product lock

---

## References

- Sprint 30 Story 05: `/admin/content-violations`
- `ContentViolationService` / `AdminContentViolationsService`
- OpenAI Moderation: binary `flagged` (sexual slang often not flagged)
