# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_photo_moderation.md](../../STORY_02_photo_moderation.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Upload → `PENDING`** — stop stub auto-approve in production path; optional `PHOTO_MODERATION_AUTO_APPROVE=1` for local/dev velocity.
- **Shared admin foundation** — new `AdminModule` with `AdminGuard` + `ADMIN_USER_IDS` env (Story 3 reuses same guard/module).
- **Admin photo queue API** — list pending, moderate (approve/reject), serve file for thumbnails.
- **Browse unchanged semantics** — only `APPROVED` photos in match DTOs / photo file endpoints for other users (already mostly true; verify + test).
- **Profile UI** — owner sees pending (amber) / rejected (red + reason); submit gate still requires ≥1 `APPROVED`.
- **Analytics** — `photo.moderation_pending`, `photo.moderation_decided`.
- **No schema model changes** — optional index migration on `UserProfilePhoto(status, createdAt)`.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — admin (new)** | |
| `dating-api/src/admin/admin.module.ts` | **created** — exports AdminGuard, AdminConfigService |
| `dating-api/src/admin/admin-config.service.ts` | **created** — parse `ADMIN_USER_IDS` |
| `dating-api/src/admin/admin.guard.ts` | **created** — AuthGuard + allowlist → 403 |
| `dating-api/src/admin/admin-photos/admin-photos.controller.ts` | **created** |
| `dating-api/src/admin/admin-photos/admin-photos.service.ts` | **created** |
| `dating-api/src/admin/admin-photos/dto/list-pending-photos.dto.ts` | query/response types |
| `dating-api/src/admin/admin-photos/dto/moderate-photo.dto.ts` | PATCH body validation |
| `dating-api/src/admin/admin-photos/admin-photos-http.integration.spec.ts` | integration tests |
| `dating-api/src/admin/admin-photos/admin-photos.service.spec.ts` | unit tests |
| `dating-api/src/app.module.ts` | import `AdminModule` |
| **API — me profile (update)** | |
| `dating-api/src/me-profile/me-profile.service.ts` | upload → PENDING; analytics on upload; primary rules |
| `dating-api/src/me-profile/me-profile.service.spec.ts` | pending upload tests |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | upload pending + submit 422 |
| `dating-api/src/analytics/product-analytics.events.ts` | new events |
| `dating-api/src/logging/error-codes.ts` | admin + moderation codes |
| `dating-api/prisma/migrations/*_photo_status_queue_index/migration.sql` | optional index |
| `dating-api/prisma/schema.prisma` | `@@index([status, createdAt])` on `UserProfilePhoto` |
| `dating-api/.env.example` | `ADMIN_USER_IDS`, `PHOTO_MODERATION_AUTO_APPROVE` |
| **UI** | |
| `dating-ui/src/app/admin/page.tsx` | **created** — index linking to Photos (Reports stub for Story 3) |
| `dating-ui/src/app/admin/photos/page.tsx` | **created** — pending queue UI |
| `dating-ui/src/lib/admin-photos-api.ts` | **created** — list, moderate, fetch blob |
| `dating-ui/src/components/profile-photo-section.tsx` | status styling + rejection reason |
| `dating-ui/src/components/profile-photo-section.spec.tsx` | pending/rejected display |
| `dating-ui/src/middleware.ts` | add `/admin` to auth matcher |
| `dating-ui/src/middleware.spec.ts` | unauthenticated `/admin` redirect |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `photoModeration.*` |
| **Docs** | |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | §3 photo moderation → product queue |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | new events (if file lists events) |

**Verify only (no logic change expected):**

- `me-matches.service.ts` — `photos: { where: { status: 'APPROVED' } }`, `countApprovedPhotosForProfile`
- `me-profile-photo-gate.ts` — approved-only counts
- `getPhotoFileForUser` — owner can read PENDING (already any status)

---

## Decisions (do not reverse without discussion)

### 1. Upload status — PENDING by default

| Option | Verdict |
|--------|---------|
| Keep stub auto-approve | **Rejected** — story AC |
| External provider on upload | **Out of scope** |
| **`PENDING` + manual admin queue** | **Chosen** |
| **`PHOTO_MODERATION_AUTO_APPROVE=1`** | **Chosen** — dev/staging escape hatch only |

**Locked create logic** (`MeProfileService.uploadPhotoForUser`):

```typescript
const autoApprove = process.env.PHOTO_MODERATION_AUTO_APPROVE === '1';

const status = autoApprove
  ? UserProfilePhotoStatus.APPROVED
  : UserProfilePhotoStatus.PENDING;

const moderationProvider = autoApprove ? 'stub' : 'manual_queue';
const moderationResultJson = autoApprove
  ? { decision: 'approved', reason: 'stub_auto_approve' }
  : null;

// Only APPROVED photos may be primary (match engine invariant).
const isPrimary = autoApprove && !approvedExists;
```

After successful storage write:

- If `status === PENDING` → `analytics.track(userId, PHOTO_MODERATION_PENDING, {})` (empty properties).

**Production:** do **not** set `PHOTO_MODERATION_AUTO_APPROVE=1`.

---

### 2. Primary photo rules

| Rule | Behavior |
|------|----------|
| Pending upload | `isPrimary: false` always |
| First approved photo | On **approve**, if profile has no other `APPROVED` + `isPrimary`, set `isPrimary: true` |
| Reject primary candidate | N/A — pending never primary |
| Delete approved primary | Existing promote-next-APPROVED logic (unchanged) |
| Set primary (user) | Existing `photo_not_approved` if not APPROVED (unchanged) |

---

### 3. Admin auth — shared module (Story 2 + 3)

**Env:**

```bash
# Comma-separated User.id values (cuid), no spaces required but trim each entry
ADMIN_USER_IDS=clxxx,clyyy
```

**`AdminConfigService`:**

```typescript
isAdmin(userId: string): boolean;
```

**`AdminGuard`:** extends session auth pattern — run after `AuthGuard` (apply both):

```typescript
@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
```

Non-admin authenticated user → **403** `{ error: 'admin_forbidden' }`.

**No** `User.isAdmin` column in v1.

**UI:** `/admin/*` requires session cookie (middleware auth); authorization enforced by API 403. Do **not** expose admin list to client env.

---

### 4. Admin photo API contracts

Base path: `/api/v1/admin` · Auth: session + `AdminGuard`

#### `GET /api/v1/admin/photos/pending`

Query (optional):

| Param | Type | Default |
|-------|------|---------|
| `limit` | int 1–100 | 50 |
| `cursor` | string (photo id) | — |

Response **200**:

```typescript
{
  items: Array<{
    id: string;
    profileId: string;
    userId: string;           // profile owner User.id
    createdAt: string;        // ISO
    mimeType: string;
    originalFileName: string | null;
    fileUrl: string;            // `/api/v1/admin/photos/${id}/file`
  }>;
  nextCursor: string | null;
}
```

Implementation notes:

- Query `UserProfilePhoto` where `status = PENDING`, order `createdAt asc` (FIFO queue).
- Join `UserProfile.userId` for ops context.
- Cursor: id-based pagination (photos after cursor id by createdAt).

#### `GET /api/v1/admin/photos/:photoId/file`

Response **200:** stream bytes (`Content-Type` from row.mimeType).

- Allowed for `PENDING` (queue review), `APPROVED`, `REJECTED`.
- **403** non-admin · **404** missing row/file

#### `PATCH /api/v1/admin/photos/:photoId`

Request body:

```typescript
{
  decision: 'approve' | 'reject';
  rejectionReason?: string;  // max 200; optional on reject v1
}
```

Validation:

- `decision` required enum
- `rejectionReason` — `@MaxLength(200)` when present
- Row must exist and `status === PENDING` else **422** `{ error: 'photo_not_pending' }`

**Approve transaction:**

1. Set `status: APPROVED`, `moderationProvider: 'manual'`, `moderationResultJson: { decision: 'approved' }`, clear `rejectionReason`
2. If no other `APPROVED` photo with `isPrimary: true` on profile → set this photo `isPrimary: true`
3. Structured log + analytics (below)

**Reject:**

1. Set `status: REJECTED`, `moderationProvider: 'manual'`, `rejectionReason` from body (nullable), `moderationResultJson: { decision: 'rejected' }`
2. Do **not** delete blob in v1 (owner can delete); optional follow-up

Response **200:** `{ id, profileId, status, rejectionReason, isPrimary, updatedAt }`

**Analytics** (profile owner as `userId` envelope):

```typescript
analytics.track(ownerUserId, PHOTO_MODERATION_DECIDED, { decision: 'approve' | 'reject' });
```

**Structured log** (no rejection text):

```text
event=photo_moderation_decided adminUserId=... photoId=... profileId=... decision=approve|reject
```

---

### 5. Browse / gates — verify only

Already implemented; add regression tests:

| Surface | Expected |
|---------|----------|
| `GET /api/v1/me/matches` | `primaryPhotoUrl` only from APPROVED primary |
| `approvedPhotoCount` | APPROVED only |
| Viewer `no_photo` gate | APPROVED count ≥ 1 |
| `POST /api/v1/me/profile/submit` | 422 `photo_required` if 0 APPROVED (pending OK to exist) |
| Match photo file endpoint | APPROVED + primary only (existing) |
| Owner `GET .../profile/photos/:id/file` | any status (preview) |

---

### 6. Profile UI — owner status display

Enhance `ProfilePhotoSection` (already has `statusLabel`):

| Status | UI |
|--------|-----|
| `PENDING` | Amber badge + i18n "Under review" |
| `REJECTED` | Red badge + show `rejectionReason` when set |
| `APPROVED` | Green/neutral "Approved" (optional) |

No change to upload limit (3) or delete behavior.

---

### 7. Admin UI — `/admin/photos`

**Routes:**

| Path | Purpose |
|------|---------|
| `/admin` | Index — link to Photos (+ placeholder Reports for Story 3) |
| `/admin/photos` | Pending queue |

**Queue page behavior:**

- On load: `GET /api/v1/admin/photos/pending`
- Each row: thumbnail via `fileUrl` (cookie auth fetch → object URL), `createdAt`, `userId`, Approve / Reject
- Reject: optional reason text field (max 200) → PATCH
- 403 → "Not authorized" message (not in public nav)
- Empty queue → "No pending photos"

**Middleware:** add to `needsAuthSession` + matcher:

```typescript
pathname.startsWith('/admin')
// matcher: '/admin', '/admin/:path*'
```

Do **not** add `/admin` to `INTERNAL_ROUTE_PREFIXES` — ops needs this in prod.

---

### 8. Prisma migration (optional but recommended)

```prisma
model UserProfilePhoto {
  // ... existing fields ...
  @@index([status, createdAt])
}
```

Backfill: none. Rollback: drop index.

---

## Runtime topology

| Concern | Value |
|---------|--------|
| REST browser target | Same-origin `/api/v1/...` (Next proxy) |
| Admin API auth | HttpOnly session cookie (`dating_session`) |
| Admin file fetch | Browser `fetch(fileUrl, { credentials: 'include' })` → blob URL for `<img>` |
| Cookie host rule | Same as existing auth — `localhost` vs `127.0.0.1` alignment |
| Socket | N/A |
| Expected Network tab | Upload `POST .../profile/photos` → 201 `status:PENDING`; admin `GET .../admin/photos/pending` → 200; `PATCH` → 200 |

---

## Tests / verification

Dev (agent 1):

```powershell
cd dating-api
npx prisma migrate deploy
npm test

cd ../dating-ui
npm test
```

Scenarios:

- [ ] Upload without auto-approve → `PENDING`; submit → 422 `photo_required`
- [ ] Admin approve → match list shows `primaryPhotoUrl` for that profile
- [ ] Admin reject → not on match list; owner sees reason
- [ ] Non-admin → 403 on admin routes
- [ ] `PHOTO_MODERATION_AUTO_APPROVE=1` → upload APPROVED (dev only test)

Manual smoke (operator): story manual smoke section.

- [ ] Browser Network smoke: deferred to agent 1 (upload + admin queue)

---

## Open questions / blockers

- None.

**Story 3 note:** reuse `AdminModule` / `AdminGuard`; add `AdminReportsController` under same module — do not duplicate allowlist parsing.

---

## Next agent

```text
--agent 1 sprint 10 story 2
```

**Notes for dev:**

1. Implement `AdminModule` first — Story 3 depends on it.
2. Run migration before integration tests if index added.
3. Update runbook §3: replace "stub auto-approve + daily DB scan" with `/admin/photos` workflow.
4. Document `ADMIN_USER_IDS` in `.env.example`; set one seed user id for local testing.
5. Do not gate `/admin` in prod internal-route middleware.
