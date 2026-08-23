# Sprint 71 — P1 God Service Decomposition

**Status:** Done (Stories 01–04)  
**Depends on:** Sprint 70 Done (feature folders in place — new collaborators land in the right folder)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 5 (P1 — service SRP, testability, Android `/me/matches` debuggability)

---

## Goal

Decompose the **top 4 god services** (>350 LOC) into focused collaborators with thin orchestrators (≤200 LOC each).

**This finishes what Sprint 64 planned** but didn't fully achieve — `match-ranking.service.ts` is still 544 LOC and `matches.service.ts` still 503 LOC.

---

## Why Now (after 69–70)

| Sprint | Fixed | Left behind |
|--------|-------|-------------|
| 69 | Giant test files | — |
| 70 | God directories | Fat services inside folders |
| **71** | — | Services that violate SRP |

Sprint 38 split `me-matches.service` into collaborators — but **`MatchRankingService.buildFullRankedList`** absorbed the scoring loop and stayed a god method (~400 LOC inside one method).

---

## Target services

| Service | LOC | Primary sin | After Sprint 71 |
|---------|-----|-------------|-----------------|
| `match-ranking.service.ts` | 544 | Loader + scorer + assembler + telemetry in one class | Orchestrator ≤200 LOC |
| `matches.service.ts` | 503 | Compare + list + HG diagnostics + admin | 3 collaborators + facade ≤150 |
| `me-conversations.service.ts` | 405 | List pagination + read state + lifecycle | 3 collaborators + facade ≤150 |
| `match-detail.service.ts` | 357 | Detail query + narrative + photo file IO | 2 collaborators + facade ≤150 |

**Out of scope for 71** (Sprint 72+): `profile-to-canonical.mapper.ts` (704 LOC, 55 methods), `extraction.service.ts` (348), admin services, infrastructure services (redis, logger).

---

## Principles (mandatory)

- **SRP:** One collaborator = one reason to change (load candidates ≠ score ≠ assemble DTO).
- **DIP:** Collaborators depend on repository **ports** already wired in Sprint 62 — no new Prisma leaks.
- **Liskov:** Public method signatures on facades (`MatchRankingService`, `MeConversationsService`, etc.) **unchanged** — controllers/workers don't change.
- **KISS:** Extract-then-delegate — move code blocks, don't rewrite algorithms.
- **No HTTP contract changes:** Same DTOs, same routes, same error codes.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Decompose match-ranking](./STORY_01_decompose_match_ranking.md) | 2–3 days | ⚠️ MEDIUM (hot path) | **Done** |
| 02 | [Decompose legacy matches.service](./STORY_02_decompose_matches_service.md) | 2 days | ⚠️ MEDIUM (admin stack) | **Done** |
| 03 | [Decompose me-conversations](./STORY_03_decompose_me_conversations.md) | 1–2 days | ⚡ LOW | **Done** |
| 04 | [Thin match-detail](./STORY_04_thin_match_detail.md) | 1–2 days | ⚡ LOW | **Done** |

**Order:** 01 → 02 → 03 → 04 (01 is highest Android impact).

---

## Success Criteria

- [x] `match-ranking.service.ts` ≤200 LOC; no collaborator >250 LOC
- [x] `matches.service.ts` ≤150 LOC (facade) or replaced by injected sub-services in module
- [x] `me-conversations.service.ts` ≤150 LOC (facade — 77 LOC)
- [x] `match-detail.service.ts` ≤150 LOC (facade — 37 LOC)
- [x] All story-scoped specs green (characterization + policy + smoke)
- [ ] `npm run build && npm test` green (full suite — pre-existing messaging gaps out of scope)
- [x] No Sprint 71 target service still >250 LOC as a monolith facade

---

## What This Solves vs Doesn't

| Problem | After 71 |
|---------|----------|
| Hard to debug `/me/matches` ranking | ✅ Stack traces point to loader/scorer/assembler |
| Admin vs product match stack confusion | ✅ Partially — Story 02 labels legacy compare/list |
| 16 other services 200–348 LOC | ❌ Sprint 72 batch |
| `profile-to-canonical.mapper` god object | ❌ Sprint 72 |
| Frontend `src/lib/` god directory | ❌ FE sprint backlog |

---

## Next: Sprint 72 (preview)

- Split `profile-to-canonical.mapper.ts` by slice (rankingSignals, structuredFacts, searchOverrides)
- Batch-thin services 200–348 LOC (extraction, admin-match-quality, photo-moderation)
- Optional: `messaging-socket-registry.service.ts` (48 methods)

See [`sprint-72-p1-mapper-and-thin-services/README.md`](../sprint-72-p1-mapper-and-thin-services/README.md).
