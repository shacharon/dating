# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_admin_report_queue.md](../../STORY_03_admin_report_queue.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Admin report triage API** — list OPEN reports (paginated), detail, PATCH status to `DISMISSED` | `ACTION_TAKEN` with optional `opsNote`.
- **Reuse Story 2 admin foundation** — extend `AdminModule` with `AdminReportsController` + `AdminReportsService`; same `AuthGuard` + `AdminGuard` + `ADMIN_USER_IDS`.
- **Schema addition** — `UserReport.opsNote` column (nullable text); existing `@@index([status, createdAt])` supports default OPEN queue query.
- **Admin UI** — `/admin/reports` table + detail drawer; `/admin` index links Reports + Photos.
- **Observability + analytics** — structured log on status change; `report.ops_resolved` with `{ status }` only (no PII).
- **Docs** — update `DATA_RETENTION.md` + runbook §3 reports workflow.
- **Unchanged** — `POST /api/v1/me/reports`, `REPORT_OPS_EMAIL`, Story 9 create/debounce logic.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — admin reports (new)** | |
| `dating-api/src/admin/admin-reports/admin-reports.controller.ts` | **created** — GET list, GET detail, PATCH status |
| `dating-api/src/admin/admin-reports/admin-reports.service.ts` | **created** |
| `dating-api/src/admin/admin-reports/dto/list-admin-reports.dto.ts` | query + list response types |
| `dating-api/src/admin/admin-reports/dto/admin-report-detail.dto.ts` | detail response + `contextPath` |
| `dating-api/src/admin/admin-reports/dto/update-admin-report.dto.ts` | PATCH body validation |
| `dating-api/src/admin/admin-reports/admin-reports-http.integration.spec.ts` | integration tests |
| `dating-api/src/admin/admin-reports/admin-reports.service.spec.ts` | unit tests |
| `dating-api/src/admin/admin.module.ts` | register reports controller + service |
| **API — schema** | |
| `dating-api/prisma/schema.prisma` | `UserReport.opsNote` field |
| `dating-api/prisma/migrations/*_user_report_ops_note/migration.sql` | add column |
| **API — observability** | |
| `dating-api/src/analytics/product-analytics.events.ts` | `REPORT_OPS_RESOLVED: 'report.ops_resolved'` |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_REPORT_STATUS_UPDATED` |
| **UI** | |
| `dating-ui/src/app/admin/reports/page.tsx` | **created** — OPEN queue + detail drawer |
| `dating-ui/src/lib/admin-reports-api.ts` | **created** — list, get, patch |
| `dating-ui/src/app/admin/page.tsx` | replace Reports stub with link |
| `dating-ui/src/middleware.spec.ts` | optional — unauthenticated `/admin/reports` redirect |
| **Docs** | |
| `dating-api/docs/legal/DATA_RETENTION.md` | admin triage UI exists |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | `report.ops_resolved` |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | §3 reports → `/admin/reports` |

**No changes required:**

- `dating-api/src/reports/*` (user create path)
- `ReportOpsEmailService` — email complements queue
- `AdminGuard` / `AdminConfigService` — reuse as-is
- Prod internal-route gate — `/admin` stays **unblocked** (Story 2 decision)

---

## Decisions (do not reverse without discussion)

### 1. Module placement — extend `AdminModule` (not new top-level module)

| Approach | Verdict |
|----------|---------|
| New `AdminReportsModule` importing `AdminGuard` | **Rejected** — duplicates wiring |
| **`AdminReportsController` + service inside existing `AdminModule`** | **Chosen** — mirrors `admin-photos/` subfolder |

Do **not** move user-facing `ReportsModule` endpoints under admin.

---

### 2. Schema — add `opsNote` column

Existing model (Sprint 9) lacks ops note storage. PATCH AC requires optional note.

```prisma
model UserReport {
  // ... existing fields ...
  opsNote     String?            @db.VarChar(500)
  status      UserReportStatus   @default(OPEN)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([status, createdAt])   // already exists — supports OPEN + sort
}
```

| Field | Rules |
|-------|--------|
| `opsNote` | Optional; trim; max **500** chars; nullable; set on PATCH (append/replace — **replace** v1) |
| `updatedAt` | Auto via `@updatedAt` — serves as resolution timestamp |

**No** `resolvedByAdminUserId` column in v1 — admin id captured in structured log only.

Migration: `ALTER TABLE "UserReport" ADD COLUMN "opsNote" VARCHAR(500);` — backfill none.

---

### 3. Admin auth — reuse Story 2 (locked)

Same as Story 2:

```typescript
@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
```

Non-admin authenticated → **403** `{ error: 'admin_forbidden' }`.

Env: `ADMIN_USER_IDS` (already in `.env.example` from Story 2).

---

### 4. Admin report API contracts

Base path: `/api/v1/admin` · Auth: session + `AdminGuard`

#### `GET /api/v1/admin/reports`

Query (optional):

| Param | Type | Default |
|-------|------|---------|
| `status` | enum `OPEN` \| `DISMISSED` \| `ACTION_TAKEN` | `OPEN` |
| `limit` | int 1–100 | 50 |
| `cursor` | string (report id) | — |

Response **200**:

```typescript
{
  items: Array<{
    id: string;
    reason: UserReportReason;
    status: UserReportStatus;
    createdAt: string;           // ISO
    reporterUserId: string;
    reportedUserId: string;
    contextType: UserReportContextType;
    // intentionally NO details in list
  }>;
  nextCursor: string | null;
}
```

Implementation notes:

- Filter `where: { status }`.
- Sort **`createdAt desc`, `id desc`** (newest first — unlike photo FIFO).
- Cursor pagination: given cursor row, return reports strictly **older** in sort order:
  - `(createdAt < cursor.createdAt) OR (createdAt = cursor.createdAt AND id < cursor.id)`.
- Clamp `limit` in service (defense if query DTO not piped).

#### `GET /api/v1/admin/reports/:reportId`

Response **200**:

```typescript
{
  id: string;
  reason: UserReportReason;
  status: UserReportStatus;
  createdAt: string;
  updatedAt: string;
  reporterUserId: string;
  reportedUserId: string;
  contextType: UserReportContextType;
  contextId: string;
  contextPath: string;           // computed — see §5
  details: string | null;
  opsNote: string | null;
}
```

**404** `{ error: 'report_not_found' }` if missing.

#### `PATCH /api/v1/admin/reports/:reportId`

Request body:

```typescript
{
  status: 'DISMISSED' | 'ACTION_TAKEN';
  opsNote?: string;              // max 500; optional
}
```

Validation:

- `status` required enum — **must not** be `OPEN` via PATCH.
- `opsNote` — `@MaxLength(500)` when present; trim; empty string → `null`.
- Row must exist and **`status === OPEN`** else **422** `{ error: 'report_not_open' }`.

Update:

```typescript
data: {
  status: body.status,
  opsNote: trimmedOpsNote ?? null,  // replace prior note on resolve
}
```

Response **200:** same shape as detail GET.

**Analytics** (admin user as envelope):

```typescript
analytics.track(adminUserId, ProductAnalyticsEvents.REPORT_OPS_RESOLVED, {
  status: 'DISMISSED' | 'ACTION_TAKEN',
});
```

**Structured log** (no `details`, no `opsNote` text):

```text
event=report_ops_resolved adminUserId=... reportId=... reportedUserId=... newStatus=DISMISSED|ACTION_TAKEN
```

Use `ErrorCodes.ADMIN_REPORT_STATUS_UPDATED`.

---

### 5. Context links (UI + API)

Compute `contextPath` server-side in detail mapper:

| `contextType` | `contextId` meaning | `contextPath` |
|---------------|---------------------|---------------|
| `MATCH_PROFILE` | `UserProfile.id` | `/dating/me-matches/${contextId}` |
| `CONVERSATION` | `MutualMatch.id` | `/dating/conversations/${contextId}` |

Admin UI opens link in **new tab** (`target="_blank" rel="noopener noreferrer"`).

Do not expose reporter email or display names in admin API v1 (user ids only — matches photo queue pattern).

---

### 6. Status transitions (locked)

| From | To (via PATCH) | Allowed |
|------|----------------|---------|
| `OPEN` | `DISMISSED` | Yes |
| `OPEN` | `ACTION_TAKEN` | Yes |
| `DISMISSED` | any | **422** `report_not_open` |
| `ACTION_TAKEN` | any | **422** `report_not_open` |

No re-open flow in v1. Admin can filter `status=DISMISSED` or `ACTION_TAKEN` in list query for audit (optional UI filter later).

**Out of scope:** auto-ban, block user from admin detail, notify reporter.

---

### 7. Admin UI — `/admin/reports`

**Routes:**

| Path | Purpose |
|------|---------|
| `/admin` | Index — links to **Reports** + **Photos** |
| `/admin/reports` | OPEN report queue |

**Queue page behavior:**

- On load: `GET /api/v1/admin/reports?status=OPEN`
- Table columns: `createdAt`, `reason`, `reporterUserId`, `reportedUserId`, `contextType`
- Row click → detail drawer/panel:
  - Show `details` (full text)
  - Show existing `opsNote` if any
  - Context link via `contextPath`
  - Actions: **Dismiss**, **Mark action taken**
  - Optional ops note textarea (max 500) applied on action
- After PATCH success → remove row from OPEN list (or reload)
- **403** → "Not authorized" (same pattern as photos page)
- Empty queue → "No open reports"
- No link from public nav (unchanged)

**Middleware:** `/admin` auth already in place (Story 2) — no matcher change required.

---

### 8. Service signatures

```typescript
@Injectable()
export class AdminReportsService {
  listReports(
    status: UserReportStatus,
    limit?: number,
    cursor?: string,
  ): Promise<ListAdminReportsResponseDto>;

  getReportById(reportId: string): Promise<AdminReportDetailDto>;

  updateReportStatus(
    adminUserId: string,
    reportId: string,
    body: UpdateAdminReportDto,
  ): Promise<AdminReportDetailDto>;
}
```

Helper (private):

```typescript
function buildReportContextPath(
  contextType: UserReportContextType,
  contextId: string,
): string;
```

---

## Runtime topology

| Concern | Value |
|---------|--------|
| REST browser target | Same-origin `/api/v1/...` (Next proxy) |
| Admin API auth | HttpOnly session cookie (`dating_session`) |
| Cookie host rule | Same as existing auth — `localhost` vs `127.0.0.1` alignment |
| Socket | N/A |
| Expected Network tab | User `POST .../me/reports` → 201; admin `GET .../admin/reports` → 200; `PATCH .../admin/reports/:id` → 200 |

---

## Tests / verification

Dev (agent 1):

```powershell
cd dating-api
npx prisma migrate deploy
npm test

cd ../dating-ui
npm test
npm run build
```

Scenarios:

- [ ] `GET /api/v1/admin/reports` default → OPEN only; list excludes `details`
- [ ] `GET /api/v1/admin/reports/:id` → includes `details`, `contextPath`, `opsNote`
- [ ] `PATCH` OPEN → DISMISSED with opsNote → 200; row gone from OPEN list
- [ ] `PATCH` OPEN → ACTION_TAKEN → 200; analytics `report.ops_resolved`
- [ ] `PATCH` on non-OPEN row → 422 `report_not_open`
- [ ] Non-admin → 403 on list, detail, PATCH
- [ ] `POST /api/v1/me/reports` unchanged (regression)

Manual smoke (operator): story manual smoke section.

- [ ] Browser smoke: report from match detail → appears in `/admin/reports` → dismiss

---

## Open questions / blockers

- None.

**Follow-up (not this story):** ban user from admin detail; Slack webhook on new OPEN report; reporter notification on resolve.

---

## Next agent

```text
--agent 1 sprint 10 story 3
```

**Notes for dev:**

1. Extend `AdminModule` — do not duplicate `AdminGuard` / `AdminConfigService`.
2. Run migration before integration tests.
3. Mirror `admin-photos/` patterns for controller guards, 403 handling, and UI error states.
4. Update runbook §3 **Reports** bullet: daily `/admin/reports` triage (keep ops email as backup).
5. Update `DATA_RETENTION.md` § Ops access — admin UI replaces SQL-only v1 note.
6. Register `report.ops_resolved` in `PRODUCT_FUNNEL.md`.
7. Route order: `@Get('reports')` before `@Get('reports/:reportId')` — no conflict with `photos/*` routes.
