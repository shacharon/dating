# Handoff: Agent 1 — Senior dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_block.md](../../STORY_05_block.md)  
**Sprint:** sprint-01-match-actions  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Enabled **BLOCK** on `POST /api/v1/me/matches/:id/actions` — removed LIKE/PASS-only gate.
- Added **`assertViewerHasNotBlockedTarget`** in `MeMatchesService` — blocked matches return **404** on detail/actions/photos; **excluded from list**.
- UI: **`blockMatch()`** client; **Block** button with inline confirm; **redirect to list** on success.
- **No schema migration.**
- Updated integration tests for BLOCK happy path and DELETE-on-blocked → 404; added `useRouter` mock for UI regression.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-match-actions.service.ts` | Removed BLOCK gate in `createAction` |
| `dating-api/src/me-profile/me-match-actions.service.spec.ts` | BLOCK upsert tests (10 total) |
| `dating-api/src/me-profile/me-matches.service.ts` | List filter + `assertViewerHasNotBlockedTarget` wired in list/detail/photos/visibility |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | BLOCK 201 test; block-check mocks; DELETE blocked → 404 |
| `dating-ui/src/lib/me-profile-api.ts` | `blockMatch()`; extended `recordMatchAction` for BLOCK |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | Block button, confirm panel, `handleBlockConfirm`, redirect |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | `useRouter` + `blockMatch` mocks (Block UI tests → agent 2) |

---

## Decisions (do not reverse without discussion)

- **One-way block (MVP)** — viewer blocked target only; no reverse lookup.
- **404 for hidden blocked matches** — same as ineligible match.
- **List excludes BLOCK rows** — not `yourAction: 'BLOCK'` badge.
- **Inline confirm** — not `window.confirm`.
- **Block available when liked/passed** — overwrites via upsert without undo first.
- **DELETE on blocked match → 404** (visibility guard before Story 4’s 403).

---

## How to run

```bash
cd dating-api && npm run start:dev
cd dating-ui && npm run dev
```

No migration needed.

---

## Manual smoke (dev)

1. Open match detail → **Block** → confirm **Block permanently**.
2. Land on `/dating/me-matches` — blocked person absent from list.
3. Direct URL to blocked detail → “Match not found.”
4. Network: `POST .../actions` `{ action: "BLOCK" }` → 201.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npx jest me-match-actions.service.spec.ts` — **10 passed**
- [x] `npx jest me-profile-http.integration.spec.ts -t "matches/:id/actions"` — **22 passed**
- [x] `npx vitest run src/app/dating/me-matches/[id]/page.spec.tsx` — **9 passed** (Block UI tests → agent 2)
- [ ] List filter integration tests — agent 2
- [ ] Detail 404 after block tests — agent 2
- [ ] Block confirm/redirect UI tests — agent 2
- [ ] `me-matches.service.spec.ts` block filter unit tests — agent 2

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 story 5
```

**Notes for next agent:**

1. Add list/detail/photo integration tests per architect handoff §6.
2. Add UI tests: Block button, confirm copy, cancel, confirm → `blockMatch` + `router.push`.
3. Add `me-matches.service.spec.ts` unit tests for list skip + getById 404.
4. Keep unit test `rejects undo of BLOCK` in service spec (403 path when visibility bypassed).
5. Manual smoke checklist in story file — dev only, not automated.
