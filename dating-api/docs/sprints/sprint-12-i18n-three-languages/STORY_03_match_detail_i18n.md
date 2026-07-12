# Story 3: Match detail i18n

**Sprint:** 12  
**Status:** Done  
**Depends on:** Story 2  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

Wire `/dating/me-matches/[id]` + `MatchCelebrationModal`:

- Nav, loading, section labels (UI chrome only)
- Like / Pass / Block / Undo / confirm copy
- Mutual match badge + celebration modal
- Error messages for actions

---

## Out of scope

- `evaluationSummary`, chips, traits, caution (API English)
- Report dialog body — Story 4 (`reportUser.linkLabel` only on detail footer)

---

## Definition of done

- [x] Action buttons and status messages localized
- [x] Celebration modal localized
- [x] Hebrew detail chrome tested; API takeaway/chips remain EN (340/340 full suite)
