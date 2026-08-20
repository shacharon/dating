# Story 02 — Freeze or taxonomy generation

**Sprint 52 · Status: Done**  
**Priority:** P1  
**Estimated effort:** ~2 days  
**Dependencies:** Story 01  
**Repo:** `dating-api`  
**Extra agents:** none

---

## Objective

Either freeze dumps (no new rules without RFCs) or generate classifiers from a single taxonomy table. Parity tests required.

## Acceptance criteria

- [x] Freeze dumps (no new rules without RFCs) — [`KEYWORD_ENGINE_FREEZE.md`](./KEYWORD_ENGINE_FREEZE.md) + FROZEN banners on SoT modules
- [x] Taxonomy generation **deferred** (Architect lock — follow-up epic; collisions too large for safe ~2d merge)
- [x] Parity tests — characterization gate **162 passed** (enrichment + HG extract specs + thin freeze banner spec)

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] Freeze doc + inventory/README links; 7 SoT FROZEN banners (comments only)
- [x] No regex/allowlist content or extract-output changes
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 2 CR fixed (playbook cross-link); Agent 3 PM close

## Deferred

- Shared taxonomy table / classifier generation → future epic (not Story 03)
- No-new-regex agent/PR policy → [Story 03](./STORY_03_no_new_regex_policy.md)

## Commits

- `8b12685` — docs: freeze keyword engines pending taxonomy follow-up
- `c33e904` — docs: fix freeze doc playbook cross-link
- (this) — chore: close sprint 52 story 2
