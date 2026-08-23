# Story 04 — Split evaluate.service.spec + Thin Eligibility Harness

**Sprint:** 69  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Ready  
**Handoffs:** [preflight](./handoffs/STORY_04_split_evaluate_and_harness/agent--1-preflight.md) · [architect](./handoffs/STORY_04_split_evaluate_and_harness/agent-0-architect.md) · [dev](./handoffs/STORY_04_split_evaluate_and_harness/agent-1-dev.md)

---

## Objective

1. Split `evaluate/evaluate.service.spec.ts` (1005 LOC) into topic-focused files.
2. Thin `me-profile/me-matches-eligibility.spec-support.ts` (1212 LOC) into fixtures + builders + prisma-mock + harness + thin barrel (target ≤600 LOC on barrel).

This is the last backend P0 test item before Sprint 70 directory work.

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
  me-matches-eligibility.fixtures.ts          # constants + eval JSON + photo types
  me-matches-eligibility.builders.ts        # extractCookieValue, makeBaseProfileRow
  me-matches-eligibility.prisma-mock.ts     # buildEligibilityPrismaMock(host) (~651 LOC)
  me-matches-eligibility.harness.ts         # EligibilityTestHarness class
  me-matches-eligibility.spec-support.ts      # barrel re-exports (≤600 LOC)
  me-matches-eligibility-spec-size.policy.spec.ts
```

**8 e2e specs keep importing `./me-matches-eligibility.spec-support`** — no import changes.

---

## Tasks

1. [ ] Extract evaluate helpers + Nest setup to `evaluate.service.spec-support.ts`
2. [ ] Move evaluate tests verbatim into 4 topic specs; wiring + policy
3. [ ] Split eligibility harness into fixtures/builders/prisma-mock/harness; thin barrel
4. [ ] `npm test -- evaluate.service` + `npm test -- me-new-model-e2e` (no new failures)

---

## Success

- [ ] `evaluate.service.spec.ts` monolith deleted; splits ≤700 LOC each
- [ ] `me-matches-eligibility.spec-support.ts` ≤600 LOC (barrel)
- [ ] **17** evaluate tests preserved; e2e pass/fail count unchanged vs baseline
- [ ] No backend spec file ≥1000 LOC (Part A/B targets)

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
