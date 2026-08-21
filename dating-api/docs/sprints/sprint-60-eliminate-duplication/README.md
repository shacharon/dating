# Sprint 60 — Eliminate Code Duplication & Dead Code (P1)

**Status:** In Progress  
**Depends on:** None (can run in parallel with Sprints 57-59)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 3 (post-tech-scan)

---

## Goal

Eliminate code duplication and remove dead code identified in the August 2026 technical scan:

1. **Delete dead/unused code** (POC repositories, version aliases) — zero behavior risk
2. **Extract shared text utilities** — consolidate 5 duplicate keyword helpers
3. **Consolidate expansion modules** — eliminate shotgun surgery across 15 near-identical files

**Non-goals:** Changing matching logic, extraction schemas, or keyword vocabularies. This is **structure + cleanup only**.

---

## Problems Solved

| Issue | Current Cost | After Sprint |
|-------|--------------|--------------|
| **Duplicate keyword helpers** | 5 copies of `isNegatedBefore`, drift risk | 1 shared util module |
| **Expansion shotgun surgery** | Edit 2 manifests + 2 files per signal | 1 config table edit |
| **Version alias files** | V3/V4 just re-export V2 | **Done (Story 01)** — direct V2 imports |
| **Dead POC code** | ~500 LOC confusion | Deferred (live DI/seed; not Story 01) |
| **Retired HG ranker stubs** | Empty DTO fields shipping | Deferred (wire DTO compatibility) |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Delete dead code & version aliases](./STORY_01_delete_dead_code.md) | 4 hours | ⚡ LOW | Done |
| 02 | [Extract shared text-match utilities](./STORY_02_shared_text_utils.md) | 1 day | ⚡ LOW | Planned |
| 03 | [Consolidate expansion explainability config](./STORY_03_expansion_config.md) | 3 days | ⚠️ MEDIUM | Planned |

**Order:** 01 → 02 → 03 (or 01+02 in parallel).

**Preferred merge tip:** `feature/sprint-60-story-1` (until Story 03; then `feature/sprint-60-story-3`)


---

## Success Criteria

- ✅ Dead code deleted (enrichment V3/V4, POC repos, retired HG stubs)
- ✅ One shared `text-match.utils.ts` used by 5+ keyword engines
- ✅ Expansion config table replaces 15 separate explainability modules
- ✅ All existing tests green (keyword parity, expansion chip tests)
- ✅ ~1000 LOC reduction, no behavior changes

---

## Impact

**KISS violations fixed:**
- Speculative generality (version aliases)
- Duplicate code (keyword helpers, expansion modules)
- Dead code (POC layers)

**Maintenance wins:**
- New expansion = 1 config object, not 2 new files
- Text matching bugs fixed once, not 5 places
- Less cognitive load (fewer files to understand)

---

## Execution Notes

**Can run in parallel with:**
- ✅ Sprint 57 (enrichment decomposition) — no conflicts
- ✅ Sprint 58 (extraction orchestration) — no conflicts
- ✅ Sprint 59 (evaluate decomposition) — no conflicts

**Best sequence if doing all together:**
1. Story 01 (delete) — immediate, safe cleanup
2. Story 02 (text utils) — unlocks cleaner Sprint 57 enrichment modules
3. Story 03 (expansion config) — leverage expansion-manifest pattern from Sprint 51

**Team velocity note:** Story 01 is a quick win to build momentum; Story 02-03 can be done by junior devs while senior devs work on Sprints 57-59.
