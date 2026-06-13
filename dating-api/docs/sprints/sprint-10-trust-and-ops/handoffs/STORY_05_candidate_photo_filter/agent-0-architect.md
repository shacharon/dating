# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_candidate_photo_filter.md](../../STORY_05_candidate_photo_filter.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Symmetric browse rule** — exclude **candidates** with zero `APPROVED` photos from scored match browse (Sprint 9 Story 2 gated the **viewer** only; Story 2 deferred candidate-side filter).
- **SQL-level filter** — `MeMatchesService.list()` candidate `findMany` adds Prisma `photos: { some: { status: APPROVED } }` (not post-filter only).
- **Detail / actions / photo file (non-mutual)** — deep link or action toward zero-photo candidate → **`404`** `"Match not found."` (same anti-leak semantics as gender/HG ineligible).
- **List meta** — optional counter **`filteredNoPhotoCandidates`** on `status: 'ready'` responses (always present, no PII).
- **Semantic tweak** — `totalCandidatesBeforeFilter` counts **photo-eligible** analyzed candidates (after SQL photo filter, before gender/HG/block in-memory filters).
- **Conversations / mutuals** — unchanged; mutual photo bypass in `getPrimaryPhotoFileById` stays (grandfather path).
- **No schema migration, no UI work** — API + tests + contract docs only.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — match engine** | |
| `dating-api/src/me-profile/me-matches.service.ts` | SQL photo filter in `list()`; candidate photo guard in `getById`, `assertMatchCandidateVisible`, `getPrimaryPhotoFileById` (non-mutual); add `filteredNoPhotoCandidates` to list DTO; optional trace field |
| `dating-api/src/me-profile/me-profile-photo-gate.ts` | Add `candidateHasApprovedPhoto()` (thin wrapper over `countApprovedPhotosForProfile`) |
| `dating-api/src/me-profile/me-profile-photo-gate.spec.ts` | Mirror viewer tests for candidate helper |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | Exclude/include scenarios; meta counter; visibility 404 tests; fix fixtures (see §8) |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | HTTP list/detail for zero-photo candidate |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | Contract doc guard row + list meta field if asserted |
| **Docs** | |
| `dating-api/docs/MATCH_ENGINE_V1_CONTRACT.md` | Guards table + list output (`filteredNoPhotoCandidates`, `totalCandidatesBeforeFilter` semantics) |
| `dating-api/docs/MATCH_ENGINE_DEEP_DIVE.md` | Guards table row (mirror V1 contract) |
| `dating-api/docs/sprints/sprint-09-product-mvp/STORY_02_photo_gate_profile_completeness.md` | Strike “optional follow-up” on candidate filter — now Story 5 |
| `dating-api/docs/sprints/sprint-10-trust-and-ops/STORY_02_photo_moderation.md` | Note symmetric candidate filter shipped Story 5 |

**No changes required:**

- Prisma schema / migrations
- `dating-ui/*` (browse pool shrinks automatically; empty-pool copy deferred)
- `MeProfileMatchesService` (`GET /api/v1/me/profile/matches` — not V1 scored engine; out of scope)
- Viewer `no_photo` gate (unchanged)
- Conversation / messaging modules
- Product analytics events (counter is response meta only)

---

## Decisions (do not reverse without discussion)

### 1. Filter mechanism — Prisma relation filter on list query

| Approach | Verdict |
|----------|---------|
| Post-filter in JS loop (`approvedPhotoCount === 0`) | **Rejected** — story AC requires SQL/list layer |
| Raw SQL `EXISTS` subquery | **Rejected** — Prisma relation filter is equivalent and matches existing `candidateSelect` |
| **`photos: { some: { status: APPROVED } }` on `findMany` where** | **Chosen** |

**Locked list query shape:**

```typescript
import { UserProfilePhotoStatus } from '@prisma/client';

private matchCandidateBaseWhere(viewerUserId: string) {
  return {
    userId: { not: viewerUserId },
    status: STATUS_ANALYZED,
    user: { deletedAt: null },
  };
}

private matchCandidatePhotoEligibleWhere(viewerUserId: string) {
  return {
    ...this.matchCandidateBaseWhere(viewerUserId),
    photos: { some: { status: UserProfilePhotoStatus.APPROVED } },
  };
}
```

`list()`:

1. `totalAnalyzedCandidates = count({ where: matchCandidateBaseWhere })`
2. `candidateRows = findMany({ where: matchCandidatePhotoEligibleWhere, select: candidateSelect })`
3. `totalBeforeFilter = candidateRows.length`
4. `filteredNoPhotoCandidates = totalAnalyzedCandidates - totalBeforeFilter`

Existing in-memory filters (gender, HG, block, scoring) unchanged — they run on `candidateRows` only.

---

### 2. Detail / visibility — 404, not `not_visible`

Story AC allows `404` or `not_visible`. **Locked:** use existing **`NotFoundException('Match not found.')`** — consistent with gender-ineligible and HG-fail detail paths. Do **not** introduce a new error shape.

Apply after candidate row load ( `candidateSelect` already returns `photos` filtered to `APPROVED` only):

```typescript
if ((candidate.photos ?? []).length < 1) {
  throw new NotFoundException('Match not found.');
}
```

**Surfaces (same check):**

| Method | When |
|--------|------|
| `getById` | After analyzed + not-deleted + before gender/HG scoring |
| `assertMatchCandidateVisible` | Same — covers LIKE/PASS/BLOCK actions via `MeMatchActionsService` |
| `getPrimaryPhotoFileById` | **Non-mutual path only** — after gender eligibility, before `readApprovedPrimaryPhotoFile` |

**Mutual path** in `getPrimaryPhotoFileById`: **unchanged** — skip browse eligibility when active mutual exists; `readApprovedPrimaryPhotoFile` still requires `APPROVED` primary (404 if none). Conversations remain usable without browse photo gate.

---

### 3. `getPrimaryPhotoFileById` — add missing viewer gate (non-mutual)

Pre-existing gap: non-mutual path checks viewer `ANALYZED` but **not** `viewerHasApprovedPhoto` (Story 9 gated list/detail/actions text paths only).

**Locked (Story 5):** on non-mutual path, after viewer analyzed check:

```typescript
if (!(await viewerHasApprovedPhoto(this.prisma, viewer.id))) {
  throw new NotFoundException('Match not found.');
}
```

Then candidate photo check (§2). Defense-in-depth aligned with `getById`.

---

### 4. List response meta — `filteredNoPhotoCandidates`

Story AC: “dev-only or always — product choice.” **Locked: always present** when `status === 'ready'` (integer ≥ 0). No PII; no extra analytics event.

```typescript
export interface MeMatchesListResponseDto {
  // ... existing fields ...
  /**
   * Analyzed candidates excluded from the pool because they have zero APPROVED photos.
   * Present when status = 'ready'.
   */
  filteredNoPhotoCandidates?: number;
  totalCandidatesBeforeFilter?: number;
}
```

**Semantics:**

| Field | Meaning (after Story 5) |
|-------|-------------------------|
| `totalCandidatesBeforeFilter` | Count of **photo-eligible** analyzed candidates (SQL filter applied), **before** gender / HG / block in-memory filters |
| `filteredNoPhotoCandidates` | Analyzed, non-deleted candidates (excluding self) **without** ≥1 `APPROVED` photo |
| `matches.length` | Final rows after all filters + scoring |

**Breaking semantic change (intentional):** `totalCandidatesBeforeFilter` previously counted all analyzed candidates. Document in `MATCH_ENGINE_V1_CONTRACT.md`. UI does not display this field today — low client impact.

Optional structured trace (extend existing list OK log):

```text
me matches list profileId=... before=<totalBeforeFilter> after=<matches.length> filteredNoPhoto=<filteredNoPhotoCandidates>
```

---

### 5. Photo gate helper — shared count, candidate alias

Keep `countApprovedPhotosForProfile` + `viewerHasApprovedPhoto` unchanged.

Add:

```typescript
/** True when candidate profile has ≥1 APPROVED photo (browse eligibility). */
export async function candidateHasApprovedPhoto(
  prisma: Pick<PrismaService, 'userProfilePhoto'>,
  profileId: string,
): Promise<boolean> {
  return viewerHasApprovedPhoto(prisma, profileId);
}
```

Use **loaded relation length** in hot paths where `candidateSelect` already fetched `photos` (avoid double query). Use `candidateHasApprovedPhoto` when profile not loaded.

---

### 6. PENDING / REJECTED photos

Candidates with only `PENDING` or `REJECTED` photos have `approvedPhotoCount === 0` and **`photos: []`** in `candidateSelect` — excluded by SQL `some: APPROVED`. No separate pending handling (Story 2 covers moderation semantics).

---

### 7. Out of scope (confirmed)

| Item | Rationale |
|------|-----------|
| `MeProfileMatchesService` | Different route; not V1 scored engine contract |
| UI empty-pool copy | Story deferred |
| Grandfather mutuals in **browse** | Product chose filter-all for browse; mutuals only grandfathered on conversation + mutual photo bypass |
| Re-ranking / N photos minimum | Story AC |
| New product analytics event | Counter in JSON meta suffices |

---

## Runtime topology

| Concern | Value |
|---------|--------|
| Affected routes | `GET /api/v1/me/matches`, `GET /api/v1/me/matches/:id`, match primary photo file (non-mutual), match actions (via `assertMatchCandidateVisible`) |
| Unchanged routes | Conversations, messaging, mutual photo bypass, admin moderation, user photo upload |
| Migration | **None** |
| Env vars | **None** |

---

## Tests / verification

Dev (agent 1):

```powershell
cd dating-api
npm test
```

### Scenarios (must pass)

**List**

- [ ] Viewer ready + candidate **ANALYZED** + **0 APPROVED** photos → absent from `matches`
- [ ] Same candidate + **1 APPROVED** photo → present (subject to gender/HG)
- [ ] `findMany` where includes `photos: { some: { status: 'APPROVED' } }`
- [ ] `filteredNoPhotoCandidates` correct (e.g. 3 analyzed, 1 photo-less → `1`)
- [ ] `totalCandidatesBeforeFilter` equals photo-eligible count, not all-analyzed count
- [ ] `approvedPhotoCount` on every list row is **≥ 1** when row present

**Detail / actions**

- [ ] `GET .../me/matches/:id` for zero-photo candidate → **404**
- [ ] `assertMatchCandidateVisible` → **404** (match actions)
- [ ] Viewer without photo → still **404** on detail (Story 9 regression)

**Photo file**

- [ ] Non-mutual `getPrimaryPhotoFileById` → **404** when candidate has no approved photo
- [ ] Non-mutual path → **404** when viewer has no approved photo (new)
- [ ] Active mutual pair → bypass unchanged; still 404 if no approved primary on disk

**Regression**

- [ ] Story 1 `primaryPhotoUrl` / `approvedPhotoCount` fields unchanged for eligible candidates
- [ ] Viewer `not_ready(no_photo)` unchanged
- [ ] `MATCH_LIST_VIEWED` analytics only on `status: 'ready'`

### Fixture note (§8 — important for agent 1)

Many existing `me-matches.service.spec.ts` / integration tests mock `userProfile.findMany` returning candidates with **`photos: []`**. After SQL filter, those candidates never enter the loop unless mocks include the `photos.some` predicate **or** tests seed APPROVED photos.

**Fix strategy:**

1. Add `photos: [{ id: 'ph1', isPrimary: true }]` to default candidate fixtures used in “candidate should appear” tests.
2. Add dedicated tests with `photos: []` asserting exclusion / 404.
3. For prisma mock `findMany`, either match `where.photos` or use integration-style seeds.

---

## Docs updates (agent 1)

Add to **`MATCH_ENGINE_V1_CONTRACT.md`** §5 list output:

- `filteredNoPhotoCandidates` optional field description
- Clarify `totalCandidatesBeforeFilter` = photo-eligible pool

Add to §6 guards table:

| Guard | Behavior |
|-------|----------|
| **Candidate has no approved photo** | Omitted from list; detail / non-mutual photo file / match actions → `404`. Count in `filteredNoPhotoCandidates` on list. |

Cross-reference in Sprint 9 Story 2 doc: candidate-side symmetric rule **shipped Sprint 10 Story 5**.

---

## Open questions / blockers

- None.

**Follow-up (not this story):** empty browse pool UX copy; filter `MeProfileMatchesService`; grandfather zero-photo mutuals in browse.

---

## Next agent

```text
--agent 1 sprint 10 story 5
```

**Notes for dev:**

1. Import `UserProfilePhotoStatus` in `me-matches.service.ts` for typed `some` filter.
2. Extract `matchCandidateBaseWhere` / `matchCandidatePhotoEligibleWhere` private methods — reuse in list count + findMany.
3. Candidate photo guard: prefer `(candidate.photos ?? []).length < 1` when row already loaded.
4. Fix **all** match test fixtures that expect candidates in list — default to ≥1 approved photo in mock data.
5. Update contract docs **before** or **with** code — `me-matches.v1-contract.spec.ts` reads guard table from markdown path.
6. Do **not** touch UI unless types optionally add `filteredNoPhotoCandidates?: number` (nice-to-have, not DoD).
7. Run full `npm test` in `dating-api` — expect broad spec touch from fixture updates.
