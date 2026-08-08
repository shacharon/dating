# Sprint 46 — PairMatchPolicy + Admin Twin + Dedupe (P0)

**Status:** Planned  
**Depends on:** Sprint 45 Done · Sprint 38 Story 03 Done (MeMatches split)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-api` only

---

## Goal

Unify product + admin matching orchestration behind one policy object and kill structural duplication:

1. Introduce `PairMatchPolicy` (`HgGateLegacyRankPolicy` = today’s hybrid) and route product ranking through it
2. Split / align admin `MatchesService` + explainability onto shared collaborators / policy
3. Dedupe `engine/signal-post-processing/*` vs `extraction/extraction-*` twins

**Non-goals:** UI (47), full Option B domain/application/infrastructure folder layout (optional Sprint 48+), changing product ranking weights for product reasons.

---

## Stories

| # | Story | Priority | Effort | Status | Agent 4 |
|---|-------|----------|--------|--------|---------|
| 01 | [PairMatchPolicy](./STORY_01_pair_match_policy.md) | P0 | 2–3d | Planned | **Yes** |
| 02 | [Admin matches split onto shared policy](./STORY_02_admin_matches_split.md) | P0 | 2d | Planned | **Yes** |
| 03 | [Dedupe signal post-processing](./STORY_03_dedupe_signal_post_processing.md) | P1 | 1d | Planned | No |

**Order:** 01 → 02 → 03.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Product + admin pair eval | Single `PairMatchPolicy` entry (or thin adapters) |
| Dual HG+legacy loop | Not duplicated in two god services |
| Signal post-processing | One owned module; twin deleted or re-exported |
| Ranking parity | Agent 4 E2E / harness green |

---

## Roadmap

| Next | Focus |
|------|--------|
| **47** | [UI contracts + RQ + chip enum](../sprint-47-matches-ui-contracts/README.md) |
| **48+ (optional)** | Option B folder polish (domain/application/infrastructure) |
