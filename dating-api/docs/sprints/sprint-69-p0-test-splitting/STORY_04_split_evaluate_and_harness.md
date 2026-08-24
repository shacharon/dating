# Story 04 — Split evaluate.service.spec + Thin Eligibility Harness

**Sprint:** 69  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_04_split_evaluate_and_harness/agent--1-preflight.md) · [architect](./handoffs/STORY_04_split_evaluate_and_harness/agent-0-architect.md) · [dev](./handoffs/STORY_04_split_evaluate_and_harness/agent-1-dev.md) · [CR](./handoffs/STORY_04_split_evaluate_and_harness/agent-2-cr.md) · [PM](./handoffs/STORY_04_split_evaluate_and_harness/agent-3-pm.md)

---

## Objective

1. Split `evaluate/evaluate.service.spec.ts` (1005 LOC) into topic-focused files.
2. Thin `me-profile/me-matches-eligibility.spec-support.ts` (1212 LOC) into fixtures + builders + prisma-mock + harness + thin barrel (target ≤600 LOC on barrel).

This was the last backend P0 test item before Sprint 70 directory work.

---

## Part A — evaluate.service.spec (shipped layout)

```
evaluate/
  evaluate.service.spec-support.ts
  evaluate.service.orchestration.spec.ts      # display + productScores (7 tests)
  evaluate.service.extended-signals.spec.ts   # extendedSignals sidecars (4)
  evaluate.service.chips.spec.ts              # chips display (4)
  evaluate.service.resilience.spec.ts         # derivedContext fail-open (2)
  evaluate.service.wiring.spec.ts
  evaluate.service-spec-size.policy.spec.ts
```

Monolith **`evaluate.service.spec.ts`** deleted. Rule: no split file >700 non-empty LOC.

*(Story template `runners`/`errors` renamed — monolith has no matching describes.)*

---

## Part B — me-matches-eligibility harness (shipped layout)

```
me-profile/
  me-matches-eligibility.fixtures.ts
  me-matches-eligibility.builders.ts
  me-matches-eligibility.prisma-mock.ts     # buildEligibilityPrismaMock(host)
  me-matches-eligibility.harness.ts         # EligibilityTestHarness class
  me-matches-eligibility.spec-support.ts    # barrel re-exports (18 non-empty LOC)
  me-matches-eligibility-spec-size.policy.spec.ts
  me-matches-eligibility.wiring.spec.ts
```

**8 e2e specs keep importing `./me-matches-eligibility.spec-support`** — no import changes.

---

## Tasks

1. [x] Extract evaluate helpers + Nest setup to `evaluate.service.spec-support.ts`
2. [x] Move evaluate tests verbatim into 4 topic specs; wiring + policy
3. [x] Split eligibility harness into fixtures/builders/prisma-mock/harness; thin barrel
4. [x] `npm test -- evaluate.service` + `npm test -- me-new-model-e2e` (no new failures)

---

## Success

- [x] `evaluate.service.spec.ts` monolith deleted; splits ≤700 LOC each (max **332**)
- [x] `me-matches-eligibility.spec-support.ts` ≤600 LOC (**18** non-empty LOC barrel)
- [x] **17** evaluate tests preserved; e2e **20/35** pass (baseline unchanged)
- [x] No Part A/B target ≥1000 LOC (max **695** prisma-mock)

---

## Shipped

`feature/sprint-69-story-4` @ `6bc4a5d`

- `c0a8a32` — test: split evaluate.service.spec by topic
- `2daead0` — test: thin me-matches-eligibility spec-support
- `6bc4a5d` — test: add evaluate and eligibility harness wiring guards

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** Evaluate failures → topic spec (~142–332 LOC) instead of 1005 LOC monolith; eligibility harness navigable via fixtures/builders/prisma-mock modules.

---

## SOLID / KISS

- **ISP:** E2E specs import stable barrel; implementation modules are internal.
- **KISS:** Move-only — no production or assertion behavior changes.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
