# Sprint 31 — Async Match Materialization

**Status:** 🟡 **IN PROGRESS** — Stories 1–2 Done; Story 3 Architect locked → Agent 1 Dev  
**Priority:** P1 (scale + fairness; not a launch blocker like Sprint 30)  
**Depends on:** Sprint 27 Done (batch evals, SQL prefilter, cap stopgap, miss metrics). Prefer after Sprint 30 content safety if sequencing product vs scale.  
**Companion:** [`SCALE_READINESS_CR.md`](../../SCALE_READINESS_CR.md) · [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md) · prior: [Sprint 27](../sprint-27-match-list-performance/README.md)

**Parked elsewhere:** [Sprint 20 live apply](../sprint-20-aws-dev-deployment/README.md) (alert — later).

---

## Goal

Move match **ranking off the request path**. Persist per-viewer ranked candidates asynchronously; `GET /api/v1/me/matches` reads the precomputed store (DB cursor), instead of rebuilding / hydrating a capped pool on every Redis cache miss.

**Replaces:** Sprint 27 `MATCH_LIST_CANDIDATE_CAP` stopgap as the long-term fairness/scale strategy (cap may remain as a rebuild *batch* bound, not as “who can appear in browse”).

---

## Why

| Today (post-27) | Problem |
|-----------------|---------|
| Cache miss → `buildFullRankedList` | CPU + DB still O(hydrated pool) |
| Cap by `analyzedAt DESC` | Older analyzed profiles can vanish from browse |
| Redis list cache | Helps hits; misses still expensive; fairness not fixed |

SCALE CR historically labeled this “Sprint 32+ Async Match Rebuild”; **repo numbering:** this work is **Sprint 31**. Content moderation ops follow-up is [Sprint 32](../sprint-32-moderation-ops/README.md).

---

## Non-goals

- Changing Holy Grail / LLM narrative scoring math (reuse existing scorer)
- Full graph “everyone vs everyone” continuous recompute without triggers
- Extracting workers to a separate deployable (may stay in-process Bull; separate worker service is later infra)
- FE redesign of match list UX (API contract stays pageable; optional cursor tighten only)
- Sprint 20 AWS apply

---

## Stories

| # | Story | Priority | Est |
|---|-------|----------|-----|
| 01 | [Materialized rank schema](./STORY_01_materialized_rank_schema.md) | P0 | 0.5–1d | **Done** |
| 02 | [Rebuild job (Bull)](./STORY_02_rebuild_job.md) | P0 | 1–1.5d | **Done** |
| 03 | [Triggers + invalidation](./STORY_03_triggers_invalidation.md) | P0 | 0.5–1d | Architect → Agent 1 |
| 04 | [List reads from materialization](./STORY_04_list_read_path.md) | P0 | 1–1.5d |
| 05 | [Cutover + deprecate request rebuild](./STORY_05_cutover_deprecate_rebuild.md) | P0 | 0.5–1d |

**Order:** 01 → 02 → 03 → 04 → 05 (4 agents each: `--agent 0..3 sprint 31 story N`).  
Story 03 can start architecting in parallel with 02 after 01 schema locks, but Dev should land 02 before 03 enqueues real jobs.

---

## Target shape (draft — Architect locks in Story 01)

```
Analysis / prefs / block change
        │
        ▼
   Bull: match.rank.rebuild (viewerId | {viewerId, reason})
        │
        ▼
  Score pool (reuse MeMatchesService scoring helpers)
        │
        ▼
  Upsert MatchRankMaterialized (viewerUserId, candidateProfileId, score, rank, reasons…)
        │
        ▼
  GET /me/matches  →  ORDER BY rank/score + stable id  (DB cursor)  →  hydrate page only
```

Suggested table (names free until Architect):

- `viewerUserId` + `candidateProfileId` (PK or unique)
- `score` (numeric), `rank` (int) or order by score + id
- `builtAt` / `sourceJobId`
- Soft filters already applied at write time (gender/age/block) so read path is thin

---

## Acceptance (sprint-level)

- [ ] Match list **steady state** serves from materialized rows (feature flag or default on after cutover)
- [ ] Rebuild runs async (Bull); analysis-complete (and locked preference/block events) enqueue rebuild
- [ ] No O(full analyzed population) hydrate on list **request** path after cutover
- [ ] Fairness: eligibility not limited to “most recently analyzed N” for browse membership (cap only bounds job work if still needed)
- [ ] Specs: schema/job/list path; miss/rebuild metrics retained or replaced with materialization metrics
- [ ] Cap stopgap documented as obsolete or relegated to job internals

---

## Success metrics

| Metric | Target |
|--------|--------|
| List p95 (warm materialization) | ≪ current miss rebuild |
| List path | No `buildFullRankedList` on hot GET after cutover |
| Rebuild lag after analysis | Architect lock (e.g. p95 &lt; 60s in dev) |
| Browse fairness | Profiles outside recent-`analyzedAt` window can still appear once ranked |

---

## Roadmap context

| Before | This sprint | After |
|--------|-------------|--------|
| Sprint 27 cap stopgap | Materialize ranks | Optional: separate worker service, Redis rank cache, pairwise incremental updates |
| Sprint 30 content safety (P0 launch) | Can run after or interleaved | Sprint 20 live apply (parked alert) |
