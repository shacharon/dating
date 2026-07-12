# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_prod_deploy_hygiene.md](../../STORY_01_prod_deploy_hygiene.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Root cause:** `npm run build` fails because `/dating/matches/[id]/page.tsx` still imports `children-unsure-badge.tsx`, which references **missing exports** from `children-unsure.ts` (`CHILDREN_UNSURE_ANALYTICS_EVENT_*`, `childrenUnsureAnalyticsEventsUrl`). List route already redirects to `/dating/me-matches`; detail route was left behind.
- **Fix strategy (locked):** **Remove legacy detail UI** — replace `[id]/page.tsx` with server redirect to `/dating/me-matches/[id]`; delete orphaned components under `dating/matches/` that exist only for the dead detail page. **Do not** restore analytics exports (keeps dead code in prod bundle).
- **Prod gate:** Extend `INTERNAL_ROUTE_PREFIXES` with `/matches` and `/dating/matches`; extend middleware `matcher` so `/matches` is evaluated (currently **not** in matcher — prefix alone is insufficient).
- **No API changes** — `GET /api/v1/matches` and compare endpoints remain for dev tooling / direct clients.
- **Docs:** Update `LAUNCH_COHORT_RUNBOOK.md` §5 — move `/matches` from “not blocked” to blocked table.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/matches/[id]/page.tsx` | **replace** — `redirect(\`/dating/me-matches/${id}\`)` (mirror list redirect pattern) |
| `dating-ui/src/app/dating/matches/children-unsure-badge.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/match-card.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/match-card.test.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/match-explainability-section.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/match-explainability-section.test.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/match-recommendation-section.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/match-recommendation-section.test.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/[id]/loading.tsx` | **delete** (redirect-only route) |
| `dating-ui/src/app/dating/matches/[id]/error.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/[id]/not-found.tsx` | **delete** |
| `dating-ui/src/app/dating/matches/loading.tsx` | **delete** (optional — list is redirect-only) |
| `dating-ui/src/app/dating/matches/error.tsx` | **delete** (optional) |
| `dating-ui/src/app/dating/_lib/matches-list.ts` | **delete** — only consumer was legacy `match-card.tsx` |
| `dating-ui/src/app/dating/matches/page.tsx` | **keep** — existing redirect to `/dating/me-matches` |
| `dating-ui/src/app/matches/*` | **keep** — dev compare POC; prod-gated via middleware only |
| `dating-ui/src/lib/internal-routes-gate.ts` | **update** — add prefixes (see §2) |
| `dating-ui/src/lib/internal-routes-gate.spec.ts` | **update** — cases for new prefixes |
| `dating-ui/src/middleware.ts` | **update** — matcher includes `/matches` paths |
| `dating-ui/src/middleware.spec.ts` | **update** — prod 404 for `/matches`, `/dating/matches`; dev allow; escape hatch |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | **update** §5 blocked routes table + remove “not blocked” note |

**Keep unchanged:**

- `dating-ui/src/app/dating/_lib/children-unsure.ts` — still used by scoring helpers if referenced elsewhere; no export restoration needed after badge delete.
- `dating-ui/src/app/dating/me-matches/*` — product path.
- `dating-api/*` — no backend work.

**Optional cleanup (same PR if trivial, not DoD):** prune unused `MatchDetailApiResponse` types from `dating/_lib/types.ts` if nothing imports them after detail page removal.

---

## Decisions (do not reverse without discussion)

### 1. Build fix — delete legacy detail UI (not patch imports)

| Option | Verdict |
|--------|---------|
| Restore missing exports in `children-unsure.ts` | **Rejected** — revives dead analytics surface; detail page is obsolete |
| Prod middleware gate only | **Rejected** — does **not** fix Turbopack build; pages still compile |
| **Redirect `[id]` + delete orphaned components** | **Chosen** — aligns with list redirect (April 2026 cutover comment); minimal prod bundle |

**Locked `[id]` redirect:**

```typescript
import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function LegacyMatchDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dating/me-matches/${encodeURIComponent(id)}`);
}
```

Deep links to `/dating/matches/:id` continue to work in **dev** (redirect). In **prod**, middleware returns 404 before redirect (see §2) — acceptable; product links use `/dating/me-matches/:id` only.

---

### 2. Prod internal route gate — prefixes + matcher

**Update `INTERNAL_ROUTE_PREFIXES`:**

```typescript
export const INTERNAL_ROUTE_PREFIXES = [
  '/profiles',
  '/evaluate',
  '/auto-matches',
  '/dev',
  '/matches',        // legacy compare POC at /matches
  '/dating/matches', // legacy redirect tree (not /dating/me-matches)
] as const;
```

**Prefix safety:** `/dating/matches` must **not** match `/dating/me-matches`. Current helper uses exact prefix or `prefix/` — `'/dating/me-matches'.startsWith('/dating/matches/')` is **false**; `'/dating/me-matches' === '/dating/matches'` is **false**. Safe.

**Middleware `config.matcher` — add:**

```typescript
'/matches',
'/matches/:path*',
```

`/dating/matches` already covered by existing `'/dating/:path*'` entry.

**Order unchanged:** `isInternalRouteBlocked(pathname)` runs **before** auth redirect — prod 404 even without session cookie.

**Escape hatch unchanged:** `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` → all internal routes allowed in production (ops debug).

---

### 3. `/matches` compare UI — gate, do not delete

| Route | Prod | Dev | Rationale |
|-------|------|-----|-----------|
| `/matches` | **404** | allowed | POC compare tool (`/api/v1/matches/compare`); linked from `/auto-matches` |
| `/dating/matches` | **404** | redirect → me-matches | Legacy bookmarks |
| `/dating/me-matches` | **product** | product | Sprint 9 browse path |

Deleting `/matches` source is **out of scope** (story AC allows fix OR remove OR gate). Gate satisfies prod safety; dev engineers keep compare tooling when escape hatch off in dev.

---

### 4. API contract — no changes

| Endpoint | Status |
|----------|--------|
| `GET /api/v1/me/matches` | unchanged — product |
| `GET /api/v1/matches` | unchanged — legacy API clients / dev |
| `GET /api/v1/matches/compare` | unchanged — dev compare page |
| `POST /api/v1/matches/analytics/children-unsure/events` | unchanged on API; UI badge removed |

---

## Runtime topology

**N/A** — UI-only story (middleware env gate). No socket, cookie, or Next proxy changes.

---

## Tests / verification

Dev (agent 1):

```powershell
cd dating-ui
npm test
npm run build
```

Expected:

- [ ] All vitest pass (including new middleware + gate specs)
- [ ] `npm run build` exits 0

Manual smoke (agent 1 or operator):

```powershell
cd dating-ui
$env:NODE_ENV="production"
npm run start
```

| URL | Expected (prod, no escape hatch) |
|-----|-----------------------------------|
| `/matches` | 404 |
| `/dating/matches` | 404 |
| `/dating/me-matches` | auth redirect or 200 with session |
| `/evaluate` | 404 (regression) |

With `$env:NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES="1"` → `/matches` and `/dating/matches` reachable.

- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 10 story 1
```

**Notes for dev:**

1. Implement deletions + redirect first, then run `npm run build` to confirm fix before middleware work.
2. Add middleware tests mirroring Story 6 pattern (`afterEach` restore `NODE_ENV`).
3. Update runbook §5 — remove line “Not blocked in v1: `/matches`”.
4. Do **not** add `/dating/me-matches` to internal prefixes.
5. Commit message focus: unblock prod deploy + prod-gate legacy compare routes.
