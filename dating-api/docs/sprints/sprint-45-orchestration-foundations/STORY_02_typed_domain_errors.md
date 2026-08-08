# Story 02 — Typed domain errors (match / me path)

**Sprint 45 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** Story 01 preferred (tests catch mapping mistakes)  
**Repo:** `dating-api` only  
**Risk:** Medium (HTTP status / client payload must stay compatible)

---

## Objective

Introduce typed domain errors for the me-matches / readiness path (pattern: `MessageRateLimitExceededError`), map them in `observability-exception.filter.ts`, and stop throwing Nest `BadRequestException` / `NotFoundException` inline inside the match orchestration service where Architect scopes.

## Why

~26 Nest exception throws in `me-matches.service.ts` alone. Services should speak domain; HTTP mapping belongs at the edge. Stable `ErrorCodes` already exist — bind them to typed errors.

## Scope / tasks

1. Add error classes (names Architect-locked), e.g. `MatchListNotReadyError`, `MatchCandidateNotFoundError`, `MatchPhotoRequiredError` (adjust to real not_ready reasons).
2. Wire filter mapping → HTTP status + payload shape compatible with current clients.
3. Migrate `MeMatchesService` (and thin call sites Architect names) to throw domain errors.
4. Keep `ErrorCodes` string values stable (CloudWatch depends on them).
5. Update specs that assert Nest exception types.

## Out of scope

- Full-repo exception migration outside match/me orchestration
- Changing public JSON field names clients depend on without explicit version note
- UI work

## Acceptance criteria

- [ ] Domain errors exist; filter maps them
- [ ] me-matches path no longer throws Nest HTTP exceptions for the migrated cases
- [ ] Clients still see equivalent status + error code semantics
- [ ] Specs green

## Suggested commit

```
refactor(me-matches): typed domain errors + filter mapping

Sprint 45 Story 2
```
