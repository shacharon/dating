# Sprint 60 — Eliminate Code Duplication & Dead Code (P1)

**Status:** Done  
**Depends on:** None (can run in parallel with Sprints 57-59)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 3 (post-tech-scan)

---

## Goal

Eliminate code duplication and remove dead code identified in the August 2026 technical scan:

1. **Delete dead/unused code** (version aliases; POC deferred)  
2. **Extract shared text utilities** — HG keyword helpers  
3. **Consolidate expansion explainability** — config + shared standard builder  

**Non-goals:** Changing matching logic, extraction schemas, or keyword vocabularies. This is **structure + cleanup only**.

---

## Problems Solved

| Issue | Current Cost | After Sprint |
|-------|--------------|--------------|
| **Duplicate keyword helpers** | 5 copies of `isNegatedBefore`, drift risk | **Done (Story 02)** — HG SoT in `shared/text-match.utils` (enrichment negation remains local) |
| **Expansion shotgun surgery** | Copy-paste explainability modules | **Done (Story 03)** — config + standard builder; custom builders kept |
| **Version alias files** | V3/V4 just re-export V2 | **Done (Story 01)** — direct V2 imports |
| **Dead POC code** | ~500 LOC confusion | Deferred (live DI/seed; not Story 01) |
| **Retired HG ranker stubs** | Empty DTO fields shipping | Deferred (wire DTO compatibility) |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Delete dead code & version aliases](./STORY_01_delete_dead_code.md) | 4 hours | ⚡ LOW | Done |
| 02 | [Extract shared text-match utilities](./STORY_02_shared_text_utils.md) | 1 day | ⚡ LOW | Done |
| 03 | [Consolidate expansion explainability config](./STORY_03_expansion_config.md) | 3 days | ⚠️ MEDIUM | Done |

**Order:** 01 → 02 → 03.

**Preferred merge tip:** `feature/sprint-60-story-3`

---

## Success Criteria

- ✅ Enrichment V3/V4 aliases removed (POC/HG stubs deferred)
- ✅ Shared `text-match.utils.ts` for HG extractors
- ✅ Expansion explainability config (13 modules) + standard shadow breakdown
- ✅ Existing keyword / expansion / explainability tests green
- ✅ Structure-only — no product scoring/prompt vocabulary changes

---

## Impact

**Maintenance wins:**
- New **standard** expansion explainability = config row + thin shim  
- Keyword text-match bugs fixed once for HG engines  
- Fewer speculative version aliases

---

## Execution Notes

Completed stacked on Sprint 59 tip via Story 01 → 02 → 03 feature branches.  
Deferred follow-ups: POC UserProfilesRepository retirement; HG wire rank stub cleanup; enrichment↔HG negation unification (freeze RFC); custom pair-predicate DSL.
