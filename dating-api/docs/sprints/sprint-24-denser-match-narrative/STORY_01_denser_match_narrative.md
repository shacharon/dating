# Story 1: Detail narrative — shorter, denser why

**Sprint:** 24  
**Status:** Reverted  
**Depends on:** Sprint 23 Done

---

## Outcome

**Reverted.** Density (`v5`) shipped then rolled back — shorter copy lost profile-excerpt specificity. Stay on Sprint 23 **`v4`**.

Original AC below kept for history only.

---

## What

**As a** user  
**I want** the match why to be short and dense  
**So that** I grasp the fit in one glance and trust it more.

### Acceptance criteria

- [x] System prompt: write **~4–5** complete English sentences (scale with facts; never pad). Prefer ~80–120 words. Keep Phase 3 excerpt rules (≤1–2 short echoes). Keep v3+ bans / concrete closer.
- [x] Validator: raise the bar on length — tighten max sentences (architect locks; today’s `>16` is too loose for this product). Min stays ≥3 (or architect-agreed thin-pack floor). *(max **6**)*
- [x] Optional soft word-count check if architect wants it (reject or warn → fallback when wildly over). *(hard reject **>140** words)*
- [x] Bump `MATCH_NARRATIVE_PROMPT_VERSION` → **`v5`** (cache key shape unchanged; version invalidates).
- [x] Unit: overlong / padded fixtures fail validation → fallback; 4–5 sentence grounded prose with excerpt cue still passes; chip labels still banned from lean prompt.
- [x] Fallback: if structured fallback routinely exceeds the new density bar, trim (e.g. fewer evidence sentences / shorter thin-pack path) — only as needed. *(≤2 evidence)*
- [x] List TLDR, scoring, HG, redaction caps, Nest DTO shape: **untouched**.

### Out of scope

- Rewriting list copy.
- New Phase 3 fields / larger excerpt caps.
- Non-English generation.
- “Refresh explanation” button.

---

## Definition of done

- [x] Local smoke (optional): reopen match detail under `v5` → shorter why, still specific (quotes/evidence when present). *(deferred — operator)*
- [x] No regression: fluff bans + no inventing biography + no about\* dump in fallback.
- [x] Agent 4: **skip**.

## Suggested touchpoints

- `match-narrative-prompt.ts` (length instructions)
- `match-narrative-validate.ts` (+ specs)
- `match-narrative.types.ts` (`v5`)
- `match-narrative-fallback.ts` (only if needed)
- Generator / me-matches specs for `promptVersion`

## Agent pipeline

```text
--agent 0 sprint 24 story 1
--agent 1 sprint 24 story 1
--agent 2 sprint 24 story 1
--agent 3 sprint 24 story 1
```

**Skip Agent 4** by default.

## Close notes (Agent 3)

- Locked denser band: prompt 4–5 / ~80–120 words; validator max 6 sentences + 140 words; fallback ≤2 evidence; `v5`.
- Optional: restart API, reopen a match detail — expect shorter why, still specific.
