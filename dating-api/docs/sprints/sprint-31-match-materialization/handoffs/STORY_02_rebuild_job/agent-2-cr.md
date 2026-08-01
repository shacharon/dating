# Handoff: Agent 2 — CR — Story 2

**Agent:** 2 CR  
**Story:** [STORY_02_rebuild_job.md](../../STORY_02_rebuild_job.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Verdict:** **PASS**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

---

## Summary

Reviewed Bull `match-list-rank` rebuild against architect locks. Queue/jobId/concurrency, rebuild cap 5000, snapshot with analytics off, upsert + delete stale / not_ready clear, Redis invalidate after write, no list GET enqueue. Specs cover persist + inline enqueue. Skip Agent 4.

---

## Architect lock checklist

| Item | Result |
|------|--------|
| Queue name / payload / jobId coalesce / concurrency | **Pass** |
| Snapshot extract (not raw list HTTP path) | **Pass** (`buildMatchListRankSnapshot` + options) |
| Rebuild cap ≠ list cap | **Pass** |
| Upsert + delete stale; not_ready clears | **Pass** |
| No list GET enqueue; Redis invalidate after write | **Pass** |
| Specs ready / not_ready / stale delete | **Pass** |

---

## Findings

### Fixed in this CR

| Severity | Finding | Fix |
|----------|---------|-----|
| Low | `enqueueRebuild` coalesced **all** `queue.add` failures as jobId exists | Only coalesce on duplicate-jobId messages; rethrow other errors |

### Accepted / non-blocking

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Info | Snapshot still runs through `buildFullRankedList` with options (builds full DTOs then maps) | Architect allowed shared loop; not persisted |
| Info | List miss metrics still emit during snapshot | Prefer rebuild metric (present); list metrics optional per lock |

### Required fixes for PASS

**None remaining.**

---

## Agent 4

**Skip** (architect + CR agree).

---

## Verification re-run

- jest persist + rebuild-cap + worker — **7 passed**

---

## Agent 3 note

Safe to **accept** Story 2 as Done. Impl: `0b0211c`; CR coalesce harden in follow-up. Next: Story 3 Agent 0.
