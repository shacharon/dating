# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_mode_b_ready_again.md](../../STORY_03_mode_b_ready_again.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  

---

## Summary

- **UI-only:** Mode B (`ready_again`) browse presentation — photo still first; teaser body is **large % + one life-goal claim** (Option 2).
- **Extend** `MatchBrowseCard` with a mode branch (same card as Mode A). Do **not** fork a separate card component.
- Until Story 5, API still defaults `teaser.mode = first_chapter` — Mode B renders only when mode is `ready_again`, plus a **QA preview override** (locked below).
- New i18n for Mode B sublabel / Why expand / empty claim. Analytics already emits `teaser_mode` (will be `ready_again` when active).
- **No API / Prisma / ranking changes.** **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/.../match-display.ts` | design — `resolveMatchBrowseClaim`, optional `resolveBrowseTeaserMode` (preview) |
| `dating-ui/.../match-browse-card.tsx` | design — Mode B body branch; hide corner badge when B |
| `dating-ui/.../match-why-section.tsx` | design — optional label overrides for Mode B expand copy |
| `dating-ui/src/lib/i18n/types.ts` + `en.ts` / `he.ts` / `es.ts` | design — Mode B browse strings |
| Specs: `match-browse-card.spec.tsx`, `match-display.spec.ts` | design — Agent 1/2 |
| `dating-api/*` | **no change** (DTO + builder already ship `claim` / `ready_again`) |

---

## Decisions (do not reverse without discussion)

### 1. Keep single `MatchBrowseCard` — branch on mode (locked)

```tsx
const mode = resolveBrowseTeaserMode(m); // see §3
if (mode === 'ready_again') {
  // Mode B teaser body
} else if (mode === 'first_chapter') {
  // Mode A hook (Story 2)
} else {
  // Story 4 owns new_chapter; until then treat as Mode A hook path
}
```

Do **not** create `MatchBrowseCardReadyAgain`. Optional extract: tiny presentational block in the same file or `match-browse-teaser-b.tsx` if card file grows — Agent 1 choice; prefer inline first.

### 2. Visual hierarchy (locked)

| Element | Mode A (Story 2) | Mode B (this story) |
|---------|------------------|---------------------|
| Photo closed | `h-[70vh]` | **same** — still photo-first |
| Corner `%` badge | small `text-xs` | **hidden** (score moves to body hero) |
| Teaser body | `lines[0]` hook `text-sm` clamp-3 | **Hero `%`** + **one claim** |
| Why | existing list labels | Mode B expand/sublabel strings |
| Like/Pass | primary | primary (unchanged) |

**Score hero typography:**

- Classes intent: `text-4xl` or `text-5xl`, `font-semibold`, `tabular-nums`, centered in teaser block.
- Value: `Math.round(matchScore)` when finite (list SOT — same as Mode A badge; do **not** prefer `teaser.score` if they diverge).
- If score null: omit hero `%` (show claim + sublabel only); do not invent a number.
- Gate: only when `teaser?.showScore !== false` (Mode B builder sets `showScore: true`).
- **Accessible:** hero element is text (`92%`), with `aria-label` e.g. `Match score 92 percent` (i18n optional; EN hardcode OK for Story 3 if needed). Not color-only.

**Claim typography:**

- One short sentence — **not** a paragraph.
- `text-base`–`text-lg`, `text-center`, `line-clamp-3` (safety; builder already ≤12 words).
- Present with clear emphasis: wrap in curly quotes in the UI (`“{claim}”`) **or** `font-medium` without quotes — **locked: use curly quotes** around the claim string; strip existing leading/trailing `"` from API if present to avoid double-quoting.
- `data-testid="match-browse-score-hero"` and `data-testid="match-browse-claim"`.

**Sublabel** (always under claim when Mode B):

- i18n `browse.modeB.sublabel` — `Why this is worth your time` / HE modeled.
- `data-testid="match-browse-mode-b-sublabel"`.
- Smaller muted text (`text-xs` / `text-sm` zinc-500).

### 3. When Mode B shows (locked) — Story 5 + QA preview

**Production (until Story 5):** API sends `first_chapter` → Mode A. Mode B UI is **dead path in prod** until Story 5 sets `teaser.mode = ready_again`.

**Render rule:**

```ts
export function resolveBrowseTeaserMode(m: MeMatchItemDto): TeaserMode {
  const preview = readTeaserModePreview(); // null | TeaserMode
  if (preview === 'ready_again' || preview === 'new_chapter' || preview === 'first_chapter') {
    return preview;
  }
  return m.teaser?.mode ?? 'first_chapter';
}
```

**QA preview flag (locked):**

| Mechanism | Detail |
|-----------|--------|
| `localStorage` key | `dating.teaserModePreview` |
| Values | `ready_again` \| `first_chapter` \| `new_chapter` \| unset |
| Scope | Client-only display override; **does not** change API / ranking |
| Tests | Prefer fixture `teaser.mode: 'ready_again'` (no need for localStorage in unit tests) |

Optional URL `?teaserPreview=ready_again` that writes the localStorage key on me-matches page client — **nice-to-have**; localStorage alone is enough for Agent 1. Document in story close notes for QA.

**Invariant:** Mode B layout **never** activates for `first_chapter` rows without preview override.

### 4. Claim source (locked)

```ts
export function resolveMatchBrowseClaim(
  m: MeMatchItemDto,
  claimEmpty: string,
): string {
  const claim = m.teaser?.claim?.trim();
  if (claim) return claim.replace(/^["“]+|["”]+$/g, '').trim() || claimEmpty;
  return claimEmpty;
}
```

- Prefer `teaser.claim` only — **do not** fall back to Mode A hook / `primaryTakeaway` / chips (avoids hobby fluff as hero — product tone lock).
- Empty → i18n `claimEmpty`.

### 5. Why section labels for Mode B (locked)

Extend `MatchWhySection` with optional overrides **or** pass mode-specific browse slice:

```ts
// Preferred: optional props
whyToggle?: string;      // collapsed: "See the full why"
whyHeading?: string;     // expanded heading — can reuse whyToggle or "Why we matched"
```

When Mode B:

| Slot | EN | HE |
|------|----|----|
| Sublabel (above Why, outside section) | `Why this is worth your time` | `למה זה שווה את הזמן שלך` |
| Why toggle (collapsed) | `See the full why` | `לראות את כל הסיבה` |
| Why heading (expanded) | keep Mode A `whyHeading` **or** same as toggle — **locked: use Mode A `whyHeading` when open** (less new copy) | same |

Do **not** use `whyToggleWithScore` on Mode B (score already hero). Collapsed toggle = Mode B expand string only.

Why **panel body** unchanged (`matchBrowseWhyBody` + chips).

### 6. i18n (locked)

Add under `matches.list.browse`:

```ts
modeB: {
  sublabel: string;
  whyExpand: string;   // collapsed toggle
  claimEmpty: string;
  scoreAria: (score: number) => string; // e.g. "Match score 92 percent"
}
```

| Key | EN | HE |
|-----|----|----|
| `sublabel` | `Why this is worth your time` | `למה זה שווה את הזמן שלך` |
| `whyExpand` | `See the full why` | `לראות את כל הסיבה` |
| `claimEmpty` | `Strong life-goal fit — open for details` | `התאמה חזקה במטרות — כדאי לפתוח` |
| `scoreAria` | `(n) => \`Match score ${n} percent\`` | HE equivalent |

ES: schema parity with plain Spanish (Agent 1).

Mode A `hookEmpty` / why strings **unchanged**.

### 7. Analytics (locked)

Reuse Story 2 `match.card_viewed` + `teaser_mode`. When Mode B active, `teaser_mode: 'ready_again'` (from `resolveBrowseTeaserMode`). No new event name.

### 8. Layout invariants (locked)

```
[PHOTO ~70vh closed / 40vh Why open]
Name, age · city   (no corner % in Mode B)
─────────────────────────────────────
        92%          ← hero, tabular
  “Both want something serious — kids already clear”
  Why this is worth your time
  ⌄ See the full why
  [Like]  [Pass]
```

- Photo still ≥60% card height when Why closed.
- Teaser block centered, compact — avoid LinkedIn/sales wall of text (Agent 3 eyeball).
- Dark: hero + claim use existing zinc/white dark tokens.
- RTL: logical centering (`text-center` OK); quotes inherit `dir`.

### 9. Untouched (locked)

- API `buildMatchTeaser` / list DTO shape / ranking / Prisma.
- Mode A path behavior (except shared card still hosts both).
- Mode C layout (Story 4).
- Onboarding chapter persistence (Story 5) — preview flag is temporary QA only.

---

## API contract

**No HTTP changes.** Mode B consumes existing:

```json
{
  "teaser": {
    "mode": "ready_again",
    "lines": [],
    "claim": "Both want something serious — kids already clear",
    "showScore": true,
    "score": 92
  },
  "matchScore": 92
}
```

---

## Service / function signatures

```ts
// match-display.ts
resolveBrowseTeaserMode(m: MeMatchItemDto): TeaserMode
readTeaserModePreview(): TeaserMode | null  // localStorage
resolveMatchBrowseClaim(m: MeMatchItemDto, claimEmpty: string): string
// resolveMatchBrowseHook — unchanged for Mode A

// match-browse-card.tsx
// branch on resolveBrowseTeaserMode(m)
// Mode B: score hero + quoted claim + sublabel; hide corner badge
// MatchWhySection whyToggle={listCopy.browse.modeB.whyExpand} when Mode B
```

---

## Migration plan

**N/A.** Rollback = remove Mode B branch (Mode A only). Clear `dating.teaserModePreview` localStorage for QA.

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-display.ts` | Claim + mode preview helpers |
| `match-browse-card.tsx` | Mode B UI branch |
| `match-why-section.tsx` | Optional toggle label override |
| i18n en/he/es + types | `browse.modeB.*` |
| Specs | Fixture `teaser.mode: 'ready_again'`; assert hero + claim; Mode A regression |

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations. Optional QA: set localStorage preview on me-matches.

---

## E2E verification (agent 4)

**Skip Agent 4** — UI presentation only; eligibility/ranking unchanged.

---

## Tests / verification (plan for Agent 1–2)

- [ ] Mode B fixture: hero `%` + claim visible; Why collapsed; Like/Pass present
- [ ] Corner badge **absent** in Mode B; present in Mode A regression
- [ ] Empty claim → `claimEmpty` i18n
- [ ] Null score → no hero number; claim still shows
- [ ] `teaser_mode: 'ready_again'` on `match.card_viewed`
- [ ] Claim quotes / strip double-quotes; word count from builder not re-enforced in UI beyond clamp
- [ ] Score `aria-label` present (a11y)
- [ ] Mode A path unchanged when `first_chapter`
- [ ] Preview helper unit test (optional)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network: N/A
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Depends on Story 01 `teaser.claim` / Mode B builder (Done). Prod Mode B traffic waits on Story 5; QA uses fixture or `dating.teaserModePreview`.

---

## Next agent

```text
--agent 1 sprint 44 story 3
```

**Notes for next agent:**

1. Implement Mode B branch in `MatchBrowseCard` + i18n `modeB` + claim/mode helpers.
2. Tests with `teaser.mode: 'ready_again'` fixtures; keep Mode A green.
3. Do not change API; do not implement Mode C or Story 5 routing (preview localStorage only).
4. Suggested commit: `feat(ui): Mode B ready-again match card (score + claim)` / Sprint 44 Story 3.
