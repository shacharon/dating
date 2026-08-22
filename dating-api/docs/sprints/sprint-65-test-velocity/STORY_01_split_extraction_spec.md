# Story 01 — Split extraction.service.spec

**Sprint:** 65  
**Effort:** 2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [architect](./handoffs/story-01-split-extraction-spec/agent-0-architect.md) · [dev](./handoffs/story-01-split-extraction-spec/agent-1-dev.md) · [CR](./handoffs/story-01-split-extraction-spec/agent-2-cr.md) · [PM](./handoffs/story-01-split-extraction-spec/agent-3-pm.md)

---

## Objective

Split `extraction.service.spec.ts` (3160 LOC, 164 tests) into focused files for faster selective CI runs.

---

## Target layout (shipped)

Architect chose **describe-block split** over story-template collaborator names (Sprint 58 unit specs already exist separately):

```
extraction/
  extraction.service.spec-support.ts
  extraction.service.core.spec.ts
  extraction-behavior-locks.spec.ts
  extraction-expansion-shadow-signal3-04.spec.ts
  extraction-expansion-shadow-05-08.spec.ts
  extraction-expansion-shadow-10-13.spec.ts
  extraction-expansion-shadow-14-15-09.spec.ts
  extraction-spec-size.policy.spec.ts
```

Monolith **`extraction.service.spec.ts` deleted**.

---

## Tasks

1. [x] Shared harness (`extraction.service.spec-support.ts`)
2. [x] Core tests → `extraction.service.core.spec.ts` (15 tests)
3. [x] Behavior locks → `extraction-behavior-locks.spec.ts` (8 tests)
4. [x] Expansion shadow tranches → 4 focused files (139 tests)
5. [x] Delete monolith; preserve **164** tests verbatim
6. [x] Policy guard for LOC + monolith absence (Agent 2)

---

## Success

- [x] No single split extraction spec >1000 non-empty LOC (max: 779)
- [x] All extraction tests green (325 total in folder; 164 from monolith preserved)
- [x] Selective runs documented — e.g. core-only ~3s vs monolith ~3s for all 164; tranche runs faster

---

## Shipped

`feature/sprint-65-story-1` @ `9f98cd9`

- `a741b8b` — test: split extraction.service.spec into focused files
- `9f98cd9` — test: add extraction spec size policy guard

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)
