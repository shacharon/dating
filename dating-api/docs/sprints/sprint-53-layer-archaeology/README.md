# Sprint 53 — Layer Archaeology (P2)

**Status:** **Done (3/3)** · **Depends on:** Sprint 46 PairMatchPolicy preferred · **Round:** 2  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Preferred tip:** `feature/sprint-53-story-3` @ close commit (stacks Story 02 + ownership; Story 01 may still be a separate branch)

## Goal

Delete unused POC in-memory repos; quarantine/retire LegacyBackend HTTP seams; document engine vs HG ownership after PairMatchPolicy.

**Ownership map:** [`docs/ops/ENGINE_VS_HG_OWNERSHIP.md`](../../ops/ENGINE_VS_HG_OWNERSHIP.md)  
**Lab HTTP quarantine:** [`docs/ops/LEGACY_HTTP_QUARANTINE.md`](../../ops/LEGACY_HTTP_QUARANTINE.md)

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Delete dead in-memory repos](./STORY_01_delete_in_memory_repos.md) | **Done** (`feature/sprint-53-story-1` @ `50f4e15`) |
| 02 | [Quarantine legacy HTTP adapters](./STORY_02_quarantine_legacy_http.md) | **Done** (`d07dc27`) |
| 03 | [Engine vs HG ownership doc](./STORY_03_ownership_doc.md) | **Done** (`9ad0b4c`) |

## Deferred (tracked)

- Hard-delete of quarantined `/api/evaluate` + `/api/matches` — follow-up operator PR after SoT reconfirm (Story 03).
