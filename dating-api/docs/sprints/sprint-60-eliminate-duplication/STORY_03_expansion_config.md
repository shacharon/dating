# Story 03 — Consolidate Expansion Explainability Config

**Sprint:** 60  
**Effort:** 3 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Done

---

## Objective

Replace duplicated standard expansion explainability builders with a shared config + `buildStandardShadowBreakdown`, while keeping custom pair-predicate modules.

**Architect scope (delivered):** Explainability-only; **13** modules (`01–07`, `10–15`); no extraction prompt merge; no `08`/`09` explainability.

---

## Delivered

```
dating-api/src/matches/expansion-explainability-config.ts
dating-api/src/matches/expansion-shadow-breakdown.ts
```

- **Standard** (`01–06`, `10`): thin shims over config + shared builder  
- **Custom** (`07`, `11–15`): dedicated builders; shared `syntheticPairEntry` / standard loop where applicable  
- `pickInterestOverlapTags` remains on expansion-07 for `match-explainability`  
- Named exports preserved for rollout/specs

---

## Acceptance criteria

- [x] Config SoT for 13 explainability modules (no 08/09)
- [x] Standard builders share `buildStandardShadowBreakdown` (`BreakdownEntry` + `computePairScore`)
- [x] Custom builders retained; specs + manifest green
- [x] Extraction prompts untouched
- [x] Agent 2 + Agent 4 approved

## Definition of Done

- [x] Agent 2; Agent 4; Agent 3 PM close

## Close

- Branch tip: `feature/sprint-60-story-3` @ `034a157`+
- Pipeline: `-1 → 0 → 1 → 2 → 4 → 3`
