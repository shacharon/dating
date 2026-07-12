# Sprint 13: Product UX polish

**Epic:** Clear, accessible match actions + remaining i18n gaps  
**Duration:** ~1 week (3 stories planned)  
**Goal:** Small, high-impact UX improvements on top of Sprint 12 i18n — decorative affordances where they help, without breaking accessibility or safety flows.  
**Status:** Done (engineering gate — all 3 stories complete; operator smoke pending)  
**Depends on:** [Sprint 12](../sprint-12-i18n-three-languages/README.md) (i18n foundation + match detail copy)

---

## Why this sprint

Sprint 12 localized **labels** across main flows. Users still see **text-only** primary actions on match detail (Like / Pass / Block / Report) while the feedback strip already uses emoji with proper `aria-hidden` decoration. Sprint 13 closes targeted UX gaps without reopening engine/API i18n scope.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Emoji on Like | **Decorative only** — `aria-hidden`; accessible name stays translated `copy.matches.detail.like` |
| Emoji on Pass / Block / Report | **Out of scope** (Story 1) — text + color semantics only |
| New i18n keys for heart | **None** — reuse existing `matches.detail.like` |
| API / Prisma | **No changes** in Story 1 |
| List “Liked” badge | **Unchanged** (text badge only) |

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Like button heart icon](./STORY_01_like_button_heart.md) | **Done** | Sprint 12 Story 3 |
| 2 | [Onboarding forms i18n](./STORY_02_onboarding_forms_i18n.md) | **Done** | Sprint 12 |
| 3 | [Profile review page i18n](./STORY_03_profile_review_i18n.md) | **Done** | Sprint 12, Story 2 |

**Order:** 1 → 2 → 3

---

## Manual smoke (sprint-level)

1. Match detail → Like button shows ❤️ + localized label (EN / ES / HE).
2. Screen reader / `getByRole('button', { name: … })` uses **text label only** (not “heart”).
3. Like → undo → block → report flows unchanged.
4. (Stories 2–3) Onboarding + profile page follow stored locale.

---

## Deferred (Sprint 14+)

- Pass button icon (e.g. ✕) — separate story if desired
- Icons on list row badges
- Localized match explainability from API (carried from Sprint 12)
