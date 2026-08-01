# Handoff: Agent 0 — Architect — Sprint 34 Story 2 Backend

**Agent:** 0 architect  
**Story:** Richer content moderation errors — backend  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** API contract lock. **No product code.** Agent 1 implements. **Skip Agent 4.**

---

## Summary

Enrich existing profile/message moderation 400 `details` with `source`, flagged span, `reason`, `suggestion`, and optional `exampleAlternative`. Keep Sprint 30 pipeline (`ModerationResult` + `evaluateContentPolicy`). Correct outdated AGENT_COMMANDS that reinvented moderation types.

Full lock: [STORY_02_moderation_errors_backend.md](../../STORY_02_moderation_errors_backend.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `dating-policy.ts` (+ spec) | `findDatingBlocklistHit` |
| `moderation-user-facing.ts` (+ spec) | **new** enrichment |
| `me-profile.service.ts` (+ specs) | richer profile 400 |
| `me-conversation-messages.service.ts` (+ specs) | richer message 400 |

---

## Decisions (do not reverse)

1. Do **not** reshape `ModerationResult` to `{ clean, … }`.  
2. Enrich at policy/HTTP boundary via `buildModerationUserFacingDetails`.  
3. Blocklist → matched substring; OpenAI / dating_score → full trimmed text.  
4. Keep error codes; keep `muted` on messages; no public scores.  
5. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_02_moderation_errors_backend.md`  
2. Implement hit finder + user-facing helper + wire both services + tests  
3. No frontend this phase  

**Next command:**

```
--agent 1 sprint 34 story 2 backend
```
