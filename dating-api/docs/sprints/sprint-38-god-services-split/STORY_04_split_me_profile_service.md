# Story 04 — Split MeProfileService

**Sprint 38 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Story 02 Done (may parallel Story 03)  
**Repo:** `dating-api` only  
**Risk:** Medium  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_04_split_me_profile_service/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_04_split_me_profile_service/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_04_split_me_profile_service/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_04_split_me_profile_service/agent-3-pm.md)

---

## Objective

Decompose `src/me-profile/me-profile.service.ts` (~1150 LOC) into focused services under `profile/`, with `MeProfileService` as a thin facade. **No API contract changes.**

## Why

One service owns CRUD, onboarding coherence, content moderation, photo upload/delete/primary, analysis submit/status, and preference dual-write.

## Locked split (Architect)

| Service | Responsibility |
|---------|----------------|
| `ProfileCrudService` | create / patch / get / nickname / `requireProfileForUser` |
| `ProfilePhotoService` | upload / delete / setPrimary / getFile / list |
| `ProfileModerationService` | edit blocked check + field moderation |
| `ProfileAnalysisSubmitService` | submit + analysis status + latest evaluation read (+ queues) |
| `ProfilePreferenceService` | preference upsert / dual-write |
| Pure helpers / photo constants | `toResponse`, onboarding asserts, writable mappers, photo limits |
| `MeProfileService` | Facade matching existing controller injections |

**Note:** Existing `MeProfileAnalysisService` (LLM/worker runner) is **out of scope** — do not merge with AnalysisSubmit.

## Acceptance criteria

- [x] Focused services + facade; facade ≤ ~250 LOC (Architect caps) — facade 95 LOC, all caps met
- [x] Controller wiring unchanged from outside (same Nest exports)
- [x] `me-profile.service.spec.ts` (56/56) + HTTP integration green — 10 integration failures confirmed pre-existing against baseline
- [x] Photo + submit paths still enqueue workers as today
- [x] No DTO / status code changes

## Suggested commit

```
refactor(me-profile): split profile god service into collaborators

Sprint 38 Story 4
```
