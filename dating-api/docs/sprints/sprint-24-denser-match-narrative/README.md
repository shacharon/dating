# Sprint 24: Denser match detail narrative

**Epic:** Sprint 23 made list TLDR + detail why feel human. This sprint tried to tighten length (4–5 sentences / `v5`).
**Status:** **Reverted**
**Depends on:** Sprint 23 Done

---

## Outcome

**Full revert.** `v5` density cut soft length but also dropped Phase 3 “music” (profile excerpt echoes). Product preferred the longer Sprint 23 (`v4`) why.

Code restored to Sprint 23 end state:

- `MATCH_NARRATIVE_PROMPT_VERSION = 'v4'`
- Prompt: 5–12 sentences (no denser shape / word budget)
- Validator: min 3 / max 16 sentences (no 140-word cap)
- Fallback: up to 5 evidence sentences

---

## Story checklist

| # | Story | Status |
|---|-------|--------|
| 1 | [Detail narrative: shorter, denser why](./STORY_01_denser_match_narrative.md) | **Reverted** |

**Do not ship Sprint 24.** Restart API → detail opens miss on `v4` again (or hit existing `v4` cache).
