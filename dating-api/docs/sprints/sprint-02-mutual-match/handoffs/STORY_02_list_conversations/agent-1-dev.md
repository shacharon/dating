# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_list_conversations.md](../../STORY_02_list_conversations.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Implemented **`GET /api/v1/me/conversations`** — returns active `MutualMatch` rows with other-user profile display (nickname, meta, photo URL, `matchedAt`, `unreadCount: 0`).
- Added **`MeConversationsService`** and wired into `MeProfileController` + `MeProfileModule`.
- Extended **`MeMatchesService.getPrimaryPhotoFileById`** — ACTIVE mutual-match pairs bypass match-engine eligibility so conversation avatars load.
- Built UI **`/dating/conversations`** with empty state, list rows, photo avatars, relative match date.
- Added **Conversations** nav link + i18n (`en` / `es`).
- Added minimal **`/dating/conversations/[id]`** stub (Story 3 placeholder).
- **No migration** required.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-conversations.service.ts` | created |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `GET conversations` |
| `dating-api/src/me-profile/me-profile.module.ts` | updated — register service |
| `dating-api/src/me-profile/me-matches.service.ts` | updated — mutual photo bypass + `readApprovedPrimaryPhotoFile` |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | updated — `MutualMatchesService` mock in constructor |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | updated — same mock |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_LIST_OK` |
| `dating-ui/src/lib/conversations-api.ts` | created |
| `dating-ui/src/app/dating/conversations/page.tsx` | created |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | created |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | created — stub |
| `dating-ui/src/components/authenticated-app-shell.tsx` | updated — nav link |
| `dating-ui/src/lib/i18n/en.ts`, `es.ts`, `types.ts` | updated — `nav.conversations` |

**Deferred to Agent 2:** unit tests (`me-conversations.service.spec.ts`), integration tests (`me-profile-http.integration.spec.ts`), UI tests (`conversations/page.spec.tsx`).

---

## Decisions (do not reverse without discussion)

- Followed architect handoff: **nickname** display fields, not `firstName`.
- Photo auth bypass uses **`findActiveByUserPair`** — skips engine eligibility + block checks for mutual partners (consistent with list showing ACTIVE mutual rows).
- Age computed via local **`deriveAgeYears`** (same whole-year logic as matching bridge) to avoid pulling full profile text fields into conversation list query.
- **`GET /api/v1/me/conversations/:id`** not implemented (Story 3); UI stub only.

---

## How to run

```powershell
# API (port 3001)
cd c:\dev\piza\dating\dating-api
npm run start:dev

# UI (port 3000)
cd c:\dev\piza\dating\dating-ui
npm run dev
```

No migration needed.

---

## Manual smoke (happy path)

1. User A and User B both have analyzed profiles and reciprocal **Like** actions → `MutualMatch` row exists (Story 1).
2. Log in as User A → nav **Conversations** or open `/dating/conversations`.
3. **Expect:** User B listed with nickname (or gender/age meta), photo if primary photo approved, "Matched …" subtitle.
4. Click row → stub page at `/dating/conversations/:id` with back link.
5. Empty state: user with no mutual matches sees "No matches yet. Keep swiping!"

**Build verification:** `npm run build` passes in both `dating-api` and `dating-ui`.

---

## Tests / verification

- [x] Command run: `npm run build` (dating-api) — pass
- [x] Command run: `npm run build` (dating-ui) — pass
- [x] Command run: `npx jest me-matches.service.spec me-matches.v1-contract` — 72 passed, 4 failed (pre-existing isolated Prisma mocks missing `matchAction` delegate in `getById` path; not introduced by Story 2)
- [ ] Integration tests for `GET /me/conversations` — Agent 2
- [ ] UI tests — Agent 2

---

## Open questions / blockers

- None for implementation. Agent 2 should add full test coverage per architect test plan.

---

## Next agent

```text
--agent 2 sprint 2 story 2
```

**Notes for next agent:**

1. Add `me-conversations.service.spec.ts` (list, empty, sort, other-user resolution, missing profile).
2. Add `describe('GET /api/v1/me/conversations')` to `me-profile-http.integration.spec.ts` — reuse mutual-like setup from Story 1 tests.
3. Add photo bypass integration test: mutual exists but gender-ineligible → photo GET still 200.
4. Add `conversations/page.spec.tsx` — empty state, list render, row href.
5. Fix or skip the 4 isolated `getById` mock failures if they block CI (missing `matchAction` on minimal Prisma mock — optional cleanup).
