# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_typed_domain_errors.md](../../STORY_02_typed_domain_errors.md)  
**Sprint:** sprint-45-orchestration-foundations  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Refactor errors only — **wire-compatible** HTTP status + body. **Skip Agent 4** (no eligibility / ranking / preference change). Depends on Story 01 characterization (esp. L6 `invalid_cursor`).

---

## Summary

- Introduce typed **me-matches domain errors** (plain `Error` subclasses, pattern: `MessageRateLimitExceededError`).
- Map them in **`ObservabilityExceptionFilter`** → Nest `HttpException` with **identical** status + response body as today.
- Migrate **all** Nest HTTP throws inside `MeMatchesService` (~26 sites) to domain errors.
- **Do not** turn `list()` `not_ready` DTO returns into throws (product contract is 200 + `{ status: 'not_ready', reason }`).
- Keep existing `ErrorCodes` string values; **add** new codes for domain mapping (do not rename).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.errors.ts` | **New** — domain error classes |
| `dating-api/src/logging/error-codes.ts` | Add new `ME_MATCHES_*` codes (stable additions) |
| `dating-api/src/logging/observability-exception.filter.ts` | Map domain errors → `HttpException` before unhandled path |
| `dating-api/src/logging/observability-exception.filter.spec.ts` | **New** — mapping unit tests |
| `dating-api/src/me-profile/me-matches.service.ts` | Throw domain errors; remove Nest HTTP imports used only for throws |
| Specs (`me-matches.service.spec.ts`, materialized, HTTP) | Assert domain errors in unit; HTTP body/status unchanged |
| Prisma / UI | **N/A** |

---

## Decisions (do not reverse without discussion)

### 1. List `not_ready` stays a return, not a throw

`GET /me/matches` viewer gate returns **200**:

```json
{ "status": "not_ready", "reason": "no_profile" | "not_analyzed" | "no_photo", "nextCursor": null, "hasMore": false }
```

Do **not** introduce `MatchListNotReadyError` as a thrown type for this path. Story example name is superseded: readiness on **detail/photo/assertVisible** uses `MatchViewerNotReadyError` (404 strings below).

### 2. Domain error module + base type

File: `src/me-profile/me-matches.errors.ts`

```ts
/** Base for me-matches orchestration errors mapped by ObservabilityExceptionFilter. */
export abstract class MeMatchesDomainError extends Error {
  abstract readonly httpStatus: number;
  /** Body passed to `new HttpException(body, status)` — must match current Nest responses. */
  abstract readonly httpBody: string | Record<string, unknown>;
  /** Stable ErrorCodes.* value for optional filter logging. */
  abstract readonly errorCode: string;

  constructor(message?: string) {
    super(message ?? 'MeMatchesDomainError');
    this.name = new.target.name;
  }
}
```

### 3. Locked error classes ↔ HTTP mapping

| Class | When | HTTP | Body (exact) |
|-------|------|------|----------------|
| `MatchListInvalidCursorError` | `list()` bad cursor | **400** | `{ error: 'invalid_cursor', message: 'Invalid match list cursor.' }` |
| `MatchViewerNotReadyError` | detail / `assertMatchCandidateVisible` — no profile or not ANALYZED | **404** | string `'Your profile is not ready for matching. Complete your profile and run analysis first.'` |
| `MatchViewerNotReadyError` | same paths — analyzed but no approved photo | **404** | string `'Your profile is not ready for matching. Add at least one photo first.'` |
| `MatchCandidateNotFoundError` | opaque not-found (missing, gender, BLOCK, no photos, hard-FAIL non-existing, photo browse gates that today say “Match not found.”) | **404** | string `'Match not found.'` |
| `MatchDetailEvaluationNotFoundError` | `getById` / `assertMatchCandidateVisible` missing eval | **404** | `{ error: 'evaluation_not_found', message: 'No analysis result available for this match.' }` |
| `MatchListViewerEvaluationMissingError` | list rebuild / gate when ANALYZED but no viewer eval row | **500** | `{ error: 'viewer_evaluation_not_found', message: 'Profile is marked analyzed but no UserProfileEvaluation row exists. Re-run analysis.' }` |
| `MatchListCandidateEvaluationMissingError` | list rebuild missing candidate eval | **500** | `{ error: 'candidate_evaluation_not_found', message: \`Profile ${profileId} is analyzed but has no UserProfileEvaluation row.\` }` |
| `MatchPhotoNotFoundError` | primary photo row missing | **404** | `{ error: 'photo_not_found', message: 'Photo was not found for this match.' }` |
| `MatchPhotoFileNotFoundError` | storage miss | **404** | `{ error: 'photo_file_not_found', message: 'Photo file is missing from storage.' }` |

**`MatchViewerNotReadyError` constructor:**

```ts
constructor(readonly reason: 'not_analyzed' | 'no_photo') {
  super(/* message = httpBody string for that reason */);
  // httpBody getter switches on reason (no_profile collapses into not_analyzed message — same as today)
}
```

Today `!viewer || status !== ANALYZED` shares one message — keep that collapse (`reason: 'not_analyzed'` for both).

### 4. Filter mapping (not service-local HttpException)

Unlike `MessageRateLimitExceededError` (mapped inside `ConversationMessageRateLimitService`), **me-matches domain errors map only in the filter** so orchestration stays Nest-free.

In `ObservabilityExceptionFilter.catch`:

```ts
if (exception instanceof MeMatchesDomainError) {
  // Optional: obs.trace at 4xx; obs.error at 5xx — use exception.errorCode
  // Do NOT treat as HTTP_UNHANDLED
  return super.catch(
    new HttpException(exception.httpBody, exception.httpStatus),
    host,
  );
}
```

Place this **before** the generic `else` unhandled branch. Do not double-log as `HTTP_UNHANDLED`.

Add focused unit tests: each class → status + body match table above.

### 5. ErrorCodes (add only; never rename)

Add to `error-codes.ts` (values equal keys):

| Code | Used by |
|------|---------|
| `ME_MATCHES_INVALID_CURSOR` | `MatchListInvalidCursorError` |
| `ME_MATCHES_VIEWER_NOT_READY` | `MatchViewerNotReadyError` |
| `ME_MATCHES_CANDIDATE_NOT_FOUND` | `MatchCandidateNotFoundError` |
| `ME_MATCHES_DETAIL_EVALUATION_NOT_FOUND` | `MatchDetailEvaluationNotFoundError` |
| `ME_MATCHES_LIST_VIEWER_EVALUATION_MISSING` | `MatchListViewerEvaluationMissingError` |
| `ME_MATCHES_LIST_CANDIDATE_EVALUATION_MISSING` | `MatchListCandidateEvaluationMissingError` |
| `ME_MATCHES_PHOTO_NOT_FOUND` | `MatchPhotoNotFoundError` |
| `ME_MATCHES_PHOTO_FILE_NOT_FOUND` | `MatchPhotoFileNotFoundError` |

Existing codes (`ME_MATCHES_LIST_OK`, `ME_MATCHES_LIST_NOT_READY`, …) **unchanged**. `ME_MATCHES_LIST_NOT_READY` remains for **trace** on DTO not_ready paths only.

### 6. Migration scope — `MeMatchesService` only

Replace every `throw new BadRequestException|NotFoundException|InternalServerErrorException` in `me-matches.service.ts` with the matching domain class.

Public methods / helpers in scope:

- `list` (cursor only)
- `resolveViewerListGate` / `getOrBuildRankedList` / `buildFullRankedList` (500 eval missing)
- `assertMatchCandidateVisible`
- `getById`
- `getPrimaryPhotoFileById`
- `assertCandidateHasApprovedPhotosInRow`
- `readApprovedPrimaryPhotoFile`
- `assertViewerHasNotBlockedTarget`

**Out of scope this story:** match-actions, conversations, feedback, profile CRUD, admin matches — even if they throw Nest HTTP exceptions.

After migration: `me-matches.service.ts` must not import Nest HTTP exception classes (unless still needed for a non-throw reason — prefer zero).

### 7. Spec updates (required)

| Layer | Expectation |
|-------|-------------|
| Unit (`me-matches.service.spec.ts`, materialized) | `rejects.toBeInstanceOf(MatchListInvalidCursorError)` etc.; Story 01 L6 may assert domain class + `httpBody` / `error: 'invalid_cursor'` |
| HTTP integration | **Unchanged** status + body (`400` + `invalid_cursor`, `404`, etc.) |
| Filter spec | Mapping table green |

Do not weaken Story 01 characterization envelope asserts.

### 8. Wire / client compatibility

- UI `fetchMyMatchById` only checks `res.status === 404` — keep 404.
- Object error keys `error` / `message` for cursor, evaluation_not_found, photo_* — **do not rename**.
- Nest string 404 bodies remain string messages (Nest wraps as `{ statusCode, message, error }` when using `HttpException(string, 404)` — same as `NotFoundException(string)` today). Prefer constructing via `HttpException(httpBody, status)` with `httpBody` as the **same argument** previously passed to Nest exception constructors.

### 9. Schema / migration / runtime / Agent 4

- Prisma: none  
- Runtime topology: N/A  
- Agent 4: **skip**

---

## Service signatures (unchanged)

```ts
list(userId: string, query?: MeMatchesListQuery): Promise<MeMatchesListResponseDto>
getById(userId: string, candidateProfileId: string): Promise<MeMatchDetailDto>
assertMatchCandidateVisible(...): Promise<{ candidateProfileId; targetUserId }>
getPrimaryPhotoFileById(...): Promise<{ contentType; content }>
```

Only thrown types change; return types unchanged.

---

## Tests / verification

- [ ] `npx jest --no-coverage src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches-materialized-list.spec.ts src/logging/observability-exception.filter.spec.ts`
- [ ] HTTP: matches list/detail invalid_cursor + a 404 detail case still green
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A

---

## E2E verification

- N/A (Agent 4 skipped). Do not modify eligibility harness.

---

## Out of scope

- Full-repo domain-error migration
- Changing public JSON field names
- Converting list `not_ready` to HTTP errors
- UI changes
- Sprint 38.3 service split

---

## Agent 1 instructions

1. Add `me-matches.errors.ts` + ErrorCodes additions per §3–§5.
2. Map in `ObservabilityExceptionFilter` + new filter unit spec.
3. Migrate all Nest throws in `me-matches.service.ts`.
4. Update unit specs to domain classes; keep HTTP integration wire asserts.
5. Confirm `me-matches.service.ts` has no Nest HTTP exception throws.
6. Run jest commands above; commit; write `agent-1-dev.md`.

Suggested commit:

```
refactor(me-matches): typed domain errors + filter mapping

Sprint 45 Story 2
```

---

## Agent 2 instructions

- [ ] No Nest HTTP throws left in `me-matches.service.ts`
- [ ] Filter maps every domain class; no `HTTP_UNHANDLED` for them
- [ ] HTTP bodies/status match locked table (esp. `invalid_cursor`, `Match not found.`, evaluation/photo object errors)
- [ ] List `not_ready` still 200 DTO
- [ ] ErrorCodes: only additions, no renames
- Write `agent-2-cr.md` → `--agent 3` (skip 4)

---

## Agent 3 instructions

- Accept if CR PASS; mark Story 02 Done; update sprint README.
- Next: `--agent 0 sprint 45 story 3`.

---

## Open questions / blockers

- None. If a Nest body shape differs when using `HttpException` vs `NotFoundException` for string messages, match Nest’s default JSON for string `HttpException`/`NotFoundException` (integration smoke will catch). Prefer asserting HTTP integration over inventing a custom wrapper.

---

## Next agent

```text
--agent 1 sprint 45 story 2
```

**Notes for next agent:**

- Wire-compatible refactor; Story 01 L6 must stay green (domain error at service, same HTTP via filter).
- Skip Agent 4 after CR.
