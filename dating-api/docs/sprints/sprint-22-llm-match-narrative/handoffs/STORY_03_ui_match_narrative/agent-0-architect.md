# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_ui_match_narrative.md](../../STORY_03_ui_match_narrative.md)  
**Sprint:** sprint-22-llm-match-narrative  
**Date:** 2026-07-29  
**Status:** complete  

---

## Summary

- **UI-only.** Story 2 already returns `matchNarrative?: string` on `GET /api/v1/me/matches/:id`. This story types it on the client and renders it on match **detail**; list stays short.
- Prefer narrative over short takeaway when present; fall back to `primaryTakeaway` / `reasonShort`. Keep chips, shared-interest note, traits, score, feedback.
- No Prisma / Nest / scoring changes. **Agent 4 N/A** (no API / eligibility / ranking change).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/me-profile-api.ts` | design — add `matchNarrative?: string` on `MeMatchDetailDto` |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | design — primary prose prefers narrative |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | design — Agent 1/2 tests |
| `dating-ui/src/app/dating/me-matches/page.tsx` | design — **no** narrative render (verify only) |
| `dating-ui/src/app/dating/_lib/types.ts` | design — optional; legacy mock types only if touched |
| `dating-api/*` | **no change** |

---

## Decisions (do not reverse without discussion)

### 1. Type placement (canonical product path)

Add to **`MeMatchDetailDto`** in `me-profile-api.ts` only:

```ts
/** Sprint 22 — long-form grounded "why you match" from API (detail only). */
matchNarrative?: string;
```

- Do **not** add to list item DTO / `MeMatchesListDto` rows.
- Do **not** nest under `recommendation` — wire field is top-level on detail (matches API).
- Legacy `dating/_lib/types.ts` (`DatingMatchDetail`, `MatchDetailApiResponse`) and mocks: **leave unchanged** unless Agent 1 finds a compile error from shared helpers. Product detail page uses `MeMatchDetailDto` via `fetchMyMatchById`.

### 2. Detail render priority (locked)

In `me-matches/[id]/page.tsx`, replace the current one-line takeaway IIFE (~L298–311) with:

| Priority | Source | UI |
|----------|--------|-----|
| 1 | `data.matchNarrative` (non-empty trim) | Long prose block |
| 2 | `data.recommendation?.primaryTakeaway` | Short takeaway (today) |
| 3 | `data.explainability?.reasonShort` | Short takeaway (today) |
| — | none | Omit prose block (page still shows chips / traits / score when present) |

**Do not** show short takeaway **and** narrative together (redundant).

**Preserve unchanged:**
- `match-detail-shared-interests`
- positive / tension chips
- `matchExplanationTraits` + existing `whyYouMatch` heading
- feedback strip, score label, hard-block banner, actions

### 3. Typography / structure

- Narrative is plain text (no markdown parser for v1).
- If the string contains `\n` (or `\n\n`), split into multiple `<p>` elements (trim empty segments).
- Otherwise single `<p>` with comfortable line-height (keep ~`text-base leading-relaxed` or slightly roomier `leading-7`; do not introduce a new card chrome around it unless needed for a11y).
- English narrative body as returned by API; **no** new i18n keys for the body.
- **No new section heading** for v1 — narrative replaces the takeaway paragraph. Existing `matches.detail.whyYouMatch` stays on the traits section only.

### 4. Test IDs

| State | `data-testid` |
|-------|----------------|
| Narrative present | `match-detail-narrative` on the narrative container |
| Short fallback only | keep `match-detail-takeaway` (existing) |
| Neither | neither test id |

Existing tests that assert `match-detail-takeaway` with short takeaway fixtures remain valid when `matchNarrative` is absent.

### 5. List page

- **No code change required** unless a mapper accidentally forwards `matchNarrative`.
- Agent 1/2: one regression assertion that list cards still use `reasonShort` / chips / `sharedInterestNote` only (existing list specs may already cover density — extend if needed).
- Do not render 5–12 sentences on list cards.

### 6. Loading / latency

- Narrative arrives on the **same** `fetchMyMatchById` response (API may wait on first-open LLM). No streaming, no second client fetch, no "Refresh explanation" button (out of scope).
- Existing page loading spinner is enough; no skeleton specific to narrative.

### 7. Out of scope (confirm)

- Admin match-quality UI
- Translating LLM output
- Regenerating narrative from the client
- API / Prisma / generator changes

### 8. Optional small helper (Agent 1 may inline)

```ts
function resolveDetailProse(data: MeMatchDetailDto):
  | { kind: 'narrative'; text: string }
  | { kind: 'short'; text: string }
  | null
```

Prefer colocating in the page or a tiny `match-detail-prose.ts` next to the page if it keeps the JSX clean — not a shared lib requirement.

---

## API contract

**No API change.** Consume Story 2:

```
GET /api/v1/me/matches/:id
→ MeMatchDetailDto.matchNarrative?: string  // present when scored + narrative resolved
```

List `GET /api/v1/me/matches` never includes the field.

---

## Service / module signatures

N/A (UI only). Client:

```ts
// me-profile-api.ts — MeMatchDetailDto
matchNarrative?: string;

// fetchMyMatchById — unchanged signature; JSON already parsed into MeMatchDetailDto
```

---

## Migration plan

**N/A** — no Prisma.

---

## Integration points

| Component | Action |
|-----------|--------|
| `MeMatchDetailDto` | Add optional field |
| `me-matches/[id]/page.tsx` | Prefer narrative for primary prose |
| `me-matches/[id]/page.spec.tsx` | Narrative present / absent / list untouched |
| List page | Verify no narrative dump |
| dating-api | None |

---

## Runtime topology (architect — realtime / proxy / cookies only)

**N/A** for topology redesign — UI already uses same-origin `/api` → Next rewrite → API.

Smoke (Agent 1 notes): open a scored match detail with API + UI up; confirm Network shows one `GET /api/v1/me/matches/:id` and the page shows multi-sentence prose when the field is present. Socket unchanged.

---

## E2E verification (agent 4)

**N/A — skip Agent 4.**

- Story does not change eligibility, preference dimensions, ranking, or Nest matches handlers.
- UI Vitest coverage is Agent 1/2; API E2E already landed in Story 2.

If Agent 2 wants a quick baseline sanity check, optional — not required to close Story 3.

---

## Tests / verification (plan for Agent 1–2)

- [ ] Unit/UI: `page.spec.tsx` — renders `match-detail-narrative` when `matchNarrative` set; content visible; chips/shared interests still present
- [ ] Unit/UI: absent `matchNarrative` → `match-detail-takeaway` from primaryTakeaway/reasonShort (existing cases stay green)
- [ ] Unit/UI: narrative with `\n\n` → multiple paragraphs
- [ ] List: no full narrative on cards (extend `page.spec.tsx` list if needed)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network: one detail GET (Agent 1 smoke or deferred)
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Story 2 Done is the only dependency (already closed).

---

## Next agent

```text
--agent 1 sprint 22 story 3
```

**Notes for next agent:**

- Types + detail page only; do not touch Nest or Prisma.
- Prefer narrative; never dual-render short + long.
- Keep chips / sharedInterestNote / traits.
- After CR → **`--agent 3 sprint 22 story 3`** (skip Agent 4).
