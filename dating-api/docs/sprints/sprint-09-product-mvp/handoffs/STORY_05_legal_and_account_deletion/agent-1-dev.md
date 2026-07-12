# Handoff: Agent 1 — Senior dev — Story 5

**Agent:** 1 senior-dev  
**Story:** [STORY_05_legal_and_account_deletion.md](../../STORY_05_legal_and_account_deletion.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **`MeAccountModule`** — `DELETE /api/v1/me/account` with `{ confirmation: "DELETE" }`; soft-delete + PII scrub; session revoke + cookie clear + WS disconnect.
- **Legal pages** — `/privacy`, `/terms` (markdown + `react-markdown`); landing footer links; draft footer marker.
- **Account settings** — `/settings/account` wired with legal links, notification prefs anchor, delete danger zone.
- **Docs** — `DATA_RETENTION.md`, `PRODUCT_FUNNEL.md` updated with `account.deleted`.

---

## Artifacts shipped

| Area | Path |
|------|------|
| Migration | `20260606200000_user_deleted_at` — `User.deletedAt` |
| API | `src/me-account/*` |
| Session | `revokeAllSessionsForUser` |
| WS | `disconnectByUserId` |
| Auth | `AuthGuard` rejects `deletedAt != null` |
| Matches | Exclude deleted users from list/detail/photos |
| Legal UI | `content/legal/*.md`, `LegalDocumentPage`, public routes |
| Settings UI | `settings/account`, `DeleteAccountSection` |
| i18n | `accountSettings`, `deleteAccount` en + es |

---

## API behavior notes

| Case | Result |
|------|--------|
| Valid delete | **204** + cookie cleared + all sessions revoked |
| Bad confirmation | **400** `account_delete_confirmation_invalid` |
| Already deleted user with session | **401** (auth guard — before service) |
| Service idempotent path | **404** `account_already_deleted` if reached with active non-deleted row missing |
| Re-login same Google | New `User` row (scrubbed `email`/`googleId`) |

Analytics: `account.deleted` fired **before** DB transaction with empty properties.

---

## Tests / verification

- [x] `npm test -- --testPathPatterns=me-account` → **9/9** pass
- [x] `session.service.spec` revoke-all → green
- [x] Full UI suite → **237/237** pass (+3 new specs)
- [ ] Manual smoke — operator (story steps 1–3)

---

## Deviations from architect (minor)

| Item | Note |
|------|------|
| Legal markdown H1 | Removed duplicate `# Title` from `.md` files — page component renders `<h1>` |
| Already-deleted + session | Integration expects **401** (guard), not **404** — matches locked guard behavior |

---

## Open questions / blockers

- None blocking agent 2.

---

## Next agent

```text
--agent 2 sprint 9 story 5
```

**Notes for CR:**

- Verify delete transaction order and photo best-effort logging.
- Confirm match list excludes deleted candidates.
- Check i18n account settings copy; legal body English-only per architect.
