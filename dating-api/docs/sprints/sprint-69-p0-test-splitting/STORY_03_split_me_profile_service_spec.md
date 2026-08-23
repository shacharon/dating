# Story 03 — Split me-profile.service.spec

**Sprint:** 69  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_03_split_me_profile_service_spec/agent--1-preflight.md) · [architect](./handoffs/STORY_03_split_me_profile_service_spec/agent-0-architect.md) · [dev](./handoffs/STORY_03_split_me_profile_service_spec/agent-1-dev.md) · [CR](./handoffs/STORY_03_split_me_profile_service_spec/agent-2-cr.md) · [PM](./handoffs/STORY_03_split_me_profile_service_spec/agent-3-pm.md)

---

## Objective

Split `me-profile.service.spec.ts` (1347 LOC) by **service method family** so profile CRUD test failures don't pull in analysis/moderation suites.

---

## Shipped layout

```
me-profile/
  me-profile.service.spec-support.ts       # createMeProfileServiceTestContext() + wiring manifest
  me-profile.service.crud.spec.ts            # root get/create/patch (16 tests)
  me-profile.service.submit.spec.ts          # 11 tests
  me-profile.service.legacy-isolation.spec.ts  # 7 tests
  me-profile.service.analysis.spec.ts        # 4 tests
  me-profile.service.preferences.spec.ts     # 8 tests
  me-profile.service.moderation.spec.ts      # 7 tests
  me-profile.service.rank-rebuild.spec.ts    # 5 tests
  me-profile.service.wiring.spec.ts
  me-profile.service-spec-size.policy.spec.ts
```

Monolith **`me-profile.service.spec.ts`** deleted.

---

## Tasks

1. [x] Extract shared setup to `me-profile.service.spec-support.ts` (reuses `me-profile.test-harness.ts`)
2. [x] Move each describe block; preserve nested describes (preferences rollback, legacy traps)
3. [x] Policy guard: 700 LOC cap per split; monolith absent
4. [x] `npm test -- me-profile.service` green; `validate:phase2-me-profile` updated

---

## Success

- [x] Monolith deleted
- [x] **58** functional tests preserved (+18 wiring/policy guards)
- [x] Each split file ≤700 non-empty LOC (max: **324** crud)
- [x] spec-support ≤400 LOC (**178**)

---

## Shipped

`feature/sprint-69-story-3` @ `2ba10a5`

- `b583a07` — test: split me-profile.service.spec by method family
- `f1ab88c` — test: update me-profile service split wiring for story 03
- `2ba10a5` — chore: close sprint 69 story 3

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** CRUD failures → `me-profile.service.crud.spec.ts` (~324 LOC) instead of 1347 LOC monolith.

---

## SOLID / KISS

- **ISP:** Each spec imports only the mock refs it needs via destructuring.
- **KISS:** Move-only — no service behavior changes.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
