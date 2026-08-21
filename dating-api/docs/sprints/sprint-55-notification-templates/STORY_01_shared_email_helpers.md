# Story 01 — Shared email helpers

**Sprint 55 · Done · P1 · ~1d**

**Status:** Done  
**Tip:** `feature/sprint-55-story-1` @ `efaac1b`

Extract shared `displayLabel`, `escapeHtml`, user-load + unsubscribe skip used by new-message / mutual / photo-rejection / report-ops.

## Definition of done

- [x] `email-format.util.ts` (`escapeHtml` + `displayLabel` → `Someone`)
- [x] `EmailRecipientHelper` load + unsubscribe skip
- [x] Four email services wired; local duplicates removed
- [x] ReportOps used shared `escapeHtml` (provider bypass removed in Story 02)
- [x] Specs + tsc green; Agents 2 approved; optional agents N/A
