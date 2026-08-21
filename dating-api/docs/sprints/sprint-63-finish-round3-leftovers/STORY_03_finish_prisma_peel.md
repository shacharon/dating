# Story 03 — Finish Prisma Peel

**Sprint:** 63  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Planned

---

## Objective

Peel remaining high-value `PrismaService` injectors left after Sprint 62 (~10–12 services).

---

## Priority targets

| Service | Path | Approach |
|---------|------|----------|
| Analysis persist | `me-profile/me-profile-analysis.service.ts` | Extend `IUserProfileRepository` or `EvaluationRepository` |
| Match feedback | `me-profile/me-match-feedback.service.ts` | Methods on match repo or `MatchFeedbackRepository` |
| Account delete | `me-account/me-account.service.ts` | `AccountRepository` or user-profile cascade port |
| Profile matches facade | `me-profile/me-profile-matches.service.ts` | Route through `MATCH_REPOSITORY` / MeMatches |

**Defer OK (justify in README):** `session`, `users`, `messaging-ws-session`, `matches.service` (legacy), `admin-match-quality`, `match-narrative-cache` — peel only if cheap.

---

## Tasks

1. Inventory `this.prisma` in each target → port methods.
2. Prefer extending existing Sprint 62 ports over new POC layers.
3. Migrate services; keep `$transaction` inside adapters.
4. Soft goal: product me-profile services without Prisma ≤ leftover list of 4–6 infra/admin.

---

## Success

- [ ] Analysis + feedback (+ account if in scope) off Prisma
- [ ] Injector count trending down from ~12
- [ ] Specs green
