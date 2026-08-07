# Launch cohort runbook

**Sprint:** 9 — Story 6  
**Audience:** Ops / product launch  
**Last updated:** 2026-08-07  

Use this checklist when opening a new city or cohort. Adjust targets after the first baseline week.

**Seed profiles (browse-only, no fake chat):** see [GO_LIVE_SEED_PROFILES.md](../../ops/GO_LIVE_SEED_PROFILES.md).  
**Overall readiness snapshot:** [GO_LIVE_STATUS.md](../../ops/GO_LIVE_STATUS.md).

---

## 1. Cohort launch checklist

- [ ] Seed or onboard **≥ target analyzed profiles** per city (see §2).
- [ ] Confirm each seeded user has **≥1 approved photo** (stub auto-approve in dev/staging; manual spot-check in prod).
- [ ] Run manual photo moderation pass on new uploads (§3).
- [ ] Verify match list loads for a test user in the cohort (`GET /api/v1/me/matches` → `status: ready`).
- [ ] Smoke Story 6 flows: analysis progress → matches redirect; empty state actions; settings profile redirects.
- [ ] Confirm prod UI blocks internal routes (§5): `/evaluate`, `/profiles`, `/auto-matches`, `/dev/*` → **404**.

---

## 2. Cohort size targets

Placeholder — fill after first launch week.

| City / cohort | Min analyzed profiles | Notes |
|---------------|----------------------|--------|
| _(example)_ Tel Aviv | 20 | Enough for non-empty lists for typical prefs |
| _(add)_ | 20 | |

**Heuristic:** If most users see the empty match state, increase seeding or widen launch geography before changing engine weights.

---

## 3. Manual moderation

**Photos (Sprint 10 Story 2):** Uploads enter `PENDING` until ops approve in **`/admin/photos`** (requires `ADMIN_USER_IDS` + session).

**Admin access (Sprint 11 Story 0):** In production, `/admin` returns **404** unless `NEXT_PUBLIC_ADMIN_ENABLED=1` **and** a network gate (VPN / Cloudflare Access) is in place. See [ADMIN_ACCESS.md](../../ops/ADMIN_ACCESS.md).

- [ ] Review pending queue daily at `/admin/photos` (approve / reject with optional reason).
- [ ] Scan approved photos for policy violations (nudity, minors, spam, contact info in image).
- [ ] Re-check reported users (Story 4 report flow).

**Local dev escape hatch:** `PHOTO_MODERATION_AUTO_APPROVE=1` skips the queue (do not set in production).

**Reports:** Triage OPEN reports daily at **`/admin/reports`** (dismiss or mark action taken). Keep `REPORT_OPS_EMAIL` as backup; block abusive accounts when action taken.

---

## 4. Funnel KPIs (CloudWatch Insights)

Structured logs use `logKind = "product_analytics"`. See [PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md).

**Event volume by type:**

```sql
fields @timestamp, event, userId, properties
| filter logKind = "product_analytics"
| stats count() by event
```

**Happy-path sequence (weekly review):**

```text
profile.submitted → match.list_viewed → match.action (like)
  → match.mutual_created → conversation.opened → message.sent
  → messaging.ws_connected
```

**Cadence:** Weekly during first month; bi-weekly once stable.

---

## 5. Internal routes (production UI)

Blocked when `NODE_ENV=production` unless escape hatch is set.

| Prefix | Prod behavior |
|--------|---------------|
| `/profiles`, `/profiles/*` | 404 |
| `/evaluate`, `/evaluate/*` | 404 |
| `/auto-matches`, `/auto-matches/*` | 404 |
| `/dev`, `/dev/*` | 404 |
| `/matches`, `/matches/*` | 404 |
| `/dating/matches`, `/dating/matches/*` | 404 |

**Escape hatch (debug only):** `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` — do not set in prod without ops approval.

**Product path (not blocked):** `/dating/me-matches` — user match browse.

Implementation: `dating-ui/src/middleware.ts` + `internal-routes-gate.ts`.

---

## 6. Manual smoke (Story 6)

1. Submit profile → `/dating/analysis` shows progress → auto-redirect to `/dating/me-matches` when analyzed.
2. Empty pool → actionable empty state (prefs, profile, copy invite link).
3. `/settings/profile` → redirects to `/dating/profile` (no TODO page).
4. `npm run build && npm run start` → visit `/evaluate` → **404**.

Cross-ref: [STORY_06_launch_ux_polish.md](./STORY_06_launch_ux_polish.md), sprint README smoke section.

---

## 7. Incident contacts

| Role | Contact |
|------|---------|
| On-call engineer | _(fill)_ |
| Product owner | _(fill)_ |
| Moderation lead | _(fill)_ |

---

## Out of scope (this sprint)

- Invite-code system / referral tracking
- Automated cohort emails
- PostHog dashboard (future `AnalyticsProvider` v2)
