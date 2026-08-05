# Handoff: Agent 1 — Dev — Sprint 41 Story 2

**Agent:** 1 implement  
**Story:** [STORY_02_priority_ranking.md](../../STORY_02_priority_ranking.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

List items now include `priorityScore` / `priorityTier` (from existing `matchScore`; thresholds 85/70). UI groups eligible matches into HIGH (always open) / GOOD / OTHER (collapsed) sections; hard-blocked trail after. Score badge + HIGH card accent on browse cards. Client analytics for section view/expand. No algorithm or schema changes.

---

## Files

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/match-priority.ts` (+ spec) | Thresholds + `toPriorityFields` |
| `dating-api/src/me-profile/me-matches.service.ts` | DTO fields + wire on both list push sites |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | Assert priority fields on sorted list |
| `dating-ui/src/lib/me-matches-api.ts` | Mirror list DTO fields |
| `dating-ui/.../match-priority.ts` (+ spec) | `groupMatchesByPriority` / resolve |
| `dating-ui/.../match-priority-sections.tsx` | Sections + collapse + analytics |
| `dating-ui/.../match-browse-card.tsx` | Score badge + HIGH accent |
| `dating-ui/.../me-matches-page-client.tsx` | Use priority sections |
| `dating-ui/src/lib/i18n/{en,es,he}.ts` + `types.ts` | `list.priority.*` |
| `dating-ui/.../page.spec.tsx` | Priority section coverage |

---

## Tests

```bash
# api
npx jest src/me-profile/match-priority.spec.ts src/me-profile/me-matches.service.spec.ts --runInBand
# passed

# ui
npx vitest run src/app/dating/me-matches/
# passed (incl. new priority section cases)
```

---

## Commit

Not committed (Agent 3). Suggested:

```
feat(matches): add priority ranking to match list triage

Sprint 41 Story 2
```

---

## Next command

```text
--agent 2 sprint 41 story 2
```
