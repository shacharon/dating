# Story 03 — Dedupe signal post-processing twins

**Sprint 46 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** Stories 01–02 preferred (stable call sites)  
**Repo:** `dating-api` only  
**Risk:** Medium (silent drift if wrong twin kept)  
**Agent 4:** Skip (unit/parity tests sufficient unless Architect flags scoring impact)

---

## Objective

Collapse near-duplicate `engine/signal-post-processing/*` and `extraction/extraction-*` post-processing into **one owned module**; delete or re-export the twin so there is a single source of truth.

## Why

Two trees of similar size invite silent divergence on normalize/alias/sparsity rules.

## Scope / tasks

1. Architect picks canonical owner (`extraction` vs shared `signal-post-processing`).
2. Diff both trees; migrate callers; keep parity tests.
3. Delete dead twin files; update imports.
4. No intentional score change — if parity fails, stop and investigate.

## Out of scope

- New signals / expansions
- UI
- PairMatchPolicy redesign

## Acceptance criteria

- [ ] One module owns post-processing
- [ ] Twin removed or thin re-export only
- [ ] Specs green; documented parity check in handoff

## Suggested commit

```
refactor(signals): dedupe engine vs extraction post-processing

Sprint 46 Story 3
```
