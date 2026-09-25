# Story 4: Honest smoking hard-block copy

**Status:** Parked
**Depends on:** —
**Repo:** `dating-ui`

## Goal

Hard-block smoking lines must not say “your preferences” as if the user set a smoking filter. Manual smoking prefs were removed. The block comes from **Story text**.

## Why

`en.ts` (and es/he): “This person smokes, while your preferences exclude smokers.” Engine: NL dealbreaker extract, not Preferences form.

## Scope

- Rewrite list + detail hard-block smoking strings (`en` / `es` / `he`)
- Point at what they wrote / what the other person wrote if evidence exists
- Do not restore a smoking preference UI
- Do not change eligibility

## Acceptance criteria

- [ ] Copy does not claim a smoking control on Preferences
- [ ] Age / gender hard-block copy unchanged unless a string is shared by mistake
- [ ] Specs that asserted the old sentence are updated

## Affected files

- `dating-ui/src/lib/i18n/en.ts` / `es.ts` / `he.ts`
- `dating-ui/src/lib/matches/hard-block-display.spec.ts`
- Match list/detail specs that quote the old line

## Validation

From `dating-ui`:

`npx vitest run src/lib/matches/hard-block-display.spec.ts src/app/dating/me-matches/page.spec.tsx src/app/dating/me-matches/[id]/page.spec.tsx`

## Definition of done

Copy matches the engine. No new filter.
