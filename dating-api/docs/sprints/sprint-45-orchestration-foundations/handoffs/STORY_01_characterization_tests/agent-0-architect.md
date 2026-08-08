# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_characterization_tests.md](../../STORY_01_characterization_tests.md)  
**Sprint:** sprint-45-orchestration-foundations  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Tests-only foundations for Sprint 38 Story 03 (`MeMatchesService` split). **No production code.** **Skip Agent 4** (no eligibility / ranking / preference behavior change — lock existing outcomes only).

---

## Summary

- Inventory existing me-matches coverage; lock a **do-not-drift** characterization matrix for `list()` / `getById()`.
- Fill **gaps only** by extending existing harnesses (`me-matches.service.spec.ts`, `me-matches-materialized-list.spec.ts`, light HTTP asserts if cheap).
- No Prisma / DTO / HTTP shape / score / HG changes.
- Success = green relevant suites + handoff matrix cases each mapped to an asserting test.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.ts` | **N/A** — do not touch |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | Extend: legacy-path gaps + named characterization block |
| `dating-api/src/me-profile/me-matches-materialized-list.spec.ts` | Extend: materialized not_ready reasons + stronger invalid_cursor body |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | Optional: HTTP 400 `invalid_cursor` if not already present |
| `me-matches-eligibility-harness.ts` / e2e specs | **Do not modify** (baseline stay green) |
| Prisma / controllers / DTOs | **N/A** |

---

## Inventory (current state)

### Specs touching list/detail

| Spec | Role | Flag context |
|------|------|----------------|
| `me-matches.service.spec.ts` (~3k LOC) | Primary unit coverage for `list` / `getById` / hardBlocked / narrative | Forces `MATCH_LIST_MATERIALIZED=0` (legacy Redis path) |
| `me-matches-materialized-list.spec.ts` | Materialized rank page + flag routing + empty enqueue | Default `=1`; also tests unset / `=0` |
| `me-matches.v1-contract.spec.ts` | List vs detail field policy + read-model import policy | Forces legacy for some cases |
| `me-matches-read-model-policy.spec.ts` | Source import policy | N/A |
| `me-profile-http.integration.spec.ts` | HTTP `GET /me/matches` + `/:id` smoke | App default (materialized on unless env set) |
| `me-new-model-e2e-*.integration.spec.ts` + eligibility harness | Eligibility / ranking / hard-block / pagination / narrative E2E | Real Nest + in-memory Prisma mock |
| `match-list-materialized-flag.spec.ts` | Flag parsing only | N/A |

### Already covered (do not duplicate; strengthen shape asserts only if weak)

| Outcome | Where |
|---------|--------|
| `list` → `not_ready` / `no_profile` \| `not_analyzed` \| `no_photo` | `me-matches.service.spec` + HTTP integration |
| `list` → `ready` + empty `matches` | service.spec + materialized empty ranks + HTTP |
| `list` pagination `nextCursor` / `hasMore` | service.spec (legacy) + materialized paging |
| Materialized vs legacy routing | `me-matches-materialized-list.spec` |
| Materialized empty → enqueue `list_empty` once; cursor present → no enqueue | materialized-list.spec |
| Materialized `not_ready(no_profile)` skips rank + enqueue; shape includes `nextCursor: null`, `hasMore: false` | materialized-list.spec |
| Invalid cursor → `BadRequestException` | materialized-list.spec only (instance check) |
| `getById` 404: no viewer / not analyzed / no photo / missing candidate / gender / no photo / BLOCK | service.spec + HTTP |
| `getById` 200 ready (id, gender, hasEvaluation, evaluationSummary, no about\* leak) | service.spec + HTTP |
| `hardBlocked` list keep + detail 200; non-existing hard-FAIL → omit / 404 | service.spec Sprint 18 blocks |
| V1: list omits `evaluationSummary` / `matchExplanationTraits` / narrative | v1-contract.spec |

### Gaps to fill (Agent 1)

1. **Materialized `not_ready(not_analyzed)` and `not_ready(no_photo)`** — only `no_profile` locked on materialized path today.
2. **Invalid cursor error body** — assert `getResponse()` / HTTP body contains `error: 'invalid_cursor'` (not only `BadRequestException` instance). Same decode runs **before** flag branch → one service-level assert is enough for both paths; optional HTTP 400 in integration.
3. **Legacy `list` not_ready / empty pagination envelope** — assert `nextCursor: null` and `hasMore: false` on not_ready and empty ready (service.spec currently asserts status/reason/matches length only).
4. **Named “do not drift” describe** — group or tag the locked cases so Sprint 38.3 reviewers can find them without hunting 3k LOC.
5. **`getById` ready minimal field lock** — one focused test asserting presence of: `id`, `matchScore` (finite or null per fixture), `teaser`, `explainability` key, `recommendation` key, `primaryPhotoUrl` / `approvedPhotoCount`, and **absence** of `userId` / about\* — without re-testing narrative/LLM paths.

---

## Decisions (do not reverse without discussion)

### 1. No production changes

- Do not edit `me-matches.service.ts` or any DTO/controller.
- Do not change scores, HG, cursor encoding, or feature-flag defaults.
- If a test fails against current code → fix the **test** (or report bug to reopen design); do not “fix” production in this story.

### 2. Prefer extend over new mega-spec

- Primary homes: `me-matches.service.spec.ts` (legacy) and `me-matches-materialized-list.spec.ts` (materialized).
- Optional one HTTP case for `GET /api/v1/me/matches?cursor=!!!` → 400 + `invalid_cursor`.
- Do **not** create a new 500+ LOC characterization file.
- Do **not** modify eligibility harness or e2e ranking/eligibility specs in this story.

### 3. Characterization matrix — locked outcomes (“do not drift”)

Agent 1 must ensure each row has a green asserting test. Mark covered-as-is vs newly added in `agent-1-dev.md`.

#### A. `list()` — viewer gate

| ID | Outcome | Assert |
|----|---------|--------|
| L1 | `not_ready` + `reason: 'no_profile'` | status/reason; `nextCursor === null`; `hasMore === false`; no `matches` required |
| L2 | `not_ready` + `reason: 'not_analyzed'` | same envelope |
| L3 | `not_ready` + `reason: 'no_photo'` | same envelope |
| L4 | L1–L3 on **materialized** path (`MATCH_LIST_MATERIALIZED` on / unset) | no `matchListRank.findMany`; no rebuild enqueue |

#### B. `list()` — empty / cursor

| ID | Outcome | Assert |
|----|---------|--------|
| L5 | `ready` + `matches: []` when no candidates / empty ranks | status ready; matches length 0; `nextCursor` null; `hasMore` false |
| L6 | Invalid cursor string | throws `BadRequestException` with body `{ error: 'invalid_cursor' }` (message text may stay as today) |
| L7 | Valid cursor pagination | page size respects limit; `hasMore` + opaque `nextCursor` when more remain; second page continues without duplicate ids |

#### C. `list()` — flag paths

| ID | Outcome | Assert |
|----|---------|--------|
| L8 | Materialized default (env unset) | uses `matchListRank.findMany`; does not use Redis ranked-list cache get for full list |
| L9 | Legacy escape (`MATCH_LIST_MATERIALIZED=0`) | Redis cache path; no `matchListRank.findMany` |
| L10 | Materialized empty first page | enqueues rebuild `list_empty` (NX); empty + cursor → no enqueue |

#### D. `list()` — hardBlocked (existing)

| ID | Outcome | Assert |
|----|---------|--------|
| L11 | Existing hard-FAIL (LIKE and/or ACTIVE mutual) | appears with `hardBlocked` DTO; sorted after eligible |
| L12 | Non-existing hard-FAIL | omitted from list |

#### E. `getById()`

| ID | Outcome | Assert |
|----|---------|--------|
| D1 | Viewer not ready (no profile / not analyzed / no photo) | `NotFoundException` (HTTP 404) — no `not_ready` DTO on detail |
| D2 | Candidate missing / ineligible gender / no approved photos / viewer BLOCK | `NotFoundException` / 404 — no existence leak |
| D3 | Eligible ready | 200/detail with locked fields (§5); no `userId`, no about\* |
| D4 | Existing hard-FAIL | 200 + `hardBlocked`; non-existing → 404 |

### 4. Flag matrix rule

- Cases L1–L3, L5–L7 must be true on **both** paths unless a row is explicitly path-specific (L4, L8–L10).
- service.spec already pins legacy (`=0`); materialized-list.spec pins on. Do not flip defaults in shared `beforeEach` without restoring.

### 5. Detail field lock (D3 minimum)

Locked keys on successful `getById` (types may be null where product allows):

- Present: `id`, `nickname`, `gender`, `ageYears`, `locationLabel`, `analyzedAt`, `hasEvaluation`, `evaluationSummary`, `matchScore`, `primaryPhotoUrl`, `approvedPhotoCount`, `explainability`, `recommendation`, `teaser`
- Optional present when scored: `matchExplanationTraits`, `matchNarrative`, `profileAnalysisStale`, `hardBlocked`
- Never: `userId`, `aboutMe`, `aboutPartner`, `aboutRelationship`, raw evaluation blob

Do not assert exact narrative text or LLM call counts in the characterization block (already covered elsewhere).

### 6. Schema / API / migration

- **None.** No Prisma changes. No endpoint contract versioning.

### 7. Agent 4

- **Skip.** Story does not change eligibility, preference dimensions, or ranking order — only tests locking current behavior.
- Baseline e2e specs must remain green and unmodified.

### 8. Runtime topology

- **N/A** (no realtime / proxy / cookie changes).

---

## Service surface under characterization (reference only)

```ts
// Existing — do not change signatures
list(userId: string, query?: MeMatchesListQuery): Promise<MeMatchesListResponseDto>
getById(userId: string, candidateProfileId: string): Promise<MeMatchDetailDto>
```

Public HTTP (unchanged):

- `GET /api/v1/me/matches` → list DTO (`ready` \| `not_ready`)
- `GET /api/v1/me/matches/:id` → detail DTO or 404

Invalid cursor: **400** with `{ error: 'invalid_cursor', message: ... }` before path branch.

---

## Tests / verification

- [ ] Unit: `npx jest --no-coverage src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches-materialized-list.spec.ts`
- [ ] Optional: same for `me-profile-http.integration.spec.ts` filter on matches list/detail if HTTP cursor case added
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A
- [ ] Socket transport: N/A

---

## E2E verification

- **N/A for new scenarios** (Agent 4 skipped).
- Baseline `me-new-model-e2e*.integration.spec.ts` must stay green and unmodified.
- Eligibility harness: do not extend for this story.

---

## Out of scope

- Splitting `MeMatchesService` (Sprint 38.3)
- Typed domain errors (Sprint 45 Story 2)
- DTO boundary module (Sprint 45 Story 3)
- Changing hardBlocked / score / HG / teaser policy
- Frontend

---

## Agent 1 instructions

1. Read this handoff + story; **do not** change production service code.
2. Add a clearly named describe, e.g. `Sprint 45 Story 1 — characterization (do not drift)`, in:
   - `me-matches.service.spec.ts` (legacy path), and/or
   - `me-matches-materialized-list.spec.ts` (materialized),
   reusing existing fixtures/`makeProfileRow` helpers.
3. Implement gap fills §Gaps 1–5; map each matrix ID (L1–L12, D1–D4) to a test name in `agent-1-dev.md`.
4. Prefer strengthening existing examples over copy-paste duplicates.
5. Run the jest commands above; all must pass.
6. Commit with suggested message; write `agent-1-dev.md`.

Suggested commit:

```
test(me-matches): characterization coverage for list/detail before split

Sprint 45 Story 1
```

---

## Agent 2 instructions

- [ ] No production file diffs under `me-matches.service.ts` / DTOs / controllers
- [ ] Every matrix ID L1–L12 and D1–D4 mapped to a green test
- [ ] Invalid cursor asserts `error: 'invalid_cursor'`
- [ ] Materialized not_ready covers all three reasons
- [ ] No new mega-spec; e2e/harness untouched
- Write `agent-2-cr.md` → then `--agent 3` (skip 4)

---

## Agent 3 instructions

- Accept if CR PASS + AC checked; mark Story 01 Done in sprint README.
- Write `agent-3-pm.md`.
- Next story: `--agent 0 sprint 45 story 2`.

---

## Open questions / blockers

- None. If Agent 1 discovers current production behavior disagrees with this matrix, stop and report — do not silently change product code in Story 1.

---

## Next agent

```text
--agent 1 sprint 45 story 1
```

**Notes for next agent:**

- Tests only; extend existing specs; lock the matrix above for Sprint 38.3 extract-then-delegate parity.
- Skip Agent 4 after CR.
