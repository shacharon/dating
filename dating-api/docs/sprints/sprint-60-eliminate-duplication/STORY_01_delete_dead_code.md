# Story 01 — Delete Dead Code & Version Aliases

**Sprint:** 60  
**Effort:** 4 hours  
**Risk:** ⚡ LOW (architect re-scoped)  
**Status:** Done

---

## Objective

Remove enrichment V3/V4 **alias modules** and call `enrichment-v2` directly. (Original story also listed POC repos / HG stubs — **deferred**; see Close.)

**Behavior guarantee:** Zero product-behavior change — aliases were identity re-exports of V2.

---

## Delivered (architect scope)

### Enrichment version aliases — deleted

```
dating-api/src/evaluate/enrichment-v3.ts
dating-api/src/evaluate/enrichment-v4.ts
```

**Migration done:** `evaluate-batch.orchestrator.ts`, `enrichment-signals.ts`, and legacy V3/V4 phrase specs → `buildEnrichmentSignalsV2` / `mapEnrichmentV2FromText`.

### Deferred (not this story)

- POC `UserProfilesRepository` / seed DI stack  
- `domain/users/user.types` / `application/dto`  
- HG retired rank wire fields (`HolyGrailRankSignalBreakdown`)

---

## Acceptance criteria

- [x] `enrichment-v3.ts`, `enrichment-v4.ts` deleted
- [x] Prod + phrase specs call V2; no `src` V3/V4 alias imports
- [x] Specs + tsc green (Agent 1/2)
- [x] POC/HG/`user.types` left untouched (per architect)

## Definition of Done

- [x] Agent 2 approved; Agent 3 PM close (Agent 4 N/A)

## Close

- Branch tip: `feature/sprint-60-story-1` @ `c6beae9`+
- Pipeline: `-1 → 0 → 1 → 2 → 3`
