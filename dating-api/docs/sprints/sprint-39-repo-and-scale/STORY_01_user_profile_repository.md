# Story 01 — UserProfile repository port

**Sprint 39 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 2 days  
**Dependencies:** Sprint 38 Story 04 Done (Story 03 MeMatches split **not** required)  
**Repo:** `dating-api` only  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_01_user_profile_repository/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_01_user_profile_repository/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_01_user_profile_repository/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_01_user_profile_repository/agent-3-pm.md)

---

## Objective

Introduce an `IUserProfileRepository` port with a Prisma implementation; wire **`ProfileCrudService`** and **`ProfileAnalysisSubmitService`** for primary profile reads/writes (+ preference dual-write inside the repository txn).

## Why

Services still call `PrismaService` directly — hard to unit-test without DB. Sprint 38 Story 04 split makes the injection surface smaller; abstract the hottest aggregate.

## Locked (Architect)

| Item | Decision |
|------|----------|
| Token | `USER_PROFILE_REPOSITORY` |
| Layout | `src/me-profile/repositories/` |
| Wire | Crud + AnalysisSubmit |
| Skip | Photo model, MeMatches, full-app Prisma |
| Txn | Inside Prisma repo; calls `ProfilePreferenceService.upsertPreference` |

## Acceptance criteria

- [x] Interface + Prisma impl registered in Nest
- [x] Profile CRUD path uses the port
- [x] Unit test uses mock/double of the port without live DB for that path
- [x] Existing HTTP/integration tests not regressed vs Story 4 baseline
- [x] No API contract changes

## Suggested commit

```
refactor(profiles): introduce IUserProfileRepository port

Sprint 39 Story 1
```
