# Story 36.1 — Refactor Match Detail Page (LOCKED)

**Sprint:** 36 — Component Refactoring  
**Story:** 1 — Refactor match detail page  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** none  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** no

---

## Goal

Split `me-matches/[id]/page.tsx` (~576 lines) into a thin orchestrator + presentational pieces under `components/match-detail/`, **without** changing product behavior, copy, testids, or visuals. Hooks and modal code-splitting already exist — **reuse them**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Page | `src/app/dating/me-matches/[id]/page.tsx` — client component, ~576 lines |
| Specs | Large `page.spec.tsx` — **must stay green**; keep `data-testid`s stable |
| Hooks (already used) | `hooks/use-match-actions.ts`, `use-match-feedback.ts`, `use-celebration-flow.ts` (+ their specs) |
| Modals (already dynamic) | `MatchCelebrationModal`, `ReportUserDialog` via `next/dynamic` `{ ssr: false }` |
| Helpers | `match-display.ts`, `hard-block-display.ts`, `[id]/match-detail-prose.ts` |
| Block UX | Inline confirm in page → `blockMatch` → `router.push('/dating/me-matches')` — **not** `useMatchActions.block` today |
| Feedback UI | Thumbs 👍/👎 already in product — keep as-is (no redesign) |

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ “Create” the three hooks — they **already exist**; do not duplicate  
- ❌ Invent new behavior / API / copy / routes  
- ❌ Move analysis or list-page code  
- ❌ Require visual redesign or remove existing emoji in feedback/like  
- ❌ Soften line-limit by dumping logic into one mega-`actions` file > 200 lines — split further if needed  
- ❌ Break or rewrite `page.spec.tsx` wholesale — update imports only if needed; prefer same page export  

---

## Locked target structure

```
app/dating/me-matches/[id]/page.tsx          ← orchestrator (load + wire hooks)
components/match-detail/
  match-detail-header.tsx                    ← hero photo + title/subtitle header
  match-detail-hard-block.tsx                ← amber hard-block banner
  match-detail-content.tsx                   ← prose / shared interests / caution / analyzedAt
  match-detail-feedback.tsx                  ← feedback section (existing testids)
  match-detail-actions.tsx                   ← footer: mutual, like/pass/undo, block, report, back
  match-detail-modals.tsx                    ← owns dynamic() imports for celebration + report
```

Keep `[id]/match-detail-prose.ts` (+ spec) next to the route (or under `match-detail/` only if imports stay clean — **prefer leave path**).

### Orchestrator responsibilities

1. `useParams` / `useRouter` / `useAppLocale`  
2. Load: `Promise.all([fetchMyMatchById, fetchMatchAction, fetchMatchFeedback])` (same as today)  
3. Wire `useMatchActions` / `useMatchFeedback` / `useCelebrationFlow`  
4. Loading / error / empty chrome + back nav link  
5. Compose extracted components + modals  
6. Optional thin helpers (`actionStatusMessage`, `undoAriaLabel`) — may live in `match-detail-actions.tsx` or a tiny `match-detail-copy.ts`  

**Target size:** page file ideally **≤ ~150 lines**; hard fail if still a monolith (>300). Prefer ≤120.

### Component responsibilities

| Component | Must preserve |
|-----------|----------------|
| Header | `MatchPhoto` `testId="match-detail-photo"`; title/subtitle via `matchDetailTitle` / `matchDetailSubtitle` |
| Hard block | `data-testid="match-detail-hard-blocked"`; reasons via `formatHardBlockReason`; prefs link `/settings/preferences`; “you liked” when `currentAction === 'LIKE'` |
| Content | `match-detail-narrative` / `match-detail-takeaway` / `match-detail-shared-interests`; caution + analyzed timestamp |
| Feedback | `match-feedback`, `match-feedback-positive/negative`, `match-feedback-thanks`; same aria + disabled rules |
| Actions | Like/pass/undo/block confirm/report/`match-detail-view-conversation` / back button; hard-block disables actions same as today |
| Modals | Celebration + report only when open; same props (`MATCH_PROFILE`, etc.) |

### Line budgets (soft, CR uses judgment)

| Unit | Prefer | Hard fail |
|------|--------|-----------|
| Each new component | ≤ 150 | > 200 |
| Orchestrator page | ≤ 150 | > 300 |

If actions exceeds 150, split block/report footer vs like/pass (e.g. `match-detail-block-report.tsx`) — **behavior unchanged**.

### Hooks

- **Reuse** existing hooks; do not fork copies under `match-detail/`.  
- Do **not** migrate block confirm onto `useMatchActions.block` in this story (behavior risk).  
- Optional (nice-to-have): extract `useMatchDetailLoad(id)` for the `Promise.all` — not required for ACCEPT.

### Modals

- Move `dynamic(...)` declarations into `match-detail-modals.tsx` so the page stays thin.  
- Keep `{ ssr: false }`.  
- Page (or actions) still owns `reportOpen` / celebration trigger state as today.

---

## Behavior freeze (regression)

Must still work exactly as today (covered by existing `page.spec.tsx` where present):

- Load success / error / loading  
- Like, pass, undo, mutual match + conversation CTA  
- Celebration modal on mutual  
- Feedback submit + thanks + sentiment pressed state  
- Hard block banner + disabled actions  
- Block confirm → leave list  
- Report dialog open/close  

No API / i18n key / route changes.

---

## Tests

1. Existing `[id]/page.spec.tsx` **green** (primary gate).  
2. Existing hook specs still green.  
3. Optional: light unit smoke on pure presentational pieces — **not required**.  

Do not delete coverage when deleting inline JSX — page specs remain the contract.

---

## Out of scope

| Item | Where |
|------|--------|
| Conversation detail split | **36.2** |
| Broader cleanup / docs sweep | **36.3** |
| Match list item refactor | Later |
| Changing hard-block / feedback product rules | Out |
| dating-api | Out |

---

## Acceptance criteria

- [x] UI split into `components/match-detail/*` per locked tree  
- [x] Orchestrator no longer holds the big article JSX inline  
- [x] Hooks reused (not reimplemented)  
- [x] Dynamic modals preserved (ideally colocated in `match-detail-modals`)  
- [x] All existing `data-testid`s and user-visible behavior preserved  
- [x] `[id]/page.spec.tsx` + hook specs green  
- [x] No dating-api / no intentional visual redesign  

---

## Agent 1 implementation order

1. Extract Header → HardBlock → Content → Feedback (lowest coupling).  
2. Extract Actions (incl. block confirm).  
3. Extract Modals (move `dynamic` imports).  
4. Slim page orchestrator.  
5. Run `[id]/page.spec.tsx` + hook specs; fix breakages.  
6. Handoff `agent-1-implement.md`.

---

## Done

Story **36.1 ACCEPT**. Next: `--agent 0 sprint 36 story 2`.
