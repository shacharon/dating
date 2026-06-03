# Story 4: Consolidate overallScore → finalScore

**Sprint:** 5  
**Status:** Not started  
**Depends on:** —

---

## Why

The match engine exposes both `overallScore` and `finalScore` on match results. `overallScore` on the **match result** is deprecated — it currently mirrors `finalScore` for backward compat but creates confusion in API consumers, UI, and tests. The compatibility sub-object's `overallScore` (from `computeCompatibility()`) is a different concept and must be preserved.

---

## What

**As a** API consumer / UI developer  
**I want** one canonical score field on match results (`finalScore`)  
**So that** there is no ambiguity about which number to display

### Acceptance criteria

- [ ] **Match result type** — `MatchEngineResult` (or equivalent) documents `finalScore` as canonical; `overallScore` removed or marked `@deprecated` with single release cycle then removed
- [ ] **API DTOs** — `/api/v1/me/matches` responses expose `finalScore`; remove duplicate `overallScore` from match list/detail DTOs if present
- [ ] **UI** — match cards and detail pages read `finalScore` only
- [ ] **Preserve compatibility sub-score** — `computeCompatibility().overallScore` unchanged (different semantic: directional compat before friction/dealbreakers)
- [ ] **Tests updated** — match-engine, matches service, UI specs use `finalScore` for end result
- [ ] **Scripts** — seed/merge scripts updated if they reference match result `overallScore`
- [ ] **No silent behavior change** — `finalScore` values identical before/after for same inputs

### Out of scope (this story)

- Renaming `computeCompatibility().overallScore` (different layer)
- Changing scoring formulas

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_04_consolidate_final_score/agent-0-architect.md` after architect run.

Key files to audit:
- `dating-api/src/matches/match-engine.ts` — result shape (~line 675 sets `overallScore: finalScoreClamped`)
- `dating-api/src/matches/matches.service.ts` — DTO mapping
- `dating-api/src/me-profile/` — match list/detail responses
- `dating-ui/src/` — match display components
- `dating-api/src/compatibility/compatibility-score.ts` — **do not rename** sub-score `overallScore`

---

## Definition of done

- [ ] Grep for match-result `overallScore` — only compatibility layer remains
- [ ] API responses documented / OpenAPI if exists
- [ ] UI displays `finalScore`
- [ ] All affected tests pass
- [ ] Release note: `overallScore` removed from match result (breaking if external consumers exist)

---

## Manual smoke

1. Open match list → score shown matches API `finalScore` field  
2. Open match detail → same score  
3. Compare API JSON before/after migration → values unchanged, field name updated

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Rename compatibility sub-score | optional future cleanup |
