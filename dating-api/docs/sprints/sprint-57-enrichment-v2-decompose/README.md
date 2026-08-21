# Sprint 57 — Enrichment-v2 Keyword Engine Decomposition (P0)

**Status:** In Progress (Stories 01–02 Done)  
**Depends on:** Sprint 52 (keyword freeze / inventory) Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 3 (post-merge scan)

---

## Goal

Decompose `evaluate/enrichment-v2.ts` (~884 LOC) from a single procedural keyword dump into focused domain modules + a thin orchestrator, **without changing enrichment outputs**.

Respect Sprint 52 freeze: **no new regex / phrases / allowlist ids** unless RFC in `KEYWORD_ENGINE_FREEZE.md`. This sprint is **structure only** (move + register), not vocabulary growth.

**Non-goals:** New enrichment dimensions; scoring changes; unfreezing keyword dumps.

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Characterization + seam map](./STORY_01_characterization_seam_map.md) | **Done** |
| 02 | [Split interest / rhythm / conflict mappers](./STORY_02_split_keyword_modules.md) | **Done** |
| 03 | [Enrichment keyword manifest + thin facade](./STORY_03_enrichment_manifest.md) | Planned |

**Order:** 01 → 02 → 03.

**Preferred merge tip (after Story 03):** `feature/sprint-57-story-3`

---

## Success criteria

- `enrichment-v2.ts` is a thin facade (target ≤ ~200 LOC) or deleted in favor of named modules + manifest
- Existing enrichment specs / evaluate parity green
- Manifest pattern mirrors Sprint 51 `expansion-manifest` (OCP for future *structure*, not new regex)
- Freeze policy docs still authoritative for vocabulary changes
