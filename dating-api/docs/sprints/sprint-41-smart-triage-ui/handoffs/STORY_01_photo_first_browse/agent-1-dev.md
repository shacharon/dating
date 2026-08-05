# Handoff: Agent 1 — Dev — Sprint 41 Story 1

**Agent:** 1 implement  
**Story:** [STORY_01_photo_first_browse.md](../../STORY_01_photo_first_browse.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Photo-first browse on `/dating/me-matches`: eligible matches use `MatchBrowseCard` (`h-[70vh]` photo, collapsed “why”, Like/Pass via `useMatchActions`). Hard-blocked rows stay on compact `MatchListItem`. Detail page unchanged. No API/DTO changes. Analytics via client `emitProductLog` (`match.card_viewed`).

---

## Files

| Path | Change |
|------|--------|
| `dating-ui/src/components/match-photo.tsx` (+ spec) | `browse` variant; fill-parent wrapper |
| `dating-ui/src/app/dating/me-matches/match-browse-card.tsx` (+ spec) | Photo-first card + viewport/expand analytics |
| `dating-ui/src/app/dating/me-matches/match-why-section.tsx` | Collapsible why (list DTO fields) |
| `dating-ui/src/app/dating/me-matches/match-browse-actions.tsx` | Like/Pass/undo (≥44px) |
| `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx` | Browse vs hardBlocked split; celebration host |
| `dating-ui/src/app/dating/me-matches/match-display.ts` (+ spec) | `matchBrowseOneLiner`, age/location helpers |
| `dating-ui/src/lib/i18n/{en,es,he}.ts` + `types.ts` | `matches.list.browse.*` |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | Selectors + expand/actions coverage |

**Unchanged:** `dating-api/**`, match list DTO, detail page layout.

---

## Behavior notes

- One-liner: `primaryTakeaway` → sharedInterestNote → first positive chip; never `matchNarrative` / reasonShort as subtitle.
- Why expand: takeaway/reasonShort + chips; link to detail for full story.
- Celebration: page-level `useCelebrationFlow` + dynamic `MatchCelebrationModal` on mutual Like from card.

---

## Tests

```bash
cd dating-ui
npx vitest run src/app/dating/me-matches/page.spec.tsx \
  src/app/dating/me-matches/match-browse-card.spec.tsx \
  src/app/dating/me-matches/match-display.spec.ts \
  src/components/match-photo.spec.tsx
# 4 files, 38 tests — passed
```

---

## Commit

Not committed (Agent 3). Suggested:

```
feat(ui): redesign match browse to photo-first layout

Sprint 41 Story 1 - Smart Triage UI pivot
```

---

## Next command

```text
--agent 2 sprint 41 story 1
```
