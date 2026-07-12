# Handoff: Agent 2 — Code review — Story 6

**Agent:** 2 code-review  
**Story:** [STORY_06_invite_referral_tracking.md](../../STORY_06_invite_referral_tracking.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (test hardening applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` and `agent-1-dev.md` — **aligned** on raw `?ref=` user id, sessionStorage persistence, create-only attribution, public landing beacon, analytics PII boundaries, empty-state invite URL.
- **No critical or major issues.** Signup never blocked by invalid ref; returning login ignores referral body.
- **Test hardening:** deleted-referrer HTTP case; beacon validation (`refPresent: false`, invalid body 400); `AuthService` unit assert on `referral.signup_completed` empty properties; funnel controller `refPresent: false`.
- Full suite: **1433/1433** API, **291/291** UI pass.

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Ref wire format | Raw `User.id` in `?ref=`; client cuid format gate | OK per architect |
| Persistence | `sessionStorage` `dating_referral_ref`; cleared on successful google exchange | OK + tested |
| Signup attribution | `ReferralAttributionService` on **create-only** path | OK + tested |
| Returning login | Ignores `referredByUserId`; no `findById` | OK + HTTP test |
| Invalid/deleted referrer | Signup **200**; `referredByUserId` null | OK (+ CR deleted HTTP) |
| Self-ref guard | `resolveReferrerUserId` rejects `ref === newUserId` | OK (unit) |
| Public beacon | `POST .../referral-landing-view`; body `{ refPresent }` only | OK (+ CR validation) |
| Landing analytics | Envelope `userId: anonymous` | OK |
| Signup analytics | `referral.signup_completed` properties `{}` | OK (+ CR unit assert) |
| Auth response | `referredByUserId` not in `AuthMeResponseDto` | OK |
| Schema | FK `SetNull` on referrer delete; index | OK |
| Empty state | `buildInviteUrl` with viewer id; fallback plain `/` | OK + tested |
| Docs | `PRODUCT_FUNNEL.md`, `DATA_RETENTION.md` | OK |

**Minor (acceptable):**

- `resolveReferrerUserId(..., '')` on create path — self-ref guard inactive until user id exists; tamper risk negligible (cuid collision).
- Landing beacon fires on every `searchParams` change (including `next=` navigation) — acceptable v1; may double-count if query churns before signup.
- `isNewUser` return field unused by caller — harmless.

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/auth/auth-http.integration.spec.ts` | **+3** — beacon `refPresent: false`; invalid body 400; deleted referrer signup |
| `dating-api/src/auth/auth.service.spec.ts` | **+1** — `referral.signup_completed` analytics PII assert |
| `dating-api/src/analytics/public-funnel.controller.spec.ts` | **+1** — `refPresent: false` track |

---

## Tests / verification

```powershell
cd dating-api
npm test
# 1433 passed

cd ../dating-ui
npm test
# 291 passed
```

- [x] API unit/integration: **1433/1433** pass
- [x] UI: **291/291** pass
- [x] `prisma migrate deploy`: operator prerequisite (`20260606300000_user_referred_by`)
- [ ] Manual smoke (story §): **deferred to operator**

### Runtime verification

| Check | Result |
|-------|--------|
| Landing capture + beacon | UI + HTTP |
| New user attributed signup | HTTP + unit |
| Invalid/deleted ref ignored | HTTP + unit |
| Returning login ignores ref | HTTP |
| Analytics PII boundary | Unit (+ CR) |

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| `?ref=` persisted through OAuth | Done + tested |
| `User.referredByUserId` on new signup | Done + tested |
| Empty state link includes ref | Done + tested |
| `referral.landing_viewed` / `referral.signup_completed` | Done + tested |
| Validation (self/deleted/invalid) | Done (+ CR deleted) |
| Privacy (no referrer PII in analytics props) | Done (+ CR) |
| API + UI tests | Done (+ CR hardening) |
| `PRODUCT_FUNNEL.md` | Done |

---

## Open questions / blockers

- None blocking agent 3 PM closeout.

Follow-up (not blocking):

- Opaque invite codes (Sprint 11).
- Soft-fail landing beacon errors (currently fire-and-forget).
- Referral counts in settings UI.

---

## Next agent

```text
--agent 3 sprint 10 story 6
```

**Notes for PM:**

- Engineering gate ready; deploy API + UI after **`npx prisma migrate deploy`**.
- Manual smoke: User A copies invite → User B incognito signup → `referredByUserId` in DB; use **real user id** in `?ref=` (not `test`).
- Story 6 completes sprint 10 (6/6 engineering stories).
