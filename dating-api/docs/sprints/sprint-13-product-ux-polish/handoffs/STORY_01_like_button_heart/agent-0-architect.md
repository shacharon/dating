# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_like_button_heart.md](../../STORY_01_like_button_heart.md)  
**Sprint:** sprint-13-product-ux-polish  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 1 adds a **decorative heart** to the match detail **Like** button only.
- Reuse the **feedback thumbs pattern** (`aria-hidden` emoji + translated visible label); accessible name stays `copy.matches.detail.like` (Sprint 12 Story 3).
- **No new i18n keys** — EN “Like”, ES “Me gusta”, HE “אהבתי” unchanged.
- Depends on Sprint 12 match detail i18n (`useAppLocale`, `matches.detail.*`).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | updated — Like button content |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | updated by agent 2 — label query + optional heart presence |
| `dating-ui/src/lib/i18n/en.ts` | verify-only — `matches.detail.like` |
| `dating-ui/src/lib/i18n/es.ts` | verify-only |
| `dating-ui/src/lib/i18n/he.ts` | verify-only |

**No changes:** `dating-api/*`, list badge, Pass/Block/Report, celebration modal, feedback 👍/👎

---

## Decisions (do not reverse without discussion)

### 1. Scope — Like button only

| Surface | Story |
|---------|--------|
| Match detail Like button ❤️ + label | **Story 1** |
| Match feedback 👍/👎 | Existing — verify-only |
| Pass / Block / Report / Undo | Text only — unchanged |
| List `actionBadge.liked` | Unchanged |
| `MatchCelebrationModal` | Unchanged |

---

### 2. Integration pattern

**Reference (feedback — same page):**

```tsx
<button
  type="button"
  aria-label={feedbackCopy.positiveLabel}  // when icon-only; N/A for Like
  …
>
  <span aria-hidden="true">👍</span>
</button>
```

**Like button (Story 1 contract):**

```tsx
<button
  type="button"
  onClick={() => void recordAction('LIKE')}
  disabled={actionSaving}
  className="… inline-flex items-center gap-1.5 …"
>
  {actionSaving ? (
    detailCopy.saving
  ) : (
    <>
      <span aria-hidden="true">❤️</span>
      {detailCopy.like}
    </>
  )}
</button>
```

**Accessibility rules (mandatory):**

| Rule | Requirement |
|------|-------------|
| Emoji | `aria-hidden="true"` on `<span>` — never in `aria-label` |
| Accessible name | From **visible text** `detailCopy.like` only |
| Saving state | Show `detailCopy.saving` **without** heart (avoid “❤️ Saving…”) |
| Tests | `getByRole('button', { name: heCopy.matches.detail.like })` must stay valid |

**RTL (Hebrew):** Button inherits page/shell `dir`. Use `inline-flex items-center gap-1.5` — no manual `text-left`/`text-right`. Heart stays first in DOM; RTL layout places it on the visual start edge.

**Emoji character:** U+2764 FE0F (`❤️`) — matches colorful feedback emoji style; do not use image/SVG in Story 1.

---

### 3. Copy keys (frozen — no new keys)

| Key | EN | HE | Use |
|-----|----|----|-----|
| `matches.detail.like` | Like | אהבתי | Button label + accessible name |
| `matches.detail.saving` | Saving… | … | Disabled/saving state — no heart |

---

### 4. Out of scope (explicit)

| Item | Reason |
|------|--------|
| Pass icon | Separate story if requested |
| Block / Report emoji | Safety actions stay plain text |
| API changes | UI-only |
| List badge heart | Different component |

---

## Runtime topology (architect — auth / cookies)

| Item | Value |
|------|--------|
| REST | Unchanged — existing `POST` like / undo endpoints |
| Locale | `useAppLocale()` on detail page (Sprint 12) |
| Expected Network tab | Same match-action calls |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/app/dating/me-matches/[id]/page.spec.tsx`
- [ ] Like button visible when `yourAction === null`
- [ ] `getByRole('button', { name: enCopy.matches.detail.like })` (and HE variant) still passes
- [ ] Optional: Like button HTML contains `aria-hidden` heart span when not saving
- [ ] Undo / block / report specs unchanged
- [ ] Full `npm test` gate — agent 2
- [ ] `prisma migrate deploy`: N/A

**Manual smoke:**

1. Open match detail (no action yet) → green Like shows ❤️ + localized word.
2. Hebrew locale → ❤️ + “אהבתי”; click Like → status “אהבת את האדם הזה”, undo still text-only.
3. Confirm Pass / Block / Report unchanged from screenshot baseline.

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Decorative ❤️ before label | `aria-hidden` span + `detailCopy.like` |
| Accessible name = translated like | No `aria-label` override; emoji hidden |
| Other actions unchanged | Touch Like button branch only |
| Tests pass | Detail spec + full suite |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 13 story 1
```

**Notes for next agent:**

1. Single-file UI change in **`page.tsx`** (~10 lines).
2. Do not add i18n keys unless accessibility review requires it.
3. Saving state: **no heart** while `actionSaving`.
4. Agent 2: extend existing detail i18n tests; do not break Hebrew like button role queries.
