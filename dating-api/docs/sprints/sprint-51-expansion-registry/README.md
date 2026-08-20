# Sprint 51 — Expansion Registry / OCP (P1)

**Status:** In Progress (Stories 01–02 Done)  
**Depends on:** Sprint 50 helpful  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 2

---

## Goal

Replace paste-into-`extraction.service` (expansions 01–N) with a single expansion **manifest/registry** that drives prompt blocks, chip/explainability builders, and promotion metadata.

---

## Stories

| # | Story | Status | Extra |
|---|-------|--------|-------|
| 01 | [Expansion manifest design + wire prompts](./STORY_01_expansion_manifest.md) | **Done** | — |
| 02 | [Chip / explainability from registry](./STORY_02_explainability_registry.md) | **Done** | Agent 4 drift gate |
| 03 | [Add-expansion playbook](./STORY_03_add_expansion_playbook.md) | Planned | — |

**Order:** 01 → 02 → 03.

**Preferred merge tip (after Story 02):** `feature/sprint-51-story-2`
