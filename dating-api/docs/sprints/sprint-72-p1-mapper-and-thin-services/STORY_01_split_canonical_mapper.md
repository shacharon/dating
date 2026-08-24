# Story 01 — Split profile-to-canonical.mapper

**Sprint:** 72  
**Effort:** 2–3 days  
**Risk:** ⚡ LOW (move-only)  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_01_split_canonical_mapper/agent--1-preflight.md) · [architect](./handoffs/STORY_01_split_canonical_mapper/agent-0-architect.md) · [dev](./handoffs/STORY_01_split_canonical_mapper/agent-1-dev.md) · [CR](./handoffs/STORY_01_split_canonical_mapper/agent-2-cr.md) · [PM](./handoffs/STORY_01_split_canonical_mapper/agent-3-pm.md)

---

## Objective

Split `holy-grail-matching/profile-to-canonical.mapper.ts` (704 LOC) by input slice.

---

## Target layout (shipped)

```
holy-grail-matching/canonical-mapper/
  profile-to-canonical.mapper.ts       # orchestrator (59 non-empty LOC)
  map-ranking-signals.slice.ts
  map-structured-facts.slice.ts
  map-structured-preferences.slice.ts
  map-search-overrides.slice.ts
  map-extraction-arrays.slice.ts
  canonical-mapper.validation.ts
  canonical-mapper-spec-size.policy.spec.ts
```

Public path `profile-to-canonical.mapper.ts` is a thin re-export (callers unchanged).

---

## Tasks

1. [x] Extract validation helpers
2. [x] Move each `validate*Slice` / map block to its file
3. [x] Orchestrator calls slices in same order
4. [x] Update specs; characterization + policy green (Agent 2: 59 tests)

---

## Success

- [x] Orchestrator ≤150 LOC (**59**)
- [x] No slice >200 LOC (max: facts **195**)
- [x] Behavior identical (characterization)

---

## Shipped

`feature/sprint-72-story-1` @ `fe7dd45`

- `23bac44` — refactor: split profile-to-canonical mapper by input slice
- `fe7dd45` — test: polish canonical-mapper LOC policy titles

**Shipped on main:** `6248313`  
**Feature tip ahead of main:** 0

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** Mapper edit → focused slice file (≤195 LOC) instead of 704 LOC monolith.

---

## SOLID / KISS

- **SRP:** One file per input slice + shared validation.
- **KISS:** Move-only — no mapping behavior changes; freeze untouched.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
