# Story 04 — Thin MatchDetailService

**Sprint:** 71  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done  

**Handoffs:** [preflight](./handoffs/STORY_04_thin_match_detail/agent--1-preflight.md) · [architect](./handoffs/STORY_04_thin_match_detail/agent-0-architect.md) · [dev](./handoffs/STORY_04_thin_match_detail/agent-1-dev.md) · [CR](./handoffs/STORY_04_thin_match_detail/agent-2-cr.md) · [PM](./handoffs/STORY_04_thin_match_detail/agent-3-pm.md)

---

## Objective

Split `me-profile/matches/detail/match-detail.service.ts` (357 LOC) — `getById` mixes eligibility, narrative resolution, trait building, and mutual-match checks; photo file reads are separate methods but same class.

**Public API unchanged:**

- `getById(userId, candidateProfileId)`
- `getPrimaryPhotoFileById`, `readApprovedPrimaryPhotoFile`

---

## Target layout (locked — Agent 0)

```
me-profile/matches/detail/
  match-detail.service.ts              # facade ≤150 LOC
  match-detail-query.service.ts        # getById orchestration ≤250 LOC
  match-detail-query.helpers.ts        # hard-block + photo URL + DTO assemble
  match-detail-photo.service.ts        # getPrimaryPhotoFileById + readApprovedPrimaryPhotoFile ≤120 LOC
  match-detail-spec-size.policy.spec.ts
  match-detail-narrative.ts            # EXISTS — keep
  match-eligibility.service.ts         # EXISTS — keep
```

Facade injects query + photo only. Photo owns full file API (access gate + storage). Query stays ≤250 via helpers (do not raise cap).

---

## Query vs photo split

| Service | Owns |
|---------|------|
| **Query** | Viewer/candidate load, photo gate, bridge, eligibility, dealbreaker extract, traits, narrative, DTO assemble (via helpers) |
| **Photo** | Mutual/eligibility access for file route, `PhotoStorage` reads, approved photo validation, file not found errors |

---

## Tasks

1. Extract photo methods to `MatchDetailPhotoService` (inject `PHOTO_STORAGE`, `MATCH_QUERY_REPOSITORY`, mutual, eligibility, obs).
2. Extract `match-detail-query.helpers.ts` (hard-block + primary photo URL + assemble).
3. Move remaining `getById` body to `MatchDetailQueryService`.
4. Facade delegates; wire in `me-profile.module.ts` + `me-matches.test-harness.ts`.
5. Update wiring + add LOC policy spec.
6. `npm test -- match-detail match-detail-spec-size match-repository-wiring`.

---

## Success

- [x] Facade ≤150 LOC
- [x] Query service ≤250 LOC (helpers keep headroom — do not raise cap)
- [x] Photo service ≤120 LOC
- [x] `/api/v1/me/matches/:id` detail shape unchanged (205 smoke)

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
