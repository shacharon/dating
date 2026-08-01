# Story 03 — Triggers + invalidation

**Sprint 31 · Status: Done (Agent 1 Dev complete → Agent 2 CR)**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Story 02 rebuild job

**Handoff:** [`handoffs/STORY_03_triggers_invalidation/agent-1-dev.md`](./handoffs/STORY_03_triggers_invalidation/agent-1-dev.md)

---

## Objective

Enqueue rank rebuilds when match-relevant state changes, and define Redis/list cache invalidation so readers do not serve stale pages forever.

## Why

Without triggers, the table goes stale after analysis, preference edits, blocks, unmatches, etc.

## Scope / tasks

1. Architect locks **minimum** trigger set. ✅
2. Enqueue with debounce / coalesce (same viewer multiple events → one job) if locked. ✅ (jobId only)
3. Invalidate Redis match-list cache for that viewer when rebuild completes (or on enqueue — Architect chooses). ✅ (rebuild + keep write-path)
4. Specs: trigger sites call enqueue (mocked queue); debounce if locked. ✅

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| MVP | Viewer-only rebuilds; **no** candidate→all-viewers fan-out |
| Triggers | Analysis complete; pref upsert; match action/undo; unmatch **both** sides |
| Reasons | `analysis_complete` / `preferences_changed` / `match_action` / `unmatch` |
| Coalesce | Story 02 jobId only — no timer debounce |
| Redis | Invalidate on rebuild (keep); keep existing write-path invalidates |

## Acceptance criteria

- [x] Locked events enqueue rebuild  
- [x] Coalesce/debounce behavior documented + tested if required  
- [x] Cache invalidation strategy locked and implemented  
- [x] No silent “never rebuild” path for analysis-complete

## Commit message

```
feat(matches): enqueue rank rebuilds on analysis and eligibility changes

Sprint 31 Story 3
```
