# Handoff: Agent 1 — Senior dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_unmatch.md](../../STORY_05_unmatch.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Implemented **`DELETE /api/v1/me/conversations/:id`** — soft-unmatch (`status = UNMATCHED`, `unmatchedAt`, `unmatchedByUserId`); **204** empty body.
- Added **`MeConversationsService.unmatch()`** with 404 (missing/UNMATCHED/double-delete) and 403 (non-participant on ACTIVE).
- UI: **Unmatch** link + confirm panel on conversation detail → redirect **`/dating/conversations`**.
- Added **`unmatchMyConversation()`** in `conversations-api.ts`.
- **No migration**; list/detail queries unchanged (ACTIVE filter + existing GET 404).
- Fixed existing UI spec mock for `useRouter` (required after page change).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `unmatch()` |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `DELETE conversations/:id` |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_UNMATCH_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `unmatchMyConversation()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — unmatch confirm + redirect |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated — `useRouter` mock fix |

**Deferred to Agent 2:** unit/integration/UI tests per architect test plan.

---

## Decisions (do not reverse without discussion)

- Followed architect: 404 before 403; UNMATCHED treated as not found.
- No `MatchAction` row deletes.
- Confirm copy uses `conversationPrimaryLabel` for name.
- Block-style inline confirm (Cancel / Unmatch) below messaging section.

---

## How to run

```powershell
cd c:\dev\piza\dating\dating-api
npm run build
npm run start:dev

cd c:\dev\piza\dating\dating-ui
npm run dev
```

No migration required.

---

## Manual smoke

1. User A + B mutual match → A opens `/dating/conversations/:id`
2. Click **Unmatch** → confirm with B's name
3. Confirm → redirect to `/dating/conversations` (B gone from list)
4. Direct URL to old conversation → 404
5. User B logs in → A not in list

**Not run in this session** — verify in browser when API/UI are up.

---

## Tests / verification

- [x] Command run: `npm run build` (dating-api)
- [x] Result: pass
- [x] Command run: `npm run build` (dating-ui)
- [x] Result: pass
- [x] Command run: `npx jest src/me-profile/me-conversations.service.spec.ts`
- [x] Result: pass (11/11 — pre-Story 5 tests; unmatch cases deferred to agent 2)
- [x] Command run: `npx vitest run "src/app/dating/conversations/[id]/page.spec.tsx"`
- [x] Result: pass (4/4 after router mock fix)

**Deferred to Agent 2:**

- Unit: `unmatch()` happy path, 404, 403, UNMATCHED
- Integration: `Sprint 2 Story 5: DELETE /api/v1/me/conversations/:id`
- UI: unmatch confirm, redirect, cancel, error

---

## Open questions / blockers

- None

---

## Next agent

```text
--agent 2 sprint 2 story 5
```

**Notes for next agent:**

1. Add `unmatch` unit tests to `me-conversations.service.spec.ts`.
2. Add integration block for DELETE with 204/403/404/idempotent cases.
3. Add UI tests for unmatch flow per architect test plan.
4. After CR + PM close, Sprint 2 is **5/5 complete**.
