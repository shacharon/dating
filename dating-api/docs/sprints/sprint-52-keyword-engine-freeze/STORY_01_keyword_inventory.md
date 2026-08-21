# Story 01 — Keyword inventory

**Sprint 52 · Status: Done**  
**Priority:** P1  
**Estimated effort:** ~1 day  
**Repo:** `dating-api`  
**Extra agents:** none

---

## Objective

Map enrichment-v2 vs HG dealbreaker/lifestyle/interest/personality text extracts vs LLM extraction. Architect handoff: who owns what; overlap matrix.

## Acceptance criteria

- [x] Ownership map + domain overlap matrix published — [`KEYWORD_INVENTORY.md`](./KEYWORD_INVENTORY.md)
- [x] Who owns what documented (engines, consumers, merge hub); collisions listed (incl. `explicit-extended-lists` sibling)

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] `KEYWORD_INVENTORY.md` + sprint README link; sprint-52 docs committed
- [x] Owner banners on enrichment-v2 + four HG `*-text.extract` modules (comments only)
- [x] No regex/allowlist/behavior changes
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 2 CR fixed (`explicit-extended-lists` note); Agent 3 PM close

## Deferred

- Freeze or taxonomy generation → [Story 02](./STORY_02_freeze_or_taxonomy.md) (include `explicit-extended-lists` in scope)
- No-new-regex policy → [Story 03](./STORY_03_no_new_regex_policy.md)

## Commits

- `e0c4138` — docs: add keyword engine ownership inventory
- `bf7e0ea` — docs: note explicit-extended-lists in keyword inventory
- (this) — chore: close sprint 52 story 1
