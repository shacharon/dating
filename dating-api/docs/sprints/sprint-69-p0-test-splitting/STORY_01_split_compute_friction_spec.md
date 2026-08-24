# Story 01 — Split compute-friction.spec

**Sprint:** 69  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW (move describes only)  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_01_split_compute_friction_spec/agent--1-preflight.md) · [architect](./handoffs/STORY_01_split_compute_friction_spec/agent-0-architect.md) · [dev](./handoffs/STORY_01_split_compute_friction_spec/agent-1-dev.md) · [CR](./handoffs/STORY_01_split_compute_friction_spec/agent-2-cr.md) · [PM](./handoffs/STORY_01_split_compute_friction_spec/agent-3-pm.md)

---

## Objective

Split `engine/compute-friction.spec.ts` (1408 LOC) into focused files. Failures in Expansion-07 shadow rules should not require opening a 1400-line file.

---

## Target layout (shipped)

```
engine/
  compute-friction.core.spec.ts
  compute-friction-expansion-shadow-01-04.spec.ts
  compute-friction-expansion-shadow-05-09.spec.ts
  compute-friction-expansion-shadow-10-13.spec.ts
  compute-friction-expansion-shadow-14-15.spec.ts
  compute-friction-spec-size.policy.spec.ts
```

Monolith **`compute-friction.spec.ts` deleted**. No `spec-support.ts` (imports duplicated per tranche). No standalone Expansion-07 file (tranche 05-09 ~421 LOC).

---

## Tasks

1. [x] Inventory describe blocks and test counts
2. [x] Shared harness — skipped (no helpers in monolith)
3. [x] Move expansion shadow describes into 4 tranche files
4. [x] Core unit tests in `compute-friction.core.spec.ts`
5. [x] Policy spec (`compute-friction-spec-size.policy.spec.ts`, 800 LOC cap)
6. [x] `npm test -- compute-friction` green; full suite — no new failures vs `main`

---

## Success

- [x] Monolith deleted
- [x] All former tests still run (**167** functional; **173** incl. policy)
- [x] No split file >800 non-empty LOC (max: **431**)
- [x] Policy spec fails if monolith reappears or any tranche exceeds cap

---

## Shipped

`feature/sprint-69-story-1` @ `3316461`

- `3316461` — test: split compute-friction.spec into focused files

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** Expansion-07 failure → `compute-friction-expansion-shadow-05-09.spec.ts` (~421 LOC) instead of 1408 LOC monolith.

---

## SOLID / KISS

- **SRP:** One file per expansion tranche or core unit scope.
- **OCP:** Add Expansion-16 as new tranche file — don't grow a monolith.
- **KISS:** No production code changes.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
