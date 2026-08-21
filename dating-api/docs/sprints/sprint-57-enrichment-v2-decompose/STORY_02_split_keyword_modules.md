# Story 02 — Split interest / rhythm / conflict mappers

**Sprint 57 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Repo:** `dating-api`  
**Extra agents:** none (behavior-preserving refactor)  
**Depends on:** Story 01

---

## Objective

Move frozen keyword logic out of the monolith into focused modules (exact names per Story 01 seam map), e.g.:

- `enrichment-interest-keywords.ts` — allowlist + interest extractors
- `enrichment-rhythm-keywords.ts` — dailyRhythm / kidsTimeline / relationshipPace / etc.
- `enrichment-conflict-keywords.ts` — conflictStyleDetail / communicationMode / autonomy helpers
- Shared: negation / window helpers (if not already shared)

`enrichment-v2.ts` re-exports or composes them with **byte-identical / golden-parity** outputs vs Story 01 characterizations.

## Acceptance criteria

- [ ] No new regex / allowlist entries (Sprint 52 freeze)
- [ ] Public entry points used by evaluate / enrichment-v4 unchanged
- [ ] Characterization suite still green
- [ ] Each new module has a clear ownership header pointing at KEYWORD_INVENTORY / FREEZE docs

## Definition of Done

- [ ] Files exist under `src/evaluate/` (or agreed subfolder)
- [ ] Specs + tsc green; Agent 2 approved
- [ ] Agents 2.5 / 3.5 / 4 / 5: N/A
- [ ] Agent 3 PM close

## Deferred

- Manifest registration → [Story 03](./STORY_03_enrichment_manifest.md)

## Suggested commit

```
refactor(enrichment): split enrichment-v2 into interest/rhythm/conflict modules

Sprint 57 Story 2
```
