# Handoff: Agent 2 — Code review — Story 3

**Agent:** 2 code-review  
**Story:** [STORY_03_notification_preferences.md](../../STORY_03_notification_preferences.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (test fixes applied; no prod code changes)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **aligned**; separate flags, dedicated PATCH endpoint, channel independence, in-app vs read-state split.
- Fixed **1 regression** in `optional-auth.guard.spec.ts` (auth DTO now includes notification flags).
- Added **4 tests** (auth DTO unit, unknown-key validation, email toggle, unsubscribe regression already present).
- Story scope **31/31 API** + **29/29 UI** pass; full suites **1318/1318** API, **201/201** UI.

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Architect alignment | Migration, `auth/me` read, `PATCH notification-preferences` write | OK |
| Channel independence | Email services gate on `emailNotificationsEnabled` only; no `inApp` server check | OK |
| Unsubscribe | Sets `emailNotificationsEnabled = false` only | OK + tested |
| In-app scope | Toast + nav bump via `shouldShowInAppAlert`; list row bump not gated | OK |
| Auth cache | `setInAppNotificationsEnabledPreference` synced on login/refresh/logout | OK |
| Profile UI | Two toggles; PATCH + `auth.refresh()`; i18n en/es | OK |
| Controlled toggles | Checkbox `checked` from `user` — no stale optimistic state on PATCH failure | OK |
| `?? true` on DTO | Partial test mocks default flags to true | OK (documented) |
| `optional-auth.guard.spec` | Expected DTO missing new fields | **Fixed** |
| List page inline bump | Not consolidated to `shouldShowInAppAlert` | Minor (deferred per architect) |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/auth/optional-auth.guard.spec.ts` | Expect `emailNotificationsEnabled` + `inAppNotificationsEnabled` on `authUser` |
| `dating-api/src/auth/auth.dto.spec.ts` | **created** — 2 tests for `toAuthMeResponseDto` flags |
| `dating-api/src/me-profile/me-notification-preferences-http.integration.spec.ts` | **+1** — unknown key → `400` |
| `dating-ui/src/components/notification-preferences-section.spec.tsx` | **+1** — email toggle PATCH |

**No production code changes.**

---

## Tests / verification

- [x] API story scope:
  ```bash
  cd dating-api
  npm test -- src/auth/auth-http.integration.spec.ts \
    src/me-profile/me-notification-preferences-http.integration.spec.ts \
    src/notifications/email-unsubscribe-http.integration.spec.ts \
    src/users/users.service.spec.ts \
    src/auth/auth.dto.spec.ts
  ```
  → **31/31 pass**
- [x] UI story scope:
  ```bash
  cd dating-ui
  npm test -- src/lib/message-in-app-notify.spec.ts \
    src/components/messaging-shell-provider.spec.tsx \
    src/components/notification-preferences-section.spec.tsx \
    src/lib/auth/auth-api.spec.ts \
    src/lib/notification-preferences-api.spec.ts
  ```
  → **29/29 pass**
- [x] Full API: `cd dating-api && npm test` → **1318/1318 pass**
- [x] Full UI: `cd dating-ui && npm test` → **201/201 pass**
- [ ] Manual smoke — pending operator (migration + toggle matrix)

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Schema `inAppNotificationsEnabled` | Done + migration |
| API expose both flags on `auth/me` | Done + tested |
| `PATCH /api/v1/me/notification-preferences` | Done + tested |
| Profile UI two independent toggles | Done + tested |
| Email path unchanged | Done (CR verified) |
| In-app toast + nav bump respect pref | Done + tested |
| Unsubscribe email-only | Done + tested |
| Unread badges not gated by pref | Done (architect §5) |
| Tests | Done — 31 API + 29 UI story scope |

---

## Open questions / blockers

- Operator must run `npx prisma migrate deploy` before manual smoke.

---

## Next agent

```text
--agent 3 sprint 8 story 3
```

**Notes for PM:**

- Close story after operator manual smoke (toggle matrix in `agent-1-dev.md`).
- Sprint 8 epic complete after Story 3 closes — update sprint README to **3/3**.
- Optional follow-up: consolidate list `handleListMessageNew` with shared helper (read-state exception documented).
