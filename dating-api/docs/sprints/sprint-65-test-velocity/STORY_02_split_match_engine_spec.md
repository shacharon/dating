# Story 02 — Split match-engine.spec

**Sprint:** 65  
**Effort:** 2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [architect](./handoffs/story-02-split-match-engine-spec/agent-0-architect.md) · [dev](./handoffs/story-02-split-match-engine-spec/agent-1-dev.md) · [CR](./handoffs/story-02-split-match-engine-spec/agent-2-cr.md) · [PM](./handoffs/story-02-split-match-engine-spec/agent-3-pm.md)

---

## Objective

Split `match-engine.spec.ts` (3079 non-empty LOC, 186 tests) into focused files for faster selective CI runs.

---

## Target layout (shipped)

Architect chose **describe-block split** over story-template concern names (scoring/friction/…):

```
matches/
  match-engine.spec-support.ts
  match-engine-expansion-shadow-01-04.spec.ts
  match-engine-expansion-shadow-05-09.spec.ts
  match-engine-expansion-shadow-10-13.spec.ts
  match-engine-expansion-shadow-14-15.spec.ts
  match-engine.compare.spec.ts
  match-engine.compare-path-coverage.spec.ts
  match-engine-spec-size.policy.spec.ts
```

Monolith **`match-engine.spec.ts` deleted**.

---

## Tasks

1. [x] Shared harness (`match-engine.spec-support.ts`)
2. [x] Expansion shadow tranches → 4 focused files (149 tests)
3. [x] Core compare + path-coverage specs (37 tests)
4. [x] Delete monolith; preserve **186** tests
5. [x] Fix stale `positiveChips` assertion (Agent 2)
6. [x] Policy guard for LOC + monolith absence (Agent 2)

---

## Success

- [x] No single split match-engine spec >1000 non-empty LOC (max: 800)
- [x] All split tests green (186/186; 193 incl. policy spec)
- [x] Selective runs documented — e.g. `match-engine.compare.spec` ~11 tests ~1s

---

## Shipped

`feature/sprint-65-story-2` @ `6129272`

- `6774428` — test: split match-engine.spec into focused files
- `6129272` — test: fix match-engine compare assertion and add size policy

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)

**Note:** Baseline had 1 pre-existing failure (`positiveChips <= 3`); Agent 2 aligned with `MAX_POSITIVE_CHIPS` (5).
