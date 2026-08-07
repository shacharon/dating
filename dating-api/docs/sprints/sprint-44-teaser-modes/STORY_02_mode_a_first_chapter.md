# Story 02 — Mode A: first chapter card

**Sprint 44 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Story 01  
**Repo:** `dating-ui` primarily  
**Risk:** Low–medium  
**Handoffs:** `handoffs/STORY_02_mode_a_first_chapter/agent-*.md`

---

## Objective

Render **Mode A (`first_chapter`)** browse card: photo-dominant + **always-visible short hook** (Option 1). Default card for everyone until Story 5.

## Modeled UI copy (EN)

| Element | Copy |
|---------|------|
| Hook region | `teaser.lines[0]` (builder) |
| Expand why | Keep existing “Why” control labels from i18n |
| Empty hook fallback | `A little in common — open to see more` |

| Element | HE (target) |
|---------|-------------|
| Empty hook fallback | `יש קצת במשותף — כדאי לפתוח ולראות` |

**Tone:** light, concrete, swipe-friendly. No big % hero.

---

## Target layout

```
┌─────────────────────────────┐
│     [PHOTO ~70vh]           │
│  Name, age · city           │
│  (small % badge OK)         │
├─────────────────────────────┤
│  Both night owls · she      │
│  bakes on Saturdays ·       │
│  ask about Japan            │
│  ⌄ Why                      │
│  [Like]  [Pass]             │
└─────────────────────────────┘
```

---

## Scope

### Agent 0
1. Extend `MatchBrowseCard` vs new `MatchBrowseCardFirstChapter`
2. Hook typography: 2–3 lines, readable on mobile
3. Score: keep corner badge; do not enlarge

### Agent 1
1. When `teaser.mode === 'first_chapter'` (or default), render always-visible hook from `teaser.lines`
2. Replace weak `matchBrowseOneLiner` path for this mode
3. Tests: hook visible without expanding Why
4. Analytics: `match.teaser_mode` = `first_chapter` on card view

### Agent 2
1. Photo still ≥60% card height when Why closed
2. Dark mode + RTL check
3. No layout shift from long hooks (clamp / line-clamp 3)

### Agent 3
1. Visual smoke with fixtures
2. Confirm wife’s Option 1 feel: photo → short hook → Like/Pass

---

## Acceptance criteria

- [x] Mode A card shows 2–3 line hook without expand
- [x] Photo remains dominant
- [x] Like/Pass primary
- [x] Uses Story 01 `teaser` DTO
- [x] Default before Story 5

---

## Suggested commit

```
feat(ui): Mode A first-chapter match card (short hook)

Sprint 44 Story 2
```

---

## Close notes (Agent 3 · 2026-08-06)

- Shipped: `resolveMatchBrowseHook` + always-visible `match-browse-hook` on `MatchBrowseCard`; i18n `hookEmpty` EN/HE/ES; `teaser_mode` on `match.card_viewed`.
- Option 1 feel confirmed via layout + CR fixtures: photo `h-[70vh]` → short hook → Why → Like/Pass; small corner `%` only.
- Live browser dark/RTL eyeball optional operator follow-up (code uses `dark:` + logical `end-3` / `text-start`).
- Agent 4 skipped (UI only).
