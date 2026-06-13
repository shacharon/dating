# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_match_detail_i18n.md](../../STORY_03_match_detail_i18n.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 3 localizes **match detail UI chrome** at `/dating/me-matches/[id]` and **`MatchCelebrationModal`**.
- Wire all user-facing **labels, buttons, status messages, and errors** via `useAppLocale()` → `copy.matches.detail`, `copy.matches.celebration`, plus shared `copy.common`, `copy.reportUser`, and `copy.launch.matchDetail` (feedback + score label).
- **Server/engine content stays English v1:** `evaluationSummary`, `explainability` chips, `reasonShort` / takeaway, `matchExplanationTraits` evidence, `recommendation.caution`, trait `group` names from API.
- **Candidate display names** from `matchDetailTitle` / `matchDetailSubtitle` (`match-display.ts`) remain English meta v1 (same as Story 2 list).
- Depends on Story 0 (`useAppLocale`, `matches.detail` schema) and Story 2 (list page; detail is separate route).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | updated — all detail chrome via i18n copy |
| `dating-ui/src/components/match-celebration-modal.tsx` | updated — `copy.matches.celebration` |
| `dating-ui/src/lib/i18n/types.ts` | verify — `matches.detail`, `matches.celebration`, `launch.matchDetail.feedback` |
| `dating-ui/src/lib/i18n/en.ts` | canonical strings |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | updated by agent 2 — EN assertions remain green |

**No changes:** `dating-api/*`, `me-matches/page.tsx` (Story 2)

---

## Decisions (do not reverse without discussion)

### 1. Page scope — detail + celebration modal only

| Surface | Story |
|---------|--------|
| `/dating/me-matches/[id]` | **Story 3** |
| `MatchCelebrationModal` | **Story 3** |
| Match list | Story 2 (done) |
| Report dialog body | Story 4 / existing `reportUser` keys (link label only on detail) |

---

### 2. Integration pattern

```tsx
const { locale, copy } = useAppLocale();
const detailCopy = copy.matches.detail;
const feedbackCopy = copy.launch.matchDetail.feedback;

// Loading / nav / sections
{detailCopy.backToMatches}
{copy.common.loading}
{detailCopy.whyYouMatch}
{detailCopy.aboutThem}

// Actions
{detailCopy.like} | {detailCopy.pass} | {detailCopy.block}
{detailCopy.actionStatus.liked} // etc.

// Errors — fallback to detailCopy.*Failed when Error.message absent
detailCopy.likeFailed | passFailed | undoFailed | blockFailed | feedbackFailed | loadFailed

// Analyzed date (same as list)
{detailCopy.analyzedPrefix}{' '}
{new Date(data.analyzedAt).toLocaleDateString(locale, { dateStyle: 'medium' })}

// Celebration modal (separate component)
const celebrationCopy = copy.matches.celebration;
{celebrationCopy.title} | {celebrationCopy.sendMessage} | closeAria
```

Pass `locale` into date formatting on detail page (already on list in Story 2).

---

### 3. Copy keys (frozen for Story 3)

**`matches.detail`:**

| Key group | Examples | UI |
|-----------|----------|-----|
| Nav | `backToMatches`, `backToMatchesButton` | Top link, bottom link |
| Header | `matchLabel` | Eyebrow |
| Sections | `whyYouMatch`, `aboutThem`, `traitStrong`, `traitModerate` | Section labels (not trait body) |
| Summary empty | `noSummary` | When no evaluationSummary |
| Meta | `analyzedPrefix` | Before date |
| Mutual | `youMatched`, `viewConversation` | Badge + link when mutual |
| Actions | `like`, `pass`, `block`, `undo`, `saving` | Buttons |
| Block flow | `blockConfirm`, `blockPermanently` | Confirm UI |
| Status | `actionStatus.liked/passed/blocked` | After action |
| A11y | `undoLikeAria`, `undoPassAria` | Undo buttons |
| Errors | `loadFailed`, `likeFailed`, `passFailed`, `undoFailed`, `blockFailed`, `feedbackFailed` | Fallback messages |

**`matches.celebration`:**

| Key | Use |
|-----|-----|
| `title` | Modal H2 |
| `sendMessage` | Primary CTA |
| `closeAria` | Close button |

**Shared (already in schema):**

| Key | Use on detail |
|-----|----------------|
| `common.loading`, `common.cancel` | Loading, block cancel |
| `launch.matchDetail.matchScoreLabel(score)` | Score line |
| `launch.matchDetail.feedback.*` | Thumbs feedback strip |
| `reportUser.linkLabel` | Report link |

---

### 4. Explicitly English v1 (render unchanged)

| Content | Source |
|---------|--------|
| `data.evaluationSummary` | API |
| `data.explainability.positiveChips`, `tensionChip` | API |
| `reasonShort` / `primaryTakeaway` one-liner | API |
| `trait.group`, `trait.evidence` | API |
| `data.recommendation.caution` | API |
| `matchDetailTitle`, `matchDetailSubtitle` | `match-display.ts` |

Section **headings** (`whyYouMatch`, `aboutThem`) are localized; **body text under them** from API stays EN.

---

### 5. Match action flows (behavior unchanged)

| Flow | API | UI copy |
|------|-----|---------|
| Like | `POST .../like` | `like`, `likeFailed`, celebration on mutual |
| Pass | `POST .../pass` | `pass`, `passFailed` |
| Undo | `DELETE .../action` | `undo`, `undoFailed`, aria labels |
| Block | `POST .../block` | confirm → `blockPermanently`, `blockFailed` |
| Feedback | `PUT .../feedback` | `feedbackCopy.*`, `feedbackFailed` |

No new endpoints.

---

### 6. Celebration modal

- Opened from detail page when `likeMatch` returns `mutualMatch: true`.
- Component owns no locale state — uses `useAppLocale()` internally.
- Candidate name stays dynamic (user data), not translated.

---

## Runtime topology (architect — realtime / proxy / cookies only)

- **REST:** unchanged — `GET /api/v1/me/matches/:id`, action endpoints via same-origin proxy.
- **Socket:** N/A.
- **Cookie:** session only; locale from localStorage.
- **Expected Network tab:** same match detail + action requests; no i18n endpoints.

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/app/dating/me-matches/\\[id\\]/page.spec.tsx`
- [ ] Existing EN tests: Like/Pass/Block, celebration `"It's a match!"`, block confirm — must stay green.
- [ ] Optional agent 2: Hebrew locale test for `detailCopy.like` / celebration title.
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Action buttons and status messages localized | `matches.detail` action + status keys |
| Celebration modal localized | `matches.celebration` |
| API evaluation/chips English | Unchanged body render |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 3
```

**Notes for next agent:**

1. Touch **`[id]/page.tsx`** and **`match-celebration-modal.tsx`** only for Story 3.
2. Do not translate API explainability bodies or chips.
3. Wire `feedbackCopy` and `matchScoreLabel` if not already using `getCopy`.
4. Run detail page spec before handoff to agent 2.
