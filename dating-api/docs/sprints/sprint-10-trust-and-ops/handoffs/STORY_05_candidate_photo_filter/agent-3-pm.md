# Handoff: Agent 3 — PM — Story 5

**Agent:** 3 pm  
**Story:** [STORY_05_candidate_photo_filter.md](../../STORY_05_candidate_photo_filter.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 5 closed as Done (engineering gate)** — symmetric candidate photo rule: zero `APPROVED` photos excluded from scored match browse at SQL layer; detail/actions/non-mutual photo file → **404**; list meta `filteredNoPhotoCandidates`.
- Full pipeline: architect → dev → code review (photo-file + mutual bypass test hardening) → pm.
- **Completes Sprint 9 Story 2 follow-up** — viewer and candidate browse gates now aligned.
- **Sprint 10 progress: 4/6** engineering stories done.
- **No migration, no UI** — deploy API only.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| No zero-photo candidates in match list | Done | SQL `photos.some APPROVED` + unit/HTTP tests |
| API tests with photo fixtures | Done | **1401/1401** API suite |
| No regression on Story 1 photo URLs | Done | Existing primary photo tests pass |
| Docs updated | Done | V1 contract, deep dive, Story 2/9 cross-refs |
| Manual smoke (story §) | Pending operator | Steps 1–3 below |
| Browser E2E | Pending operator | Automated integration + E2E sufficient for gate |

---

## Acceptance criteria

**6 / 6** engineering AC met.

| AC | Status |
|----|--------|
| Match list excludes `approvedPhotoCount === 0` | Done + tested |
| Detail deep link → 404 | Done + tested |
| SQL/list-layer filter | Done + tested |
| `filteredNoPhotoCandidates` list meta (always on `ready`) | Done + tested |
| Tests (exclude/include fixtures) | Done (+ CR hardening) |
| Docs (symmetric rule) | Done |

---

## Sprint 10 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Prod deploy hygiene | **Done** (manual smoke pending operator) |
| 2 | Photo moderation pipeline | **Done** (migrate deploy + manual smoke pending operator) |
| 3 | Admin report queue | **Done** (migrate deploy + manual smoke pending operator) |
| 4 | Match feedback | Planned |
| 5 | Candidate photo filter | **Done** (manual smoke pending operator) |
| 6 | Invite referral tracking | Planned |

**Sprint status:** In progress (4/6).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_05_candidate_photo_filter.md` | Status Done, AC/DoD checked, shipped table |
| `README.md` (sprint-10) | Story 5 row; photo-less candidates bullet resolved |
| `handoffs/STORY_05_candidate_photo_filter/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; operator manual smoke waived to launch runbook (Stories 1–3 pattern).
- **`totalCandidatesBeforeFilter` semantic change** — now photo-eligible pool (documented in V1 contract); UI does not display field today.
- **404** for ineligible zero-photo candidates (not `not_visible`) — matches gender/HG anti-leak pattern.
- **Mutuals** — browse gates skipped on photo file when active mutual; conversations unchanged.
- **`MeProfileMatchesService`** unfiltered — out of scope; note if product wants parity later.
- **No product analytics event** — `filteredNoPhotoCandidates` is response meta only (architect choice).

---

## Tests / verification

- [x] API full suite — **1401/1401** pass
- [x] UI — unchanged (no Story 5 scope); prior sprint UI suites remain green
- [x] `npx prisma migrate deploy` — N/A (no migration)
- [ ] Manual smoke (story § steps 1–3) — pending operator

### Runtime verification

| Check | Result |
|-------|--------|
| Realtime / socket | N/A |
| Match list/detail/photo gates (automated) | Unit + HTTP + E2E |
| Browser photo-less candidate absent from browse | Deferred — operator |

---

## Operator manual smoke (Story 5)

**Prerequisites:** Story 2 moderation live (photos `APPROVED` via admin or dev auto-approve); both users **ANALYZED**.

1. User A: analyzed profile, **no** `APPROVED` photos (pending-only or none).
2. User B: analyzed + ≥1 `APPROVED` photo → `GET /api/v1/me/matches` → A **not** in `matches`.
3. Admin approves A's photo → refresh B's list → A **may** appear (gender/HG permitting).
4. Optional: deep link B → A detail before approve → **404**; after approve → **200**.

**Deploy:** API release only — no DB migration for Story 5.

---

## Deferred / follow-up (not blocking)

| Item | Notes |
|------|--------|
| Empty browse pool UX copy | Story deferred |
| `MeProfileMatchesService` photo filter | Optional parity |
| UI type for `filteredNoPhotoCandidates` | Optional |
| Grandfather zero-photo mutuals in browse | Product decision |

---

## Open questions / blockers

- None blocking Story 4 or Story 6 start.

---

## Next work

```text
--agent 0 sprint 10 story 4
```

Recommended parallel option: `--agent 0 sprint 10 story 6` (no dependency on Story 4/5).
