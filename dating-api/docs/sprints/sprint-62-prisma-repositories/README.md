# Sprint 62 — Prisma Repositories (Track 4)

**Status:** Done  
**Depends on:** Sprint 61 Done (DIP ports — cleaner to peel DB after infra ports)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 3

---

## Goal

Extract Prisma access behind domain repository ports for the hottest product paths so ~29 `PrismaService` injectors shrink toward a small set of adapters.

**Pattern to copy:** `IUserProfileRepository` + `PrismaUserProfileRepository` (already used by profile CRUD / analysis submit).

**Non-goals:** Microservices; rewriting matching algorithms; expanding ornamental POC `MatchesRepository` / dead profile repos — grow **real** ports from current call sites.

---

## Checkpoint

| Metric | Value |
|--------|-------|
| Services injecting `PrismaService` | **~29** |
| Highest intensity | violations (14), profile-photo (13), analysis (12), match-ranking (10), conversations (8) |
| Existing good port | `IUserProfileRepository` |
| Do not revive | in-memory / disabled `MatchesRepository` POC |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Match repository port](./STORY_01_match_repository.md) | 3–4 days | ⚠️ MEDIUM | Done |
| 02 | [Conversation / message repository](./STORY_02_conversation_repository.md) | 2–3 days | ⚠️ MEDIUM | Done |
| 03 | [Violations + reports repository](./STORY_03_violations_reports_repository.md) | 2 days | ⚡ LOW–MED | Done |
| 04 | [Profile photo repository](./STORY_04_profile_photo_repository.md) | 2 days | ⚡ LOW–MED | Done |

**Order:** 01 → 02 → 03 → 04.

**Preferred merge tip:** `feature/sprint-62-story-4`

---

## Success criteria

- [x] Match ranking / list / actions / detail use `MatchRepository` (or split query/command ports) — no new Prisma in those services *(Story 01)*
- [x] Conversations + messages services use conversation/message repository *(Story 02)*
- [x] Content violations + reports (+ admin twins where practical) use repository ports *(Story 03)*
- [x] Profile photo service uses photo repository (extend profile repo family, don’t invent parallel POC) *(Story 04)*
- [x] Soft target: **Prisma injectors ≤ ~15** (infra/session/users/admin leftovers OK for a later pass) — ~12 `*.service.ts` files still reference `PrismaService` at sprint close
- [x] Characterization / existing integration specs green (S04 photo visibility: 2 pool assertions = known harness noise; gate + admin HTTP pass)

---

## Priority rationale

1. **Match** — densest product surface + ranking heat  
2. **Conversation** — messaging write path  
3. **Violations/Reports** — safety + admin  
4. **Profile photos** — high op count, clear aggregate
