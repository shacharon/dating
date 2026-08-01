# Story 03 — Triggers + invalidation

**Sprint 31 · Status: Architect locked → Agent 1 Dev**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Story 02 rebuild job

**Handoff:** [`handoffs/STORY_03_triggers_invalidation/agent-0-architect.md`](./handoffs/STORY_03_triggers_invalidation/agent-0-architect.md)

---

## Objective

Enqueue rank rebuilds when match-relevant state changes, and define Redis/list cache invalidation so readers do not serve stale pages forever.

## Why

Without triggers, the table goes stale after analysis, preference edits, blocks, unmatches, etc.

## Scope / tasks

1. Architect locks **minimum** trigger set. ✅
2. Enqueue with debounce / coalesce (same viewer multiple events → one job) if locked.
3. Invalidate Redis match-list cache for that viewer when rebuild completes (or on enqueue — Architect chooses).
4. Specs: trigger sites call enqueue (mocked queue); debounce if locked.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| MVP | Viewer-only rebuilds; **no** candidate→all-viewers fan-out |
| Triggers | Analysis complete; pref upsert; match action/undo; unmatch **both** sides |
| Reasons | `analysis_complete` / `preferences_changed` / `match_action` / `unmatch` |
| Coalesce | Story 02 jobId only — no timer debounce |
| Redis | Invalidate on rebuild (keep); keep existing write-path invalidates |

## Acceptance criteria

- [ ] Locked events enqueue rebuild  
- [ ] Coalesce/debounce behavior documented + tested if required  
- [ ] Cache invalidation strategy locked and implemented  
- [ ] No silent “never rebuild” path for analysis-complete

## Commit message

```
feat(matches): enqueue rank rebuilds on analysis and eligibility changes

Sprint 31 Story 3
```
