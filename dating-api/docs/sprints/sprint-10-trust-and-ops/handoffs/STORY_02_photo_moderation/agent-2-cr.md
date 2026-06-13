# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_photo_moderation.md](../../STORY_02_photo_moderation.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (test hardening applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` and `agent-1-dev.md` — **aligned** on upload → PENDING, admin queue API/UI, shared AdminGuard, analytics, browse gates unchanged.
- **No critical or major issues.** Security: AuthGuard + AdminGuard on all admin routes; non-admin → 403; admin list server-side only (`ADMIN_USER_IDS`).
- **Test hardening:** added non-admin 403 coverage on PATCH/file, reject integration + unit tests, rejected-badge UI test; removed placeholder spec block.
- Full API suite: **1373/1373** pass; UI suite: **278/278** pass (1 pre-existing unhandled-rejection flake in `conversations/[id]/page.spec.tsx`, not story-related).

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Upload → PENDING | `PHOTO_MODERATION_AUTO_APPROVE === '1'` gate only; pending never primary | OK |
| Auto-approve dev escape | Documented in `.env.example` + runbook | OK |
| Admin auth | `AuthGuard` + `AdminGuard`; 403 `admin_forbidden` | OK |
| Admin env | `ADMIN_USER_IDS` parsed server-side; not exposed to UI | OK |
| Approve transaction | First approved sets `isPrimary`; pending cannot be primary | OK |
| Reject | Status REJECTED, reason stored, `isPrimary: false`, blob retained | OK |
| Analytics | `photo.moderation_pending` empty props; decided `{ decision }` only | OK |
| Structured log | `ADMIN_PHOTO_MODERATION_DECIDED`; no rejection text in log | OK |
| Browse gates | `me-matches` APPROVED filter + photo gate unchanged | OK (verified) |
| Submit gate | 422 `photo_required` with 0 APPROVED (integration spec) | OK |
| DTO validation | `rejectionReason` max 200 on PATCH via `MeProfileValidationPipe` | OK |
| Index migration | `(status, createdAt)` for FIFO queue | OK |
| UI middleware | `/admin` requires session; API enforces admin | OK (per architect) |
| UI owner display | Pending/rejected badges + reason; set-primary disabled unless APPROVED | OK |
| `me-profile.service.spec` | Architect listed pending upload unit tests — **not present**; covered by HTTP integration | Minor — deferred |
| Query DTO validation | `ListPendingPhotosQueryDto` lacks pipe on GET; service clamps limit 1–100 | Minor — acceptable |
| Admin UI auth UX | Non-admin sees generic error string (403 from API) | Minor — acceptable v1 |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/admin/admin-photos/admin-photos-http.integration.spec.ts` | Non-admin 403 on PATCH + file; reject-with-reason integration |
| `dating-api/src/admin/admin-photos/admin-photos.service.spec.ts` | Reject + analytics unit test; removed placeholder block |
| `dating-ui/src/components/profile-photo-section.spec.tsx` | Rejected badge + reason display test |

---

## Tests / verification

```powershell
cd dating-api
npx jest admin-photos --runInBand   # 12/12 pass
npm test                            # 1373/1373 pass

cd ../dating-ui
npm test                            # 278/278 pass (1 pre-existing unhandled error in conversations spec teardown)
```

- [x] API unit/integration: **1373/1373** pass
- [x] UI unit: **278/278** pass
- [x] `npm run build`: verified by Agent 1 (unchanged)
- [ ] `npx prisma migrate deploy`: **operator** on target DB
- [ ] Manual smoke (story steps 1–4): **deferred to operator**

### Runtime verification

| Check | Result |
|-------|--------|
| Upload → PENDING (no auto-approve env) | HTTP integration spec |
| Submit blocked without APPROVED photo | HTTP integration spec |
| Admin list/approve/reject/file (admin session) | HTTP integration spec |
| Non-admin 403 on all three admin routes | HTTP integration spec (+ CR) |
| Approve sets primary when first approved | Service + HTTP specs |
| Owner pending/rejected UI badges | Vitest `profile-photo-section` (+ CR rejected) |
| Match browse APPROVED-only | Existing me-matches tests (no regression) |
| Browser end-to-end admin queue | Deferred — operator smoke |

**N/A:** No realtime/socket or WS proxy changes in this story.

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Upload → PENDING (not auto-APPROVED in prod path) | Done + tested |
| Viewer/submit gates unchanged (APPROVED only) | Done + tested |
| Browse shows APPROVED photos only | Done (verified existing) |
| Profile UI pending/rejected display | Done + tested |
| Admin API list/moderate/file | Done + tested |
| Admin UI `/admin/photos` | Done (manual smoke deferred) |
| Analytics events | Done + tested |
| Structured log on decision | Done (service code review) |
| Non-admin → 403 | Done + tested (+ CR) |
| Runbook §3 updated | Done (Agent 1) |
| Index migration | Done — deploy pending operator |

---

## Open questions / blockers

- None blocking agent 3 PM closeout.

Follow-up (not blocking):

- Optional `me-profile.service.spec.ts` unit tests for upload pending path (integration covers today).
- Operator: `ADMIN_USER_IDS` + `prisma migrate deploy` before prod smoke.
- Pre-existing Vitest unhandled rejection in `conversations/[id]/page.spec.tsx` (unrelated flake).

---

## Next agent

```text
--agent 3 sprint 10 story 2
```

**Notes for PM:**

- Story delivers manual photo moderation queue — replaces stub auto-approve for cohort launch.
- Engineering gate ready; operator manual smoke still required per sprint pattern (upload → admin approve → match visibility).
- Story 3 can reuse `AdminModule` / `AdminGuard` as architect planned.
