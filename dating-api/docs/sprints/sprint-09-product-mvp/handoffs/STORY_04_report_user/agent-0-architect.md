# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_report_user.md](../../STORY_04_report_user.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **New Prisma model `UserReport`** + migration — first moderation artifact in product DB.
- **New `ReportsModule`** — `POST /api/v1/me/reports` (session auth); **does not** call block/match-action code.
- **Report identity from context** — client sends `contextType` + `contextId` only; server derives `reportedUserId` (prevents mismatched ids).
- **24h debounce** — application check: one **OPEN** row per `(reporterUserId, reportedUserId, reason)` within rolling 24h → **409** `report_duplicate`.
- **Observability** — ops trace `USER_REPORT_CREATED` via `StructuredObservabilityService` (ids + reason + context; **no `details` text** in log).
- **Product analytics** — new event `user.reported` with `{ reason }` only (extend `ProductAnalyticsEvents`).
- **Ops email (optional)** — `REPORT_OPS_EMAIL` env → best-effort plain email via existing Resend/noop stack (**may include `details`** for triage; not in analytics).
- **UI** — shared `ReportUserDialog`; entry on match detail (link near Block) + conversation (overflow menu with Report).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `UserReport` model + enums |
| `dating-api/prisma/migrations/*` | new migration |
| `dating-api/src/reports/reports.module.ts` | **created** |
| `dating-api/src/reports/reports.controller.ts` | `POST api/v1/me/reports` |
| `dating-api/src/reports/reports.service.ts` | create + debounce + context validation |
| `dating-api/src/reports/dto/create-user-report.dto.ts` | class-validator DTO |
| `dating-api/src/reports/dto/user-report-response.dto.ts` | 201 response shape |
| `dating-api/src/reports/reports.service.spec.ts` | unit tests |
| `dating-api/src/reports/reports-http.integration.spec.ts` | auth, self, debounce, context |
| `dating-api/src/notifications/report-ops-email.service.ts` | optional ops notify |
| `dating-api/src/notifications/email-notification-config.service.ts` | `reportOpsEmail` getter |
| `dating-api/src/notifications/notifications.module.ts` | export `ReportOpsEmailService` |
| `dating-api/src/analytics/product-analytics.events.ts` | `USER_REPORTED: 'user.reported'` |
| `dating-api/src/logging/error-codes.ts` | `USER_REPORT_*` codes |
| `dating-api/src/app.module.ts` | import `ReportsModule` |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | document `user.reported` |
| `dating-api/.env.example` | `REPORT_OPS_EMAIL` comment |
| `dating-ui/src/lib/report-user-api.ts` | **created** — `createUserReport()` |
| `dating-ui/src/lib/report-user-options.ts` | reason enum constants |
| `dating-ui/src/components/report-user-dialog.tsx` | **created** — reason + details + confirm |
| `dating-ui/src/components/report-user-dialog.spec.tsx` | submit mock |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | Report link + dialog |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | report flow tests |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | overflow menu → Report |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | report menu tests |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `reportUser` copy |

**No changes required:** `MeMatchActionsService` block path, `MatchAction` schema, match list filters.

---

## Decisions (do not reverse without discussion)

### 1. Module placement — dedicated `reports/` (not buried in me-profile)

| Approach | Verdict |
|----------|---------|
| Add to `MeProfileController` only | **Rejected** — new domain + migration; grows me-profile further |
| New `ReportsModule` + `ReportsController` under `api/v1/me/reports` | **Chosen** |

`ReportsModule` imports: `PrismaModule`, `AuthModule`, `StructuredLoggingModule`, `AnalyticsModule`, `NotificationsModule`, `MeProfileModule` (for profile/conversation resolution helpers — import exported services only).

---

### 2. API contract — `POST /api/v1/me/reports`

```http
POST /api/v1/me/reports
Auth: session cookie
Content-Type: application/json

{
  "reason": "HARASSMENT",
  "details": "optional free text",
  "contextType": "MATCH_PROFILE",
  "contextId": "prof_candidate_1"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `reason` | enum | Required — see §3 |
| `details` | string \| omit \| null | Optional; trim; max **1000** chars; strip `\0`; omit/`null` = no details |
| `contextType` | enum | Required — `MATCH_PROFILE` \| `CONVERSATION` |
| `contextId` | string | Required; non-empty |

**Do not accept `reportedUserId` in body** — derived server-side from validated context.

**Responses:**

| Status | When | Body |
|--------|------|------|
| **201** | Created | `{ id, reason, status, createdAt, contextType, contextId }` |
| **400** | Validation / self-report / bad context | `{ error: 'report_invalid_context' \| 'cannot_report_self' \| validation messages }` |
| **401** | No session | existing auth pattern |
| **404** | Unknown profile or conversation for viewer | `{ error: 'report_context_not_found' }` |
| **409** | Duplicate within 24h | `{ error: 'report_duplicate' }` |

Use `MeProfileValidationPipe` or equivalent `ValidationPipe` on controller (whitelist + transform).

---

### 3. Enums (Prisma + DTO + UI)

**`UserReportReason`**

| Value | UI label (en) |
|-------|----------------|
| `HARASSMENT` | Harassment or threats |
| `SPAM` | Spam or scam |
| `FAKE_PROFILE` | Fake or misleading profile |
| `INAPPROPRIATE_CONTENT` | Inappropriate photos or messages |
| `OTHER` | Something else |

**`UserReportStatus`** (DB default `OPEN`; ops updates manually in v1)

- `OPEN` | `DISMISSED` | `ACTION_TAKEN`

**`UserReportContextType`**

- `MATCH_PROFILE` — `contextId` = `UserProfile.id` (match detail URL `:id`)
- `CONVERSATION` — `contextId` = `MutualMatch.id` (conversation URL `:id`)

---

### 4. Prisma schema (locked)

```prisma
enum UserReportReason {
  HARASSMENT
  SPAM
  FAKE_PROFILE
  INAPPROPRIATE_CONTENT
  OTHER
}

enum UserReportStatus {
  OPEN
  DISMISSED
  ACTION_TAKEN
}

enum UserReportContextType {
  MATCH_PROFILE
  CONVERSATION
}

model UserReport {
  id             String               @id @default(cuid())
  reporterUserId String
  reporter       User                 @relation("ReportsByReporter", fields: [reporterUserId], references: [id])
  reportedUserId String
  reported       User                 @relation("ReportsByReported", fields: [reportedUserId], references: [id])
  reason         UserReportReason
  details        String?              @db.VarChar(1000)
  contextType    UserReportContextType
  contextId      String
  status         UserReportStatus     @default(OPEN)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@index([status, createdAt])
  @@index([reportedUserId, status])
  @@index([reporterUserId, reportedUserId, reason, createdAt])
}
```

Add on `User`:

```prisma
reportsAsReporter UserReport[] @relation("ReportsByReporter")
reportsAsReported UserReport[] @relation("ReportsByReported")
```

**No DB unique for 24h window** — rolling window enforced in service (query latest OPEN row).

**Do not store** message bodies, profile text, or photo URLs in the row — only `contextId` reference.

---

### 5. Context resolution + authorization

```typescript
// reports.service.ts — locked behavior

MATCH_PROFILE:
  - Load UserProfile by contextId (404 if missing)
  - reportedUserId = profile.userId
  - if reportedUserId === reporterUserId → 400 cannot_report_self
  - Do NOT call assertMatchCandidateVisible (block must not prevent reporting
    when user still has conversation access; match detail uses profile id directly)

CONVERSATION:
  - Reuse MeConversationsService.getById(reporterUserId, contextId) OR equivalent
    participant check (404 if not participant / not ACTIVE)
  - reportedUserId = otherUser.id from conversation shell
  - if reportedUserId === reporterUserId → 400 (defensive)
```

Cross-check: `reportedUserId` must exist as `User` row (404 if profile orphaned — unlikely).

---

### 6. Debounce (24h)

Before insert:

```typescript
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const existing = await prisma.userReport.findFirst({
  where: {
    reporterUserId,
    reportedUserId,
    reason,
    status: 'OPEN',
    createdAt: { gte: since },
  },
});
if (existing) throw new ConflictException({ error: 'report_duplicate' });
```

Manual smoke #2: second report same day → **409** (not silent 201).

---

### 7. Independence from block

| Action | Behavior |
|--------|----------|
| Report | Inserts `UserReport` only |
| Block | Unchanged — `POST .../actions` `{ action: "BLOCK" }` |
| Report then block | Two separate UI actions; no shared confirm |
| Block then report from match detail | Block hides detail (404) — user may still report from **conversation** if mutual exists |

**Do not** auto-block on report. **Do not** auto-unmatch on report.

---

### 8. Observability vs product analytics

| Channel | Event | Payload |
|---------|-------|---------|
| Ops structured log | `StructuredObservabilityService.trace` | `USER_REPORT_CREATED` — `reportId`, `reporterUserId`, `reportedUserId`, `reason`, `contextType`, `contextId` — **no `details`** |
| Product analytics | `analytics.track(reporterUserId, 'user.reported', { reason })` | **reason enum only** — no ids in properties (consistent with minimal funnel props; envelope has `userId`) |

Update `PRODUCT_FUNNEL.md` with new row.

Ops email failure: log `USER_REPORT_OPS_EMAIL_FAILED`; **do not** fail 201.

---

### 9. Ops email — `REPORT_OPS_EMAIL`

Extend `EmailNotificationConfigService`:

```typescript
get reportOpsEmail(): string | undefined {
  return trimOrUndefined(this.config.get<string>('REPORT_OPS_EMAIL'));
}
```

`ReportOpsEmailService.notifyReportCreatedBestEffort(report)`:

- Skip if `reportOpsEmail` unset (local dev default).
- Send via `EmailNotificationService` when `EMAIL_PROVIDER=resend`.
- Subject: `[dating] User report — ${reason}`
- Body: report id, reason, reporter/reported user ids, contextType/contextId, createdAt, **details** (if any).
- No user email addresses in body.

---

### 10. UI — shared dialog + entry points

**Component:** `ReportUserDialog`

Props:

```typescript
{
  open: boolean;
  onClose: () => void;
  contextType: 'MATCH_PROFILE' | 'CONVERSATION';
  contextId: string;
  subjectLabel: string; // display name for confirm copy
}
```

Flow (mirror block confirm pattern):

1. Reason `<select>` or radio group (required)
2. Optional `<textarea>` details (max 1000 client-side)
3. Confirm line: “Report {name} for {reason}?”
4. Submit → `createUserReport()` → inline success message (role=status) → auto-close after ~2s or manual Close
5. Errors: duplicate, network, validation — role=alert

**Match detail** (`me-matches/[id]/page.tsx`):

- Add **Report** text link adjacent to **Block** (same footer column).
- `contextType=MATCH_PROFILE`, `contextId=profileId` from route.

**Conversation** (`conversations/[id]/page.tsx`):

- Add **overflow control** — `<details>` or button `⋯` with menu item **Report** (story AC).
- `data-testid="conversation-report-menu"` / `conversation-report-open`
- `contextType=CONVERSATION`, `contextId=conversationId`, `subjectLabel=otherName`

**i18n:** `reportUser` section in en + es (title, reasons, details placeholder, confirm, success, errors including duplicate).

---

### 11. Block flow — unchanged

No edits to:

- `MeMatchActionsService.createAction` BLOCK branch
- `MeMatchesService` block filters
- Block confirm copy on match detail

CR must verify report tests do not regress block specs.

---

## Runtime topology

```text
Browser (session cookie)
  → POST /api/v1/me/reports (Next rewrite → dating-api)
  → ReportsService
       → validate context → debounce check
       → prisma.userReport.create
       → obs.trace(USER_REPORT_CREATED)
       → analytics.track(user.reported)
       → ReportOpsEmailService (best-effort)
  ← 201 UserReportResponseDto
```

No WebSocket. No match recompute.

---

## Tests / verification (for agents 1–2)

| Layer | Scope |
|-------|--------|
| API unit | `reports.service.spec.ts` — debounce, self-report, context derivation |
| API integration | `reports-http.integration.spec.ts` — 201, 409 duplicate, 400 self, 401, 404 bad context |
| Analytics | Assert `analytics.track` called with `user.reported` + `{ reason }` |
| Ops log | Assert structured trace with ids, without details string |
| UI unit | `report-user-dialog.spec.tsx` — submits body, shows success |
| UI page | Match detail + conversation specs — open dialog, mock 201 |
| Regression | `npm test` dating-api + dating-ui; block specs unchanged |
| Migration | `npx prisma migrate deploy` in CI |

**Manual smoke:** story file steps 1–4.

---

## Open questions / blockers

- None blocking agent 1.

**Product note:** Reporting does not hide the reported user — user must block separately if desired.

---

## Next agent

```text
--agent 1 sprint 9 story 4
```

**Notes for next agent:**

1. Run `prisma migrate dev` first; add User relations on `User` model.
2. Implement `ReportsService` context resolution before controller wiring.
3. Wire `ReportOpsEmailService` best-effort after DB insert (never fail 201).
4. Shared `ReportUserDialog` — reuse from both pages; add i18n en/es.
5. Manual smoke duplicate → **409** (not idempotent 201).
