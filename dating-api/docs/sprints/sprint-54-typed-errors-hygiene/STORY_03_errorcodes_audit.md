# Story 03 — ErrorCodes audit

**Sprint 54 · Done · P2 · ~0.5d**

**Status:** Done  
**Tip:** `feature/sprint-54-story-3` @ `c7053d0`

Use `ADMIN_FORBIDDEN` in AdminGuard (etc.) or delete unused codes. Document dual AUTH_ERROR_CODES vs ErrorCodes.

## Definition of done

- [x] `ADMIN_FORBIDDEN` logged from AdminGuard; HTTP `{ error: 'admin_forbidden' }` unchanged
- [x] `ME_CONVERSATIONS_MESSAGE_RATE_LIMITED` logged on message 429
- [x] Deleted unused: `ME_PROFILE_UNAUTHORIZED`, `ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED`, `CONTENT_MODERATION_CHECK`
- [x] `PROCESS_*` retained
- [x] `docs/ops/ERROR_CODE_REGISTRIES.md` + file-header pointers
- [x] Specs + tsc green; Agents 2 approved; optional agents N/A
