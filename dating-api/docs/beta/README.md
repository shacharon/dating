# Beta launch ops

**Sprint 43 Story 4** — launch readiness for ~100 Tel Aviv users on **Piza**.

| Doc | Purpose |
|-----|---------|
| [BETA_DECISION_FRAMEWORK.md](./BETA_DECISION_FRAMEWORK.md) | GREEN / YELLOW / RED + small-n rules |
| [INVITE_EMAIL_TEMPLATE.md](./INVITE_EMAIL_TEMPLATE.md) | Manual invite email copy |
| [BETA_LAUNCH_WEEK_SCHEDULE.md](./BETA_LAUNCH_WEEK_SCHEDULE.md) | Day −3 → Week 4 checklist |
| [PRE_LAUNCH_SMOKE_TEST.md](./PRE_LAUNCH_SMOKE_TEST.md) | Full product smoke |
| [BETA_METRICS_COOKBOOK.md](./BETA_METRICS_COOKBOOK.md) | SQL + CloudWatch recipes |
| [BETA_USER_LIST_TEMPLATE.md](./BETA_USER_LIST_TEMPLATE.md) | Spreadsheet columns (no PII in git) |

## Surfaces in product

| Surface | URL / env |
|---------|-----------|
| Beta metrics (admin) | `/admin/beta-metrics` → `GET /api/v1/admin/beta-metrics` |
| Support (public) | `/support` — requires `NEXT_PUBLIC_SUPPORT_EMAIL` in `dating-ui` (align with ops inbox / `SUPPORT_OPS_EMAIL`) |

Admin access: [ADMIN_ACCESS.md](../ops/ADMIN_ACCESS.md). Funnel logs: [PRODUCT_FUNNEL.md](../analytics/PRODUCT_FUNNEL.md).

## Monday ritual (weekly)

1. Open `/admin/beta-metrics` (note cohort sizes / advisory flags).
2. Skim CloudWatch `product_analytics` event volume ([cookbook](./BETA_METRICS_COOKBOOK.md)).
3. Triage `/admin/reports` + `/admin/photos` + support inbox.
4. Write top 3 issues; ship or schedule fixes.
5. Week 4 only: apply [decision framework](./BETA_DECISION_FRAMEWORK.md) with qualitative feedback.

**Do not** kill the beta before Week 4 on noisy early percentages.
