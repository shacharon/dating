# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_me_matches_dto_boundary.md](../../STORY_03_me_matches_dto_boundary.md)  
**Sprint:** sprint-45-orchestration-foundations  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Extract DTO + response mapper edge. **Default: no wire break.** Depends on Stories 01–02 (characterization + domain errors). **Skip Agent 4** (no eligibility/ranking change).

---

## Summary

- Move public me-matches response types out of `me-matches.service.ts` into `dto/`.
- Add a **response mapper** that owns list/detail/list-envelope assembly (priority, teaser, field shaping).
- Service keeps scoring, eligibility, HG, narrative, persistence — then calls mapper for HTTP-shaped objects.
- Document **public vs internal** fields; optional Sprint 47 rename map (docs only — no rename this story).
- Story 01 characterization + V1 contract + HTTP specs must stay green with **identical JSON**.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/me-profile/dto/me-matches-response.dto.ts` | **New** — `MeMatchItemDto`, `MeMatchDetailDto`, `MeMatchesListResponseDto` (+ brief JSDoc) |
| `src/me-profile/me-matches-response.mapper.ts` | **New** — pure builders for list item / detail / list envelopes |
| `src/me-profile/me-matches-response.mapper.spec.ts` | **New** — unit tests for builders (shape + omit rules) |
| `src/me-profile/dto/me-matches-list-query.dto.ts` | JSDoc: query edge notes (cursor/limit); no behavior change |
| `src/me-profile/me-matches.service.ts` | Import DTOs; replace inline object literals with mapper calls; re-export types for back-compat |
| `match-quality-audit.ts` (optional) | Prefer importing DTOs from `dto/` (or keep service re-export) |
| Prisma / UI | **N/A** |

**Leave in service (or existing modules) — not HTTP DTOs:**

- `MatchListRankSnapshot` (worker/persist internal)
- `matchListRankAfterCursorWhere`
- Domain errors (`me-matches.errors.ts`)
- `buildMeMatchesParticipantReadModel` usage (engine read model — stays internal)

---

## Decisions (do not reverse without discussion)

### 1. No wire break

- JSON keys, nullability, optional omit rules, and status codes stay as today.
- Do **not** rename `matchScore` → `score`, strip list `explainability`, etc. in this story.
- Sprint 01 characterization + V1 list/detail field policy must remain green.

### 2. Module layout (locked)

```text
me-profile/
  dto/
    me-matches-list-query.dto.ts     # request query (existing)
    me-matches-response.dto.ts       # NEW — response types only
  me-matches-response.mapper.ts      # NEW — assembly
  me-matches.service.ts              # orchestration; calls mapper
  me-matches.errors.ts               # Story 02
```

### 3. Public API fields (wire)

#### `MeMatchesListResponseDto` (list envelope)

| Field | When | Notes |
|-------|------|--------|
| `status` | always | `'ready' \| 'not_ready'` |
| `reason` | `not_ready` | `'no_profile' \| 'not_analyzed' \| 'no_photo'` |
| `viewerProfileId` | ready | |
| `viewerGender` | ready | |
| `viewerAcceptedPartnerGenders` | ready | |
| `viewerProfileAnalysisStale` | ready | |
| `totalCandidatesBeforeFilter` | ready (legacy rebuild) | may be absent on some materialized paths today — **do not invent** |
| `filteredNoPhotoCandidates` | ready (legacy rebuild) | same |
| `matches` | ready | `MeMatchItemDto[]` |
| `nextCursor` | list() always sets | `string \| null` |
| `hasMore` | list() always sets | boolean |
| `budgetExceeded` | rebuild paths only | not set by GET list normally |

#### `MeMatchItemDto` (list row)

| Field | Notes |
|-------|--------|
| `id`, `nickname`, `gender`, `ageYears`, `locationLabel`, `analyzedAt` | identity / display |
| `hasEvaluation`, `matchScore`, `priorityScore`, `priorityTier` | scoring / triage |
| `profileAnalysisStale?` | optional |
| `primaryPhotoUrl`, `approvedPhotoCount` | photos |
| `explainability`, `recommendation` | engine-derived **but public today** (V1) |
| `teaser` | Sprint 44 |
| `yourAction` | LIKE/PASS/BLOCK/null |
| `hardBlocked?` | existing hard-FAIL only |

**List must omit:** `evaluationSummary`, `matchExplanationTraits`, `matchNarrative`, `userId`, about\*, evaluation blob.

#### `MeMatchDetailDto` (detail)

Same identity/score/photo/explainability/recommendation/teaser/hardBlocked as list, plus:

| Field | Notes |
|-------|--------|
| `evaluationSummary` | from read-model display summary |
| `matchExplanationTraits?` | omit when empty / unscored |
| `matchNarrative?` | omit when unscored / guard |
| `profileAnalysisStale?` | |

**Detail must omit:** `userId`, about\*, evaluation blob, `yourAction` (not on detail today — do not add).

### 4. Internal-only (never serialize)

| Symbol / concept | Where it lives |
|------------------|----------------|
| `MeMatchesParticipantReadModel.enginePayload` | engine compare input |
| `MeMatchesParticipantReadModel.hg` / HG rows | eligibility |
| `evaluationJson` / raw eval blob | mapper/DB only |
| aboutMe / aboutPartner / aboutRelationship | narrative + hard-block evidence fetch only |
| Candidate / viewer `userId` | actions, blocks, mutuals |
| `compareWithStatus` guard objects | scoring branch |
| Dealbreaker / HG telemetry counters | logs only |
| `MatchListRankSnapshot` | rank persist/rebuild |
| Redis `MatchListCachePayload` internals | cache layer |

Mapper **may accept** internal inputs (e.g. `ProfileJsonPayload` for teaser builder) but **must not** put them on the returned DTO.

### 5. Mapper API (locked signatures)

File: `me-matches-response.mapper.ts`

```ts
/** Inputs are already eligibility-filtered / scored by the service. */
export type MeMatchCardScoreFields = {
  matchScore: number | null;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
};

export type MeMatchTeaserBuildInput = {
  datingChapter: string | null | undefined;
  viewerAgeYears: number | null;
  viewerPayload: ProfileJsonPayload;   // internal
  candidatePayload: ProfileJsonPayload; // internal
};

export function toMeMatchListItem(input: {
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: Date | string | null;
  hasEvaluation: boolean;
  profileAnalysisStale?: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  hardBlocked?: HardBlockedDto;
  score: MeMatchCardScoreFields;
  teaser: MeMatchTeaserBuildInput;
}): MeMatchItemDto;

export function toMeMatchDetail(input: {
  // same card identity/photo/score fields as list…
  evaluationSummary: string | null;
  matchExplanationTraits?: MatchExplanationTrait[];
  matchNarrative?: string;
  profileAnalysisStale?: boolean;
  hardBlocked?: HardBlockedDto;
  score: MeMatchCardScoreFields;
  teaser: MeMatchTeaserBuildInput;
}): MeMatchDetailDto;

export function toMeMatchesListNotReady(
  reason: 'no_profile' | 'not_analyzed' | 'no_photo',
): MeMatchesListResponseDto; // includes nextCursor: null, hasMore: false

export function toMeMatchesListReady(input: {
  viewerProfileId: string;
  viewerGender: string | null;
  viewerAcceptedPartnerGenders: string[] | null;
  viewerProfileAnalysisStale: boolean;
  matches: MeMatchItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCandidatesBeforeFilter?: number;
  filteredNoPhotoCandidates?: number;
}): MeMatchesListResponseDto;
```

Mapper responsibilities:

- `toPriorityFields(matchScore)` → `priorityScore` / `priorityTier`
- `buildDefaultMatchTeaser(...)` using score + teaser inputs
- nickname trim → null if empty
- `analyzedAt` → ISO string
- spread optional `hardBlocked` / traits / narrative only when defined (preserve omit semantics)

Service responsibilities (unchanged ownership):

- Viewer gate, cursor decode, materialized vs legacy
- Candidate load, gender/HG/BLOCK, `compareWithStatus`, hardBlocked DTO build
- Narrative resolution, photo URLs resolution args
- Call mapper once facts are known

### 6. Service re-exports

Keep existing import paths working:

```ts
// me-matches.service.ts
export type {
  MeMatchItemDto,
  MeMatchDetailDto,
  MeMatchesListResponseDto,
} from './dto/me-matches-response.dto';
```

Prefer new code importing from `dto/me-matches-response.dto`. Update `match-quality-audit.ts` import optionally (nice-to-have).

### 7. Query DTO alignment

In `me-matches-list-query.dto.ts`, add short module JSDoc:

- Query params are transport-only (`cursor`, `limit`).
- Invalid cursor remains domain `MatchListInvalidCursorError` (Story 02) thrown from service after decode — query parser only validates limit.
- No new query fields this story.

### 8. Future Sprint 47 rename map (document only — do not apply)

| Wire (today) | Possible UI view-model name (47) |
|--------------|----------------------------------|
| `matchScore` | `score` |
| `priorityTier` | `tier` |
| `explainability.positiveChips` | `chips` / product chip VM |
| `hardBlocked` | `hardBlock` |
| `evaluationSummary` | `summary` |
| `matchExplanationTraits` | `traits` |
| `matchNarrative` | `narrative` |

Server keeps wire names until a versioned contract change is explicitly approved.

### 9. Policy / contract specs

- Update `me-matches-read-model-policy.spec.ts` / V1 import checks only if imports move: service may still import **only** `buildMeMatchesParticipantReadModel` from engine mapper; response mapper may import teaser/priority/engine types.
- Do **not** allow service to re-import low-level `buildProfilePayloadFromNewModel`.

### 10. Schema / runtime / Agent 4

- Prisma: none  
- Runtime topology: N/A  
- Agent 4: **skip**

---

## HTTP contracts (unchanged)

```
GET /api/v1/me/matches          → MeMatchesListResponseDto
GET /api/v1/me/matches/:id      → MeMatchDetailDto | 404 domain-mapped
```

---

## Tests / verification

- [ ] Mapper unit: list omits detail-only fields; detail includes summary; not_ready envelope has null cursor
- [ ] `npx jest --no-coverage` me-matches.service + materialized + v1-contract + characterization + mapper spec
- [ ] HTTP list/detail smoke still green
- [ ] Result: not run (architect)
- [ ] Browser / migrate: N/A

---

## E2E verification

- N/A (Agent 4 skipped). Eligibility harness untouched.

---

## Out of scope

- UI view-models (Sprint 47)
- MeMatchesService god split (38.3) — mapper helps but does not complete the split
- PairMatchPolicy (46)
- Changing scores / HG / teaser copy
- Wire renames

---

## Agent 1 instructions

1. Create `dto/me-matches-response.dto.ts` by moving interfaces (+ imports for nested types).
2. Implement `me-matches-response.mapper.ts` per §5; add focused mapper.spec.
3. Replace inline list/detail/envelope object builds in `me-matches.service.ts` (legacy rebuild, materialized hydrate page, getById, not_ready returns) with mapper calls.
4. Re-export DTO types from service; JSDoc on query dto.
5. Keep Story 01 characterization + V1 + HTTP green — **byte-compatible JSON**.
6. Commit; write `agent-1-dev.md`.

Suggested commit:

```
refactor(me-matches): isolate API DTO mapping from engine fields

Sprint 45 Story 3
```

---

## Agent 2 instructions

- [ ] DTOs live under `dto/`; mapper owns assembly
- [ ] Service does not leave Nest/engine blobs on response objects
- [ ] Characterization + V1 omit rules still pass
- [ ] No wire renames
- Write `agent-2-cr.md` → `--agent 3` (skip 4)

---

## Agent 3 instructions

- Accept if CR PASS; mark Story 03 + Sprint 45 Done in README.
- Next track: `--agent 0 sprint 38 story 3` (per orchestration commands) when ready.

---

## Open questions / blockers

- None. If a call site builds a partial list item for cache that differs from mapper output, prefer one mapper path for all list items (including materialized page assembly).

---

## Next agent

```text
--agent 1 sprint 45 story 3
```

**Notes for next agent:**

- Extract-only; Story 01 matrix is the parity gate.
- Skip Agent 4 after CR.
