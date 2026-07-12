# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_real_photo_moderation.md](../../STORY_02_real_photo_moderation.md)  
**Sprint:** sprint-19-performance-and-photo-moderation  
**Date:** 2026-07-12  
**Status:** complete  

---

## Summary

- **Do not invent a `Photo` table.** Remap all Story 2 ACs onto existing **`UserProfilePhoto`** + Sprint 10 admin queue. Story prose is stale relative to product.
- **Default upload is already `PENDING`** (not auto-approve). Stub auto-approve only when `PHOTO_MODERATION_AUTO_APPROVE=1`. Match list / photo gate **already require `APPROVED`**.
- **Extend**, don't replace: enum `FLAGGED_FOR_REVIEW`, Rekognition Bull worker, SLA cron, rejection email, coded reject reasons, admin UI ML labels.
- Keep **existing admin routes** (`GET …/photos/pending`, `PATCH …/photos/:photoId`) — extend queue membership + response fields; do **not** add the story's fictional `/review-queue` + POST approve/reject aliases unless needed for UI convenience (prefer one contract).
- **Agent 4 required** — photo-gate / match-list visibility for non-approved statuses.

---

## Branch / workspace gate

| Fact | Detail |
|------|--------|
| Product branch | **`sprint-19`** (created from `sprint17` in Story 1) |
| Continue on | Same branch as Story 1 — photos/admin already live there |
| Do not | Implement against engine `main` |

**Agent 1:** stay on `sprint-19`; pull latest Story 1 work if needed.

---

## Current baseline (product — after Sprint 10 + Story 1)

### Schema

| Item | Today |
|------|--------|
| Model | `UserProfilePhoto` — **no** `Photo` model |
| Enum | `UserProfilePhotoStatus`: `PENDING` \| `APPROVED` \| `REJECTED` |
| Result JSON | `moderationResultJson` (+ `moderationProvider`, `rejectionReason`) |
| Time | `createdAt` (story's `uploadedAt`) |
| Index | `@@index([status, createdAt])` already exists |

### Upload / visibility / admin

| Item | Today |
|------|--------|
| Upload | `POST /api/v1/me/profile/photos` → default **`PENDING`**, `moderationProvider: 'manual_queue'` |
| Dev stub | `PHOTO_MODERATION_AUTO_APPROVE=1` → immediate `APPROVED` |
| Photo gate | ≥1 **`APPROVED`** required for submit + matches `ready` |
| Match pool | `photos: { some: { status: APPROVED } }` — pending/rejected excluded |
| Admin list | `GET /api/v1/admin/photos/pending` — **PENDING only**, FIFO |
| Admin decide | `PATCH /api/v1/admin/photos/:photoId` `{ decision, rejectionReason? }` |
| Admin UI | `/admin/photos` |
| Rekognition | Config foreshadowed (`PHOTO_MODERATION_DRIVER`, `PHOTO_FACE_DETECTION_ENABLED`) — **unused** |
| Bull | Story 1 `profile-analysis` queue — **mirror** for photo moderation |
| Email | `EmailNotificationService.sendTransactionalBestEffort` — **no** photo-rejection template |
| Prefs | `User.emailNotificationsEnabled` / `inAppNotificationsEnabled` (no `NotificationPreference` table) |

### Photo moderation baseline SQL (capture in Agent 1 / 3)

```sql
SELECT status, COUNT(*) AS count
FROM "UserProfilePhoto"
GROUP BY status;
```

Expect: mostly `APPROVED` (legacy + stub) and/or `PENDING` (manual queue), not all stub-approved forever.

---

## Remap (locked) — story fiction → real

| Story 2 wording | Actual |
|-----------------|--------|
| Table `Photo` | **`UserProfilePhoto`** |
| `Photo.status` / new enum | Extend **`UserProfilePhotoStatus`** with `FLAGGED_FOR_REVIEW` |
| `moderationResult` | **`moderationResultJson`** |
| `uploadedAt` | **`createdAt`** |
| Always auto-approve stub | **False** — already PENDING by default |
| New `/photos/photo-moderation.*` tree only | Prefer **`workers/photo-moderation.*`** + thin service under `photo-storage/` or `me-profile/` |
| `GET …/review-queue` + POST approve/reject | **Extend** existing pending list + PATCH |
| Match JOIN APPROVED / photo gate | **Already done** — keep green; extend E2E |
| `NotificationPreference` | **`User.emailNotificationsEnabled`** (+ in-app flag; no notification inbox store) |
| `PHOTO_BUCKET` | **`PHOTO_S3_BUCKET`** |
| Lambda trigger | **Bull** queue on `REDIS_URL` (same pattern as Story 1) |
| i18n new framework | Extend `dating-ui/src/lib/i18n/{en,es,he}.ts` + `types.ts` |

---

## Artifacts (Agent 1 implements)

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | Add `FLAGGED_FOR_REVIEW` to `UserProfilePhotoStatus` |
| `dating-api/prisma/migrations/20260712120000_add_photo_flagged_for_review/` | Enum alter + backfill note (no status NULL today) |
| `dating-api/src/photo-storage/photo-moderation.service.ts` | **New** — Rekognition client + threshold decision |
| `dating-api/src/photo-storage/photo-moderation.types.ts` | **New** — result JSON shape, reason codes |
| `dating-api/src/workers/photo-moderation.queue.ts` | **New** — queue name `photo-moderation` |
| `dating-api/src/workers/photo-moderation.worker.ts` | **New** — consume job → run ML → update row |
| `dating-api/src/workers/photo-sla.cron.ts` | **New** — hourly SLA auto-approve + alerts |
| `dating-api/src/workers/worker.module.ts` | Register queue + worker + SLA |
| `dating-api/src/me-profile/me-profile.service.ts` | After save: enqueue moderation (unless auto-approve stub) |
| `dating-api/src/admin/admin-photos/*` | Queue includes `FLAGGED_FOR_REVIEW` (+ stuck `PENDING`); ML fields on list DTO; coded reject reasons; notify on reject |
| `dating-api/src/notifications/photo-rejection-email.service.ts` | **New** — mirror mutual-match email pattern |
| `dating-api/.env.example` | Thresholds, Rekognition, SLA knobs |
| `dating-ui/src/app/admin/photos/page.tsx` | Show ML labels/confidence; reason code select; Skip = next item |
| `dating-ui/src/lib/admin-photos-api.ts` | Consume extended list fields |
| `dating-ui/src/lib/i18n/{en,es,he,types}.ts` | Rejection reason user copy |
| `dating-ui` profile photo section | Surface coded rejection copy when `REJECTED` |

**Do not change (this story):**

| Path | Reason |
|------|--------|
| Holy-grail / ranking math | Out of scope |
| Public unauthenticated photo URLs | Sprint 9 + Story 1 signed CDN only |
| Invent parallel `Photo` model / duplicate admin routes | Drift from Sprint 10 |

---

## Decisions (do not reverse without discussion)

### 1. Extend enum — do not rename statuses

```prisma
enum UserProfilePhotoStatus {
  PENDING
  APPROVED
  REJECTED
  FLAGGED_FOR_REVIEW
}
```

Migration: `ALTER TYPE "UserProfilePhotoStatus" ADD VALUE 'FLAGGED_FOR_REVIEW';`  
No backfill of `status IS NULL` — column is already NOT NULL with default `PENDING`. Legacy rows stay `APPROVED` as today.

### 2. State machine (locked)

```text
Upload (driver=rekognition, auto-approve unset)
  → status=PENDING, moderationProvider='rekognition', enqueue Bull job

ML worker:
  → APPROVED          (max NSFW confidence < FLAG threshold, and face/quality OK)
  → FLAGGED_FOR_REVIEW (FLAG ≤ confidence < REJECT, OR 0 faces when face check on, OR quality warn)
  → REJECTED          (confidence ≥ REJECT threshold)
  → FLAGGED_FOR_REVIEW (Rekognition/API error — fail-open to human, never silent APPROVED)

Admin PATCH (PENDING or FLAGGED_FOR_REVIEW only):
  → APPROVED | REJECTED

SLA cron:
  → APPROVED (with audit event) per rules below

PHOTO_MODERATION_AUTO_APPROVE=1:
  → unchanged stub path (APPROVED immediately, no queue) — local only
```

**Visibility:** only `APPROVED` in match list, profile photo URLs for others, and photo gate. `PENDING` / `FLAGGED_FOR_REVIEW` / `REJECTED` never count as “has photo.”

### 3. NSFW confidence = max label confidence

Among `DetectModerationLabels` results, take **`max(Confidence)`** across returned labels (empty list → 0).

| Band | Action |
|------|--------|
| `confidence < NSFW_FLAG_THRESHOLD` (default **50**) | Auto-**APPROVED** (source `ml`) |
| `FLAG ≤ confidence < NSFW_AUTO_REJECT_THRESHOLD` (default **50–80**) | **FLAGGED_FOR_REVIEW** |
| `confidence ≥ NSFW_AUTO_REJECT_THRESHOLD` (default **80**) | Auto-**REJECTED** (`explicit_content`) |

Env:

```text
NSFW_FLAG_THRESHOLD=50
NSFW_AUTO_REJECT_THRESHOLD=80
PHOTO_MODERATION_DRIVER=rekognition   # or stub (no ML; stays PENDING for manual)
PHOTO_FACE_DETECTION_ENABLED=1        # optional DetectFaces; 0 faces → FLAGGED (reason hint no_face)
```

**Do not** invert thresholds (README smoke text that says “approve if confidence >80%” is wrong — that would approve NSFW).

### 4. Rekognition I/O

- Prefer `Image.S3Object` when `PHOTO_STORAGE_DRIVER=s3` (`Bucket=PHOTO_S3_BUCKET`, `Key=storageKey`).
- Else `Image.Bytes` from `PhotoStorage.read(storageKey)` (local driver / tests).
- IAM: `rekognition:DetectModerationLabels` (+ `DetectFaces` if face flag on).
- `MinConfidence` request param = `NSFW_FLAG_THRESHOLD` (catch mid band).

### 5. Admin API — extend existing contract (locked)

**Do not** add story fictional paths as the primary contract.

#### Review queue (extend pending)

```http
GET /api/v1/admin/photos/pending?limit=50&cursor=<photoId>
Auth: AuthGuard + AdminGuard
```

**Where:** `status IN ('FLAGGED_FOR_REVIEW', 'PENDING')`  
**Order:** `createdAt ASC`, `id ASC` (FIFO).  
**Cursor:** same keyset style as today, valid for either status in the queue set.

**Item shape (extend):**

```typescript
{
  id: string;
  profileId: string;
  userId: string;          // uploader User.id — no email/name
  fileUrl: string;         // /api/v1/admin/photos/:id/file
  createdAt: string;       // ISO
  status: 'PENDING' | 'FLAGGED_FOR_REVIEW';
  mlConfidence: number | null;
  mlLabels: string[];
  moderationProvider: string | null;
}
```

Parse `ml*` from `moderationResultJson` when present.

#### Decide (extend PATCH)

```http
PATCH /api/v1/admin/photos/:photoId
Body: {
  decision: 'approve' | 'reject';
  rejectionReasonCode?: 'no_face' | 'explicit_content' | 'low_quality' | 'not_real_person' | 'other';
  rejectionReason?: string; // optional free-text; required nuance when code=other (max 200)
}
Response: { id, status, rejectionReason, rejectionReasonCode? }
```

- Allowed from: `PENDING` | `FLAGGED_FOR_REVIEW` only (else `photo_not_pending` → rename error to `photo_not_reviewable` **or** keep code and accept both statuses — prefer new error `photo_not_reviewable` with migration note in tests).
- On **reject:** persist code in `moderationResultJson.rejectionReasonCode`; store human-readable string in `rejectionReason`; send email if prefs allow.
- On **approve:** same as today (`moderationProvider: 'manual'`, may set primary).
- **Skip:** UI-only (advance to next row) — no API.

### 6. `moderationResultJson` shape (locked)

```typescript
type PhotoModerationResultJson = {
  source: 'legacy' | 'stub' | 'ml' | 'manual' | 'sla';
  decision?: 'approved' | 'rejected' | 'flagged';
  mlConfidence?: number;
  mlLabels?: string[];
  faceCount?: number;
  rejectionReasonCode?: RejectionReasonCode;
  reviewedBy?: string;       // admin userId
  reviewedAt?: string;       // ISO
  slaRule?: 'flagged_6h_low' | 'flagged_24h';
  error?: string;            // Rekognition failure message (no secrets)
};
```

### 7. SLA enforcer (hourly Bull repeatable or Nest `@Cron`)

| Rule | Condition | Action |
|------|-----------|--------|
| A | `FLAGGED_FOR_REVIEW` AND `createdAt < now-6h` AND `mlConfidence < 60` | Auto-APPROVE, `source: 'sla'`, log `sla_auto_approved` |
| B | `FLAGGED_FOR_REVIEW` AND `createdAt < now-24h` | Auto-APPROVE + ops alert log (`capacity_alert`) |
| Alert | Count of SLA auto-approvals in rolling 24h **> 20** | Structured log `sla_capacity_shortage` (ops paging = follow-up) |

Stuck `PENDING` with `moderationProvider='rekognition'` and `createdAt < now-15m`: treat as flag (`FLAGGED_FOR_REVIEW`, `error: 'ml_timeout'`) so they enter human queue.

### 8. User notifications

- **Email:** new `PhotoRejectionEmailService` — check `emailNotificationsEnabled`; map reason codes → friendly EN body (i18n strings also in UI for in-app display of `rejectionReason`).
- **In-app:** no notification inbox today — surface rejection on **profile photo section** via status + i18n copy (sufficient for MVP). Do not invent a notifications table.
- Friendly map:

| Code | User-facing (EN) |
|------|------------------|
| `no_face` | We couldn't detect a clear face in your photo. Please upload a photo where your face is visible. |
| `explicit_content` | Your photo doesn't meet our community guidelines. |
| `low_quality` | Your photo quality is too low. Please upload a higher resolution image. |
| `not_real_person` | Please upload a photo of yourself (not a celebrity, meme, or stock image). |
| `other` | Your photo was not approved. Please try a different photo. |

ES/HE: same keys under `photoModeration.rejectionReasons.*`.

### 9. Structured audit log

Every transition emits:

```json
{
  "logKind": "photo_moderation",
  "event": "auto_approved" | "auto_rejected" | "flagged" | "human_approved" | "human_rejected" | "sla_auto_approved" | "ml_error_flagged",
  "photoId": "...",
  "userId": "...",
  "mlConfidence": 0.85,
  "mlLabels": ["Explicit Nudity"],
  "reviewerId": "...",
  "rejectionReasonCode": "explicit_content",
  "timestamp": "..."
}
```

Use existing `StructuredObservabilityService` + dedicated `ErrorCodes` / message prefix. Keep analytics events `PHOTO_MODERATION_PENDING` / `PHOTO_MODERATION_DECIDED`.

### 10. Rate limit

Story mentions max 3 uploads/day — **defer** (already max **3 photos per profile**). No new daily rate limiter in this story.

### 11. Match / gate integration

**No query rewrite required** if gates already filter `APPROVED` only — verify and add E2E. Ensure any raw `status: 'PENDING'` admin assumptions updated for `FLAGGED_FOR_REVIEW`.

---

## Service signatures (copy-paste ready)

```typescript
// photo-moderation.service.ts
injectable class PhotoModerationService {
  decideFromRekognition(input: {
    photoId: string;
    storageKey: string;
  }): Promise<{
    status: 'APPROVED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW';
    result: PhotoModerationResultJson;
    rejectionReasonCode?: RejectionReasonCode;
  }>;

  applyDecision(photoId: string, outcome: ...): Promise<void>;
}

// workers
class PhotoModerationQueueService {
  enqueue(photoId: string): Promise<void>; // fail-open log if Redis down; optional inline run
}

class PhotoModerationWorker {
  process(job: { photoId: string }): Promise<void>;
}

class PhotoSlaEnforcer {
  runHourly(): Promise<{ autoApproved: number; flaggedStuck: number }>;
}

// notifications
class PhotoRejectionEmailService {
  sendBestEffort(params: {
    userId: string;
    photoId: string;
    rejectionReasonCode: RejectionReasonCode;
  }): Promise<void>;
}
```

---

## Migration plan

**Forward**

1. `ALTER TYPE "UserProfilePhotoStatus" ADD VALUE IF NOT EXISTS 'FLAGGED_FOR_REVIEW';` (Postgres; Prisma migrate).
2. No column adds required if using existing `moderationResultJson` / `rejectionReason`.
3. `npx prisma migrate deploy` on Agent 1 before smoke.

**Rollback**

- App can stop writing `FLAGGED_FOR_REVIEW`; cannot easily remove PG enum value — leave value unused.
- Feature-flag: `PHOTO_MODERATION_DRIVER=stub` restores manual PENDING queue only.

**Backfill**

- Do **not** re-moderate existing `APPROVED` in this story (follow-up). Optional JSON tag: skip.

---

## Runtime topology

| Concern | Rule |
|---------|------|
| REST browser target | Same-origin via Next rewrite (`/api/*` → API) unless `NEXT_PUBLIC_API_URL` set |
| Admin photo file | Session cookie + `AdminGuard` on `GET /api/v1/admin/photos/:id/file` — **not** CDN (moderators need private bytes) |
| Cookie host | `localhost` vs `127.0.0.1` alignment (existing auth rule) |
| Socket | **N/A** — no WS for moderation |
| Expected Network | Upload → 201; optional short poll on profile photos for status flip; admin list + blob fetch; reject → email best-effort (no UI wait) |
| Migration | Required before reading/writing `FLAGGED_FOR_REVIEW` |

---

## E2E verification plan (Agent 4 required)

| Item | Plan |
|------|------|
| Baseline | Keep green: `me-new-model-e2e*.integration.spec.ts` (eligibility, ranking, pagination) |
| Affects | **Eligibility / visibility** via photo gate — not ranking math |
| New scenarios (harness) | (1) Viewer with only `PENDING` photo → matches `not_ready` / `no_photo` (2) Candidate with only `FLAGGED_FOR_REVIEW` / `REJECTED` excluded from pool (3) After admin/ML approve → appears / ready |
| Admin | Integration (not necessarily Agent 4 harness): upload → worker mock → FLAGGED → PATCH approve |
| Agent 4 | **Required** — matches photo visibility contract |

---

## Env (`.env.example` additions)

```text
# Photo moderation ML (Story 2)
# PHOTO_MODERATION_DRIVER=rekognition
# PHOTO_FACE_DETECTION_ENABLED=1
# NSFW_FLAG_THRESHOLD=50
# NSFW_AUTO_REJECT_THRESHOLD=80
# PHOTO_MODERATION_SLA_LOW_HOURS=6
# PHOTO_MODERATION_SLA_MAX_HOURS=24
# PHOTO_MODERATION_SLA_LOW_CONFIDENCE=60
# PHOTO_MODERATION_SLA_ALERT_PER_DAY=20
# Dev only — never in production:
# PHOTO_MODERATION_AUTO_APPROVE=1
```

Rekognition uses default AWS credential chain / existing `AWS_ACCESS_KEY_ID` + region (`PHOTO_S3_REGION` or `AWS_REGION`).

---

## Testing strategy (for Agents 1–2)

| Layer | Focus |
|-------|--------|
| Unit | Threshold bands; empty labels → approve; API error → flag; SLA rules |
| Integration | Upload enqueues; worker updates status; admin list shows flagged; reject sends email mock |
| Agent 4 | Photo-gate / match pool approved-only with new statuses |
| Manual | Real Rekognition images (safe / NSFW test pack / no-face) on staging |

---

## Open questions / blockers

- None blocking design. **Ops:** IAM + Rekognition budget alert must exist before production `PHOTO_MODERATION_DRIVER=rekognition`.
- Deferred (story follow-ups): appeal flow, daily upload rate limit, re-moderate approved batch, in-app notification inbox.

---

## Next agent

```text
--agent 1 sprint 19 story 2
```

**Notes for next agent:**

- Implement on **`sprint-19`**; extend Sprint 10 admin + Story 1 Bull patterns.
- Remap aggressively — ignore fictional `Photo` / `/review-queue` as primary design.
- Ship enum + worker + admin/email/UI; do not rebuild match photo gate from scratch.
- After CR: `--agent 4 sprint 19 story 2` (photo visibility), then `--agent 3`.
