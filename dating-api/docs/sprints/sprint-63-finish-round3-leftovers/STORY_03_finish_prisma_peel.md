# Story 03 — Finish Prisma Peel

**Sprint:** 63  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Done

---

## Objective

Peel remaining high-value `PrismaService` injectors left after Sprint 62 (~10–12 services).

---

## Priority targets (shipped)

| Service | Peeled to |
|---------|-----------|
| Analysis persist | `USER_PROFILE_REPOSITORY` (`persistAnalysisSuccess`, status marks) |
| Match feedback | `MATCH_FEEDBACK_REPOSITORY` (dedicated; not god match port) |
| Account delete | `ACCOUNT_REPOSITORY` (DB scrub in adapter; storage I/O in service) |
| Profile matches facade | `USER_PROFILE_REPOSITORY` (legacy list peel-in-place) |

**Deferred (justified):** `session`, `users`, `messaging-ws-session`, `matches.service` (legacy), `admin-match-quality`, `match-narrative-cache`, email helpers / report adapters.

---

## Tasks

1. Inventory `this.prisma` in each target → port methods.
2. Prefer extending existing Sprint 62 ports over new POC layers.
3. Migrate services; keep `$transaction` inside adapters.
4. Soft goal: product me-profile services without Prisma ≤ leftover list of 4–6 infra/admin.

---

## Success

- [x] Analysis + feedback + account + legacy profile-matches off Prisma
- [x] Injector count: **4 → 0** on those Success services (me-profile product path clean of Prisma injectors)
- [x] Specs green (Agent 2: 41 peel/wiring + 200 HTTP smoke)

---

## Shipped

`feature/sprint-63-story-3` @ `f034238`

- `50eedb1` — feat: peel Prisma from analysis/feedback/matches/account
- `39f2c6d` — test: guard prisma peel wiring + eval lookup (Agent 2)
- `f034238` — chore: close sprint 63 story 3

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)
