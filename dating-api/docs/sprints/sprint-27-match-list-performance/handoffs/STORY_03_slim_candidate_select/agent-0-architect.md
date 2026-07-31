# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_slim_candidate_select.md](../../STORY_03_slim_candidate_select.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Greenfield split of shared `candidateSelect`. Skip Agent 4 (unit/integration specs; no HTTP DTO change).

---

## Summary

- Split **`candidateSelectList`** (slim) vs **`candidateSelectDetail`** (current full shape).
- List rebuild uses slim only; `getById` / `assertMatchCandidateVisible` use detail.
- **Drop from list:** `aboutMe` / `aboutPartner` / `aboutRelationship`, plus proven-unused `city`, `country`, `status`, `user`.
- **Keep on list:** identity, gender/DOB/locationLabel, HG structured facts, preference, signals/interests, approved photos, `_count.evaluations`, dates needed by DTO.
- **Hard-block list UX:** batch-load `about*` **only** for the small existing hard-fail subset that needs `hardBlocked` copy — not for the whole pool.
- Document accepted list vs detail free-text scoring difference (keyword friction / HG NL extractors see empty text on list).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.ts` | Split selects; wire list vs detail; hard-block about\* batch fetch |
| Specs asserting `findMany`/`findUnique` `select` shape | Update for slim list / full detail |
| Prisma / API DTOs | **No change** |

---

## Decisions (do not reverse without discussion)

### 1. Two selects (locked)

Today one `candidateSelect` is shared by list (`findMany` ~L476), `assertMatchCandidateVisible`, and `getById`. **Do not slim in place.**

| Select | Used by |
|--------|---------|
| `candidateSelectList` | `buildFullRankedList` `findMany` only |
| `candidateSelectDetail` | `getById`, `assertMatchCandidateVisible` (keep **current** field set including about\*, city/country, status, user) |

Rename for clarity; detail may remain the current object renamed.

### 2. `candidateSelectList` shape (locked)

**Include:**

```
id, userId, name, nickname,
birthDate, gender, desiredPartnerGenders, locationLabel,
analyzedAt, updatedAt,
childrenStatus, wantsChildren, smokingFrequency, alcoholUse, education, religion,
preference: true,   // or equivalent fields HG/product need
signals: { signalKey, signalValue, evalVersion },
interests: { tag, rank, evalVersion } orderBy rank asc,
photos: where APPROVED { id, isPrimary, storageKey },
_count: { evaluations: true }
```

**Exclude (must not appear on list select):**

| Field | Why |
|-------|-----|
| `aboutMe`, `aboutPartner`, `aboutRelationship` | Story AC — stop hydrating free-text for every candidate |
| `city`, `country` | List DTO uses `locationLabel` only |
| `status` | Already constrained in SQL `where` |
| `user` / `deletedAt` | Already constrained in SQL `where` |

**Do not add** `interestsTop` / `sig*` (already excluded; write-only cache).

### 3. Free-text semantics on list (locked — accepted drift)

Inventory shows list scoring/eligibility today **does** use about\*:

- Engine: `applyKeywordTriggers` + `resolveDerivedContext` from `texts.aboutMe` / `aboutRelationship`
- HG ranking-aware mapping: NL dealbreaker / self-hint / lifestyle / interest extractors from about\*
- Hard-block DTO: candidate about\* for reason copy

**This story still drops about\* from the bulk list select.** On the list path, pass **empty/null** about\* into mappers (same as a profile with blank text).

**Accepted consequence:** list membership/scores may differ from detail for profiles whose **only** dealbreaker/keyword signal lives in free text (structured HG columns + evaluation JSON still apply). Detail path unchanged (full about\*).

**Out of scope this story:** rewriting keyword/HG paths to ignore free text globally, or feature-flagging the drift.

### 4. Hard-block about\* on list (locked)

When list loop hits HG hard-fail **and** existing (LIKE / ACTIVE mutual) and needs `buildHardBlockedDto`:

1. Collect those candidate profile ids (usually few).
2. **One** `findMany` (or equivalent) with `where: { id: { in: ids } }`, `select: { id, aboutMe, aboutPartner, aboutRelationship }` only.
3. Merge text into hard-block DTO build.

Do **not** re-fetch about\* for the full candidate pool. Non-existing hard-fails still `continue` (omit) with no text fetch.

Viewer about\* for list hard-block reasons: viewer is already loaded via `findUnique` include — **keep viewer about\*** on the viewer query (not part of candidateSelect).

### 5. Detail path (locked)

- `candidateSelectDetail` = today’s full select (including about\*, city, country, status, user).
- Narrative / `evaluationSummary` / detail hard-block continue to work unchanged.
- List API DTO fields unchanged (no new/removed response keys).

### 6. `ENGINE_READ_NORMALIZED` (locked)

Comment claims flag gates signals/interests merge; **code always selects and may merge on version match** (no env read). **Keep selecting signals/interests on list.** Do not implement the flag gate in this story.

### 7. Preference / photos (locked)

- `preference: true` OK on list (small row). Optional slim of preference columns is **nice-to-have**, not required.
- Photos: keep APPROVED-only `{ id, isPrimary, storageKey }` (already minimal).

### 8. Tests (Agent 1)

- Assert list `findMany` select **omits** about\*, city, country, status, user.
- Assert detail `findUnique`/`findFirst` select **includes** about\*.
- Existing score / gender / hard-block tests: update fixtures; add/adjust case that hard-block list path batch-loads about\* when needed.
- No list DTO contract assertions should require about\* on list items (they don’t today).

### 9. Agent 4

- **Skip.**

---

## Out of scope

- Story 04 pool cap / Story 05 metrics  
- Removing reciprocal dual-run gender check  
- Implementing real `ENGINE_READ_NORMALIZED` env gate  
- Changing Redis cache DTO shape  
- Dropping HG structured fact columns from list  

---

## Agent 1 instructions

1. Rename/split selects per §1–2; wire list rebuild → list, detail/assert → detail.
2. Ensure mappers tolerate missing about\* on list rows (empty string / null).
3. Implement hard-block about\* batch fetch per §4.
4. Update specs; `npm run build`.
5. Commit + write `agent-1-dev.md`.

Suggested commit message:

```
perf(matches): slim candidate select for match-list rebuild

Stop hydrating about* free-text (and unused fields) on the list
rebuild path; keep full select for detail/hard-block.

Sprint 27 Story 3
```

---

## Agent 2 instructions

- [ ] List select omits about\* + city/country/status/user
- [ ] Detail select still has about\*
- [ ] Hard-block existing path still gets text via targeted fetch (not full-pool)
- [ ] List DTO contract unchanged; signals/interests still on list
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Call out accepted free-text scoring drift in PM notes.
- Write `agent-3-pm.md`.

---

## Open risks

1. Users with free-text-only dealbreakers may appear on list until structured prefs catch up — accepted this sprint.  
2. Hard-block batch query must not N+1 (one `in` query).  
3. Fixtures that assumed about\* on list `findMany` mocks may need empty fields.
