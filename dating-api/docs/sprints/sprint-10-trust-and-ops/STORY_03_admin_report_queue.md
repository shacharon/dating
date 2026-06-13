# Story 3: Admin report queue

**Sprint:** 10  
**Status:** Done (engineering gate — migrate deploy + manual smoke pending operator)  
**Depends on:** [Story 1](./STORY_01_prod_deploy_hygiene.md) (admin routes + deploy); shares admin auth with [Story 2](./STORY_02_photo_moderation.md)

---

## Why

Sprint 9 shipped **user reports** (`POST /api/v1/me/reports`, `UserReport` rows, ops email). [DATA_RETENTION.md](../../legal/DATA_RETENTION.md) states: *"Query UserReport directly in the database. No admin triage UI in v1."* As report volume grows, SQL-only triage does not scale.

---

## What

**As an** operator  
**I want** to view and resolve user reports in the product  
**So that** moderation response time stays low without database access

### Acceptance criteria

- [x] **Admin API** — session auth + `ADMIN_USER_IDS` allowlist:
  - `GET /api/v1/admin/reports` — paginated list, default `status=OPEN`, sort `createdAt desc`
  - `GET /api/v1/admin/reports/:id` — detail including reporter/reported user ids, reason, details, context
  - `PATCH /api/v1/admin/reports/:id` — `{ status: 'DISMISSED' | 'ACTION_TAKEN', opsNote?: string }`
- [x] **Response shape** — list row: id, reason, status, createdAt, reporterUserId, reportedUserId, contextType (no full details in list)
- [x] **Admin UI** — `/admin/reports`:
  - Table of OPEN reports
  - Detail drawer: reason, details text, context link (match id or conversation id)
  - Actions: Dismiss, Mark action taken (+ optional ops note)
- [x] **Navigation** — `/admin` index links to Reports + Photos (Story 2)
- [x] **Security** — non-admin → 403; admin routes not linked from public nav
- [x] **Observability** — log admin status changes (report id, new status, admin user id)
- [x] **Analytics** — optional `report.ops_resolved` with `{ status }` (no PII)
- [x] **Tests** — admin CRUD; non-admin forbidden; status transitions

### Out of scope (this story)

- Auto-ban after N reports
- Reporting individual messages
- In-app notification to reporter on resolution
- Full RBAC / admin roles table

---

## Technical notes (guidance, not prescriptive)

- New module: `AdminModule` or split `AdminReportsModule` + guard `AdminGuard`.
- Reuse `UserReport` model — optional migration for `opsNote` text field if not stored in JSON metadata.
- Link context: `MATCH_PROFILE` → `/dating/me-matches/:id` (admin opens in new tab); `CONVERSATION` → conversation route.
- Keep Story 9 `REPORT_OPS_EMAIL` — queue UI complements email, does not replace.

---

## Definition of done

- [x] Ops can resolve OPEN reports without DB
- [x] API + UI tests
- [x] DATA_RETENTION.md updated (admin UI exists)

---

## Manual smoke

1. User reports match → row appears in `/admin/reports`
2. Admin dismisses → disappears from OPEN filter
3. Non-admin user hits admin API → 403

**Operator:** see `handoffs/STORY_03_admin_report_queue/agent-3-pm.md`.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Admin API | `GET/PATCH /api/v1/admin/reports` — list, detail, resolve |
| Schema | `UserReport.opsNote` (`VarChar(500)`) |
| Admin UI | `/admin/reports` queue + detail panel |
| Nav | `/admin` links Reports + Photos |
| Analytics | `report.ops_resolved` |
| Docs | DATA_RETENTION, runbook §3, PRODUCT_FUNNEL |
| Tests | API **1390/1390**; UI **279/279** |

Handoffs: `handoffs/STORY_03_admin_report_queue/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Ban user from admin detail | Story follow-up |
| Report metrics dashboard | Analytics sprint |
| Slack webhook on new OPEN report | Ops automation |
