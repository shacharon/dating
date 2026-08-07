# PARKED — Go-live seed profiles

**Status:** ⏸️ Parked — resume when ready to implement  
**Parked:** 2026-08-07  
**Do not start until:** You explicitly unpark this and say "implement seed profiles"

---

## Resume here

When you come back, read in order:

1. **[GO_LIVE_SEED_PROFILES.md](./GO_LIVE_SEED_PROFILES.md)** — agreed plan (browse-only, 5 profiles, no auto-chat)
2. **[GO_LIVE_STATUS.md](./GO_LIVE_STATUS.md)** — what's ready vs open blockers
3. **[LAUNCH_COHORT_RUNBOOK.md](../sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md)** — day-of checklist

---

## What we decided

| Topic | Decision |
|-------|----------|
| Count | Start with **5** seed profiles (test); scale later |
| UX | Show in match browse like normal profiles |
| LIKE / PASS | Yes |
| Mutual match / chat | **No** — no auto-replies, no AI personas |
| Backend | Flag `isMockProfile`; fade out when real users grow |
| Photos | AI-generated (nano banana / paid tool) — coffee, beach, home, street |
| Out of scope | Multi-day polite AI chat + soft ghosting |

---

## What to build (next session)

1. Prisma: `isMockProfile`, `mockProfileCreatedBy`, `mockProfileHiddenAt`
2. Admin or script to create 5 seeds (User + Profile + photos + evaluation)
3. Match list: supplement thin pools; cap seed %
4. Block mutual match + messaging to seeds
5. Fade-out cron when real density threshold hit
6. Do **not** deploy `qa50_*` to prod

---

## Existing code to reuse

- `dating-api/scripts/seed-mock-candidates.ts` — 2 mock ANALYZED candidates
- `dating-api/scripts/seed-qa50-pool.ts` — local QA only (50 profiles)

---

## Unpark command (for you / agent)

> "Implement go-live seed profiles per PARKED_GO_LIVE.md"
