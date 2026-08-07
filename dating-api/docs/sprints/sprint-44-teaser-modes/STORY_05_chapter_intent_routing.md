# Story 05 — Dating-chapter intent + mode routing

**Sprint 44 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Stories 01–04  
**Repo:** Both  
**Risk:** Medium (onboarding + persistence)  
**Handoffs:** `handoffs/STORY_05_chapter_intent_routing/agent-*.md`

---

## Objective

Let the user choose a **dating chapter** in onboarding/settings; persist it; route match cards to Mode A/B/C. Age is fallback only.

---

## Modeled wording (locked)

### Question
| Locale | Text |
|--------|------|
| EN | `Where are you in your dating story?` |
| HE | `איפה את/ה בסיפור הדייטים שלך?` |

### Helper under question
| Locale | Text |
|--------|------|
| EN | `This only changes how we present matches — not who we show.` |
| HE | `זה משנה רק איך מציגים לך התאמות — לא את מי מציגים.` |

### Choices

| Value | EN label | HE label | Mode |
|-------|----------|----------|------|
| `first_chapter` | `Just starting my chapter` | `בתחילת הדרך` | A |
| `ready_again` | `Ready again after a long relationship` | `מוכן/ה שוב אחרי מערכת יחסים ארוכה` | B |
| `new_chapter` | `Building a new chapter` | `בונה פרק חדש` | C |

**Optional subtext under `new_chapter` (EN):** `Divorced, separated, or dating again later in life`  
**HE:** `גרוש/ה, פרוד/ה, או חוזר/ת לדייטים בשלב מאוחר יותר`

**Do not use as labels:** Younger · Second time (bare) · Old · Mature · Gen Z

### Settings
| Locale | Text |
|--------|------|
| EN | `Dating chapter` / `Change how match cards look` |
| HE | `פרק הדייטים` / `לשנות איך נראות כרטיסי ההתאמה` |

---

## Routing rules

```
if user.datingChapter set → teaserMode = that value
else if ageYears ≤ 34 → first_chapter
else if ageYears ≤ 44 → ready_again
else if ageYears ≥ 45 → new_chapter
else → first_chapter  // safe default
```

**Note:** Age fallback is temporary. Prefer chapter always after onboarding.

---

## Scope

### Agent 0
1. Prisma field: `UserProfile.datingChapter` enum or string
2. Where in onboarding (basic vs texts vs new step) — prefer **one screen, low friction**
3. API: GET/PATCH me profile includes chapter
4. Match list: server applies mode when building `teaser` OR client selects layout from chapter — **lock one** (prefer server builds teaser with mode)

### Agent 1
1. Migration + API
2. Onboarding UI with modeled EN/HE copy
3. Settings edit path
4. Wire Stories 02–04 cards to resolved mode
5. Analytics: `profile.dating_chapter_set`

### Agent 2
1. No age-only hard UI without chapter field existing
2. Changing chapter re-renders teasers without re-login
3. Privacy: chapter is preference, not shown on public profile

### Agent 3
1. Manual: pick each chapter → confirm A/B/C cards
2. Age fallback with chapter unset
3. Update product doc shipping policy to “shipped”

---

## Acceptance criteria

- [x] User can set dating chapter (onboarding + settings)
- [x] Modeled EN (+ HE) copy used
- [x] Cards switch A/B/C from chapter
- [x] Age fallback only if unset
- [x] Default `first_chapter` when unknown
- [x] Chapter not exposed on other users’ profiles

---

## Suggested commit

```
feat(profile): dating chapter intent routes teaser modes A/B/C

Sprint 44 Story 5
```

---

## Close notes (Agent 3 · 2026-08-06)

- Shipped: `UserProfile.datingChapter` + server `resolveTeaserMode` → list/detail teasers; onboarding radios + settings section; cache invalidate on change; analytics `profile.dating_chapter_set`.
- Manual/AC smoke (fixture + CR): each chapter maps to Mode A/B/C cards; age proxy when unset; privacy OK (self profile only).
- Sprint 44 complete — all five stories Done.
- Agent 4 skipped (presentation preference only). Optional live browser operator pass remains non-blocking.
