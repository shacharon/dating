# Story 3: UI — render matchNarrative on match detail

**Sprint:** 22  
**Status:** Done  
**Depends on:** Story 2

---

## Why

The API will return a grounded long-form `matchNarrative`, but dating-ui still shows the short template takeaway. Users need the narrative on the match detail "Why you match" surface; list cards must stay scannable.

---

## What

**As a** user  
**I want** a clear multi-sentence explanation on the match detail page  
**So that** I understand why this person showed up — in plain language.

### Acceptance criteria

- [x] Extend UI DTOs / mappers (`me-profile-api.ts`, `dating/_lib/types.ts`, list/detail mappers) with optional `matchNarrative?: string` on recommendation or detail payload.
- [x] Match **detail** page (`dating-ui/src/app/dating/me-matches/[id]/page.tsx`):
  - Prefer `matchNarrative` when present for the primary "why you match" / takeaway block.
  - Fall back to existing `primaryTakeaway` / `reasonShort` when narrative is absent (old API / fallback).
  - Preserve chips, shared-interest note, and tension display as today (narrative complements chips; does not remove them).
- [x] Match **list** page: do **not** render the full narrative; keep short takeaway / chips / sharedInterestNote only.
- [x] Basic typography: readable paragraph(s); split on newlines if the API returns them, or render as one block with comfortable line-height. No markdown requirement for v1 unless already used.
- [x] Unit tests: detail renders narrative when present; falls back when absent; list does not dump 12 sentences into a card.
- [x] English copy only for v1 (narrative itself is EN from API). No new i18n keys required unless adding a section heading — if so, add EN/HE/ES for the heading only.

### Out of scope

- Regenerating / "Refresh explanation" button (nice-to-have later).
- Translating LLM output.
- Admin match-quality surfaces (optional follow-up).

---

## Definition of done

- [x] Opening a scored match detail shows a 5–12 sentence grounded narrative when API provides it.
- [x] Absent narrative does not blank the page (short takeaway still shows).
- [x] List UX unchanged in density.

## Suggested touchpoints

- `dating-ui/src/lib/me-profile-api.ts`
- `dating-ui/src/app/dating/_lib/types.ts`
- `dating-ui/src/lib/matches-api-list-mapper.ts` (if detail shares mapper)
- `dating-ui/src/app/dating/me-matches/[id]/page.tsx` + `page.spec.tsx`

## Implementation notes

**Handoffs:** architect → dev → CR → Agent 4 N/A → PM.

**Delivered:**
- `MeMatchDetailDto.matchNarrative?` in `me-profile-api.ts` (list DTO unchanged).
- `match-detail-prose.ts` — prefer narrative, fall back to short takeaway / reasonShort; split on newlines.
- Detail page: `match-detail-narrative` vs `match-detail-takeaway` testids; chips / shared interests / traits preserved.
- Vitest: prose helper + detail narrative/fallback/empty + list ignores injected narrative (CR extended).

**Deferred (optional):** live browser Network smoke with OpenAI key; refresh-explanation button; LLM translation; admin surfaces.
