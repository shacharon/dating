# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_batch_unread_counts.md](../../STORY_04_batch_unread_counts.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Inbox `list()` loads unread counts via one `$queryRaw` UNNEST + `COUNT(*) GROUP BY conversationId` (chunk 200). Single-conversation `countUnreadForParticipant` still uses `message.count`. DTO/sort unchanged. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| UNNEST + COUNT GROUP BY; Map default 0 | Pass |
| Helper `me-conversations-unread-batch.ts` | Pass |
| Chunk 200 | Pass |
| Single-id count path unchanged | Pass |
| Specs: no N× count on list; multi-conversation | Pass |
| HTTP unread tests updated | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `me-conversations-unread-batch.ts` (+ spec) | Batch helper |
| `me-conversations.service.ts` | `list()` uses batch |
| `me-conversations.service.spec.ts` | `$queryRaw` mocks |
| `me-profile-http.integration.spec.ts` | Unread list + `$queryRaw` routing |

---

## Verification

- `npx jest --testPathPatterns="me-conversations.service.spec|me-conversations-unread-batch" --runInBand` — pass
- Filtered HTTP unread tests — pass
- `npm run build` — pass

---

## Agent 2 notes

- Confirm list never calls `message.count`; single-id still does.
- Prisma array/`timestamptz[]` null binding — exercised only via mocks in CI; smoke against real Postgres when available.
