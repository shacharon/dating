# Match Card Teaser Modes — Audience Options

**Status:** Sprint 44 **shipped** — Stories 01–05 **Done**  
**Date:** 2026-08-06  
**Wording:** Modeled in sprint README (chapter language, not age labels)  
**Impl:** `match-teaser.ts` (`resolveTeaserMode`) + Mode A/B/C cards + `UserProfile.datingChapter` (onboarding/settings).

---

## Core product feel (all modes)

1. Photo first → attraction  
2. Teaser → curiosity (“MAY”)  
3. Deeper why optional → Like / Pass  

Same engine. Different curiosity packaging.

---

## Three modes (internal ids)

| Mode | Id | Audience | Layout |
|------|-----|----------|--------|
| **A** | `first_chapter` | First serious dating chapter | Short hook under photo (Option 1) |
| **B** | `ready_again` | Ready again after a long relationship | Big % + one life-goal claim (Option 2) |
| **C** | `new_chapter` | Divorced / older — building a new chapter | Photo-first hybrid: % + seriousness + practical line |

**Never in UI chrome:** Younger · Gen Z · Old · Mature singles · Second chance at love

---

## Onboarding question (modeled)

**EN:** `Where are you in your dating story?`  
**HE:** `איפה את/ה בסיפור הדייטים שלך?`

**Helper EN:** `This only changes how we present matches — not who we show.`  
**Helper HE:** `זה משנה רק איך מציגים לך התאמות — לא את מי מציגים.`

| Choice EN | Choice HE | Mode |
|-----------|-----------|------|
| Just starting my chapter | בתחילת הדרך | A |
| Ready again after a long relationship | מוכן/ה שוב אחרי מערכת יחסים ארוכה | B |
| Building a new chapter | בונה פרק חדש | C |

`new_chapter` optional subtext EN: `Divorced, separated, or dating again later in life`

---

## Teaser formulas

| Mode | Formula |
|------|---------|
| A | `{vibe} · {specific} · {ask?}` |
| B | `{score}%` + one claim (≤12 words) |
| C | `{score}% · {seriousness}` + `{practical} · {soft?}` |

### Golden EN examples

**A:** `Both night owls · she bakes on Saturdays · ask about Japan`  
**B:** `92%` + `Both want something serious — kids already clear`  
**C:** `88% · both want a real partnership` / `Kids situation aligned · same city · ask about her travel`

---

## Routing

1. User `datingChapter` if set  
2. Else age proxy: ≤34 A · ≤44 B · ≥45 C  
3. Else default **A**

Age is fallback only. Wife @ 52 preferred Option 1 energy → Mode C stays **photo-first**.

---

## Shipping (Sprint 44)

1. Story 01 — teaser builder + DTO — **Done**
2. Story 02 — Mode A card (default) — **Done**
3. Story 03 — Mode B card — **Done**
4. Story 04 — Mode C card — **Done**
5. Story 05 — chapter intent + routing — **Done**

**Shipped.** Chapter choice in onboarding/settings; age proxy only when unset.

---

## One-line summary

**Three dating chapters, three teasers — chapter wording in the product, age only as backup.**
