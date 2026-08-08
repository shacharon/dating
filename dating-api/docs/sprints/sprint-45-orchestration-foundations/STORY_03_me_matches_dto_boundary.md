# Story 03 — Me-matches DTO boundary (API vs engine)

**Sprint 45 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1–1.5 days  
**Dependencies:** Stories 01–02 preferred  
**Repo:** `dating-api` only  
**Risk:** Medium if wire shape drifts — default is **no wire break**

---

## Objective

Carve a clear DTO / mapper edge for me-matches list + detail: engine/internal fields stay internal; HTTP response assembly goes through dedicated DTO modules under `me-profile/dto/` (or Architect-chosen path).

## Why

List/detail assembly mixes transport DTOs with engine vocabulary (`matchScore`, HG internals, explainability blobs). Sprint 47 UI needs a stable contract; this story prepares the server edge without forcing a FE rewrite yet.

## Scope / tasks

1. Architect locks: which fields are public API vs internal-only.
2. Extract/normalize response builders into dedicated DTO/mapper files.
3. Default: **identical JSON** to clients (characterization from Story 01 must stay green).
4. Optional: document a future “view model” rename map for Sprint 47 (do not break wire unless Architect + PM agree).
5. Align query DTOs (`me-matches-list-query.dto.ts`) with the same boundary notes.

## Out of scope

- UI rewrite (Sprint 47)
- Splitting MeMatchesService (38.3)
- PairMatchPolicy (46)

## Acceptance criteria

- [x] Dedicated DTO/mapper modules exist; god service (or future collaborators) call them
- [x] Characterization / HTTP specs prove wire parity (unless explicit versioned change)
- [x] Architect handoff lists public vs internal fields

## Suggested commit

```
refactor(me-matches): isolate API DTO mapping from engine fields

Sprint 45 Story 3
```
