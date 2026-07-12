# Handoff: Agent 2 — Code review — Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_send_message.md](../../STORY_01_send_message.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **Verdict: approved** — implementation matches architect handoff; one minor fix applied.
- Added **`me-conversation-messages.service.spec.ts`** (7 unit tests).
- Added **`assertActiveConversationParticipant()`** tests in `me-conversations.service.spec.ts` (2 tests; 17 total in file).
- Added integration block **`Sprint 3 Story 1: POST /api/v1/me/conversations/:id/messages`** (9 tests).
- Added **3 UI tests** for send flow in `conversations/[id]/page.spec.tsx` (12 total in file).
- **Fix:** `@UsePipes(MeProfileValidationPipe)` on `POST conversations/:id/messages` so `MaxLength(2000)` / `IsNotEmpty` run (aligned with match-actions pattern).

---

## Review findings

| Severity | Issue | Resolution |
|----------|-------|------------|
| Minor | Send-message endpoint lacked validation pipe | Added `@UsePipes(MeProfileValidationPipe)` on controller |
| — | No critical/major logic or security issues | — |

### Security ✓
- `AuthGuard` on POST; 401 tested.
- 403 non-participant; 404 missing/UNMATCHED (same bodies as Sprint 2).
- Text trimmed before persist; empty/whitespace rejected.

### Logic ✓
- Access gate via `assertActiveConversationParticipant` before `message.create`.
- **201** + `MessageDto` shape; `status: SENT` only on create path.
- UI session-only list (no GET until Story 2) — intentional.

### Quality ✓
- Error codes and trace on success.
- UI: Send disabled when empty; append after 201; inline send error.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | created — 7 tests |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | updated — 2 `assertActive` tests |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — 9 POST tests + `message.create` reset |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `@UsePipes` on send |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated — 3 send-flow tests |

---

## Tests / verification

- [x] `npx jest src/me-profile/me-conversation-messages.service.spec.ts` — **7/7 pass**
- [x] `npx jest src/me-profile/me-conversations.service.spec.ts` — **17/17 pass**
- [x] `npx jest src/me-profile/me-profile-http.integration.spec.ts -t "Sprint 3 Story 1"` — **9/9 pass**
- [x] `npx vitest run "src/app/dating/conversations/[id]/page.spec.tsx"` — **12/12 pass**

---

## Test coverage map

| Scenario | Test file |
|----------|-----------|
| ACTIVE participant → create + MessageDto | unit + integration |
| Trimmed text persisted | unit + integration |
| Empty / whitespace → 400 | unit + integration |
| >2000 chars → 400 | integration |
| Missing conversation → 404 | unit + integration |
| UNMATCHED → 404 | unit + integration |
| Non-participant → 403 | unit + integration |
| 401 no session | integration |
| `assertActive` ACTIVE / UNMATCHED | unit (conversations) |
| UI composer enabled | UI |
| UI Send disabled when empty | UI |
| UI type + Send → bubble | UI |
| UI send API error | UI |

---

## Open questions / blockers

- None blocking Agent 3 closure.
- Recipient still has no message visibility until Story 2 (by design).

---

## Next agent

```text
--agent 3 sprint 3 story 1
```

**Notes for next agent:**

1. Mark Story 1 Done; update sprint README (1/6).
2. Manual smoke per agent-1-dev handoff.
3. Next: `--agent 0 sprint 3 story 2` (message history GET).
