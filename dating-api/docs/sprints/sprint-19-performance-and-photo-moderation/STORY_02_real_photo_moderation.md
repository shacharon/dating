# Story 2: Real photo moderation — ML + human review

**Epic:** Sprint 19 — Performance optimization + real photo moderation  
**Story:** Real photo moderation  
**Priority:** P0 (MVP-blocking for public launch — trust/safety liability)  
**Estimated effort:** ~1 week (4 agents)  
**Status:** Done

---

## Problem statement

[Sprint 9 Story 2](../sprint-09-product-mvp/STORY_02_photo_gate_profile_completeness.md) shipped **stub auto-approve** for photos with explicit "manual ops for small cohort" callout. This was acceptable for closed beta with <100 users.

**Current state (pre–Sprint 19):** Uploads could sit `PENDING` for manual queue, or auto-approve via `PHOTO_MODERATION_AUTO_APPROVE=1` — no ML NSFW path.

**Risks for public launch:**
1. **NSFW/explicit content** reaches users (legal liability, user trust loss)
2. **Catfishing** (fake photos, celebrities, stock images)
3. **Spam/low-quality** (memes, screenshots, blank images)
4. **No recourse** if bad photo reaches matches (user reports but no workflow)

**Impact:** One viral tweet about explicit content on the platform → permanent reputation damage. Unacceptable for public launch.

---

## Success criteria (AC)

### A. Photo state machine (DB schema)

- [x] Prisma: extend `UserProfilePhotoStatus` with `FLAGGED_FOR_REVIEW` (remap — no fictional `Photo` table)
- [x] `moderationResultJson` holds ML + review fields (remap from `moderationResult`)
- [x] Migration: `20260712120000_add_photo_flagged_for_review`
- [x] No NULL backfill needed — status already NOT NULL; legacy rows stay `APPROVED`
- [x] Default on upload: `status='PENDING'` (already true; ML/mock enqueue when driver ≠ stub)

### B. AWS Rekognition integration (ML classification)

- [x] `photo-moderation.service.ts`: Rekognition `DetectModerationLabels` (+ optional faces)
- [x] ML thresholds via `.env`: `NSFW_AUTO_REJECT_THRESHOLD=80`, `NSFW_FLAG_THRESHOLD=50`
- [x] Face check: 0 faces → `FLAGGED_FOR_REVIEW` (`no_face`) when face detection enabled
- [ ] Image quality / blur warn — **deferred** (no AWS quality signal in MVP)
- [x] On upload: storage → Bull `photo-moderation` → ML → update status + JSON (remap from Lambda)
- [x] Unit tests: mock Rekognition (safe / flag / reject / API error → flag)
- [x] Drivers: `rekognition` | `mock` (local auto-approve without AWS) | `stub` (full manual); unset → rekognition if AWS creds else mock

### C. Human review queue (admin UI)

- [x] Extend `GET /api/v1/admin/photos/pending` — queue = `PENDING` + `FLAGGED_FOR_REVIEW` (remap — no `/review-queue`)
- [x] Sorted by `createdAt ASC` (oldest first); ML confidence / labels on DTO
- [x] UI: `/admin/photos` — thumbnail + ML; **Approve** | **Reject** | **Skip** (Skip = UI-only)
- [x] `PATCH /api/v1/admin/photos/:photoId` approve/reject (remap — no POST aliases)
- [x] Reject reason codes: `no_face` | `explicit_content` | `low_quality` | `not_real_person` | `other`

### D. User notifications (rejection feedback)

- [x] Email: photo rejection template + friendly reason copy
- [x] Reasons mapped EN (and UI i18n EN/ES/HE)
- [x] In-app: profile photo section status/copy (no notification inbox — remapped)
- [x] i18n rejection reasons EN/ES/HE
- [x] User can re-upload from profile (unchanged)

### E. Match flow integration (visibility rules)

- [x] Match pool / photo gate: `APPROVED` only (already Sprint 9/10; kept)
- [x] Profile / candidates: non-approved never count as “has photo”
- [x] E2E: pending/flagged/rejected → not ready / excluded; approve → visible (`me-new-model-e2e-photo-moderation`)

### F. SLA enforcement (auto-approve fallback)

- [x] Hourly SLA enforcer (Nest interval / cron pattern)
- [x] Rule A: flagged >6h + NSFW mid-band low confidence → auto-approve (**excludes** `no_face` / error flags — Agent 2 fix)
- [x] Rule B: flagged >24h → auto-approve + capacity alert log
- [x] Structured audit for SLA auto-approvals
- [x] Alert log if >20 SLA auto-approvals / day

### G. Audit trail (compliance)

- [x] Structured `logKind: photo_moderation` events (auto/human/SLA/ml_error)
- [ ] CloudWatch Insights dashboards — **deferred** ops

---

## Technical design

> **Shipped remap:** Implement against `UserProfilePhoto` + Sprint 10 admin (`GET …/photos/pending`, `PATCH …/photos/:id`). See `handoffs/STORY_02_real_photo_moderation/agent-0-architect.md`. NSFW = max label confidence: **&lt;50% approve**, **50–80% flag**, **≥80% reject**.

### Architecture

```
BEFORE (Sprint 9 stub / manual):
User uploads → UserProfilePhoto PENDING (or AUTO_APPROVE stub) → admin or instant APPROVED

AFTER (Sprint 19):
User uploads → UserProfilePhoto PENDING
             → Bull photo-moderation → Rekognition (or mock locally)
             → NSFW <50%: APPROVED
             → 50–80%: FLAGGED_FOR_REVIEW
             → ≥80%: REJECTED + email
             → API error: FLAGGED_FOR_REVIEW (fail-open to human)

Admin: /admin/photos (PENDING + FLAGGED) → PATCH approve/reject
SLA hourly: mid-band flagged >6h low conf → APPROVED; any flagged >24h → APPROVED + alert
```

### Photo state machine

```
PENDING (initial)
  ↓
  ML scan (Rekognition)
  ↓
  ├─ Confidence <50% → APPROVED (auto)
  ├─ Confidence 50-80% → FLAGGED_FOR_REVIEW
  │    ↓
  │    Human review or SLA timeout
  │    ↓
  │    ├─ Approve → APPROVED
  │    └─ Reject → REJECTED
  └─ Confidence >80% → REJECTED (auto)

APPROVED: visible in match flow
REJECTED: hidden, user notified, can re-upload
```

### AWS Rekognition request/response

```typescript
// Request
const params = {
  Image: {
    S3Object: {
      Bucket: process.env.PHOTO_BUCKET,
      Name: photoKey
    }
  },
  MinConfidence: 50 // lower threshold to catch edge cases
};
const result = await rekognition.detectModerationLabels(params).promise();

// Response example (explicit content)
{
  ModerationLabels: [
    {
      Name: 'Explicit Nudity',
      ParentName: 'Nudity',
      Confidence: 92.5
    }
  ]
}

// Response example (safe)
{
  ModerationLabels: [] // no labels → safe
}
```

### Database migration

```sql
-- 20260711100000_photo_moderation_states.sql

-- Add status enum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED_FOR_REVIEW');

ALTER TABLE "Photo" 
  ADD COLUMN "status" "PhotoStatus" DEFAULT 'PENDING',
  ADD COLUMN "moderationResult" JSONB DEFAULT '{}';

-- Backfill existing photos (all approved in stub flow)
UPDATE "Photo" 
SET 
  status = 'APPROVED',
  moderationResult = '{"source": "legacy", "approved_at": "2026-07-11"}'::jsonb
WHERE status IS NULL;

ALTER TABLE "Photo" ALTER COLUMN "status" SET NOT NULL;

-- Index for review queue query
CREATE INDEX "Photo_status_uploadedAt_idx" ON "Photo"("status", "uploadedAt");
```

### Code changes (key files)

```
dating-api/src/
├── photos/
│   ├── photo-moderation.service.ts      # NEW: Rekognition integration
│   ├── photo-moderation.worker.ts       # NEW: Bull worker for async moderation
│   ├── photo-sla-enforcer.cron.ts       # NEW: hourly SLA job
│   ├── photo-moderation.service.spec.ts
│   └── photos.service.ts                # MODIFY: set status='pending' on upload
├── admin/
│   ├── admin-photos.controller.ts       # NEW: review queue endpoints
│   ├── admin-photos.service.ts          # NEW: approve/reject logic
│   └── admin-photos.controller.spec.ts
├── notifications/
│   ├── photo-rejection.template.ts      # NEW: email template
│   └── notifications.service.ts         # MODIFY: send photo rejection notification
└── me-profile/
    ├── me-matches.service.ts            # MODIFY: JOIN Photo WHERE status='APPROVED'
    └── me-profile.service.ts            # MODIFY: photo gate checks approved photos

dating-ui/src/
├── app/admin/photos/
│   ├── page.tsx                         # NEW: review queue UI
│   └── review-actions.tsx               # NEW: approve/reject buttons
├── lib/
│   └── admin-photos-api.ts              # NEW: API client for review queue
└── lib/i18n/
    ├── en.ts                            # MODIFY: add photo rejection copy
    ├── es.ts                            # MODIFY: add photo rejection copy (Spanish)
    └── he.ts                            # MODIFY: add photo rejection copy (Hebrew)
```

### API contract changes

#### New admin endpoints

```typescript
// Get review queue
GET /api/v1/admin/photos/review-queue
Response: {
  photos: [
    {
      id: string,
      url: string,
      uploadedAt: string,
      userId: string, // no PII
      mlConfidence: number,
      mlLabels: string[],
      flaggedAt: string
    }
  ]
}

// Approve photo
POST /api/v1/admin/photos/:photoId/approve
Response: { success: true }

// Reject photo
POST /api/v1/admin/photos/:photoId/reject
Body: { reason: 'no_face' | 'explicit_content' | 'low_quality' | 'not_real_person' | 'other' }
Response: { success: true }
```

---

## Testing strategy

### Unit tests (dating-api)

- `photo-moderation.service.spec.ts`: mock Rekognition; test thresholds (safe → approve, risky → flag, explicit → reject)
- `photo-sla-enforcer.spec.ts`: mock DB; test auto-approve logic (6hr low confidence, 24hr timeout)
- `admin-photos.service.spec.ts`: approve/reject updates status, logs event

### Integration tests (dating-api)

- `photo-moderation-flow.integration.spec.ts`: upload photo → worker runs → status updated
- `match-list-approved-only.integration.spec.ts`: user with pending photo → not in match pool
- `photo-gate.integration.spec.ts`: user with 0 approved photos → `status='not_ready'` reason `'no_photo'`

### E2E tests (dating-ui)

- `admin-photo-review.e2e.spec.ts`: admin opens queue → approves photo → photo visible
- `user-photo-rejection.e2e.spec.ts`: upload → auto-rejected → see notification → re-upload

### Manual smoke (real Rekognition)

Prepare test images:
- `safe-photo.jpg` (normal selfie)
- `nsfw-photo.jpg` (explicit content — use Rekognition test image)
- `no-face-photo.jpg` (landscape, no person)
- `low-quality-photo.jpg` (pixelated/blurry)

Upload each; verify ML classification + status.

---

## Rollout plan

### Phase 1: Infrastructure (Agent 0–1)
1. AWS Rekognition API credentials (IAM role with `rekognition:DetectModerationLabels`)
2. Database migration (photo states)
3. Backfill existing photos to `APPROVED` (legacy)

### Phase 2: Backend (Agent 1)
1. Implement `photo-moderation.service.ts` (Rekognition client)
2. Implement Bull worker (async moderation on upload)
3. Implement SLA enforcer cron job
4. Implement admin endpoints (review queue, approve/reject)
5. Update photo gate logic (approved photos only)
6. Update match list query (approved photos only)

### Phase 3: Admin UI (Agent 1)
1. Build `/admin/photos` review queue page
2. Implement approve/reject actions
3. Add i18n for rejection reasons

### Phase 4: User notifications (Agent 1)
1. Email template for rejection
2. In-app notification integration
3. i18n (EN/ES/HE)

### Phase 5: Testing (Agent 2)
1. Unit + integration tests
2. E2E tests (admin review, user rejection)
3. Manual smoke with real test images

### Phase 6: Deploy & monitor (Agent 3)
1. Deploy to staging; smoke test with real Rekognition
2. Monitor: auto-reject rate, flag rate, human review queue depth
3. Deploy to production (low-risk: only affects new uploads)
4. Backfill check: ensure existing photos still visible (status='APPROVED')

---

## Success metrics (measure week 1 post-deploy)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Photo auto-approval rate | >85% | `SELECT COUNT(*) ... WHERE status='APPROVED' AND moderationResult->>'source'='ml'` |
| Photo auto-reject rate | <5% | `SELECT COUNT(*) ... WHERE status='REJECTED' AND moderationResult->>'source'='ml'` |
| Human review queue size | <50 at any time | `SELECT COUNT(*) FROM Photo WHERE status='FLAGGED_FOR_REVIEW'` |
| SLA adherence (reviewed <24hr) | >95% | `SELECT COUNT(*) ... WHERE reviewedAt - uploadedAt < INTERVAL '24 hours'` |
| False positive rate (good photo rejected) | <2% | User support tickets |
| NSFW content reaching users | 0 | User reports (logKind: 'user_report', reason: 'inappropriate_photo') |

---

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rekognition false positive → good photo rejected | High | Conservative thresholds (80%+); human review queue for 50–80% |
| Rekognition API downgrade → all photos stuck pending | High | Fallback: if API error, set status='flagged_for_review' (human queue) |
| Human review queue backlog (>100 photos) | Medium | SLA auto-approve after 6hr (low confidence) + alert ops |
| User uploads 10 explicit photos → spams queue | Low | Rate limit: max 3 photo uploads per day per user |
| AWS Rekognition cost spike | Low | Budget alert at $100/month; estimate ~$0.001/photo = $100 for 100k photos |

---

## Compliance & legal

- **GDPR:** Photo moderation logs include user ID (not email/name) → still PII; document in privacy policy
- **Right to appeal:** Deferred to follow-up story (user can contest rejection via support)
- **Data retention:** Rejected photos stay in S3 for 30 days (audit trail), then purged
- **Moderator training:** Document rejection criteria; require admin to complete guide before access

---

## Deferred (Story 2 follow-ups)

- **Photo appeal flow:** User clicks "I think this was a mistake" → escalates to senior review
- **Proactive re-moderation:** Batch re-scan approved photos (quarterly) for policy updates
- **Face verification:** Selfie + photo matching to prevent catfishing (separate epic)
- **Video moderation:** Apply same ML + human review to video profiles (future feature)
- **Advanced ML:** Train custom model on dating-specific policy (celebrities, memes, etc.)
- **Moderator dashboard:** Queue stats, performance metrics, training materials
- **Image quality / blur** signal wiring
- **Privacy policy copy** update (ops/legal) — tracked in Agent 3 handoff
- **Staging Rekognition smoke** — operator checklist

---

## Dependencies

- AWS Rekognition API access (IAM credentials)
- Email service (existing from Sprint 8)
- Admin auth (existing from Sprint 10)
- Notification service (existing from Sprint 8)

---

## Agent handoff checklist

### Agent 0 (Architect) delivers:
- [x] Photo state machine documented (enum values, transitions)
- [x] Database migration script written + reviewed
- [x] API contract for admin endpoints documented (extend Sprint 10)
- [x] Rekognition thresholds documented (80% / 50% / auto)
- [x] SLA enforcement logic designed (6hr / 24hr / alert)
- [x] Rejection reason → user-friendly copy mapping (i18n)

### Agent 1 (Senior Dev) delivers:
- [x] `photo-moderation.service.ts` implemented (Rekognition client)
- [x] Bull worker for async moderation
- [x] SLA enforcer cron job
- [x] Admin endpoints (extended pending queue + PATCH)
- [x] Admin UI (`/admin/photos` page)
- [x] User notifications (email + profile status copy)
- [x] Photo gate + match list verified (approved only)
- [x] Database migration applied
- [x] Unit/integration smoke passing (Agent 2 completed full Story 2 suite)

### Agent 2 (Code Review) delivers:
- [x] Code review complete (moderation, admin, notifications) — verdict `fixed`
- [x] Integration tests written + passing
- [x] E2E tests written + passing (Agent 4)
- [ ] Manual smoke with real Rekognition test images — **tracked operator follow-up**
- [x] i18n complete (EN/ES/HE rejection reasons)
- [ ] Linter clean — **deferred** / not blocking

### Agent 3 (PM / Close) delivers:
- [x] Engineering DoD closed (Agents 0–2–4); ops smoke tracked
- [ ] Staging smoke complete (upload → ML → admin) — **tracked operator follow-up**
- [ ] Success metrics captured in production week 1 — **deferred** ops
- [x] Runbook: [PERFORMANCE_AND_MODERATION_RUNBOOK.md](../../ops/PERFORMANCE_AND_MODERATION_RUNBOOK.md)
- [ ] Privacy policy updated — **deferred** legal/ops
- [ ] Production deploy plan reviewed + approved — **deferred** ops
- [x] Story marked DONE in sprint README
- [x] Handoff `agent-3-pm.md` written
