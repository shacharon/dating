# Story 4: Report user

**Sprint:** 9  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** — (block flow exists from Sprint 1)

---

## Why

**Block** hides someone from the actor's view only. Launching to strangers requires a **report** path so ops can review harassment, scams, or inappropriate photos/messages. Block and report must be independent actions.

---

## What

**As a** user  
**I want** to report someone for bad behavior  
**So that** the team can review and protect the community

### Acceptance criteria

- [x] **Data model** — `UserReport`:
  - `reporterUserId`, `reportedUserId` (derived server-side from context)
  - `reason` enum (`HARASSMENT`, `SPAM`, `FAKE_PROFILE`, `INAPPROPRIATE_CONTENT`, `OTHER`)
  - optional `details` text (max 1000, sanitized)
  - `contextType` + `contextId` (`MATCH_PROFILE` | `CONVERSATION`)
  - `createdAt`, `status` (`OPEN` | `DISMISSED` | `ACTION_TAKEN`) — ops updates manual v1
  - debounce: one **OPEN** report per `(reporter, reported, reason)` within 24h → **409**
- [x] **API** — `POST /api/v1/me/reports`; auth required; cannot report self → **400**
- [x] **UI entry points:**
  - Match detail — Report link near Block
  - Conversation — overflow menu → Report
- [x] **UI flow** — reason picker + optional details → confirm → success message
- [x] **Observability** — `USER_REPORT_CREATED` trace (ids + reason + context; **no details text**); optional `REPORT_OPS_EMAIL` → ops email
- [x] **Analytics** — `user.reported` with `{ reason }` only
- [x] **Independence** — reporting does not auto-block
- [x] **Tests** — API auth, self-report, debounce, UI submits *(integration smoke deferred operator)*

### Out of scope (this story)

- Admin dashboard to triage reports
- Auto-ban on N reports
- Reporting individual messages (conversation-level report is enough for v1)
- Photo moderation pipeline

---

## Technical notes (guidance, not prescriptive)

- Module: `dating-api/src/reports/`
- Migration: `20260606180000_add_user_report`
- Do not store message body in report row — `contextId` reference only

---

## Definition of done

- [x] Migration + API + UI shipped
- [x] Ops can query reports via DB or receive email (`REPORT_OPS_EMAIL`)
- [x] Block flow unchanged
- [x] Tests + PII review

---

## Manual smoke

1. A reports B from match detail with reason `HARASSMENT` → 201 + DB row. *(operator)*
2. A reports B again same day → **409** `report_duplicate`. *(operator)*
3. A blocks B without reporting → both flows work. *(operator)*
4. A tries to report self → 400. *(covered by API tests)*

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Data | `UserReport` model + migration |
| API | `ReportsModule` — `POST /api/v1/me/reports` |
| Ops notify | `ReportOpsEmailService` + `REPORT_OPS_EMAIL` env |
| Analytics | `user.reported` funnel event |
| UI | `ReportUserDialog` on match detail + conversation overflow |
| i18n | `reportUser` copy en + es |
| Tests | **16/16** API report tests; **234/234** UI suite |

Handoffs: `handoffs/STORY_04_report_user/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Browser report smoke | Operator |
| Admin triage UI | Future sprint |
| Report message by id | Future |
| Sentry alert on report spike | Ops |
