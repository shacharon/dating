# Handoff: Agent 1 — Senior Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_mode_b_ready_again.md](../../STORY_03_mode_b_ready_again.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  

---

## Summary

- Mode B (`ready_again`) on `MatchBrowseCard`: large score hero + quoted `teaser.claim` + sublabel; corner badge hidden.
- Helpers: `resolveBrowseTeaserMode` (localStorage QA preview `dating.teaserModePreview`), `resolveMatchBrowseClaim`.
- i18n `browse.modeB` (EN/HE/ES); Why toggle override `See the full why`.
- Analytics `teaser_mode: 'ready_again'` when Mode B active.
- No API / ranking / Mode C / Story 5 routing (preview only).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/.../match-display.ts` | preview + claim + mode helpers |
| `dating-ui/.../match-browse-card.tsx` | Mode B teaser branch |
| `dating-ui/.../match-why-section.tsx` | optional `whyToggle` override |
| `dating-ui/src/lib/i18n/types.ts` + `en.ts` / `he.ts` / `es.ts` | `browse.modeB.*` |
| `dating-ui/.../match-display.spec.ts` | claim / preview tests |
| `dating-ui/.../match-browse-card.spec.tsx` | Mode B hero / empty / null score |

---

## Decisions (do not reverse without discussion)

- Single card branch; Mode B only when `resolveBrowseTeaserMode === 'ready_again'`.
- Claim never falls back to takeaway/chips.
- Curly quotes around claim in UI; strip API quotes first.
- Score hero uses `matchScore` (list SOT); `aria-label` from `scoreAria`.
- QA: set `localStorage.dating.teaserModePreview = 'ready_again'` (no URL param this story).

---

## Runtime topology

**N/A**

---

## Tests / verification

- [x] `npx vitest run src/app/dating/me-matches/match-display.spec.ts src/app/dating/me-matches/match-browse-card.spec.tsx src/app/dating/me-matches/page.spec.tsx` — **pass** (47 tests)
- [ ] A11y/RTL polish — Agent 2
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network: N/A
- [ ] Socket: N/A

---

## E2E verification (agent 4)

**Skip Agent 4** — UI only.

---

## Open questions / blockers

- None. Prod Mode B waits on Story 5; QA via fixture or localStorage preview.

---

## Next agent

```text
--agent 2 sprint 44 story 3
```

**Notes for next agent:**

1. Claim ≤12 words (builder); accessible score; RTL for HE Mode B strings.
2. Mode A regression + no salesy layout.
3. Suggested commit: `feat(ui): Mode B ready-again match card (score + claim)` / Sprint 44 Story 3.
