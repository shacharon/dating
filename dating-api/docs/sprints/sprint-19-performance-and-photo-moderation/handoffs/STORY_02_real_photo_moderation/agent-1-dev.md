# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_real_photo_moderation.md](../../STORY_02_real_photo_moderation.md)  
**Sprint:** sprint-19-performance-and-photo-moderation  
**Date:** 2026-07-12  
**Status:** complete  

---

## Summary

- Extended **`UserProfilePhotoStatus`** with `FLAGGED_FOR_REVIEW` (migration applied locally).
- Implemented Rekognition-backed **`PhotoModerationService`** + Bull **`photo-moderation`** queue (inline fallback) + hourly **SLA enforcer**.
- Upload path: `PHOTO_MODERATION_DRIVER=rekognition` → `PENDING` + enqueue; stub driver stays manual queue; `PHOTO_MODERATION_AUTO_APPROVE=1` unchanged.
- Admin queue lists `PENDING` + `FLAGGED_FOR_REVIEW` with ML fields; PATCH accepts coded reject reasons + sends rejection email; error `photo_not_reviewable`.
- Admin UI: ML labels/confidence, reason codes, Skip (UI-only). i18n EN/ES/HE rejection copy + flagged status.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `FLAGGED_FOR_REVIEW` enum value |
| `dating-api/prisma/migrations/20260712120000_add_photo_flagged_for_review/` | Migration |
| `dating-api/src/photo-storage/photo-moderation.types.ts` | **New** |
| `dating-api/src/photo-storage/photo-moderation.config.ts` | **New** |
| `dating-api/src/photo-storage/photo-moderation.service.ts` | **New** — Rekognition + thresholds + apply |
| `dating-api/src/workers/photo-moderation.queue.ts` | **New** |
| `dating-api/src/workers/photo-moderation.worker.ts` | **New** |
| `dating-api/src/workers/photo-sla.cron.ts` | **New** — hourly setInterval |
| `dating-api/src/workers/worker.module.ts` | Register moderation + SLA |
| `dating-api/src/me-profile/me-profile.service.ts` | Enqueue on upload when driver=rekognition |
| `dating-api/src/admin/admin-photos/*` | Extended queue + PATCH + notify |
| `dating-api/src/notifications/photo-rejection-email.service.ts` | **New** |
| `dating-api/src/logging/error-codes.ts` | Photo moderation + email codes |
| `dating-api/.env.example` | Thresholds / SLA / driver knobs |
| `dating-ui/src/app/admin/photos/page.tsx` | ML + codes + Skip |
| `dating-ui/src/lib/admin-photos-api.ts` | Extended types / PATCH body |
| `dating-ui/src/lib/i18n/{en,es,he,types}.ts` | Flagged + rejectionReasons |
| `dating-ui/src/components/profile-photo-section.tsx` | Flagged status label |
| `dating-api/package.json` | `@aws-sdk/client-rekognition` |

---

## Decisions (followed from Agent 0)

- No `Photo` table; extend Sprint 10 admin routes.
- NSFW = max label confidence; bands 50 / 80; API error → flag (never silent approve).
- Skip is UI-only.
- In-app notification = profile photo status/copy (no inbox table).

---

## Runtime topology

| Concern | Status |
|---------|--------|
| REST | Same-origin `/api` rewrite |
| Admin file | Cookie + AdminGuard (not CDN) |
| Socket | N/A |
| Migration | **`npx prisma migrate deploy` applied** (`20260712120000_add_photo_flagged_for_review`) |

---

## Tests / verification

```text
npx prisma migrate deploy
→ Applied 20260712120000_add_photo_flagged_for_review

npx tsc --noEmit -p tsconfig.json
→ exit 0

npx jest --no-coverage src/admin/admin-photos/admin-photos.service.spec.ts src/photo-storage/photo-storage.config.spec.ts --runInBand
→ 2 suites, 8 passed

npx jest --no-coverage "admin-photos-http.integration.spec.ts" --runInBand
→ 7 passed

npx jest --no-coverage "me-new-model-e2e-eligibility.integration.spec.ts" --runInBand
→ 5 passed
```

- [x] Unit/integration smoke (scoped): pass
- [x] `prisma migrate deploy`: yes
- [ ] Browser Network smoke: **deferred** — needs admin session + optional real Rekognition; Agent 2/3
- [ ] Socket transport: N/A
- [ ] Full Rekognition unit suite / SLA unit tests: **Agent 2**

### Photo baseline (local DB at migrate time)

Run for Agent 3 metrics:

```sql
SELECT status, COUNT(*) AS count FROM "UserProfilePhoto" GROUP BY status;
```

(Not captured numerically here — query via staging/prod for DoD metrics.)

---

## How to run locally

```text
# API
cd dating-api
npx prisma migrate deploy
# Optional ML:
# PHOTO_MODERATION_DRIVER=rekognition
# PHOTO_FACE_DETECTION_ENABLED=1
# AWS credentials + PHOTO_S3_* if using S3Object path
npm run start:dev

# UI
cd dating-ui
npm run dev
# Admin: /admin/photos (ADMIN_USER_IDS must include your user id)
```

---

## Open questions / blockers

- None for Agent 2. Real Rekognition smoke needs AWS IAM in staging.
- Agent 4 still required for photo-gate / match visibility E2E with new statuses.

---

## Next agent

```text
--agent 2 sprint 19 story 2
```

**Notes for next agent:**

- Prefer unit tests on `decideFromScores` / SLA rules / mock Rekognition — do not require live AWS in CI.
- Update any remaining specs that assumed queue = PENDING-only without FLAGGED.
- Flag Agent 4 for approved-only match visibility with `FLAGGED_FOR_REVIEW` / `REJECTED` candidates.
