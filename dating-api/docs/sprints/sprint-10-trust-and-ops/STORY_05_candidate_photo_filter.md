# Story 5: Candidate photo filter

**Sprint:** 10  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** [Story 2](./STORY_02_photo_moderation.md) (approved-only semantics enforced)

---

## Why

Sprint 9 Story 2 gates the **viewer** (must have ≥1 approved photo to browse). **Candidates** without approved photos can still appear in others' lists — inconsistent UX and wasted impressions. Deferred explicitly in Story 2 out-of-scope — **now symmetric** (Story 5).

---

## What

**As a** user  
**I want** match suggestions to include only people with visible photos  
**So that** browse feels complete and trustworthy

### Acceptance criteria

- [x] **Match list API** — candidates with `approvedPhotoCount === 0` excluded from `GET /api/v1/me/matches` results
- [x] **Match detail** — direct deep link to candidate with 0 approved photos → **404** (consistent with gender/HG ineligible paths)
- [x] **Engine query** — filter at SQL/list layer (`photos: { some: { status: APPROVED } }`), not post-filter only
- [x] **List meta** — `filteredNoPhotoCandidates` on `status: 'ready'` (always present; no PII; no new analytics event)
- [x] **Tests** — seeded candidate without approved photo absent from list; with approved photo present
- [x] **Docs** — Story 2/9 + `MATCH_ENGINE_V1_CONTRACT.md` note symmetric candidate rule

### Out of scope (this story)

- Hiding candidates with only `PENDING` photos (they already have count 0 until approved — covered by Story 2)
- Requiring N photos per candidate
- Changing viewer `no_photo` gate
- `GET /api/v1/me/profile/matches` (non–V1-scored path)

---

## Technical notes (guidance, not prescriptive)

- Extend `MeMatchesService` candidate query with `EXISTS` approved photo subquery (mirror primary photo enrichment).
- Ensure mutual match / conversation flows unaffected (existing mutuals may have lost photos — define: still visible in conversations; optional follow-up).

---

## Definition of done

- [x] No zero-photo candidates in match list
- [x] API tests with photo fixtures
- [x] No regression on Story 1 photo URL fields

---

## Manual smoke

1. Seed user A (analyzed, no approved photos) and user B (viewer with photo)
2. B's match list does not include A
3. A gets photo approved → appears in B's list (subject to other filters)

**Operator:** see `handoffs/STORY_05_candidate_photo_filter/agent-3-pm.md`.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Match list | SQL photo filter; `filteredNoPhotoCandidates` meta; `totalCandidatesBeforeFilter` = photo-eligible pool |
| Visibility | `getById`, match actions, non-mutual photo file → **404** when candidate has 0 approved photos |
| Photo file | Non-mutual path also gates viewer without approved photo (Story 9 gap closed) |
| Mutuals | Browse gates skipped when active mutual; conversations unchanged |
| Helper | `candidateHasApprovedPhoto()` in `me-profile-photo-gate.ts` |
| Docs | V1 contract, deep dive, Sprint 9 Story 2 follow-up struck |

**No migration. No UI changes** — browse pool shrinks automatically.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Grandfather existing mutuals without photos in **browse** | Product decision (conversations grandfathered) |
| Empty pool copy when filter removes many candidates | UX polish |
| Filter `MeProfileMatchesService` for parity | Optional |
| UI type for `filteredNoPhotoCandidates` | Optional |
