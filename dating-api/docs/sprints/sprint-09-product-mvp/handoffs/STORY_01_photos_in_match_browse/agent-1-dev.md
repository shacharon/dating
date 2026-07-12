# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_photos_in_match_browse.md](../../STORY_01_photos_in_match_browse.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Shipped shared **`MatchPhoto`** component with `list` / `hero` / `celebration` / `header` variants, placeholder initials, and `onError` fallback.
- **Match list** rows now show primary photo thumbnail; **match detail** shows full-width hero above header/score.
- **`MatchCelebrationModal`** refactored to use `MatchPhoto variant="celebration"`.
- Added `primaryPhotoUrl` to UI **`MeMatchItemDto`** (API already returned the field).
- **Conversations unchanged** — list + thread header already had photos; conversation test suite passes (regression check).
- **No backend changes.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/match-photo.ts` | created — `matchPhotoSrc` re-export + `matchPhotoPlaceholderInitial` |
| `dating-ui/src/components/match-photo.tsx` | created — shared photo UI |
| `dating-ui/src/components/match-celebration-modal.tsx` | uses `MatchPhoto` |
| `dating-ui/src/lib/me-profile-api.ts` | `primaryPhotoUrl` on `MeMatchItemDto` |
| `dating-ui/src/app/dating/me-matches/page.tsx` | list thumbnails |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | detail hero |
| `dating-ui/src/lib/match-photo.spec.ts` | created — 3 tests |
| `dating-ui/src/components/match-photo.spec.tsx` | created — 3 tests |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | +2 photo tests |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | +2 photo tests |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

- Reused `conversationPhotoSrc` via `matchPhotoSrc` alias (architect locked).
- Hero uses `aspect-[4/3]` full-width inside card (`overflow-hidden` on article).
- `data-testid`: `match-list-photo` (list), `match-detail-photo` (detail), `match-celebration-photo` (modal).
- Did not refactor conversation pages to `MatchPhoto` (optional per architect — out of scope).

---

## Runtime topology (photo auth)

| Item | Value |
|------|--------|
| Photo `src` | Same-origin `/api/v1/me/matches/.../file` via `getApiBase()` + Next rewrite |
| Cookie | Session cookie on UI origin (default dev: no `NEXT_PUBLIC_API_URL`) |
| Browser smoke | **Deferred to operator** (two users with photos) |

---

## Tests / verification

- [x] `cd dating-ui && npm test` → **217/217 pass** (+8 new tests)
- [x] Conversation specs unchanged and green (13 + 37 tests)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke (photo `file` → 200): **deferred — operator**

### How to manual smoke

1. Start API + UI; log in as users A and B with approved primary photos.
2. A opens `/dating/me-matches` → B's thumbnail visible; Network: `GET .../photos/.../file` → **200**.
3. A opens B's match detail → hero photo visible above score.
4. After mutual match → `/dating/conversations` still shows B's avatar (regression).
5. Candidate without photo → placeholder initial on list + detail.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 9 story 1
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — confirm no API drift, PII-safe URLs only.
- Verify placeholder + error fallback behavior.
- Optional: refactor `conversations/page.tsx` to `MatchPhoto variant="list"` (not required for DoD).
- Manual two-browser smoke still pending operator.
