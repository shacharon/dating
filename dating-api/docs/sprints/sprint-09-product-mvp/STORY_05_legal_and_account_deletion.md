# Story 5: Legal pages + account deletion

**Sprint:** 9  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** —

---

## Why

Real users require **privacy policy**, **terms of use**, and a way to **delete their account**. Settings account page is currently `TODO`. Without this, cohort launch carries legal and trust risk.

---

## What

**As a** user  
**I want** to read how my data is used and delete my account if I leave  
**So that** I trust the product and control my presence

### Acceptance criteria

- [x] **Static pages** (UI):
  - `/privacy` — privacy policy (markdown; `[DRAFT — legal review pending]` footer)
  - `/terms` — terms of use (same draft marker)
  - Links from landing footer + settings account page
- [x] **Account settings** — `/settings/account`:
  - Links to privacy / terms
  - Notification prefs link → `/dating/profile#notification-prefs`
  - **Delete account** danger zone (type `DELETE` to confirm)
- [x] **Delete account API** — `DELETE /api/v1/me/account` with `{ confirmation: "DELETE" }`:
  - Session auth required
  - Soft-delete: `User.deletedAt` + PII scrub per retention doc
  - Cascade: profile scrub, photos (storage best-effort), actor match actions removed, messages anonymized, ACTIVE mutuals → UNMATCHED
  - Session cookie cleared; all sessions revoked
- [x] **Post-delete** — deleted user cannot auth (`deletedAt` + `DISABLED`); same Google → **new User row** (scrubbed email/googleId)
- [x] **Analytics** — `account.deleted` (empty properties; `userId` in envelope; pre-delete)
- [x] **Tests** — delete integration + session invalid; UI legal/account/delete specs *(browser smoke deferred operator)*

### Out of scope (this story)

- GDPR data export (ZIP download)
- Lawyer-approved final copy (use draft + checklist)
- Cookie consent banner / CMP
- Billing / subscription cancellation

---

## Technical notes (guidance, not prescriptive)

- `User.deletedAt` + index; filter deleted users from match browse
- Photo storage: delete blobs best-effort + log failures
- Retention: `dating-api/docs/legal/DATA_RETENTION.md`

---

## Definition of done

- [x] Privacy + terms pages live and linked
- [x] Delete account works end-to-end (engineering gate)
- [x] Privacy doc lists what is deleted vs retained
- [x] API + UI tests

---

## Manual smoke

1. Open `/privacy` and `/terms` from landing footer. *(operator)*
2. Settings → Delete account → confirm → redirected to landing; cookie cleared. *(operator)*
3. Login same Google account → **new account** (not linked to prior id). *(operator)*

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Schema | `User.deletedAt` — migration `20260606200000_user_deleted_at` |
| API | `MeAccountModule` — `DELETE /api/v1/me/account` |
| Retention | `docs/legal/DATA_RETENTION.md` |
| Analytics | `account.deleted` funnel event |
| Legal UI | `/privacy`, `/terms`, landing footer links |
| Settings UI | Account page + `DeleteAccountSection` |
| i18n | `accountSettings`, `deleteAccount` en + es |
| Tests | **11/11** me-account unit; **5/5** HTTP; **241/241** UI |

Handoffs: `handoffs/STORY_05_legal_and_account_deletion/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Browser delete + re-login smoke | Operator |
| Final legal review | Ops |
| Data export API | GDPR sprint |
| Cookie banner | If EU traffic |
