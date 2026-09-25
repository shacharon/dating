# Story 2: Distinct empty Matches for not analyzed

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`

## Goal

`not_analyzed` is not “more people joining.” Show copy that they need analysis. Empty **ready** list keeps the invite / pool empty.

## Why

`me-matches-page-client.tsx` renders `MatchListEmptyState` for both `not_ready` + `not_analyzed` and `ready` + zero matches. Empty copy is invite + “preferences may narrow the list.” Spec asserts no analysis/onboarding links on `not_analyzed` (stay on Matches). Stay on Matches; change the **message**, not the route.

## Scope

- New empty UI (or props on the existing one) for `reason === 'not_analyzed'`
- CTA may link to Profile analyze (`/profile` or the analyze block). That is a link the user clicks, not `router.replace` on mount
- `ready` + empty list: keep invite empty
- `no_photo` / `no_profile` gates unchanged
- Never redirect off Matches

## Acceptance criteria

- [x] `not_analyzed` does not show the pool-invite title/body as the only message
- [x] User can open Profile/analyze without being forced off Matches on load
- [x] Empty ready list still invites / “joining”
- [x] Specs: two empties are distinct; no auto `replace`

## Affected files

- `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx`
- `dating-ui/src/components/match-list-empty-state.tsx`
- `dating-ui/src/lib/i18n/en.ts` / `es.ts` / `he.ts`
- `dating-ui/src/app/dating/me-matches/page.spec.tsx`

## Validation

From `dating-ui`:

`npx vitest run src/app/dating/me-matches/page.spec.tsx src/components/match-list-empty-state.spec.tsx`

## Definition of done

- [x] Two different empties
- [x] Matches still stays on Matches
- [x] Tests passing (me-matches page spec + empty-state spec — 28 passed)
- [x] UX review approved (Agent 3.5)
- [x] Landed on `main` (SHA recorded after merge)
