# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_candidate_photo_filter.md](../../STORY_05_candidate_photo_filter.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **SQL photo filter** — `MeMatchesService.list()` uses `photos: { some: { status: APPROVED } }` on candidate `findMany` + separate `count` for meta.
- **Visibility gates** — zero-photo candidates → `404` on `getById`, `assertMatchCandidateVisible`, non-mutual `getPrimaryPhotoFileById`.
- **Viewer photo gate on photo file** — non-mutual `getPrimaryPhotoFileById` now checks `viewerHasApprovedPhoto` (Story 9 gap closed).
- **List meta** — `filteredNoPhotoCandidates` always on `status: 'ready'`; `totalCandidatesBeforeFilter` = photo-eligible pool.
- **Helper** — `candidateHasApprovedPhoto()` in `me-profile-photo-gate.ts`.
- **Tests** — 1395/1395 API tests pass.

---

## Files changed

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.ts` | SQL filter, visibility guards, DTO field, trace log |
| `dating-api/src/me-profile/me-profile-photo-gate.ts` | `candidateHasApprovedPhoto()` |
| `dating-api/src/me-profile/me-profile-photo-gate.spec.ts` | candidate helper test |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | fixtures default photo; exclusion/meta/404 tests |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | default candidate photos + `count` mock |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | `userProfile.count`; photo fixtures; HTTP tests |
| `dating-api/src/me-profile/me-new-model-e2e.integration.spec.ts` | `count` + photo-enriched mock rows |
| `dating-api/docs/MATCH_ENGINE_V1_CONTRACT.md` | guards + list meta semantics |
| `dating-api/docs/MATCH_ENGINE_DEEP_DIVE.md` | guards row |
| `dating-api/docs/sprints/sprint-09-product-mvp/STORY_02_photo_gate_profile_completeness.md` | follow-up struck |
| `dating-api/docs/sprints/sprint-10-trust-and-ops/STORY_02_photo_moderation.md` | Story 5 cross-ref |

**No UI changes** (per architect).

---

## Verification

```powershell
cd dating-api
npm test
# 1395 passed
```

### Scenarios covered

- [x] List excludes zero-photo candidates (unit + HTTP)
- [x] `filteredNoPhotoCandidates` meta (unit + HTTP)
- [x] `findMany` where includes `photos.some APPROVED` (unit)
- [x] Detail 404 for zero-photo candidate (HTTP)
- [x] `assertMatchCandidateVisible` 404 for zero-photo (unit)
- [x] Self-action test still 400 (photos on self mock)
- [x] E2E two-user flow unchanged (steps 7–9)
- [x] Viewer `no_photo` unchanged
- [x] Mutual photo bypass unchanged

---

## Operator notes

- **No migration** — deploy API only.
- Manual smoke: story manual smoke section (seed photo-less analyzed user → absent from browse).

---

## Next agent

```text
--agent 2 sprint 10 story 5
```

**Notes for CR:**

1. Confirm `totalCandidatesBeforeFilter` semantic change is documented (intentional).
2. Review non-mutual `getPrimaryPhotoFileById` viewer gate — defense-in-depth, not a behavior change for ready viewers.
3. `MeProfileMatchesService` still unfiltered (out of scope per architect).
