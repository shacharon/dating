# Admin & ops — leftover work

**Status:** Engineering shipped (Sprint 10 + 11). **Operator validation and infra gates are not finished.**  
**Audience:** You (operator) + anyone enabling admin on staging/prod  
**Last updated:** 2026-06-13

This is the single checklist for everything admin-related that is **built but not closed**.

---

## What is done (code)

| Surface | Route / API | Sprint |
|---------|-------------|--------|
| Photo moderation queue | `/admin/photos`, `GET/PATCH /api/v1/admin/photos/*` | 10 |
| Report triage | `/admin/reports`, `GET/PATCH /api/v1/admin/reports/*` | 10 |
| Match feedback (user) | Match detail thumbs → `MatchFeedback` + logs | 10 |
| Match quality dashboard | `/admin/match-quality` | 11 |
| Audit drill-down | `/admin/match-quality/[profileId]` | 11 |
| Aggregates API | `GET /api/v1/admin/match-quality/summary`, `.../negative-candidates` | 11 |
| Export baseline | `GET /api/v1/admin/match-quality/export` (JSON/CSV) | 11 |
| Compare windows | `GET /api/v1/admin/match-quality/compare`, `npm run match-quality:compare` | 11 |
| Prod admin UI gate | `/admin` → 404 unless `NEXT_PUBLIC_ADMIN_ENABLED=1` | 11 |

Docs: [ADMIN_ACCESS.md](./ADMIN_ACCESS.md), [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md), [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md), [LAUNCH_COHORT_RUNBOOK.md](../sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md).

---

## Blockers before calling admin “finished”

### 1. Database migrations (all environments)

Run on staging/prod before any smoke:

```bash
cd dating-api && npx prisma migrate deploy
```

Key migrations for admin flows:

- `20260606180000_add_user_report` — reports queue
- `20260606240000_match_feedback` — match thumbs
- `20260606300000_user_referred_by` — referral attribution
- _(plus Sprint 9/10 photo status migrations if not already applied)_

- [ ] Staging migrated
- [ ] Production migrated

### 2. Environment variables

| Variable | Where | Required for |
|----------|-------|--------------|
| `ADMIN_USER_IDS` | `dating-api/.env` | All `/api/v1/admin/*` |
| `NEXT_PUBLIC_ADMIN_ENABLED=1` | `dating-ui` build (staging only) | Admin UI visible in prod build |
| `REPORT_OPS_EMAIL` | `dating-api/.env` | Report notification backup |
| Network gate (VPN / Cloudflare Access) | Infra | Public prod — **not optional** |

- [ ] `ADMIN_USER_IDS` set to 1–2 ops accounts only (your real `User.id` values)
- [ ] Staging UI built with `NEXT_PUBLIC_ADMIN_ENABLED=1` on a **gated** host
- [ ] Public marketing deploy does **not** set `NEXT_PUBLIC_ADMIN_ENABLED`
- [ ] WAF / VPN blocks `/api/v1/admin/*` on public API URL (see [ADMIN_ACCESS.md](./ADMIN_ACCESS.md))

### 3. Seed / test data for match-quality smokes

Dashboard and compare are meaningless with zero feedback rows.

- [ ] At least ~20 `MatchFeedback` rows in staging (real cohort or manual thumbs during smoke)
- [ ] At least one candidate with ≥3 distinct negative reporters (for “actionable negative” drill-down)

---

## Operator smokes — Sprint 10 (not run)

From [sprint-10 README](../sprints/sprint-10-trust-and-ops/README.md):

- [ ] **Build** — `cd dating-ui && npm run build` succeeds
- [ ] **Prod route gates** — `/evaluate`, `/matches` → 404 in prod middleware
- [ ] **Photo moderation** — upload → `PENDING` → `/admin/photos` approve → photo on match browse
- [ ] **Report queue** — user reports someone → `/admin/reports` → dismiss or action taken
- [ ] **Match feedback** — thumbs on match detail → row in DB + `match.feedback` in structured logs
- [ ] **Photo filter** — user with 0 approved photos absent from others’ match lists
- [ ] **Referral** — User A invite link → User B incognito signup → `User.referredByUserId` set (use **real** user id in `?ref=`, not `test`)

---

## Operator smokes — Sprint 11 (not run)

From [sprint-11 README](../sprints/sprint-11-match-quality-intelligence/README.md):

- [ ] **Prod admin 404** — prod build, `NEXT_PUBLIC_ADMIN_ENABLED` unset → `GET /admin` → 404
- [ ] **Staging admin loads** — `ADMIN_ENABLED=1` + admin session → `/admin`, `/admin/photos`, `/admin/reports`, `/admin/match-quality`
- [ ] **Non-admin API** — non-allowlisted user → `403` on admin API
- [ ] **Dashboard** — `/admin/match-quality` shows positive rate + negative candidates
- [ ] **Audit drill-down** — click high-negative row → score, chips, guards on `[profileId]` page
- [ ] **Export (curl)** — `GET /api/v1/admin/match-quality/export` → valid JSON/CSV baseline
- [ ] **Compare (curl or CLI)** — `GET .../compare?beforeDays=7&afterDays=7` or `npm run match-quality:compare`
- [ ] **Weekly ritual** — walk [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md) once (no-op week OK)
- [ ] **Engine approval doc** — fill [example no-op week](../engine/examples/2026-06-10-no-op-week.md) or real week

---

## Security & infra checklist (not done)

From [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) enable checklist:

- [ ] VPN / Cloudflare Access / IP allowlist on admin hostname
- [ ] Same policy on API origin for `/api/v1/admin/*`
- [ ] Smoke all three admin UI areas on gated staging
- [ ] Confirm `/admin` is not linked from public marketing pages
- [ ] Document who holds ops Google accounts (incident contacts in launch runbook)

**Known gap (v1):** API does **not** 404 admin routes when UI admin is disabled. Edge/WAF must block public access to `/api/v1/admin/*`. Deferred: `ADMIN_API_ENABLED` on Nest (Sprint 12+ if needed).

---

## UI / product gaps (built elsewhere, not admin UI)

These are **intentionally out of scope** for Sprint 10–11 admin pages but affect ops workflow:

| Gap | Workaround today | Future |
|-----|------------------|--------|
| Export / compare not in UI | curl or `npm run match-quality:compare` | Sprint 12+ dashboard buttons |
| Adoption % not on dashboard | CloudWatch / logs per runbook | `match.detail_viewed` event Sprint 12+ |
| No auto-ban on N reports | Manual action via report queue | Sprint 12+ |
| No Rekognition / auto moderation | Manual photo queue | Sprint 12+ |
| No GDPR data export | Manual / legal process | Sprint 12+ |

---

## Daily / weekly ops rhythm (once smokes pass)

**Daily**

- `/admin/photos` — clear pending uploads
- `/admin/reports` — triage OPEN reports

**Weekly**

- `/admin/match-quality` — review top negatives
- Runbook KPIs (adoption proxy, positive rate) — [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md)
- Before any matcher change: [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md) sign-off

---

## Definition of “admin finished”

Admin ops can be marked **done** when:

1. All checkboxes in **Operator smokes — Sprint 10** and **Sprint 11** are checked on **staging**
2. **Security & infra checklist** is checked before prod `ADMIN_ENABLED=1`
3. At least one person has run the **weekly match-quality ritual** on real or seeded data
4. Launch runbook §3 (moderation/reports) is updated with your actual contacts and schedule

Until then, status remains: **shipped in code, not validated in ops.**
