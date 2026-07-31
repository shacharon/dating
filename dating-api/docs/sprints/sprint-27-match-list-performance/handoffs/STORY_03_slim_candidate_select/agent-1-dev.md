# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_slim_candidate_select.md](../../STORY_03_slim_candidate_select.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Split `candidateSelectList` (slim) vs `candidateSelectDetail` (full). List rebuild uses slim (no about\*/city/country/status/user). Detail/assert use full select. Existing HG hard-fail candidates get about\* via **one** batch `findMany` before `hardBlocked` DTO build. List mappers receive null about\* (accepted free-text scoring drift).

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| List select omits about\*, city, country, status, user | Pass |
| Detail select keeps about\* + status/user | Pass |
| Hard-block about\* batch only for existing hard-fail subset | Pass |
| Signals/interests still on list | Pass |
| No API DTO change | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `me-matches.service.ts` | Split selects; deferred hard-block + about\* batch |
| `me-matches.service.spec.ts` | Slim select asserts; hard-block mock batch; detail about\* assert |

---

## Verification ran

| Check | Result |
|-------|--------|
| `me-matches.service.spec.ts` | **93 passed** |
| `me-matches.v1-contract.spec.ts` | **7 passed** |
| `npm run build` | **OK** |

---

## Agent 2 note

- List path intentionally nulls about\* into bridge/read model.
- Hard-block smoking fixtures use structured `smokingFrequency: 'REGULAR'` + batch about\* for quotes.
- Accepted free-text scoring drift vs detail remains.

---

## Commit

`perf(matches): slim candidate select for match-list rebuild` — Sprint 27 Story 3.
