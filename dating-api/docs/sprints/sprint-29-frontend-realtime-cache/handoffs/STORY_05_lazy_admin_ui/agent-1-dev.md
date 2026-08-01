# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_lazy_admin_ui.md](../../STORY_05_lazy_admin_ui.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Split four heavy admin pages into `*-page-client` + thin `dynamic(..., { ssr: false })` wrappers. Product overlays (`MatchCelebrationModal`, `ReportUserDialog`, `AnalysisResultsView`) load via `next/dynamic`; modals mount only when open. Middleware / admin gates untouched. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Heavy admin + `ssr: false` | Pass |
| Admin index eager | Pass |
| Middleware / gates unchanged | Pass |
| Product overlays dynamic; modals when open | Pass |
| Specs import admin clients | Pass |
| No dating → admin imports | Pass |

---

## Bundle note

Admin route bodies are separate client chunks via `next/dynamic` (App Router already isolates `/admin/*` routes; product pages no longer static-import celebration/report/analysis-results). No webpack analyzer run this story.

---

## Changes

| Path | Change |
|------|--------|
| `admin/photos|reports|match-quality/**` | Client split + dynamic `page.tsx` |
| `admin/*/page.spec.tsx` | Import `*-page-client` |
| `me-matches/[id]/page.tsx` | dynamic celebration + report |
| `conversations/[id]/page.tsx` | dynamic report |
| `analysis/analysis-page-client.tsx` | dynamic results |
| `src/test/setup-next-dynamic.ts` + `vitest.config.ts` | Sync-ish dynamic mock for Vitest |

---

## Verification

- Admin specs + analysis + match detail + middleware/gate — **86 passed**
- Conversation report dialog — pass (`waitFor`)
- Known pre-existing flakes (not introduced here): conversation duplicate-message ×2, one HE `loadMessagesFailed` i18n assert

---

## Smoke (manual)

1. `/admin/photos` (admin enabled) shows Loading… then queue.  
2. Match detail Report → dialog appears.  
3. Mutual-match celebration still opens.  
4. Analysis results still render when ANALYZED.
