# Story 03 — Mode B: ready again card

**Sprint 44 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Story 01  
**Repo:** `dating-ui` primarily  
**Risk:** Medium (must not feel salesy)  
**Handoffs:** `handoffs/STORY_03_mode_b_ready_again/agent-*.md`

---

## Objective

Render **Mode B (`ready_again`)**: photo still first, but teaser centers on **score + one sharp life-goal claim** (Option 2).

## Modeled UI copy (EN)

| Element | Copy |
|---------|------|
| Score hero | `{score}%` (large, tabular) |
| Claim | `teaser.claim` in quotes or clear emphasis |
| Sublabel | `Why this is worth your time` |
| Expand | `See the full why` |
| Empty claim fallback | `Strong life-goal fit — open for details` |

| Element | HE (target) |
|---------|-------------|
| Sublabel | `למה זה שווה את הזמן שלך` |
| Expand | `לראות את כל הסיבה` |
| Empty claim fallback | `התאמה חזקה במטרות — כדאי לפתוח` |

**Tone:** adult, direct, time-respecting. No hobby-only fluff as the hero.

---

## Target layout

```
┌─────────────────────────────┐
│     [PHOTO]                 │
│  Name, age · city           │
├─────────────────────────────┤
│         92%                 │
│  “Both want something       │
│   serious — kids clear”     │
│  Why this is worth your time│
│  ⌄ See the full why         │
│  [Like]  [Pass]             │
└─────────────────────────────┘
```

---

## Scope

### Agent 0
1. Visual hierarchy: % larger than Mode A badge
2. Claim typography (not a paragraph)
3. Still photo-first (not text-first card)

### Agent 1
1. Render when `teaser.mode === 'ready_again'`
2. Wire `teaser.claim` + `teaser.score`
3. Tests for claim + score visibility
4. Analytics: `match.teaser_mode` = `ready_again`

### Agent 2
1. Claim ≤12 words / length cap from builder
2. Accessible score (not color-only)
3. RTL for HE strings

### Agent 3
1. Side-by-side A vs B with same fixture
2. Check: doesn’t feel like LinkedIn / sales landing

---

## Acceptance criteria

- [x] Mode B shows large % + one claim
- [x] Photo still above the fold / dominant
- [x] Expand why optional
- [x] No Mode B unless mode set (Story 5) — or preview flag for QA

---

## Suggested commit

```
feat(ui): Mode B ready-again match card (score + claim)

Sprint 44 Story 3
```

---

## Close notes (Agent 3 · 2026-08-06)

- Shipped: Mode B branch on `MatchBrowseCard` (hero `%` + quoted claim + sublabel); corner badge hidden; `browse.modeB` i18n; QA `dating.teaserModePreview`.
- Side-by-side A vs B (fixture evidence): A = short hook + small badge; B = large % + one life-goal claim — photo still first both; not LinkedIn/sales (compact centered teaser, no paragraph wall).
- Prod Mode B traffic waits on Story 5; until then use fixture or localStorage preview.
- Agent 4 skipped (UI only).
