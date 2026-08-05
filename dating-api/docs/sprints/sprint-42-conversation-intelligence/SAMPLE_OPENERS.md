# Sample conversation openers — Sprint 42 Story 1

**Purpose:** Quality bar + iteration reference for LLM / fallback openers.  
**Prompt version:** `v1` (`CONVERSATION_STARTER_PROMPT_VERSION`)  
**Scope:** HIGH matches only; ≤15 words; grounded to interests/chips.

> **Note:** Live 50-opener LLM batch rating is tracked as a follow-up for Story 2 / beta validation (needs real API + OpenAI). Examples below mix **intended good output**, **deterministic fallback**, and **reject** cases covered by unit tests.

---

## Good (target ≥7/10)

| # | Context | Opener | Why |
|---|---------|--------|-----|
| 1 | Shared hiking | Into hiking too — done the Israel Trail yet? | Specific interest + question |
| 2 | Shared cooking | Fellow cook — what's your weeknight go-to? | Casual, grounded |
| 3 | Chip: Emotional depth + hiking note | Hiking and deep talks — favorite trail near you? | Mix chip/interest lightly |
| 4 | Shared photography | Into photography too — street or landscapes? | Short choice question |
| 5 | Shared travel (tags) | I saw you're into travel too — what's your favorite part? | Fallback template (deterministic) |
| 6 | Shared yoga | Into yoga too — studio or outdoors? | Natural |
| 7 | Shared books | Into books too — fiction or nonfiction lately? | Easy reply |
| 8 | Shared coffee | Coffee person too — best café find recently? | Local-feel without inventing city |
| 9 | Shared dogs | Into dogs too — what's your favorite part? | Fallback-safe |
| 10 | Shared running | Into running too — road or trail? | Clear ask |

---

## Mediocre (5–6/10 — acceptable start, improve in prompt v2)

| # | Opener | Issue |
|---|--------|-------|
| 11 | I saw you're into hiking too — what's your favorite part? | Correct but generic template |
| 12 | Emotional depth matters — how do you recharge? | Chip-only; less vivid |
| 13 | You both enjoy cooking — ask about that? | Sounds coachy if LLM echoes note |
| 14 | Into travel too — been anywhere fun? | Vague “fun” |
| 15 | Shared lifestyle pace — weekends slow or busy? | Chip jargon-ish |

---

## Bad — must reject / never ship

| # | Opener | Reject reason |
|---|--------|---------------|
| 16 | Hey, how are you? | Generic |
| 17 | Our compatibility score says we'd be great! | Deny: compatibility / score |
| 18 | Your Japan trip looked amazing — tips? | Ungrounded invent (not in fact pack) |
| 19 | Soulmate energy based on the algorithm | Deny: soulmate / algorithm |
| 20 | one two three … sixteen words … | Too many words |

Unit coverage: deny-list, word/char caps, ungrounded → fallback (`conversation-starter-validate` / generator specs).

---

## Edge cases (product behavior)

| Case | Expected |
|------|----------|
| No shared interests / note | `suggestedOpener: null` (hide) |
| GOOD / OTHER tier | Always null (no generate) |
| Hard-blocked HIGH | null; no LLM |
| LLM timeout | Fallback interest line or null; list still 200 |
| Cache hit (same eval pair + `v1`) | No second LLM call |

---

## Follow-up (tracked)

- [ ] Live LLM sample of ~20–50 HIGH pairs in beta → score ≥7/10 ≥80%
- [ ] Hebrew nicknames smoke once UI shows openers (Story 2)
- [ ] Consider passing engine `sharedInterestTags` into fact pack (Architect open Q #2) if quality weak
