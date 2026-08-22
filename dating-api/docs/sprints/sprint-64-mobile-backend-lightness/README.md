# Sprint 64 — Match Ranking + Legacy Cleanup (P0)

**Status:** In Progress  
**Depends on:** Sprint 63 Story 04 Done (E2E unblocked) — E2E still red on tip; Story 01 blocked on Agent 4 sign-off  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 4 (Android prep — backend lightness)

---

## Goal

Get the backend ready for mobile: thin hot services, remove legacy bloat, make debugging fast.

**Target audience:** Android app needs fast `/me/matches` endpoint, clean error traces, easy to add mobile-specific features.

**Fixes:**
1. **Match-ranking** (544 LOC) — biggest hot service left
2. **Legacy matches.service** (503 LOC + Prisma) — dead weight
3. **Final Prisma peel** (8 → ~4 services)
4. **Fat adapters** (match repo 424 LOC)

**Non-goals:** HG keyword dumps (acceptable frozen data); test splitting (Sprint 65); new features.

---

## Why Now (Mobile Context)

| Issue | Impact on Android |
|-------|-------------------|
| Match-ranking 544 LOC | Slow to debug `/me/matches` performance issues |
| Legacy Prisma coupling | Database migrations break mobile in weird ways |
| Fat repository adapters | Adding mobile-specific queries is scary |
| Matches.service vs MeMatches* | Two match stacks confuse mobile features |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Decompose match-ranking service](./STORY_01_match_ranking_decompose.md) | 3–4 days | ⚠️ MEDIUM | Blocked (Agent 4 E2E) |
| 02 | [Deprecate/quarantine legacy matches.service](./STORY_02_legacy_matches_cleanup.md) | 2 days | ⚡ LOW–MED | Planned |
| 03 | [Final Prisma peel + thin adapters](./STORY_03_final_prisma_peel.md) | 2–3 days | ⚠️ MEDIUM | Planned |

**Order:** 01 → 02 → 03 (or 02+03 parallel).

**Preferred merge tip:** `feature/sprint-64-story-3`

---

## Success Criteria

- [x] Match-ranking ≤ ~250 LOC (load → score → assemble collaborators) — Story 01 code on `feature/sprint-64-story-1`
- [ ] Legacy `matches.service` marked deprecated or moved to `/admin-legacy/` folder
- [ ] Product Prisma injectors ≤ 4 (session/users/WS-session OK; matches/narrative peeled or justified)
- [ ] `prisma-match.repository` split if stays >400 LOC
- [ ] Specs green
- [ ] `/me/matches` endpoint trace has <5 layers (easy mobile debugging)

---

## Impact on Mobile

**Before:**
- Match list bug → wade through 544-line ranking service
- DB change breaks two match stacks
- 8 services coupled to Prisma schema

**After:**
- Match list bug → check 150-line scorer
- DB change touches 4 services max
- Clean ports = easy mobile DTO mapping
