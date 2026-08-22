# Sprint 64 — Match Ranking + Legacy Cleanup (P0)

**Status:** In Progress (2/3 Done; Story 01 blocked)  
**Depends on:** Sprint 63 Story 04 — E2E baselines still red on tip (pre-existing)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 4 (Android prep — backend lightness)

---

## Goal

Get the backend ready for mobile: thin hot services, remove legacy bloat, make debugging fast.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Decompose match-ranking service](./STORY_01_match_ranking_decompose.md) | 3–4 days | ⚠️ MEDIUM | Blocked (Agent 4 E2E) |
| 02 | [Deprecate/quarantine legacy matches.service](./STORY_02_legacy_matches_cleanup.md) | 2 days | ⚡ LOW–MED | **Done** (`feature/sprint-64-story-2`) |
| 03 | [Final Prisma peel + thin adapters](./STORY_03_final_prisma_peel.md) | 2–3 days | ⚠️ MEDIUM | **Done** |

**Merge branches:** Story 01 → `feature/sprint-64-story-1` · Story 02 → `feature/sprint-64-story-2` · Story 03 → `feature/sprint-64-story-3`

---

## Success Criteria

- [x] Match-ranking ≤ ~250 LOC — Story 01 code on `feature/sprint-64-story-1` (pending E2E + merge)
- [x] Legacy `matches.service` quarantined under `admin-legacy/` *(Story 02, `ce6bb00`)*
- [x] Product Prisma injectors ≤ 4 — **0 product direct injectors** after Story 03 peel (`c30aea3`)
- [x] `prisma-match.repository` evaluated — **accepted** at 424 LOC (no split)
- [x] Story 02 + Story 03 targeted specs green
- [ ] `/me/matches` trace <5 layers — partial (Story 01 ranking decompose helps; blocked on merge)

---

## E2E baseline (tip)

Pre-existing red state — **not introduced by Stories 02/03**:

- Standard baselines (`me-new-model-e2e*.integration.spec.ts`) red — `ProfileAnalysisQueueService` inline analysis
- Story 03 narrative spec: **3/4 pass** (identical to `main`); cache hit/miss/fallback paths green

---

## Impact on Mobile

- Product stack clearly separated from admin legacy (Story 02)
- Narrative cache + WS session no longer couple product services to Prisma directly (Story 03)
- Ranking decompose ready on branch pending E2E sign-off (Story 01)
