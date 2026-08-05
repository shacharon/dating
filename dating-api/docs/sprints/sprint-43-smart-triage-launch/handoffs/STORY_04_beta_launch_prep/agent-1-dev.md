# Handoff: Agent 1 — Senior Dev — Sprint 43 Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_beta_launch_prep.md](../../STORY_04_beta_launch_prep.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)  
**Skip Agent 4**

---

## Summary

Launch readiness pack for ~100 Tel Aviv beta users:

- **`dating-api/docs/beta/`** — decision framework, invite template, schedule, smoke, metrics cookbook, user-list template (no PII).
- **Admin beta metrics** — `GET /api/v1/admin/beta-metrics` + `/admin/beta-metrics` (Postgres cards; opener rates via `buildOpenerWeeklyReport`).
- **Public `/support`** — mailto intake (`NEXT_PUBLIC_SUPPORT_EMAIL`); links from landing footer + account settings.
- No SupportTicket DB, no chart libs, no browse→message on admin (CW recipe in cookbook only).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/docs/beta/*` | Ops pack (7 docs) |
| `dating-api/src/admin/admin-beta-metrics/*` | Helpers + service + controller + specs |
| `dating-api/src/admin/admin.module.ts` | Register beta metrics |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_BETA_METRICS_FETCHED` |
| `dating-api/.env.example` | `SUPPORT_OPS_EMAIL` comment |
| `dating-ui/src/lib/admin-beta-metrics-api.ts` (+ spec) | Client fetch + `formatRatePct` |
| `dating-ui/src/app/admin/beta-metrics/*` | Admin UI + spec |
| `dating-ui/src/app/admin/page.tsx` | Index link |
| `dating-ui/src/lib/support-mailto.ts` (+ spec) | Mailto builder |
| `dating-ui/src/app/(public)/support/*` | Support page + spec |
| `dating-ui/src/components/landing/landing-footer.tsx` | Support link |
| `dating-ui/.../account-page-client.tsx` | Get help link |
| `dating-ui/src/lib/i18n/{types,en,es,he}.ts` | Support + footer/account copy |
| `dating-ui/.env.example` | `NEXT_PUBLIC_SUPPORT_EMAIL` |

---

## Implementation notes

- **betaStart:** query `?betaStart=` or default **30d before asOf**.
- **D7:** returns `advisory: true` when cohort &lt; 20.
- **Priority share:** observed HIGH/GOOD/OTHER from `MatchListRank` (thresholds 85/70); excludes hard-blocked / unscored (&lt;0).
- **Support:** no Nest POST; unconfigured email shows amber config message.
- Admin English-only; support localized EN/ES/HE.

---

## How to verify

```bash
cd dating-api
npx jest src/admin/admin-beta-metrics --no-coverage --forceExit

cd ../dating-ui
npx vitest run "src/lib/admin-beta-metrics-api.spec.ts" "src/lib/support-mailto.spec.ts" "src/app/admin/beta-metrics/page.spec.tsx" "src/app/(public)/support/page.spec.tsx" "src/app/(authenticated)/settings/account/page.spec.tsx" "src/lib/i18n/index.spec.ts"
```

Manual (Agent 3): set `NEXT_PUBLIC_SUPPORT_EMAIL` + admin allowlist → `/admin/beta-metrics` + `/support` mailto; fill external user sheet; run smoke checklist.

---

## Next

```text
--agent 2 sprint 43 story 4
```
