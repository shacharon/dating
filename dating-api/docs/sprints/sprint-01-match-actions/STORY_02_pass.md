# Story 2: Pass on a match

**Sprint:** 1  
**Status:** Done  
**Depends on:** [Story 1 — Like](./STORY_01_like.md) (`MatchAction` table + POST actions endpoint)

---

## Why

Users need to skip matches they are not interested in. Pass completes the basic browse loop (like or pass) and generates behavioral data for the match engine over time.

---

## What

**As a** logged-in user  
**I want to** pass on a match  
**So that** I can move on without expressing interest

### Acceptance criteria

- [x] **Pass button** on match detail (alongside Like)
- [x] **POST** same endpoint with `{ "action": "PASS" }` saves PASS
- [x] **Same user pair** — upsert on `@@unique([actorUserId, targetUserId])`; update `targetProfileIdSnapshot` on write if URL profile id differs (optional: always refresh snapshot)
- [x] **Switching actions** — if user previously LIKED, PASS overwrites same row (and vice versa) *(API; UI switch deferred to Story 4 undo)*
- [x] **UI feedback** — after pass: “You passed on this person” (neutral, not error tone)
- [x] **Mutual exclusivity** — only one action type active per actor→target user pair at a time
- [x] **Tests** — API test for PASS; UI test for pass flow

### Out of scope (this story)

- Hiding passed profiles from list (optional later; not required for MVP pass)
- Undo (Story 4)
- Block (Story 5)

---

## Definition of done

- [x] POST accepts `PASS` with same profile→user resolution as Story 1
- [x] Match detail UI: Pass control + feedback state
- [x] Tests cover PASS create and LIKE→PASS overwrite on same `(actorUserId, targetUserId)`
- [x] Manual smoke: pass a match, refresh, state persists *(documented; browser verification pending user)*

---

## Manual smoke

1. Open match detail → **Pass**  
2. Refresh — still passed  
3. Like same match — action becomes LIKE (overwrite on same user pair) *(API/integration test; UI requires Story 4 undo)*
