# Sprint 45 — Orchestration Foundations (P0)

**Status:** In progress (Story 01 Done)  
**Depends on:** None (can start anytime; preferred before Sprint 38 Story 03)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Plan:** Option A foundations — characterization tests, typed domain errors, me-matches DTO boundary  
**Repo:** `dating-api` only

---

## Goal

Lock behavior and contracts **before** splitting `MeMatchesService` (Sprint 38 Story 03):

1. Characterization coverage for `list()` / `getById()` so extract-then-delegate cannot silently drift
2. Typed domain errors (replace scattered Nest HTTP exceptions in the match path)
3. Dedicated me-matches DTO / mapping edge (API contract vs engine vocabulary) — **no wire break** unless Architect explicitly versions

**Non-goals:** Splitting `MeMatchesService` (38.3), `PairMatchPolicy` (46), UI (47), changing scores/HG policy.

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Characterization tests](./STORY_01_characterization_tests.md) | P0 | 1d | Done |
| 02 | [Typed domain errors](./STORY_02_typed_domain_errors.md) | P0 | 1d | Planned |
| 03 | [Me-matches DTO boundary](./STORY_03_me_matches_dto_boundary.md) | P0 | 1–1.5d | Planned |

**Order:** 01 → 02 → 03 (agents: `--agent 0..3 sprint 45 story N`). Agent 4 **not** required (no ranking/eligibility behavior change).

---

## Success metrics

| Metric | Target |
|--------|--------|
| Characterization | `list` / `getById` ready / not_ready / empty / cursor paths covered |
| Errors | Match-path domain errors typed; mapped in exception filter; `ErrorCodes` stable |
| DTOs | Clear API-vs-engine mapping module; HTTP JSON shape unchanged by default |
| Behavior | No product ranking / eligibility change |

---

## Roadmap

| Next | Focus |
|------|--------|
| **38.3** | [Split MeMatchesService](../sprint-38-god-services-split/STORY_03_split_me_matches_service.md) |
| **46** | [PairMatchPolicy + admin + dedupe](../sprint-46-pair-match-policy/README.md) |
| **47** | [UI contracts](../sprint-47-matches-ui-contracts/README.md) |
