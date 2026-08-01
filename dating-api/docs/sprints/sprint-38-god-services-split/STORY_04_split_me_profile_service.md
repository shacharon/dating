# Story 04 — Split MeProfileService

**Sprint 38 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** None (can parallel Story 03 after Story 02)  
**Repo:** `dating-api` only  
**Risk:** Medium

---

## Objective

Decompose `src/me-profile/me-profile.service.ts` (~1200 LOC) into focused services with a thin orchestrator or controller-facing facade. **No API contract changes.**

## Why

One service owns CRUD, onboarding coherence, content moderation, photo upload/delete/primary, analysis submit/status, and preference dual-write.

## Target split (Architect may adjust names)

| Service | Responsibility |
|---------|----------------|
| `ProfileCrudService` | create / patch / get / nickname uniqueness |
| `ProfilePhotoService` | upload / delete / setPrimary / getFile / list |
| `ProfileModerationService` | edit blocked check + field moderation |
| `ProfileAnalysisSubmitService` | submit + analysis status (+ queue enqueue) |
| `ProfilePreferenceService` | preference upsert / dual-write helpers |
| `MeProfileService` | Facade matching existing controller injections |

## Scope / tasks

1. Architect locks ownership of helpers currently file-local (`toResponse`, onboarding asserts, etc.).
2. Extract without changing status machines (DRAFT → SUBMITTED → …) or photo moderation drivers.
3. Preserve content-moderation and match-list invalidate/enqueue side effects on submit/patch.
4. Update specs; keep HTTP integration specs green.

## Out of scope

- New profile fields / UI
- Changing moderation policy thresholds
- Repository pattern (Sprint 39)

## Acceptance criteria

- [ ] Focused services + facade; former god file slimmed under Architect LOC cap
- [ ] Controller wiring unchanged from outside (same Nest exports)
- [ ] `me-profile.service.spec.ts` + HTTP integration green
- [ ] Photo + submit paths still enqueue workers as today
- [ ] No DTO / status code changes

## Suggested commit

```
refactor(me-profile): split profile god service into collaborators

Sprint 38 Story 4
```
