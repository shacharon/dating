# Story 01 — Extend domain errors

**Sprint 54 · Done · P1 · ~1.5d**

**Status:** Done  
**Tip:** `feature/sprint-54-story-1` @ `35d42e9`

Migrate conversations / profile-submit hot paths from inline Nest HTTP exceptions to typed domain errors + filter mapping (same as me-matches).

## Definition of done

- [x] `MeDomainError` + filter mapping; match errors still work
- [x] Conversations cursor + assertActiveParticipant use domain errors
- [x] `submitForUser` Nest HTTP exceptions replaced with domain errors (parity bodies)
- [x] New conversation ErrorCodes added; profile codes reused
- [x] Specs updated + filter coverage; Jest green for touched suites
- [x] Sprint-54 docs committed
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
