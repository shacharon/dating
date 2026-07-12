# Handoff: Agent 2 — Code review — Story 5

**Agent:** 2 code-review  
**Story:** [STORY_05_candidate_photo_filter.md](../../STORY_05_candidate_photo_filter.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (test hardening applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` and `agent-1-dev.md` — **aligned** on SQL photo filter, visibility 404s, list meta, mutual bypass, docs.
- **No critical or major issues.** Symmetric browse rule matches Story 9 viewer gate; anti-leak semantics consistent (`Match not found.`).
- **Test hardening:** added `getById` / `getPrimaryPhotoFileById` unit tests, HTTP photo-file gate tests, list row `approvedPhotoCount` invariant, contract doc guard assertions.
- Full API suite: **1401/1401** pass; no UI changes (per scope).

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| SQL list filter | `photos: { some: { status: APPROVED } }` on `findMany` + parallel `count` | OK + tested |
| List meta | `filteredNoPhotoCandidates` always on `ready`; `totalCandidatesBeforeFilter` = photo-eligible pool | OK + documented |
| Detail / actions | `assertCandidateHasApprovedPhotosInRow` before gender/HG | OK + tested |
| Photo file (non-mutual) | Viewer + candidate `count` gates; no file read before gates | OK (+ CR tests) |
| Mutual bypass | Skips browse gates; still requires APPROVED primary in storage | OK (+ CR unit test) |
| Viewer `no_photo` | Unchanged list `not_ready` path | OK (regression) |
| `MeProfileMatchesService` | Unfiltered (architect out of scope) | OK — note for PM |
| Docs | V1 contract + deep dive + Story 2 cross-refs | OK (+ CR doc asserts) |
| Analytics | No new event (meta counter only) | OK per architect |
| Migration | None | OK |

**Minor (acceptable):**

- `filteredNoPhotoCandidates` could theoretically go negative if mocks/DB drift; production SQL makes it ≥ 0. No clamp added — matches architect formula.
- UI types omit optional `filteredNoPhotoCandidates` — not displayed today.

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.spec.ts` | `getById` zero-photo 404; `getPrimaryPhotoFileById` viewer/candidate/mutual tests; list `approvedPhotoCount ≥ 1` assert |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | HTTP 404 match photo when viewer or candidate has no approved photo |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | Assert contract md contains `filteredNoPhotoCandidates` + candidate guard row |

---

## Tests / verification

```powershell
cd dating-api
npm test
# 1401/1401 pass
```

- [x] API unit/integration: **1401/1401** pass
- [x] UI: unchanged (no Story 5 UI scope)
- [x] `prisma migrate deploy`: N/A (no migration)
- [ ] Manual smoke (story §): **deferred to operator**

### Runtime verification

| Check | Result |
|-------|--------|
| List excludes zero-photo candidates | Unit + HTTP |
| Detail / actions 404 | Unit + HTTP |
| Photo file gates (non-mutual) | Unit + HTTP |
| Mutual photo bypass | Unit |
| E2E two-user matches | Pass (Agent 1) |

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Match list excludes `approvedPhotoCount === 0` | Done + tested |
| Detail deep link → 404 | Done + tested |
| SQL/list-layer filter (not post-filter only) | Done + tested |
| `filteredNoPhotoCandidates` list meta | Done + tested |
| Tests with photo fixtures | Done (+ CR hardening) |
| Docs (Story 2/9 symmetric rule) | Done |

---

## Open questions / blockers

- None blocking agent 3 PM closeout.

Follow-up (not blocking):

- Optional UI type for `filteredNoPhotoCandidates`.
- Filter `MeProfileMatchesService` if product wants parity.
- Operator manual smoke: photo-less analyzed user absent from browse.

---

## Next agent

```text
--agent 3 sprint 10 story 5
```

**Notes for PM:**

- Engineering gate ready; deploy API only (no migration).
- Manual smoke: seed analyzed user A without approved photo → absent from B's match list; approve photo → appears (subject to other filters).
