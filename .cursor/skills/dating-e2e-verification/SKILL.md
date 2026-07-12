---
name: dating-e2e-verification
description: >-
  End-to-end integration test verification for the dating app's matching
  engine — real Nest app boot, real HTTP via supertest, in-memory Prisma
  mock. Loaded by architect, dev, and CR agents when stories touch
  eligibility, matching preferences/dimensions, ranking order, or
  GET /api/v1/me/matches.
disable-model-invocation: true
---

# Dating App — Matching engine E2E verification

Unit tests on `eligibility.evaluator.ts` or `holy-grail-five-signal-ranking.ts` in isolation do **not** prove what a real user sees from `GET /api/v1/me/matches`. Use this skill whenever a story touches **eligibility**, **preference dimensions**, **ranking order**, or the matches endpoints.

## When this skill is mandatory

| Signal in story / diff | Why |
|---|---|
| `eligibility.evaluator.ts`, `holy-grail-*`, `evaluateHolyGrailPairDirections` | Eligibility gating is what actually excludes candidates from `/api/v1/me/matches` — must be proven end-to-end, not just at the unit level |
| New/changed preference dimension (gender, age, distance, or any Sprint 17+ dealbreaker tag) | Missing-data handling is exactly where the Sprint 15 bug came from (silent zero-matches) — every new dimension needs a missing-fact E2E case, not just a happy-path one |
| `compareWithStatus`, `matchScore`, ranking order | `matchScore` comes from the older V1 `compareWithStatus` engine, **not** `holy-grail-five-signal-ranking.ts` — confirm which engine a change actually reaches before claiming it affects ranking (verified false assumption once already, see below) |
| `me-matches.service.ts`, `MeMatchesService` | This is the real production gate + sort — changes here need a live-HTTP test, not a service-level unit test |

## Existing harness — use this, do not reinvent it

- `dating-api/src/me-profile/me-matches-eligibility-harness.ts` — shared N-profile harness: real Nest app boot (`Test.createTestingModule` + `app.init()`), real HTTP via `supertest`, `PrismaService` replaced with an in-memory mock backed by plain JS state, `MeProfileAnalysisService` stubbed with manual `ANALYZED` advancement (simulates the async analysis worker completing).
- `dating-api/src/me-profile/me-new-model-e2e.integration.spec.ts` — original 2-user happy-path template.
- `dating-api/src/me-profile/me-new-model-e2e-eligibility.integration.spec.ts` — 5 scenarios: gender exclusion, age-range exclusion, missing-DOB exclusion, missing/withheld-gender exclusion, no-preference contrast case.
- `dating-api/src/me-profile/me-new-model-e2e-ranking.integration.spec.ts` — 3-candidate ranking-order scenario.

These 3 spec files are the **Sprint 16/17 regression baseline** (`dating-api/docs/sprints/sprint-16-matching-strictness-control/README.md`, Story 0). They must stay green, unmodified, through Sprint 16/17 unless a story is *explicitly and intentionally* changing that exact behavior. If one breaks unexpectedly, that's a real regression, not a flaky test — treat it as a stop-the-line signal.

## Known project facts (verified 2026-07 via Story 0 — don't re-derive, just cite)

- Candidates with `overallHardEligibility === 'FAIL'` (either direction) are **fully excluded** from the `matches` array in `MeMatchesService.list` (a `continue`), not flagged.
- `evalGender`/`evalAge` only evaluate — and can only `FAIL` — when the **searcher** has actually set a preference for that dimension. No preference set → `SKIPPED`; the counterparty's missing fact is never even checked.
- Gender has a redundant, simpler gate (`reciprocalProductGenderEligibility`) that runs before the Holy Grail evaluator against the same field — `evalGender`'s `FAIL` branch is effectively dead on the live matches path today (still real and unit-tested in isolation elsewhere).
- A truly unset/withheld gender is unreachable via normal signup (`submit` rejects it with 422); reachable only via a later `PATCH { gender: null }`.
- `matchScore` (what actually orders `/api/v1/me/matches`) comes from `compareWithStatus` (V1), not `holy-grail-five-signal-ranking.ts`. Holy Grail today only gates eligibility — it has no live effect on order. Don't assume a ranking-signal change affects real order unless it touches `compareWithStatus` or `MeMatchesService`'s sort; verify by reading the code.

## Architect — must document in handoff

Add an **E2E verification plan** subsection whenever the trigger table above applies:

1. Which existing baseline spec(s) this story must keep green
2. Which new scenario(s) need a new test (in the eligibility/ranking spec files, or a new sibling file using the shared harness)
3. Whether the change affects eligibility (gating), ranking (order), or both — state explicitly, don't assume

**Gate:** an eligibility/ranking story's handoff with no E2E verification plan is **incomplete**.

## Dev (agent 1) — must extend, not skip

- [ ] Add/extend a spec using `me-matches-eligibility-harness.ts` — do not hand-roll a new one-off harness
- [ ] Run `npx jest --no-coverage "integration.spec" --runInBand` (from `dating-api`) and confirm the baseline specs are still green
- [ ] If a baseline spec's assertion must legitimately change, say so explicitly in the handoff — that's a call for agent 2/3 to see, not a silent edit

## Code review (agent 2) — must verify

- [ ] Confirm no baseline spec assertion silently changed without handoff justification
- [ ] Confirm new scenarios go through the shared harness (real HTTP), not mocks-only unit tests, for anything touching `MeMatchesService` / `evaluateHolyGrailPairDirections`
- [ ] **Critical:** a story claims "zero behavior change" with no E2E test proving it
- [ ] **Major:** a ranking-signal change doesn't state whether it reaches `compareWithStatus` (live) or only `holy-grail-five-signal-ranking.ts` (currently inert on the live path)

### Verdict rule

**Do not approve** eligibility/ranking stories when:
- Only isolated unit tests exist for a change to `evaluateHolyGrailPairDirections` / `MeMatchesService`, **and**
- No E2E test through the shared harness proves the real HTTP-level effect

Use verdict `fixed` only once an E2E scenario exists and passes.

## PM (agent 3) — DoD gate

- [ ] Do not mark a matching-engine story Done if CR deferred E2E verification without an explicit tracked follow-up
- [ ] Confirm the Sprint 16/17 baseline specs are referenced as still-green in the CR handoff, not just assumed
