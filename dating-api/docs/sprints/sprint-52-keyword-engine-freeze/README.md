# Sprint 52 — Keyword-Engine Freeze / Consolidate (P1)

**Status:** In Progress (Stories 01–02 Done; Story 03 policy) · **Depends on:** 51 helpful · **Round:** 2  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

## Goal

Inventory and freeze or consolidate `enrichment-v2.ts`, HG `*-text.extract.ts`, and LLM signals so we stop additive regex dumps.

**Inventory:** [KEYWORD_INVENTORY.md](./KEYWORD_INVENTORY.md) — ownership map + domain overlap matrix.  
**Freeze:** [KEYWORD_ENGINE_FREEZE.md](./KEYWORD_ENGINE_FREEZE.md) — FROZEN dumps + RFC exceptions (taxonomy deferred).  
**Policy:** [NO_NEW_REGEX_POLICY.md](./NO_NEW_REGEX_POLICY.md) — where new signals go (agents & PRs).

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Inventory + ownership map](./STORY_01_keyword_inventory.md) | **Done** |
| 02 | [Freeze or generate from taxonomy](./STORY_02_freeze_or_taxonomy.md) | **Done** |
| 03 | [Guardrails / no-new-regex policy](./STORY_03_no_new_regex_policy.md) | In Progress |

**Order:** 01 → 02 → 03.

**Preferred merge tip (after Story 02):** `feature/sprint-52-story-2`
