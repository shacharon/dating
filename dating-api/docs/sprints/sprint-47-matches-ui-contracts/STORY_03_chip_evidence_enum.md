# Story 03 — Chip-evidence enum / stable contract

**Sprint 47 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** Story 01; server may need additive stable keys from Sprint 45 DTO edge  
**Repo:** `dating-ui` + tiny `dating-api` additive if Architect requires  
**Risk:** Medium (label rename breakage today)

---

## Objective

Replace hardcoded English chip-evidence API keys in the UI (e.g. `'Ambition alignment'`) with a stable enum / code contract shared with (or documented against) the API, mapped to i18n separately.

## Why

English labels as keys break silently when API copy changes. i18n should own display strings.

## Scope / tasks

1. Architect locks key set (mirror server chip ids / signal keys).
2. Update UI chip-evidence mappers; i18n for display.
3. If API still emits English labels only, add additive stable codes without breaking old clients (or dual-read period).
4. Specs for mapping.

## Out of scope

- New chips / scoring
- Full enrichment taxonomy rewrite

## Acceptance criteria

- [ ] UI does not depend on English chip titles as keys
- [ ] i18n still shows correct labels
- [ ] Specs green

## Suggested commit

```
refactor(ui): stable chip-evidence keys instead of English labels

Sprint 47 Story 3
```
