# Handoff: Agent 0 — Architect — Sprint 41 Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_photo_first_browse.md](../../STORY_01_photo_first_browse.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** dating-ui only. **Skip Agent 4.**

---

## Summary

Redesign `/dating/me-matches` from a compact explanation-forward list into a **vertical stack of photo-first browse cards**. Photo dominates (~70vh); name/age/location + one-liner sit on/under the photo; **"Why we matched" collapsed by default**; **Like/Pass on the card** (reuse `useMatchActions`). Keep `/dating/me-matches/[id]` for full narrative, feedback, block/report. **No match DTO / API changes.** Prompt essays and km-distance are **not** on the list DTO — map to existing fields (below). Analytics = client `emitProductLog` only this story.

---

## Baseline facts (verified in code)

| Surface | Today |
|---------|--------|
| List page | `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx` + infinite scroll |
| Row | `match-list-item.tsx` — whole row is `<Link>` to detail; `MatchPhoto variant="list"` (56px circle); shows `primaryTakeaway`, score pill, action badge |
| Like / Pass | Only on detail via `MatchDetailActions` + `useMatchActions` |
| List DTO | `MeMatchItemDto`: photo, nickname, age, locationLabel, matchScore, explainability, recommendation, yourAction, hardBlocked — **no** `matchNarrative`, **no** `aboutMe` / prompts, **no** distance km, **no** `matchExplanationTraits` |
| Detail DTO | Has `matchNarrative` + traits — stay on detail |
| Photos | `MatchPhoto` + auth cookie URLs; variants: `list` \| `hero` \| `celebration` \| `header` |
| Product analytics | Server `ProductAnalyticsEvents` only; UI has `emitProductLog` (console JSON) — no client→server match card events |

---

## Decision: layout model (locked)

| Option | Verdict |
|--------|---------|
| Single Tinder-style deck (one card, swipe to next) | **Reject** — swipe gestures deferred (story policy); infinite list already ships |
| Separate `/browse` route vs list | **Reject** — refactor in place on `/dating/me-matches` |
| **Vertical stack of photo-first cards + expand/collapse** | **Lock** |
| Remove detail page | **Reject** — detail keeps narrative, traits, feedback, block/report |

Browse = triage + act. Detail = deep read + safety tools.

---

## Component structure (locked)

```text
me-matches-page-client.tsx
  ├── MatchBrowseCard          # NEW — eligible (non-hardBlocked) matches
  │     ├── photo region (MatchPhoto browse)
  │     ├── identity overlay / strip (name, age, location)
  │     ├── one-liner preview
  │     ├── MatchWhySection      # NEW — collapsed-by-default “why”
  │     └── MatchBrowseActions   # NEW — Like / Pass / undo / mutual CTA
  ├── MatchListItem              # KEEP — hardBlocked rows only (compact amber layout)
  ├── celebration modal host     # lift useCelebrationFlow to page (mutual from card)
  └── infinite sentinel (unchanged)
```

**Do not** wrap the entire eligible card in `<Link>`. Provide an explicit “View profile” / name link to `/dating/me-matches/:id` (`scroll={false}` + existing scroll restore).

Optional thin extract: if `MatchBrowseActions` stays small, it may live in the same file as `MatchBrowseCard` — prefer colocated under `me-matches/` (same folder as today), not a new top-level `components/` tree unless reuse appears.

---

## `MatchPhoto` — browse variant (locked)

Add variant **`browse`**:

| Token | Value |
|-------|--------|
| Default height | Parent sets **`h-[70vh]`** (min card photo region). Image fills parent: `h-full w-full object-cover` |
| Expanded “why” | Parent switches to **`h-[40vh]`** (CSS transition optional, ≤200ms) |
| Cap | `max-h-[640px]` on the photo region so desktop ultrawide doesn’t become a billboard |
| Width | Full card width; page stays `max-w-2xl` |
| Sizes (next/image) | `(max-width: 768px) 100vw, 672px` |
| Priority | First **3** cards `priority` (same as list today) |
| Placeholder / error | Same patterns as `hero` |
| testId | `match-browse-photo` |

Height lives on the **wrapper**, not hard-coded only inside the variant map, so expand/collapse can change height without a second variant:

```tsx
<div
  className={
    whyOpen
      ? 'relative h-[40vh] max-h-[640px] w-full overflow-hidden'
      : 'relative h-[70vh] max-h-[640px] w-full overflow-hidden'
  }
>
  <MatchPhoto variant="browse" className="!h-full !w-full" … />
</div>
```

`browse` base classes: `h-full w-full object-cover bg-zinc-100 dark:bg-zinc-800` (and matching placeholder/skeleton).

---

## Props interfaces (locked)

```ts
// dating-ui/src/app/dating/me-matches/match-browse-card.tsx

export type MatchBrowseCardProps = {
  match: MeMatchItemDto;
  index: number;
  locale: AppLocale;
  listCopy: AppCopySchema['matches']['list'];
  detailCopy: AppCopySchema['matches']['detail']; // Like/Pass/undo strings (reuse)
  onMutualMatch: (conversationId: string) => void;
};

export type MatchWhySectionProps = {
  match: MeMatchItemDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listCopy: AppCopySchema['matches']['list']; // new keys under list.browse
};

export type MatchBrowseActionsProps = {
  matchId: string;
  initialAction: MeMatchItemDto['yourAction'];
  detailCopy: AppCopySchema['matches']['detail'];
  disabled: boolean; // hardBlocked path never mounts this
  onMutualMatch: (conversationId: string) => void;
  onActionSuccess?: (action: 'LIKE' | 'PASS' | 'BLOCK') => void;
};
```

`MatchBrowseActions` wraps `useMatchActions({ matchId, initialAction, onMutualMatch })`. Touch targets **≥44px** (`min-h-11 min-w-11` or `py-3 px-6`).

---

## Field mapping — no API changes (locked)

Story mock mentions “first prompt” and “3km”. List DTO cannot supply those. **Do not** add fields this story.

| UI slot | Source (priority order) | If missing |
|---------|-------------------------|------------|
| Photo | `primaryPhotoUrl` | Placeholder initial |
| Name | `nickname` via `matchListPrimaryLabel` | Existing meta fallback |
| Age | `ageYears` → `"32"` (not `"32y"` in hero overlay — prefer plain number) | Omit |
| Location | `locationLabel` (usable length >1, reuse `match-display` helper) | Omit; **never invent km** |
| One-liner under photo | 1) `recommendation.primaryTakeaway` 2) `explainability.sharedInterestNote` (formatted) 3) first `positiveChips[0]` | Hide line |
| Why summary | Same takeaway / `reasonShort` only as secondary inside expand — prefer takeaway | “No explanation yet” i18n |
| Why chips | `explainability.positiveChips` (+ optional `tensionChip`) | Hide chip row |
| Score in “Why (87%)” | `matchScore` when non-null | Omit % |
| Category rows (“Life goals 95%”) | **Out of scope** — traits are detail-only; Sprint 43 | Link “Full story” → detail |
| Full narrative | **Detail only** (`matchNarrative`) | Browse shows list fields + link |

---

## Expand / collapse (locked)

- **Collapsed by default.**
- Prefer **controlled React state** (not only native `<details>`) so analytics + photo height stay in sync. Implementing with `<details>` is OK if `onToggle` drives the same state.
- Summary control: i18n e.g. `See why we matched` + optional `(${score}%)`.
- a11y: `aria-expanded`, button/`summary` keyboard operable, visible focus ring.
- Expanding must **not** navigate to detail.

---

## Like / Pass on browse (locked)

1. Eligible cards mount `MatchBrowseActions` (bottom of card, thumb-reachable).
2. Reuse existing APIs: `likeMatch` / `passMatch` / `undoMatchAction` via `useMatchActions`.
3. On mutual match → page-level celebration (`useCelebrationFlow`), same as detail.
4. After LIKE/PASS, show status + undo on the card (mirror detail patterns; can be simplified).
5. Hard-blocked: **keep `MatchListItem`** — no Like/Pass on browse card.
6. Already-acted matches: show badge / undo; do not show primary Like+Pass pair.

---

## Analytics (locked — no API)

Story asks for `match.card_viewed` with `explanation_expanded`. Server funnel has no such event; story forbids match DTO/API work.

**Lock for Story 1:**

```ts
emitProductLog({
  level: 'trace',
  route: '/dating/me-matches',
  message: 'match.card_viewed',
  meta: {
    event: 'match.card_viewed',
    matchProfileId: match.id, // opaque id OK
    explanation_expanded: boolean,
  },
});
```

| When | `explanation_expanded` |
|------|------------------------|
| Card ≥50% visible once (IntersectionObserver) | `false` |
| User opens “Why we matched” | `true` |

Do **not** add `ProductAnalyticsEvents` / Nest endpoints this story. Document promotion to server analytics as optional follow-up (not Story 2).

---

## i18n (locked)

Add under `copy.matches.list.browse` (EN + ES + HE):

| Key | Purpose |
|-----|---------|
| `whyToggle` | Collapsed control label |
| `whyToggleWithScore` | `(score: number) => …` |
| `whyHeading` | Expanded heading |
| `whyEmpty` | No takeaway/chips |
| `viewProfile` | Link to detail |
| `oneLinerFallback` | optional; prefer hiding vs generic fluff |

Reuse `detail.like` / `detail.pass` / undo / saving / actionStatus for buttons.

---

## Page / CSS notes (locked)

- Page chrome (nav, title, stale banner, empty/photo gate) **unchanged**.
- List container: `flex flex-col gap-6` (more air than `gap-3`).
- Card: `overflow-hidden rounded-2xl border …` + dark mode zinc tokens consistent with existing pages.
- Overlay text on photo: gradient scrim bottom (`from-black/60`) for name readability; ensure contrast in light **and** dark.
- No emoji in new UI chrome (product convention). Like button may keep existing heart from detail **or** text-only — match detail for consistency.
- Infinite scroll sentinel / scroll restore: keep; restore still works when returning from detail.

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `dating-ui/src/components/match-photo.tsx` (+ spec) | Add `browse` variant + sizes/skeleton/placeholder |
| `dating-ui/src/app/dating/me-matches/match-browse-card.tsx` (+ spec) | **New** photo-first card |
| `dating-ui/src/app/dating/me-matches/match-why-section.tsx` (+ optional spec) | Collapsible why |
| `dating-ui/src/app/dating/me-matches/match-browse-actions.tsx` (+ optional spec) | Like/Pass via `useMatchActions` |
| `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx` | Use browse card; celebration host; hardBlocked → `MatchListItem` |
| `dating-ui/src/app/dating/me-matches/match-list-item.tsx` | Hard-blocked only (or leave dual-use but page stops using it for eligible) |
| `dating-ui/src/lib/i18n/en.ts` (+ es/he + types if needed) | `matches.list.browse.*` |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | Update selectors; cover photo-first + expand + actions smoke |
| `dating-ui/src/app/dating/me-matches/match-display.ts` | Optional helper: `matchBrowseOneLiner(m)`, `formatBrowseAge` |

**Do not change:**

| Path | Reason |
|------|--------|
| `dating-api/**` | No API / analytics server this story |
| `me-matches-api.ts` DTO shapes | Frozen |
| Detail page layout | Out of scope (optional small link copy only if needed) |
| Swipe gestures | Sprint 42+ |
| Priority sections | Story 2 |

---

## Tests / verification (Agent 1)

- [ ] `MatchBrowseCard` renders photo region (≥60% of card height via `h-[70vh]` region)
- [ ] Why collapsed by default; toggle opens + `aria-expanded`
- [ ] Like / Pass call through (mock `useMatchActions` or API)
- [ ] Hard-blocked still uses compact row; actions disabled path unchanged
- [ ] Dark mode classes present on new chrome
- [ ] `page.spec.tsx` green; `match-photo.spec` covers `browse`
- [ ] `cd dating-ui && npm test` (or project’s usual scoped command)

---

## Acceptance mapping

| AC | How |
|----|-----|
| Photo ≥60% card height | `h-[70vh]` photo region collapsed |
| Name/age/location without scroll | Overlay/strip on first screen of card |
| Explanation collapsed / below actions | Why below one-liner; default closed; actions always visible at bottom |
| Like/Pass ≥44px | `min-h-11` buttons |
| Expand works | Controlled why section |
| No API contract change | List DTO only |
| Dark mode | Zinc tokens + scrim |
| Analytics on expand | `emitProductLog` `match.card_viewed` |

---

## Open questions / non-blockers

- None blocking Agent 1.
- Optional polish: after PASS, auto-scroll to next card — **not required**.
- Promoting `match.card_viewed` to server `ProductAnalyticsEvents` — follow-up, not Story 2.

---

## Agent 1 brief

1. Read this handoff + `STORY_01_photo_first_browse.md`.
2. Implement `browse` photo variant + `MatchBrowseCard` stack; wire Like/Pass + celebration.
3. Map one-liner/why from existing list fields only.
4. i18n EN/ES/HE; update specs.
5. No dating-api changes.

**Next command:**

```text
--agent 1 sprint 41 story 1
```
