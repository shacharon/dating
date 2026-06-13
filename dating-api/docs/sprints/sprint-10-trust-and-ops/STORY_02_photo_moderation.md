# Story 2: Photo moderation pipeline

**Sprint:** 10  
**Status:** Done (engineering gate — migrate deploy + manual smoke pending operator)  
**Depends on:** [Story 1](./STORY_01_prod_deploy_hygiene.md) (recommended — deploy path clear)

---

## Why

Sprint 9 **stub auto-approves** every upload (`moderationProvider: 'stub'`). The launch runbook relies on **daily manual photo review** with no product workflow. `UserProfilePhoto` already has `PENDING`, `APPROVED`, `REJECTED` — we should use them.

---

## What

**As a** user  
**I want** my photos reviewed before they appear to matches  
**So that** the community sees appropriate profile photos

**As an** operator  
**I want** to approve or reject pending photos  
**So that** moderation is not SQL-only

### Acceptance criteria

- [x] **Upload flow** — new photos created with `status: PENDING` (not auto-`APPROVED`)
- [x] **Viewer gate unchanged** — match list still requires viewer ≥1 `APPROVED` photo (`no_photo`)
- [x] **Browse display** — only `APPROVED` photos used for `primaryPhotoUrl`; pending/rejected never shown to other users
- [x] **Profile UI** — owner sees per-photo status: pending (amber), rejected (red + reason if set), approved (normal)
- [x] **Submit gate** — `POST .../submit` requires ≥1 `APPROVED` photo (pending alone → 422 `photo_required`)
- [x] **Admin API** — for allowlisted admin users:
  - `GET /api/v1/admin/photos/pending` — list pending photos with profile/user ids
  - `PATCH /api/v1/admin/photos/:id` — `{ decision: 'approve' | 'reject', rejectionReason?: string }`
- [x] **Admin UI** — `/admin/photos` queue: thumbnail, upload time, approve / reject with reason
- [x] **Analytics** — `photo.moderation_pending` on upload; `photo.moderation_decided` with `{ decision }` (no blob ids in properties)
- [x] **Observability** — structured log on admin decision (admin user id, photo id, decision)
- [x] **Tests** — upload → pending; approve → visible on match DTO; reject → hidden; non-admin → 403

### Out of scope (this story)

- AWS Rekognition / third-party moderation provider
- Automated reject on ML scores
- Re-moderation on profile edit
- User appeal flow

---

## Technical notes (guidance, not prescriptive)

- Change `MeProfileService` upload path: stop setting `APPROVED` + stub JSON on create.
- `MeMatchesService` photo enrichment: already filters approved; verify query.
- **Symmetric candidate filter** — shipped in [Story 5](./STORY_05_candidate_photo_filter.md): zero-photo candidates excluded from browse.
- Admin auth: shared with Story 3 (`ADMIN_USER_IDS` env, comma-separated user ids).
- Rejection reason: store in existing `rejectionReason` column; max length TBD (e.g. 200).
- Dev/staging: optional `PHOTO_MODERATION_AUTO_APPROVE=1` for local velocity (document in `.env.example`).

---

## Definition of done

- [x] No stub auto-approve in production path
- [x] Admin can clear pending queue
- [x] API + UI tests
- [x] Runbook §3 updated (product queue replaces pure manual DB scan)

---

## Manual smoke

1. Upload photo → profile shows **Pending**
2. Admin approves → photo on match list for other user
3. Admin rejects with reason → owner sees rejection message; not on match list
4. User with only pending photos cannot submit profile

**Operator:** run after `prisma migrate deploy` + `ADMIN_USER_IDS` configured. See `handoffs/STORY_02_photo_moderation/agent-3-pm.md`.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Upload | `PENDING` by default; `PHOTO_MODERATION_AUTO_APPROVE=1` dev only |
| Admin API | `AdminModule` — list pending, moderate, serve file |
| Admin UI | `/admin`, `/admin/photos` queue |
| Profile UI | Pending/rejected badges + rejection reason |
| Analytics | `photo.moderation_pending`, `photo.moderation_decided` |
| Migration | Index on `UserProfilePhoto(status, createdAt)` |
| Tests | API **1373/1373**; UI **278/278** |

Handoffs: `handoffs/STORY_02_photo_moderation/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Rekognition / Moderation API provider | Sprint 11 |
| Email user on reject | Notifications sprint |
| Hide rejected photos from owner upload count | Product polish |
