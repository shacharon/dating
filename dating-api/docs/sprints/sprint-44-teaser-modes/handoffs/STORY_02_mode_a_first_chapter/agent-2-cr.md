# Handoff: Agent 2 — Code Review — Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_mode_a_first_chapter.md](../../STORY_02_mode_a_first_chapter.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  
**Verdict:** approved (with fixes)

---

## Summary

- Reviewed Mode A card against architect + Story AC: teaser hook, photo-first, small badge, analytics `teaser_mode`.
- **Fixed (Minor→RTL):** Why toggle `text-left` → `text-start` for logical alignment.
- Strengthened tests: long hook keeps `h-[70vh]`, badge `text-xs`/`end-3`, `showScore: false` hides badge, dark token on hook, non–Mode-A resolver fallback.
- **Skip Agent 4** — UI presentation only.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/.../match-why-section.tsx` | fixed — `text-start` for RTL |
| `dating-ui/.../match-browse-card.spec.tsx` | added — long hook / badge / showScore / dark |
| `dating-ui/.../match-display.spec.ts` | added — ready_again → legacy one-liner |

---

## Review findings

### Critical
- None.

### Major
- None.

### Minor (fixed / accepted)
1. **RTL:** Why toggle used `text-left` — fixed to `text-start`.
2. **Score badge `score!` non-null assertion** — safe given `showScoreBadge` gate; left as-is.
3. **Live browser dark/RTL eyeball** — deferred to Agent 3 visual smoke (unit coverage for dark class + logical badge/`text-start` present).

### AC checklist
- [x] Mode A hook visible without Why expand (`match-browse-hook`)
- [x] Photo dominant when Why closed (`h-[70vh]` ≥60%; long hook does not steal)
- [x] Like/Pass primary (unchanged)
- [x] Uses Story 01 `teaser` DTO via `resolveMatchBrowseHook`
- [x] Default `first_chapter` when teaser missing
- [x] `line-clamp-3` / no layout shift from long hooks
- [x] Small corner badge (not hero); dark token on hook
- [x] `teaser_mode` on `match.card_viewed`

---

## Decisions (do not reverse without discussion)

- Why toggle uses `text-start` (RTL-safe).
- Non–`first_chapter` still uses legacy one-liner until Stories 3–4 own layouts.

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations.

---

## Tests / verification

- [x] `npx vitest run src/app/dating/me-matches/match-display.spec.ts src/app/dating/me-matches/match-browse-card.spec.tsx src/app/dating/me-matches/page.spec.tsx` — **pass** (41 tests)
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: **N/A** (UI-only; Agent 3 visual smoke for Option 1 feel)
- [x] Socket: N/A
- [x] Dark/RTL: code checklist (dark classes + logical props); live eyeball → Agent 3

---

## E2E verification (agent 4)

**Skip Agent 4** — not eligibility / preference / ranking.

---

## Open questions / blockers

- None blocking Accept. Agent 3: visual smoke photo → short hook → Like/Pass.

---

## Next agent

```text
--agent 3 sprint 44 story 2
```

**Notes for next agent:**

1. Visual smoke with fixtures; confirm Option 1 feel (wife preference).
2. Confirm HE `hookEmpty` in chrome when teaser missing.
3. Suggested commit: `feat(ui): Mode A first-chapter match card (short hook)` / Sprint 44 Story 2.
