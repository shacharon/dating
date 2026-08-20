# Story 01 — Expansion manifest + prompt wiring

**Sprint 51 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 2 days  
**Repo:** `dating-api`  
**Extra agents:** none (prompt registry; Agent 4 is Story 02)

---

## Objective

Introduce `ExpansionManifest` (or equivalent) listing expansion modules. `extraction.service` iterates the registry instead of hardcoding EXPANSION_01…N imports into prompt strings.

## Acceptance criteria

- [x] Adding a shadow expansion = new module + manifest entry (no prompt string edit in core service) — `EXPANSION_PROMPT_MANIFEST` + join helpers
- [x] Parity: existing expansions still extract — expansion shadow describes green; join parity spec
- [x] Specs green — Agent 2: **168 passed** (coverage assertion refreshed)

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] `expansion-manifest.ts` + thin `expansion-manifest.spec.ts`
- [x] `extraction.service.ts` wired via join helpers only
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 2 CR fixed; Agent 3 PM close

## Deferred

- Chip / explainability from registry → [Story 02](./STORY_02_explainability_registry.md)
- Add-expansion playbook → [Story 03](./STORY_03_add_expansion_playbook.md)

## Commits

- `97e66f6` — refactor(extraction): drive expansion prompts from manifest
- `b358a66` — test(extraction): refresh coverage overlap assertion for key growth
- (this) — chore: close sprint 51 story 1
