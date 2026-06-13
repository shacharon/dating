# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_prod_deploy_hygiene.md](../../STORY_01_prod_deploy_hygiene.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Legacy match detail removed** — `/dating/matches/[id]` is now a server redirect to `/dating/me-matches/[id]`; deleted orphaned components (badge, cards, explainability sections, loading/error shells) and `matches-list.ts`.
- **Prod route gate extended** — `/matches` and `/dating/matches` blocked in production via `INTERNAL_ROUTE_PREFIXES` + middleware matcher entries; `/dating/me-matches` remains product path.
- **Runbook updated** — `LAUNCH_COHORT_RUNBOOK.md` §5 lists new blocked prefixes.
- **Build unblocked** — `npm run build` green; fixed pre-existing TS error in `match-preferences-form` by narrowing `ME_PARTNER_GENDER_CHOICES` to `MePartnerGenderChoice` (exclude `PREFER_NOT_TO_SAY` from index type).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/matches/[id]/page.tsx` | replaced — redirect to me-matches |
| `dating-ui/src/app/dating/matches/page.tsx` | unchanged — list redirect |
| `dating-ui/src/app/dating/matches/children-unsure-badge.tsx` | deleted |
| `dating-ui/src/app/dating/matches/match-card.tsx` | deleted |
| `dating-ui/src/app/dating/matches/match-card.test.tsx` | deleted |
| `dating-ui/src/app/dating/matches/match-explainability-section.tsx` | deleted |
| `dating-ui/src/app/dating/matches/match-explainability-section.test.tsx` | deleted |
| `dating-ui/src/app/dating/matches/match-recommendation-section.tsx` | deleted |
| `dating-ui/src/app/dating/matches/match-recommendation-section.test.tsx` | deleted |
| `dating-ui/src/app/dating/matches/[id]/loading.tsx` | deleted |
| `dating-ui/src/app/dating/matches/[id]/error.tsx` | deleted |
| `dating-ui/src/app/dating/matches/[id]/not-found.tsx` | deleted |
| `dating-ui/src/app/dating/matches/loading.tsx` | deleted |
| `dating-ui/src/app/dating/matches/error.tsx` | deleted |
| `dating-ui/src/app/dating/_lib/matches-list.ts` | deleted |
| `dating-ui/src/lib/internal-routes-gate.ts` | added `/matches`, `/dating/matches` prefixes |
| `dating-ui/src/lib/internal-routes-gate.spec.ts` | new prefix + me-matches safety tests |
| `dating-ui/src/middleware.ts` | matcher `/matches`, `/matches/:path*` |
| `dating-ui/src/middleware.spec.ts` | prod 404 + escape hatch tests |
| `dating-ui/src/lib/me-profile-api.ts` | `MePartnerGenderChoice` type (build fix) |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | §5 blocked routes |

**Not changed:** `dating-api/*`, Prisma, `dating/_lib/types.ts` (optional prune deferred).

---

## Decisions (do not reverse without discussion)

- Followed architect handoff exactly — no analytics export restoration.
- Build TS fix is type-only on partner gender choices; no product behavior change.
- `/matches` compare POC source kept; prod-gated only.

---

## Runtime topology

**N/A** — middleware env gate only.

---

## Tests / verification

```powershell
cd dating-ui
npm test    # 273/273 pass
npm run build   # exit 0
```

- [x] Unit/integration: **273/273 pass**
- [x] `npm run build`: **pass**
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: **deferred** (middleware covered by unit tests; operator can verify prod start)

**Manual smoke (operator):**

```powershell
cd dating-ui
$env:NODE_ENV="production"
npm run start
# /matches → 404, /dating/matches → 404, /dating/me-matches → auth flow, /evaluate → 404
```

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 10 story 1
```

**Notes for CR:**

1. Confirm deleted files have no dangling imports (grep clean).
2. Verify middleware tests cover escape hatch for `/matches`.
3. `MePartnerGenderChoice` build fix is adjacent hygiene — acceptable in this story per green-build DoD.
4. Optional: prune unused `MatchDetailApiResponse` from `types.ts` — not DoD.
