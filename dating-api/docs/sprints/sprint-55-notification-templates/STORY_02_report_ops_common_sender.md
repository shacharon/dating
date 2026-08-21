# Story 02 — ReportOps via common sender

**Sprint 55 · Done · P1 · ~0.5d · Agent 2.5**

**Status:** Done  
**Tip:** `feature/sprint-55-story-2` @ `4d6f2cf`

Route ReportOpsEmail through shared ops sender (stop bypassing provider resolver). Uses `sendOpsBestEffort` — not user transactional send (no unsubscribe).

## Definition of done

- [x] `EmailNotificationService.sendOpsBestEffort` (no unsubscribe / no userId)
- [x] ReportOps builds template → ops sender; no `EmailProviderResolver` bypass
- [x] ErrorCodes preserved; HTML body still `escapeHtml`
- [x] Specs + tsc green; Agents 2 + 2.5 approved
- [x] Agent 5 optional post-deploy only (not a Done gate)
