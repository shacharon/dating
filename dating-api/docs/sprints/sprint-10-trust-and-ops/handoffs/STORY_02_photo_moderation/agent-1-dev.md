# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_photo_moderation.md](../../STORY_02_photo_moderation.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Upload → `PENDING`** — production path no longer stub auto-approves; `PHOTO_MODERATION_AUTO_APPROVE=1` escape hatch for local/dev only.
- **Admin photo queue (API + UI)** — allowlisted admins list pending photos, approve/reject with optional reason, fetch file for thumbnails.
- **Shared admin foundation** — `AdminModule`, `AdminGuard`, `AdminConfigService` (`ADMIN_USER_IDS`); Story 3 reuses.
- **Profile UI** — owner sees pending (amber) / rejected (red + reason) badges on `/dating/profile`.
- **Browse unchanged** — only `APPROVED` photos in match DTOs; submit gate still requires ≥1 approved photo.
- **Analytics + observability** — `photo.moderation_pending` on upload; `photo.moderation_decided` + structured log on admin decision.
- **Index migration** — `UserProfilePhoto(status, createdAt)` for pending queue pagination.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — admin (new)** | |
| `dating-api/src/admin/admin.module.ts` | **created** — Prisma, PhotoStorage, Session, Users, AuthModule |
| `dating-api/src/admin/admin-config.service.ts` | **created** — parse `ADMIN_USER_IDS` |
| `dating-api/src/admin/admin.guard.ts` | **created** — AuthGuard + allowlist → 403 |
| `dating-api/src/admin/admin-photos/admin-photos.controller.ts` | **created** — GET pending, PATCH moderate, GET file |
| `dating-api/src/admin/admin-photos/admin-photos.service.ts` | **created** — queue, approve (auto-primary if none), reject |
| `dating-api/src/admin/admin-photos/dto/list-pending-photos.dto.ts` | query/response types |
| `dating-api/src/admin/admin-photos/dto/moderate-photo.dto.ts` | PATCH body validation |
| `dating-api/src/admin/admin-photos/admin-photos-http.integration.spec.ts` | 403, list, approve, file |
| `dating-api/src/admin/admin-photos/admin-photos.service.spec.ts` | unit tests |
| `dating-api/src/app.module.ts` | import `AdminModule` |
| **API — me profile (update)** | |
| `dating-api/src/me-profile/me-profile.service.ts` | upload → PENDING; analytics; primary only when APPROVED |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | upload pending + submit 422 without approved |
| `dating-api/src/analytics/product-analytics.events.ts` | `PHOTO_MODERATION_PENDING`, `PHOTO_MODERATION_DECIDED` |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_PHOTO_MODERATION_DECIDED`, related codes |
| `dating-api/prisma/migrations/20260606210000_user_profile_photo_status_queue_index/migration.sql` | index on `(status, createdAt)` |
| `dating-api/prisma/schema.prisma` | `@@index([status, createdAt])` on `UserProfilePhoto` |
| `dating-api/.env.example` | `ADMIN_USER_IDS`, `PHOTO_MODERATION_AUTO_APPROVE` |
| **Test fixes (photo gate mocks)** | |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | add `userProfilePhoto.count` mock |
| `dating-api/src/me-profile/me-new-model-e2e.integration.spec.ts` | add `userProfilePhoto` mock with `count` |
| **UI** | |
| `dating-ui/src/app/admin/page.tsx` | **created** — index linking to Photos |
| `dating-ui/src/app/admin/photos/page.tsx` | **created** — pending queue UI |
| `dating-ui/src/lib/admin-photos-api.ts` | **created** — list, moderate, fetch blob |
| `dating-ui/src/components/profile-photo-section.tsx` | status badges + rejection reason |
| `dating-ui/src/components/profile-photo-section.spec.tsx` | pending badge test |
| `dating-ui/src/middleware.ts` + `middleware.spec.ts` | `/admin` requires auth |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `photoModeration.*` |
| **Docs** | |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | §3 product queue workflow |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | new events |

---

## Decisions (do not reverse without discussion)

- Followed architect handoff — manual queue first; no Rekognition.
- `PHOTO_MODERATION_AUTO_APPROVE=1` is dev-only; production must leave unset.
- Only `APPROVED` photos can be `isPrimary`; approve sets primary when profile has none.
- Admin file endpoint serves any photo row (pending/approved/rejected) for ops review.
- Non-admin authenticated users get **403** on admin API (not 404).

---

## API behavior notes

| Case | Result |
|------|--------|
| Upload (prod path) | **201** photo with `status: PENDING`; `photo.moderation_pending` |
| Upload (`PHOTO_MODERATION_AUTO_APPROVE=1`) | **201** `status: APPROVED`, `moderationProvider: stub` |
| Submit with 0 approved photos | **422** `{ error: 'photo_required' }` |
| `GET /api/v1/admin/photos/pending` (non-admin) | **403** |
| `PATCH .../photos/:id` approve | status → APPROVED; primary if first approved |
| `PATCH .../photos/:id` reject | status → REJECTED; `isPrimary: false`; optional reason |
| Match browse | unchanged — only APPROVED in DTOs |

---

## Tests / verification

```powershell
cd dating-api
npm test                    # 1370/1370 pass

cd ../dating-ui
npm test                    # 277/277 pass
npm run build               # exit 0
```

- [x] API unit/integration: **1370/1370 pass**
- [x] UI unit: **277/277 pass**
- [x] `npm run build`: **pass**
- [ ] `npx prisma migrate deploy`: **operator** on target DB
- [ ] Manual smoke (story steps 1–4): **deferred to operator**

**Manual smoke (operator):**

1. Set `ADMIN_USER_IDS=<your-user-id>` in API `.env`; restart API.
2. Upload photo → profile shows **Pending** badge.
3. Open `/admin/photos` as admin → approve → photo appears on match list for other user.
4. Upload another → reject with reason → owner sees red badge + reason; not on match list.
5. User with only pending photos → submit returns 422.

---

## Deviations from architect

None.

---

## Open questions / blockers

- Admin UI has no dedicated unit spec for `admin-photos-api.ts` (optional; page is integration-tested manually).
- Rejected-photo badge UI test not added (only pending covered); CR may add if desired.

---

## Next agent

```text
--agent 2 sprint 10 story 2
```

**Notes for CR:**

1. Confirm upload path never auto-approves when `PHOTO_MODERATION_AUTO_APPROVE` unset.
2. Verify approve transaction: pending cannot become primary until approved; first approve sets primary.
3. Check non-admin 403 on all three admin photo routes.
4. Confirm analytics properties omit blob/storage ids (`decision` only on decided).
5. Grep for stale tests expecting upload → APPROVED without auto-approve env.
6. Run `prisma migrate deploy` before prod smoke.
