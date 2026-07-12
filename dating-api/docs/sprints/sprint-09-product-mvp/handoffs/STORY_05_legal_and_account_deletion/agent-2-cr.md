# Handoff: Agent 2 — Code review — Story 5

**Agent:** 2 code-review  
**Story:** [STORY_05_legal_and_account_deletion.md](../../STORY_05_legal_and_account_deletion.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (minor fixes + tests applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **aligned**: `MeAccountModule`, soft-delete scrub, session/WS teardown, legal pages, account settings, `account.deleted` analytics.
- Applied **fixes/tests**: `OptionalAuthGuard` rejects `deletedAt`; analytics-before-txn + photo-failure unit tests; API client + account page + landing footer specs.
- Story test suite: **11/11** API me-account unit; **5/5** HTTP integration; **7/7** optional-auth; **241/241** UI (+4 CR specs).

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Architect alignment | `DELETE /api/v1/me/account` + confirmation | OK |
| Soft-delete scrub | email/googleId scrub, profile PII, unmatch, messages | OK |
| Photo storage | best-effort before txn; failure logged | OK (+ test) |
| Analytics | `account.deleted` before txn, empty props | OK (+ test) |
| Session + cookie | revoke all + clear cookie on 204 | OK |
| Auth guard | `deletedAt` → 401 | OK |
| Optional auth | Missing `deletedAt` check | **Fixed** |
| Match browse | `user.deletedAt: null` filter | OK (code review) |
| Legal pages | draft footer, markdown, public routes | OK |
| Account settings | legal + notif link + delete zone | OK (+ page spec) |
| Landing footer | Privacy / Terms links | OK (+ spec) |
| i18n | accountSettings + deleteAccount en/es | OK |
| Manual browser smoke | delete + re-login | Deferred — operator |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/auth/optional-auth.guard.ts` | Skip auth population when `deletedAt != null` |
| `dating-api/src/me-account/me-account.controller.ts` | Remove unused `@Req()` param |

---

## Tests added

| File | Tests added |
|------|-------------|
| `dating-api/src/auth/optional-auth.guard.spec.ts` | **+1** — deletedAt user not authenticated |
| `dating-api/src/me-account/me-account.service.spec.ts` | **+2** — analytics before txn; photo storage failure trace |
| `dating-ui/src/lib/delete-account-api.spec.ts` | **+2** — DELETE payload; 400 error mapping |
| `dating-ui/src/app/(authenticated)/settings/account/page.spec.tsx` | **+1** — legal/notif/delete links |
| `dating-ui/src/components/landing/public-landing-client.spec.tsx` | **+1** — footer Privacy/Terms |

(Agent 1: me-account service 4→6, HTTP 5, UI 237→237 before CR.)

---

## Tests / verification

- [x] `npm test -- --testPathPatterns=me-account` → **11/11** pass
- [x] `optional-auth.guard.spec` → **7/7** pass
- [x] Story-focused UI specs — **8/8** pass (delete section, privacy, account page, landing, delete-api)
- [x] Full UI suite — **241/241** pass
- [x] Report/block regression — unchanged and green
- [ ] Manual smoke — pending operator

### Runtime verification

| Check | Result |
|-------|--------|
| Analytics before DB mutation | Unit test order assertion |
| Photo delete failure non-blocking | Unit test |
| Deleted user optional auth | Unit test |
| Cookie cleared on 204 | Integration test |
| Browser delete flow | **Deferred** (operator) |

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| `/privacy` + `/terms` static pages + draft footer | Done + tested |
| Account settings links + delete zone | Done + tested |
| `DELETE /api/v1/me/account` + scrub | Done + tested |
| Session invalid after delete | Done + tested |
| `account.deleted` analytics | Done + tested |
| `DATA_RETENTION.md` | Done |
| API + UI tests | Done |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 9 story 5
```

**Notes for PM:**

- Mark story **Done (engineering gate)**; operator manual smoke still pending.
- Re-login same Google → new user row (document in privacy + DATA_RETENTION).
