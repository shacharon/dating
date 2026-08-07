# Sprint 44 — Match Card Teaser Modes (3 audiences)

**Status:** ✅ Done (Stories 01–05)  
**Depends on:** Sprint 41–43 Smart Triage Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md) · Product: [`../../product/MATCH_CARD_TEASER_MODES.md`](../../product/MATCH_CARD_TEASER_MODES.md)

**Context:** One matching engine, three curiosity packages. Wife (52) preferred short-hook energy; product still wants distinct modes for first-chapter / ready-again / new-chapter (divorced-older).

---

## Goal

Ship three match-card teaser modes with **modeled wording** (EN + HE ready structure), selectable by dating-chapter intent (not age alone):

| Mode | Internal id | Audience | Card feel |
|------|-------------|----------|-----------|
| **A** | `first_chapter` | First serious dating chapter (~25–34 proxy) | Photo + always-visible short hook |
| **B** | `ready_again` | Back after a long relationship (~32–45 proxy) | Photo + big % + one sharp life-goal line |
| **C** | `new_chapter` | Divorced / older second chapter (~45–60 proxy) | Photo-first hybrid: % + seriousness + practical line |

**Non-goals:** Changing match scores, new ranking weights, Option 3 two-step gate, monetization.

---

## Modeled wording (locked for UX)

### Onboarding — how the user picks a mode

**Question (EN):**  
`Where are you in your dating story?`

**Question (HE):**  
`איפה את/ה בסיפור הדייטים שלך?`

| Choice (EN) | Choice (HE) | Maps to |
|-------------|-------------|---------|
| `Just starting my chapter` | `בתחילת הדרך` | Mode A `first_chapter` |
| `Ready again after a long relationship` | `מוכן/ה שוב אחרי מערכת יחסים ארוכה` | Mode B `ready_again` |
| `Building a new chapter (divorced / older)` | `בונה פרק חדש (גרוש/ה או מבוגר/ת יותר)` | Mode C `new_chapter` |

**Do not show in UI:** “Younger”, “Gen Z”, “Old people”. Age is fallback only.

### Card teaser formulas

| Mode | Formula | Max length |
|------|---------|------------|
| A | `{vibe} · {specific} · {ask?}` | ~90 chars / 2–3 lines |
| B | `{score}%` + one quoted life-goal claim | 1 claim, ≤12 words |
| C | `{score}% · {seriousness}` then `{practical} · {soft?}` | 2 lines |

### Example teasers (EN) — use as golden fixtures

**Mode A**
- `Both night owls · she bakes on Saturdays · ask about Japan`
- `Same weekend energy · hiking + markets`

**Mode B**
- `92%` + `Both want something serious — kids already clear`
- `88%` + `Aligned on long-term · similar timeline`

**Mode C**
- `88% · both want a real partnership`
- `Kids situation aligned · same city · ask about her travel`

### Banned phrasing (all modes)
- “Compatibility coefficient”, chip jargon, “dealbreaker filter”
- “You’d be stupid to pass”
- Fake scarcity (“Only 3 matches left!”)
- Gen-Z slang on Mode C; corporate HR tone on Mode A

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Teaser wording system + builder](./STORY_01_teaser_wording_system.md) | P0 | 2d | Done |
| 02 | [Mode A — first chapter card](./STORY_02_mode_a_first_chapter.md) | P0 | 2d | Done |
| 03 | [Mode B — ready again card](./STORY_03_mode_b_ready_again.md) | P0 | 2d | Done |
| 04 | [Mode C — new chapter card](./STORY_04_mode_c_new_chapter.md) | P0 | 2d | Done |
| 05 | [Dating-chapter intent + mode routing](./STORY_05_chapter_intent_routing.md) | P0 | 2d | Done |

**Order:** 01 → 02 → 03 → 04 → 05  
(02–04 can parallel after 01 locks the teaser DTO; 05 wires selection.)

---

## Success metrics

| Metric | Target |
|--------|--------|
| Three distinct card layouts | Render from `teaserMode` |
| Wording fixtures | Golden EN examples match formulas |
| Intent capture | Onboarding stores chapter → mode |
| Age fallback | Only if chapter unset |
| Default before intent | Mode A for everyone (safe default) |
| i18n | EN strings shipped; HE keys stubbed or shipped |

---

## After Sprint 44

- Hebrew polish pass if stubs only
- Live A/B: Mode B vs C for overlapping ages
- Resume Part 2 (onboarding length) / Part 4 (growth) from product review
