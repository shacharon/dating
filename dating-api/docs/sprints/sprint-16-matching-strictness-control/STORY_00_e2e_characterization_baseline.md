# Story 0: E2E characterization baseline

**Sprint:** 16
**Status:** Done
**Depends on:** —

---

## Why

Before touching the evaluator, we need a checked, automated record of exactly how it behaves *today* — not a description in a doc, an actual test that fails the moment behavior drifts. `dating-api` had a real end-to-end test harness (`me-new-model-e2e.integration.spec.ts`: real Nest app boot, real HTTP via `supertest`, real route/guard/pipe/matching-engine code, with only `PrismaService` and the analysis worker stubbed) but it only covered one happy-path scenario. It never exercised the `FAIL`/`SKIPPED`/missing-data branches this sprint is about to change. This story is that safety net, built *before* Story 1 touches anything.

This is not a new feature and ships no user-visible change. It is a prerequisite gate for Story 1's "zero behavior change" claim to mean anything.

---

## What was done

Added, under `dating-api/src/me-profile/`:

- `me-matches-eligibility-harness.ts` — shared N-profile version of the existing spec's boot/mock pattern, extracted so each new scenario file doesn't re-duplicate ~400 lines of Prisma-mock/session/login boilerplate.
- `me-new-model-e2e-eligibility.integration.spec.ts` — 5 scenarios, all against real unmodified production code:
  1. Gender exclusion (searcher has a gender preference; counterparty's gender not in the allowlist → excluded)
  2. Age-range exclusion (searcher has an age preference; counterparty's age outside range → excluded)
  3. Missing counterparty DOB **with an age preference set** → currently excluded (`PARTNER_DOB_MISSING`) — the exact branch Story 1 reclassifies internally to `UNKNOWN`; this test is the regression guard on that reclassification staying net-neutral
  4. Missing/withheld counterparty gender **with a gender preference set** → currently excluded (`PARTNER_GENDER_MISSING_OR_WITHHELD`) — same purpose, for gender
  5. No preference set at all (contrast case): counterparty missing both gender and DOB, searcher has no preference on either → **not** excluded, because both dimensions are `SKIPPED`, never evaluated. This is the case that proves the bug only fires when a preference is actually set.
- `me-new-model-e2e-ranking.integration.spec.ts` — 1 scenario: three mutually-eligible candidates, asserts they come back ordered by descending `matchScore` (confirmed by reading `MeMatchesService`, not assumed).

All 6 new tests pass against real, unmodified code. Zero files under `src/holy-grail-matching` or other production behavior code were changed. Full suite: 138 suites / 1424 tests green.

### Findings surfaced while writing these (see Sprint 16 README's "Notes from Story 0" section for the full writeup)

- `GENDER`'s evaluator `FAIL` branch is redundant/unreachable on the live matches path (a separate, simpler check already gates on the same field first).
- A truly missing/unset gender is unreachable via normal signup; only reachable via a later `PATCH { gender: null }`.
- `matchScore` (the thing that actually orders `/api/v1/me/matches`) comes from the older V1 `compareWithStatus` engine, not `holy-grail-five-signal-ranking.ts`. Holy Grail today only gates eligibility, not order. Flagged forward to Sprint 17 as an open decision, not resolved in this story.

---

## Definition of done

- [x] Shared harness extracted for multi-scenario reuse
- [x] 5 eligibility scenarios covering gender/age exclusion, both missing-data branches, and the no-preference contrast case
- [x] 1 ranking-order scenario across 3+ candidates
- [x] All new tests green against real, unmodified production code
- [x] Zero production behavior code touched
- [x] Full `dating-api` test suite green (138 suites / 1424 tests)
