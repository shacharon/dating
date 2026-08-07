# Story 04 — Mode C: new chapter card

**Sprint 44 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Story 01  
**Repo:** `dating-ui` primarily  
**Risk:** Medium (respectful tone for divorced/older)  
**Handoffs:** `handoffs/STORY_04_mode_c_new_chapter/agent-*.md`

---

## Objective

Render **Mode C (`new_chapter`)**: photo-first **hybrid** — score + seriousness on line 1, practical alignment on line 2. For divorced / older second chapter without assuming “score only.”

## Modeled UI copy (EN)

| Element | Copy |
|---------|------|
| Line 1 pattern | `{score}% · both want a real partnership` (from builder) |
| Line 2 pattern | practical · optional soft ask |
| Section label | `What lines up` |
| Expand | `Full why` |
| Empty fallback | `Clear life-goal overlap — open to learn more` |

| Element | HE (target) |
|---------|-------------|
| Section label | `מה מסתדר` |
| Expand | `כל הסיבה` |
| Empty fallback | `יש חפיפה ברורה במטרות — כדאי לפתוח` |

**Tone:** warm, clear, no slang, no pity language (“despite your divorce”), no fake urgency.

**Banned for Mode C UI chrome:** “Younger mode”, “Senior”, “Mature singles”, “Second chance at love” (cheesy). Prefer **new chapter**.

---

## Target layout

```
┌─────────────────────────────┐
│     [PHOTO big]             │
│  Name, age · city           │
├─────────────────────────────┤
│  88% · both want a real     │
│  partnership                │
│  Kids aligned · same city · │
│  ask about her travel       │
│  What lines up · ⌄ Full why │
│  [Like]  [Pass]             │
└─────────────────────────────┘
```

---

## Scope

### Agent 0
1. Hybrid ≠ Mode B clone: always 2-line block, photo stays large
2. Confirm wife insight: attraction still first

### Agent 1
1. Render when `teaser.mode === 'new_chapter'`
2. Map `teaser.lines[0]`, `teaser.lines[1]`
3. Tests + analytics mode tag

### Agent 2
1. No pity / ageist chrome copy
2. Line-clamp without cutting mid-word awkwardly
3. Contrast for % in text

### Agent 3
1. Review with “divorced / 50+” framing (respectful)
2. Compare A/B/C same profile — C feels calmer/clearer than B

---

## Acceptance criteria

- [x] Mode C shows 2-line hybrid teaser
- [x] Photo-first preserved
- [x] Wording uses “new chapter” language in product docs/UI labels
- [x] No ageist labels in UI

---

## Suggested commit

```
feat(ui): Mode C new-chapter match card (hybrid teaser)

Sprint 44 Story 4
```

---

## Close notes (Agent 3 · 2026-08-06)

- Shipped: Mode C hybrid on `MatchBrowseCard` (`teaser.lines` + section label); corner badge hidden; `browse.modeC` i18n; QA `dating.teaserModePreview=new_chapter`.
- A/B/C compare (fixture/CR): C is start-aligned two-line hybrid — calmer/clearer than B’s centered score billboard; photo-first all three; no pity/ageist chrome.
- Product docs keep “new chapter” framing; card chrome uses “What lines up” / “Full why” (architect lock).
- Prod Mode C traffic waits on Story 5; Agent 4 skipped (UI only).
