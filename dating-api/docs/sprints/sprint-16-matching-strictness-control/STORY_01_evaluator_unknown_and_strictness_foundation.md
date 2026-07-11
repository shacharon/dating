# Story 1: Evaluator foundation — UNKNOWN vs FAIL + per-dimension strictness

**Sprint:** 16
**Status:** Not started
**Depends on:** Sprint 15 Story 1 (evaluator trimmed to `GENDER` / `AGE` / `PROXIMITY`)

---

## Why

`dating-api/src/holy-grail-matching/eligibility.evaluator.ts` currently has exactly one outcome for "the fact is missing" and "the fact is known but wrong" — both are `FAIL`:

```ts
// dating-api/src/holy-grail-matching/eligibility.evaluator.ts (current)
// evalGender: gid undefined or PREFER_NOT_TO_SAY  -> FAIL 'PARTNER_GENDER_MISSING_OR_WITHHELD'
// evalAge:    dob undefined                       -> FAIL 'PARTNER_DOB_MISSING'
//             age undefined (invalid dob)          -> FAIL 'PARTNER_DOB_INVALID'
```

This is the actual root cause behind the Sprint 15 removal: education/smoking/alcohol/religion/wants-has-children were deleted (not fixed) because a missing self-fact hard-failed every candidate on that dimension, and the only lever available was "delete the dimension." The same pattern is still live today on `GENDER` and `AGE` — any profile with an incomplete or malformed date of birth, or gender withheld, silently disappears from every candidate pool, with no operator visibility into how often that happens.

The design docs (`docs/HOLY_GRAIL_MATCHING.md`) already describe a conceptual `UNKNOWN` outcome distinct from `NO_MATCH`, but the implementation never built it — `UNKNOWN` collapses into `FAIL` in code. This story builds the missing status and the strictness plumbing generically, with **zero** change to user-visible behavior. Story 2 is what spends this new capability.

---

## What

**As an** engineer
**I want** the evaluator to represent "counterparty fact missing/withheld" as a distinct `UNKNOWN` status, and to support a per-dimension strictness setting
**So that** future dimensions can degrade gracefully instead of hard-excluding, without re-litigating this fix per dimension

### Acceptance criteria

- [ ] **New status:** `HolyGrailHardEligibilityStatus` gains `'UNKNOWN'`, distinct from `'PASS'` / `'FAIL'` / `'SKIPPED'` / `'SOFT_PASS'`.
- [ ] **Reclassify existing branches:** in `evalGender`, the `gid === undefined || gid === GenderIdentity.PREFER_NOT_TO_SAY` branch returns `UNKNOWN` (reason code unchanged: `PARTNER_GENDER_MISSING_OR_WITHHELD`), not `FAIL`. In `evalAge`, `dob === undefined` (`PARTNER_DOB_MISSING`) and `age === undefined` (`PARTNER_DOB_INVALID`) both return `UNKNOWN`, not `FAIL`. All other branches (`GENDER_NOT_IN_ALLOWLIST`, `AGE_BELOW_MIN`, `AGE_ABOVE_MAX`) stay `FAIL` — these are genuine, known mismatches, not missing data.
- [ ] **New type:** `HolyGrailDimensionStrictness = 'MUST_MATCH' | 'PREFER' | 'DONT_CARE'`.
- [ ] **New policy function**, e.g. `resolveDimensionOutcome(rawStatus, strictness)`, that maps a dimension's raw evaluation (`PASS` / `FAIL` / `UNKNOWN` / `SKIPPED` / `SOFT_PASS`) plus its strictness into the status that feeds `overallHardEligibility`:
  - `MUST_MATCH`: `UNKNOWN` **still blocks** (treated as `FAIL` for the purpose of `overallHardEligibility`) — this preserves today's exact behavior for `GENDER`/`AGE` with **zero** regression.
  - `PREFER` / `DONT_CARE`: `UNKNOWN` **never blocks**. (Not exercised by any real dimension yet this story — `GENDER`/`AGE`/`PROXIMITY` are hardcoded `MUST_MATCH` — but the function must be correct and unit-tested for all three tiers so Story 2 can wire it up without touching this function again.)
- [ ] **Hardcode current dimensions:** `GENDER`, `AGE`, `PROXIMITY` are `MUST_MATCH` this story, via a constant map, not a new preference field. No new API surface yet.
- [ ] **Audit visibility:** `eligibility-audit.types.ts` / `build-eligibility-audit.ts` surface `UNKNOWN` as its own value wherever `FAIL` is currently the only "blocked" signal shown, so `match-quality-audit.ts` and any debug UI can distinguish "genuinely incompatible" from "we don't know."
- [ ] **Telemetry:** emit one structured log event per directional evaluation containing per-dimension outcome counts (`PASS` / `FAIL` / `SKIPPED` / `UNKNOWN` / `SOFT_PASS`), aggregable by dimension. Use the existing logger — no new infrastructure. This is the evidence base Story 2 (and any future "should we bring dimension X back" decision) needs; today nobody can see how often `UNKNOWN` fires versus a genuine mismatch.
- [ ] **Tests** (`eligibility.evaluator.spec.ts`):
  - Every existing test asserting `overallHardEligibility === 'FAIL'` on a missing gender/DOB still passes unchanged (net behavior for `MUST_MATCH` is identical).
  - New tests assert the **per-dimension** status is `UNKNOWN`, not `FAIL`, for the missing-fact branches.
  - New matrix test: for each of `{PASS, FAIL, UNKNOWN, SKIPPED, SOFT_PASS} × {MUST_MATCH, PREFER, DONT_CARE}`, assert `resolveDimensionOutcome` returns the documented result.

### Out of scope (this story)

- Any new user-facing preference field, UI, or i18n copy (Story 2)
- Turning `PROXIMITY` into something enforceable — still blocked on a geo anchor, unrelated to this story
- Changing `GENDER`/`AGE` default strictness away from `MUST_MATCH`, or making them user-configurable
- Reintroducing education/religion/smoking/alcohol/children (Story 2)

---

## Technical notes (guidance, not prescriptive)

- Keep this story a pure internal refactor: if any existing integration test's *external* result (`overallHardEligibility`, list/detail 404s) changes, that's a regression — the whole point is that `MUST_MATCH` behaves exactly like today's hardcoded `FAIL`-only model.
- `reasonCode` strings should stay stable where they already exist (`PARTNER_GENDER_MISSING_OR_WITHHELD`, `PARTNER_DOB_MISSING`, `PARTNER_DOB_INVALID`) — only the `status` they're attached to changes, so log-based dashboards built on reason codes don't break.
- Prefer a small, explicit constant map (`{ GENDER: 'MUST_MATCH', AGE: 'MUST_MATCH', PROXIMITY: 'MUST_MATCH' }`) over inferring strictness from anything implicit — Story 2 replaces this map with a per-user, per-dimension value without changing the function signature.

---

## Definition of done

- [ ] `UNKNOWN` status exists and is distinct from `FAIL` in evaluator + audit types
- [ ] `GENDER`/`AGE`/`PROXIMITY` net behavior is unchanged for every existing caller (regression tests green, no diff in list/detail guard behavior)
- [ ] `resolveDimensionOutcome` (or equivalent) is unit-tested for all 3 strictness tiers × all 5 raw statuses, even though only `MUST_MATCH` is wired to a real dimension this story
- [ ] Telemetry emits per-dimension outcome counts on every directional evaluation
- [ ] Full `dating-api` test suite green
