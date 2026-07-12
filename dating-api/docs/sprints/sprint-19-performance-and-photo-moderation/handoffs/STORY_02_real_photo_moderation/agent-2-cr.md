# Handoff: Agent 2 — Code Review — Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_real_photo_moderation.md](../../STORY_02_real_photo_moderation.md)  
**Sprint:** sprint-19-performance-and-photo-moderation  
**Date:** 2026-07-12  
**Status:** complete  
**Verdict:** fixed  

---

## Summary

- Reviewed Agent 1 against Agent 0 (extend `UserProfilePhoto`, admin routes, Rekognition bands, fail-open, Bull, SLA).
- **Fixed Major:** SLA Rule A no longer auto-approves `no_face` / error / non-NSFW flags (confidence `0` was wrongly treated as “low NSFW”).
- **Fixed Major:** `applyOutcome` uses conditional `updateMany` + `expectedStatuses` so stale workers cannot overwrite admin/SLA decisions.
- Added unit/integration/UI tests for thresholds, Rekognition fail-open, SLA rules, rejection email, admin FLAGGED list fields, admin UI actions.
- **Agent 4 required next** — photo-gate / match visibility for `PENDING` / `FLAGGED_FOR_REVIEW` / `REJECTED`.

---

## Issues

| Severity | Issue | Resolution |
|----------|-------|------------|
| Major | SLA Rule A auto-approved `no_face` (mlConfidence 0) after 6h | `resolveSlaRule` requires NSFW mid-band (`≥ flagThreshold`, `< slaLowConfidence`); excludes `no_face` / `low_quality` / `not_real_person` / `error` |
| Major | Worker/SLA race could overwrite decided rows | `applyOutcome(..., { expectedStatuses })` + `updateMany`; skip if count 0 |
| Major | Missing ML/SLA unit coverage | Added specs (below) |
| Minor | Image quality / blur warn not implemented | **Deferred** — no AWS quality signal wired; face + NSFW cover MVP; follow-up |
| Minor | `other` reject free-text not required | Deferred — UI still sends code; copy defaults from EN map |
| Minor | Profile shows server EN `rejectionReason` vs locale map | Deferred — i18n keys exist; DTO has no code field for UI map yet |

No Critical auth/data-leak issues. Admin remains `AuthGuard` + `AdminGuard`; queue returns `userId` only (no email/name); audit logs reason **codes**, not free-text.

---

## Artifacts (this step)

| Path | Change |
|------|--------|
| `dating-api/src/photo-storage/photo-moderation.service.ts` | Race-safe `applyOutcome` |
| `dating-api/src/workers/photo-sla.cron.ts` | Safer Rule A |
| `dating-api/src/photo-storage/photo-moderation.service.spec.ts` | **New** |
| `dating-api/src/workers/photo-sla.cron.spec.ts` | **New** |
| `dating-api/src/notifications/photo-rejection-email.service.spec.ts` | **New** |
| `dating-api/src/admin/admin-photos/admin-photos-http.integration.spec.ts` | FLAGGED + ML fields on list |
| `dating-ui/src/app/admin/photos/page.spec.tsx` | **New** |

---

## Tests / verification

### Commands + results

```text
npx tsc --noEmit -p tsconfig.json
→ exit 0

npx jest --no-coverage src/photo-storage/photo-moderation.service.spec.ts src/workers/photo-sla.cron.spec.ts src/notifications/photo-rejection-email.service.spec.ts src/admin/admin-photos --runInBand
→ Test Suites: 5 passed, 5 total
→ Tests:       29 passed, 29 total

# UI
npx vitest run src/app/admin/photos/page.spec.tsx
→ 2 passed
```

- [x] Unit/integration: pass (Story 2 surface)
- [x] `prisma migrate deploy`: already applied in Agent 1
- [ ] Browser Network / real Rekognition smoke: **deferred** (needs AWS IAM + admin session — Agent 3)
- [ ] Socket transport: **N/A**

---

## Runtime topology

| Concern | Verified |
|---------|----------|
| Admin routes gated | Yes — HTTP 403 non-admin still covered |
| Admin file not CDN | Unchanged cookie + AdminGuard path |
| Migration | Present + deployed (Agent 1) |

---

## E2E verification

- [ ] Baseline match E2E: not re-run full suite here — **Agent 4 owns** photo visibility scenarios
- Affects: **eligibility / visibility** (approved-only photo gate), not ranking math
- Agent 4 must prove: only-`PENDING` / `FLAGGED` / `REJECTED` → not in pool / `not_ready` `no_photo`; after approve → visible

---

## Open questions / blockers

- None blocking Agent 4. Staging Rekognition smoke remains PM/manual DoD.

---

## Next agent

```text
--agent 4 sprint 19 story 2
```

**Notes for next agent:**

- Use `me-matches-eligibility-harness.ts`; set photo rows to non-`APPROVED` statuses and assert matches/gate.
- Do not weaken APPROVED-only filters.
- After E2E: `--agent 3 sprint 19 story 2`.
