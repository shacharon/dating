# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_user_profile_repository.md](../../STORY_01_user_profile_repository.md)  
**Sprint:** sprint-39-repo-and-scale  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Introduce repository **port** + Prisma impl; wire split profile collaborators. **Zero** HTTP/DTO/schema change. **No** feature flag. Skip Agent 4.

---

## Summary

Add `IUserProfileRepository` for the product `UserProfile` (+ preference dual-write inside the same aggregate boundary). Wire **`ProfileCrudService`** fully and **`ProfileAnalysisSubmitService`** for profile row reads/updates. Photo tables stay on Prisma. Do **not** wait on unfinished Sprint 38 Story 03 (MeMatches still god-class); do **not** migrate `MeMatchesService` in this story.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Sprint 38 Story 04 | Done — `ProfileCrud` / `Photo` / `AnalysisSubmit` / Preference / Moderation exist |
| Sprint 38 Story 03 | **Not done** — MeMatches still direct Prisma; **out of scope** for Story 1 |
| Preference dual-write | Still same txn as profile create/patch (`ProfilePreferenceService.upsertPreference`) |
| Facade | `MeProfileService` stays thin; controller unchanged |
| Existing pattern | Follow Symbol token style (`PHOTO_STORAGE`, `MATCH_LIST_RANK_*`, `HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY`) |

---

## Artifacts (locked layout)

```text
dating-api/src/me-profile/repositories/
  user-profile.repository.ts              # IUserProfileRepository + USER_PROFILE_REPOSITORY token
  user-profile.repository.types.ts        # UserProfileWithPreference (+ small input types if needed)
  prisma-user-profile.repository.ts       # PrismaUserProfileRepository
  # optional: in-memory double only if Agent 1 prefers over jest mock — not required
```

Register in `me-profile.module.ts`:

```ts
{
  provide: USER_PROFILE_REPOSITORY,
  useClass: PrismaUserProfileRepository,
},
```

Export token **only if** another module needs it this story — default: **providers only** (MeProfileModule-internal).

---

## Decisions (do not reverse without discussion)

### 1. Interface (locked)

```ts
export const USER_PROFILE_REPOSITORY = Symbol('USER_PROFILE_REPOSITORY');

export interface IUserProfileRepository {
  findByUserId(userId: string): Promise<UserProfile | null>;

  findByUserIdWithPreference(
    userId: string,
  ): Promise<UserProfileWithPreference | null>;

  /** True when another profile already owns this nickname. */
  isNicknameTaken(
    nickname: string,
    excludeProfileId: string | null,
  ): Promise<boolean>;

  /**
   * Create DRAFT profile + preference upsert in one interactive transaction.
   * Throws Prisma P2002 through to caller (Crud maps nickname conflicts).
   */
  createWithPreference(args: {
    userId: string;
    profileData: Prisma.UserProfileCreateInput; // or Unchecked + connect pattern matching today
    preferenceBody: CreateMeProfileDto | PatchMeProfileDto;
  }): Promise<UserProfile>;

  /**
   * Optional profile field update + always-run preference upsert (same as today’s patch txn).
   * When `profileData` is null/empty, only preference upsert runs (still inside txn if prefs change —
   * preserve current Crud short-circuit: if neither profile nor pref changes, Crud must NOT call this).
   */
  updateByUserIdWithPreference(args: {
    userId: string;
    profileId: string;
    profileData: Prisma.UserProfileUpdateInput | null;
    preferenceBody: CreateMeProfileDto | PatchMeProfileDto;
  }): Promise<void>;

  /** Status / submit path updates (no preference). */
  updateByUserId(
    userId: string,
    data: Prisma.UserProfileUpdateInput,
  ): Promise<UserProfile>;

  /**
   * Narrow select used by getAnalysisStatusForUser — keep select in Prisma impl
   * matching today’s fields (status, submittedAt, analyzedAt, lastAnalysisError).
   */
  findAnalysisStatusFieldsByUserId(userId: string): Promise<{
    status: UserProfileStatus;
    submittedAt: Date | null;
    analyzedAt: Date | null;
    lastAnalysisError: string | null;
  } | null>;
}
```

**Types:** `UserProfileWithPreference = UserProfile & { preference: UserProfilePreference | null }`.

**Do not** put photo CRUD on this port (Story says photo-adjacent only if needed — **not needed**; Photo continues via `ProfileCrudService.requireProfileForUser` + Prisma photo model).

### 2. Who injects the port (locked)

| Collaborator | Change |
|--------------|--------|
| `ProfileCrudService` | **Required** — replace `this.prisma.userProfile*` / `$transaction` profile paths with repository. May keep `PrismaService` **out** of Crud ctor if unused after migrate. |
| `ProfileAnalysisSubmitService` | **Required** — `findByUserId` / `findByUserIdWithPreference` / `updateByUserId` / `findAnalysisStatusFieldsByUserId`. Keep Prisma only if still needed for nothing else (prefer remove). |
| `ProfilePhotoService` | **No** — unchanged (photos + `crud.requireProfileForUser`) |
| `ProfilePreferenceService` | **Unchanged API** — still `upsertPreference(tx, …)`; **PrismaUserProfileRepository** calls it inside create/update-with-preference txns (inject Preference into Prisma repo). |
| `ProfileModerationService` | **No** |
| `MeMatchesService` / match ranking | **Out of scope** |
| `MeProfileService` facade | **No** (still delegates) |

### 3. Transaction / Preference (locked)

- Interactive `$transaction` lives **inside** `PrismaUserProfileRepository` for `createWithPreference` / `updateByUserIdWithPreference`.
- Repository injects `ProfilePreferenceService` and calls `upsertPreference(tx, …)` — same semantics as today.
- Port intentionally does **not** expose raw `Prisma.TransactionClient` to Crud (keeps Crud Prisma-free for profile aggregate).

### 4. Nest + tests (locked)

1. Token `USER_PROFILE_REPOSITORY` + `useClass: PrismaUserProfileRepository`.
2. Update `me-profile.test-harness.ts`: construct `PrismaUserProfileRepository` with the same prisma mock **or** pass a jest mock implementing `IUserProfileRepository` into Crud/AnalysisSubmit. Prefer: real Prisma repo + mocked prisma (minimal behavior change) **or** mock port if easier for Crud-only unit cases — Agent 1 picks one approach but **must** prove at least one unit path uses a **double of the port** (jest mock of `IUserProfileRepository`) without asserting on raw `prisma.userProfile` for that case.
3. Required commands:

```bash
cd dating-api
npx jest src/me-profile/me-profile.service.spec.ts --runInBand
npm run typecheck
```

HTTP integration: same pre-existing baseline policy as Story 4 (do not block on known 10 failures if unchanged).

### 5. Migration style (locked)

1. Add port + Prisma impl; switch Crud + AnalysisSubmit; update harness/specs.
2. No parallel flag; no schema migration.
3. Do not expand to MatchAction / messages / sessions.
4. Do not reintroduce Sprint 38 Story 03 MeMatches WIP.

### 6. Out of scope

- Sprint 39 Stories 02–04  
- Sprint 40 engine stages  
- Full-app Prisma eradication  
- Changing preference schema / dual-write rules  

### 7. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Add `repositories/` files per §1–§3.
2. Wire module + Crud + AnalysisSubmit; Preference used from Prisma repo for txns.
3. Update test harness + migrate specs so port is real in DI and at least one double-based unit proof exists.
4. Run locked Jest + typecheck.
5. Write `agent-1-dev.md`. Do not commit.

Suggested commit:

```
refactor(profiles): introduce IUserProfileRepository port

Sprint 39 Story 1
```

---

## Agent 2 CR checklist

- [ ] Layout under `me-profile/repositories/` + Symbol token
- [ ] Interface matches locked methods (no photo port)
- [ ] Crud + AnalysisSubmit use port; Photo/MeMatches untouched
- [ ] Preference dual-write still in same txn via PreferenceService inside Prisma repo
- [ ] Unit proof with repository double; typecheck green
- [ ] No API/DTO/schema drift

---

## Next command

```text
--agent 1 sprint 39 story 1
```
