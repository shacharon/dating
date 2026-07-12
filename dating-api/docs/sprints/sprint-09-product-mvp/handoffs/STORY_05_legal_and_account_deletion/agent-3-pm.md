# Handoff: Agent 3 — PM — Story 5

**Agent:** 3 pm  
**Story:** [STORY_05_legal_and_account_deletion.md](../../STORY_05_legal_and_account_deletion.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 5 closed as Done (engineering gate)** — `/privacy` and `/terms` live; `/settings/account` wired; `DELETE /api/v1/me/account` soft-deletes and scrubs PII; session revoked + cookie cleared.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 9 progress: 4/6** — recommended next: **Story 2** (Photo gate) or **Story 6** (Launch UX polish).
- **Manual delete/re-login smoke** remains **operator-owned**.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| `/privacy` + `/terms` + draft footer | Done | `LegalDocumentPage` + markdown |
| Landing + account links | Done | Footer + account page specs |
| Account settings (not TODO) | Done | Legal, notif link, delete zone |
| `DELETE /api/v1/me/account` | Done | `MeAccountModule` + integration tests |
| PII scrub + retention doc | Done | `DATA_RETENTION.md` + service txn |
| Session invalid after delete | Done | revoke all + auth guard `deletedAt` |
| Re-login policy documented | Done | New user row; privacy + retention doc |
| Product analytics | Done | `account.deleted` before txn |
| Tests passing | Done | **11/11** me-account; **241/241** UI |
| Manual smoke | Pending operator | Story manual smoke section |

---

## Acceptance criteria

**7 / 7** engineering AC met.

**Confirmation AC:** Required body `{ confirmation: "DELETE" }` (case-sensitive); UI disables submit until exact match.

**Post-delete AC:** Same Google account creates a **new** `User` row (scrubbed `email`/`googleId` frees uniques) — documented in privacy policy and `DATA_RETENTION.md`.

**Already-deleted session:** Auth guard returns **401** (not service 404) — consistent with CR fix on `OptionalAuthGuard`.

---

## Sprint 9 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Photos in match browse | **Done** (manual smoke pending operator) |
| 2 | Photo gate + profile completeness | Planned |
| 3 | Match preferences UI | **Done** (manual smoke pending operator) |
| 4 | Report user | **Done** (manual smoke pending operator) |
| 5 | Legal + account deletion | **Done** (manual smoke pending operator) |
| 6 | Launch UX polish | Planned |

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_05_legal_and_account_deletion.md` | Status Done, AC/DoD checked, shipped table |
| `README.md` (sprint-09) | Sprint in progress 4/6; Story 5 row; why section |
| `handoffs/STORY_05_legal_and_account_deletion/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; browser delete smoke is operator waiver (same pattern as Stories 1, 3, 4).
- Legal copy remains **draft** until ops legal review — footer marker mandatory.
- No GDPR export in this story; retention table is factual ops doc only.

---

## Tests / verification

- [x] API me-account — **11/11** pass
- [x] Full UI suite — **241/241** pass
- [x] optional-auth deletedAt — **7/7** pass
- [ ] Manual smoke — pending operator

---

## Operator manual smoke

1. Run `npx prisma migrate deploy` (includes `User.deletedAt`).
2. Open landing → **Privacy** / **Terms** → confirm draft footer visible.
3. **`/settings/account`** → links work; notification link opens profile `#notification-prefs`.
4. Delete account: type `DELETE` → submit → **204** → redirect landing; `GET /auth/me` → **401**.
5. Sign in again with same Google → new user (fresh onboarding path).

---

## Open questions / blockers

- None blocking Story 2 or Story 6.

---

## Next work

Per sprint README recommended order after Stories 1 + 3 + 4 + 5:

```text
--agent 0 sprint 9 story 2
```

**Alternative (launch polish — Stories 1–3 done):**

```text
--agent 0 sprint 9 story 6
```

**Notes:** Story 2 gates match-ready on ≥1 photo. Story 6 adds empty-pool + analysis-wait UX for cohort launch.
