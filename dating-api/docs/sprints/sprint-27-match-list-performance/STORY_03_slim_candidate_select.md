# Story 03 — Slim candidate select for list

**Sprint 27 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 0.5–1 day  
**Agent:** `generalPurpose`  
**Dependencies:** Story 01 helpful; can run after or parallel with Story 02

**Handoffs:** [architect](./handoffs/STORY_03_slim_candidate_select/agent-0-architect.md) · [dev](./handoffs/STORY_03_slim_candidate_select/agent-1-dev.md) · [CR](./handoffs/STORY_03_slim_candidate_select/agent-2-cr.md) · [PM](./handoffs/STORY_03_slim_candidate_select/agent-3-pm.md)

---

## Objective

Introduce a **slim** select for `buildFullRankedList` that excludes free-text and other fields not needed to score/rank the list. Keep a **full** select for match detail / hard-block paths that need about\* copy.

## Why

`candidateSelect` currently pulls `aboutMe` / `aboutPartner` / `aboutRelationship` (and more) for **every** candidate on every miss. That bloats memory and Redis-cached DTOs’ upstream cost.

## Scope / tasks

1. Inventory which fields `buildFullRankedList` scoring + list DTO mapping actually need.
2. Split selects:
   - `candidateSelectList` (slim) — identity, gender, birthDate, prefs, signals, interests, approved photos (minimal), HG structured fields required for gates/scoring
   - `candidateSelectDetail` (full) — keep current fields for `getById` / hard-block narrative paths
3. Wire list rebuild to slim select only.
4. Ensure hard-block / dealbreaker free-text paths still load text when needed (detail or lazy load).
5. Update any tests that assert on select shape or mocked includes.

## Acceptance criteria

- [x] List rebuild no longer selects about\* free-text columns
- [x] Match detail and hard-block UX still have text where product requires it
- [x] Tests green; no list API contract break (same DTO fields for list items)

## Notes / gotchas

- Dealbreaker extraction from free text on **list** path: if currently used in the rebuild loop, either keep about\* only for that branch or load text for the small hard-block subset only.
- Photos: list may only need primary/id/storageKey — avoid over-fetching if easy.

## Deliverables

Updated `me-matches.service.ts` (+ any mapper helpers/tests).

## Commit message

```
perf(matches): slim candidate select for match-list rebuild

Stop hydrating about* free-text (and unused fields) on the list
rebuild path; keep full select for detail/hard-block.

Sprint 27 Story 3
```
