# Handoff: Agent 2 — CR — Story 4

**Agent:** 2 CR  
**Story:** [STORY_04_batch_unread_counts.md](../../STORY_04_batch_unread_counts.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  
**Verdict:** **PASS**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

---

## Summary

Reviewed inbox unread batching against architect lock. `list()` uses `batchUnreadCountsByConversationId` (`$queryRaw` UNNEST + `COUNT(*) GROUP BY`, chunk 200); missing conversation ids default to 0. Single-id `countUnreadForParticipant` still uses `message.count` + `unreadMessageCountWhere`. DTO/sort unchanged. Specs assert one raw query (not N counts). Skip Agent 4.

---

## Architect lock checklist

| Item | Result |
|------|--------|
| `list()` does not N+1 `message.count` | **Pass** |
| Semantics match peer SENT + lastReadAt (SQL mirrors where helper) | **Pass** |
| DTO unchanged; single-id count path still works | **Pass** |
| Specs cover multi-conversation / empty / sort | **Pass** |
| Chunk 200; Prisma.sql binding (no string concat) | **Pass** |

---

## Findings

### Fixed in this CR

**None.**

### Accepted / non-blocking

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Info | Live Postgres UNNEST/`timestamptz[]` null binding only mocked in CI | Architect risk noted; smoke when DB available |
| Info | HTTP `$queryRaw` mock branches on SQL text for Message vs eval | Test-only; acceptable |

### Required fixes for PASS

**None remaining.**

---

## Agent 4

**Skip** (architect + CR agree).

---

## Agent 3 note

Safe to **accept** Story 4 as Done. Commit under review: `e606628`.
