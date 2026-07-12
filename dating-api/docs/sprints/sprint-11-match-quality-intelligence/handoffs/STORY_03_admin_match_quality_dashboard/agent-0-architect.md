# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_admin_match_quality_dashboard.md](../../STORY_03_admin_match_quality_dashboard.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **UI-only story** — `/admin/match-quality` dashboard consuming Story 2 GETs; no API or Prisma changes.
- **Pattern** — mirror `admin/reports/page.tsx`: client component, `admin-*-api.ts` fetch with `credentials: 'include'`, `admin_forbidden` error surface.
- **Weekly ritual steps 1–2** — window selector (7 / 30 days) + summary cards + negative table replace manual SQL/curl for Postgres metrics; adoption % **not** on dashboard v1 (logs/runbook step 3 unchanged).
- **Drill-down** — table rows link to `/admin/match-quality/[profileId]`; **Story 4** implements that route (Story 3 ships href only — no stub page required).
- **Prod gate** — `/admin/match-quality` covered automatically by existing `admin-routes-gate` prefix; add middleware/gate tests for the new path.

---

## Artifacts

| Path | Change |
|------|--------|
| **UI — API client (new)** | |
| `dating-ui/src/lib/admin-match-quality-api.ts` | **created** — types + `getMatchQualitySummary`, `listNegativeCandidates` |
| `dating-ui/src/lib/admin-match-quality-api.spec.ts` | **created** — fetch URL/403 mapping (optional; page spec may suffice) |
| **UI — page (new)** | |
| `dating-ui/src/app/admin/match-quality/page.tsx` | **created** — dashboard |
| `dating-ui/src/app/admin/match-quality/page.spec.tsx` | **created** — vitest + mocked API |
| **UI — nav** | |
| `dating-ui/src/app/admin/page.tsx` | add “Match quality” link |
| **UI — tests (extend)** | |
| `dating-ui/src/middleware.spec.ts` | `/admin/match-quality` in prod 404 + unauth redirect matrix |
| `dating-ui/src/lib/admin-routes-gate.spec.ts` | `/admin/match-quality` blocked in prod default |
| **Docs** | |
| `dating-api/docs/ops/ADMIN_ACCESS.md` | smoke checklist: `/admin/match-quality` |
| `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` | weekly ritual §2: dashboard option |
| `dating-ui/.env.example` | optional `NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL` |
| **API** | none |
| **Prisma** | N/A |

---

## Decisions (do not reverse without discussion)

### 1. No new API routes

Consume existing Story 2 endpoints only:

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/match-quality/summary?windowDays={n}` |
| GET | `/api/v1/admin/match-quality/negative-candidates?windowDays={n}&limit=20&offset={o}` |

Base URL: `getApiBase()` + credentialed `fetch` (same as `admin-reports-api.ts`).

### 2. Auth UX (locked)

| Case | Behavior |
|------|----------|
| No session cookie | Middleware redirect to `/` with `next=/admin/match-quality` (existing) |
| Session, non-admin (API 403) | In-page error: `You are not authorized to view match quality.` — **same as reports**, not a redirect |
| Session, admin | Page loads |

Story AC “non-admin redirected” means **unauthenticated** users hit middleware redirect; authenticated non-admin gets **403 error panel** (test both).

### 3. Window selector

| UI control | API `windowDays` |
|------------|------------------|
| **7 days** (default) | `7` |
| **30 days** | `30` |

Segmented control or two buttons — no free-form input in v1. Changing window refetches summary + resets negative list (`offset=0`).

### 4. Summary cards (three)

| Card label | Source field | Display |
|------------|--------------|---------|
| Total feedback | `feedbackCount` | integer |
| Positive rate | `positiveRate` | `—` when `null`; else `(positiveRate * 100).toFixed(1) + '%'` |
| Distinct reporters | `distinctReporters` | integer |

**Not in v1 cards:** `negativeCount`, `distinctCandidates`, `windowStart`, adoption % (logs only per Story 1–2).

Optional subtitle under cards: `Window: last {windowDays} days` (from response `windowDays`).

### 5. Negative candidates table

| Column | Field |
|--------|-------|
| Profile ID | `matchProfileId` (`font-mono`, truncated with `title` full id) |
| Negative count | `negativeCount` |
| Distinct viewers | `distinctViewers` (ops signal; matches API) |
| Last negative | `lastNegativeAt` → `toLocaleString()` |
| Action | Link **View audit** → `/admin/match-quality/{matchProfileId}` |

Sort order is server-defined (Story 2). **Pagination v1:** initial `limit=20`, `offset=0`; if `items.length < total`, show **Load more** button → `offset += limit`, append rows (do not replace).

### 6. Empty state

When `feedbackCount === 0` (after successful summary fetch):

- Heading/message: **No feedback yet**
- Body: thumbs on match detail populate this dashboard once users submit feedback.
- Runbook link:
  - If `process.env.NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL` is set → `<a href={...}>` external
  - Else → plain text path `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` (no broken href)

Hide table when empty; still show window selector.

### 7. Loading / error states

Mirror reports page:

- Loading: “Loading match quality…”
- Error: `role="alert"` red text; `admin_forbidden` → fixed copy above
- Back link: `← Admin` to `/admin`

### 8. i18n

English hardcoded strings in component (admin v1 — same as photos/reports).

### 9. Styling

Reuse Tailwind patterns from `admin/reports/page.tsx` — `max-w-4xl`, zinc borders, emerald links, `text-xs` table.

### 10. Story 4 boundary

**Do not** implement `/admin/match-quality/[profileId]/page.tsx` in Story 3. Table links are valid; 404 until Story 4 is acceptable. Manual smoke step 3 is satisfied by link presence + href correctness.

---

## API client contract

```typescript
// dating-ui/src/lib/admin-match-quality-api.ts

export type MatchQualitySummary = {
  windowDays: number;
  windowStart: string;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};

export type NegativeCandidateRow = {
  matchProfileId: string;
  negativeCount: number;
  distinctViewers: number;
  lastNegativeAt: string;
};

export type ListNegativeCandidatesResponse = {
  windowDays: number;
  items: NegativeCandidateRow[];
  total: number;
  limit: number;
  offset: number;
};

export async function getMatchQualitySummary(
  windowDays: number,
): Promise<MatchQualitySummary>;

export async function listNegativeCandidates(
  windowDays: number,
  limit?: number,
  offset?: number,
): Promise<ListNegativeCandidatesResponse>;
```

**403 handling:** throw `new Error('admin_forbidden')` (consistent with `admin-reports-api.ts`).

**Other errors:** `throw new Error(\`GET match quality summary failed: ${status}\`)` etc.

---

## Page data flow

```text
mount / windowDays change
  → parallel fetch summary(windowDays) + listNegativeCandidates(windowDays, 20, 0)
  → set state; reset list offset

Load more click
  → listNegativeCandidates(windowDays, 20, currentOffset + 20)
  → append items; update offset from response.offset + response.limit
```

No React Query in v1 — `useState` + `useCallback` + `useEffect` like reports.

---

## Admin index nav

Add third list item on `/admin`:

```text
Match quality → /admin/match-quality
```

Order: Photos, Reports, Match quality.

---

## Prisma / migrations

**N/A**

---

## Runtime topology

| Item | Value |
|------|--------|
| Page | `GET /admin/match-quality` — Next app |
| API | `NEXT_PUBLIC_API_URL` + `/api/v1/admin/match-quality/*` with session cookie |
| Prod default | Middleware 404 on `/admin/match-quality` unless `NEXT_PUBLIC_ADMIN_ENABLED=1` |
| Socket | N/A |

**Dev smoke (agent 1):**

1. Admin session → `/admin/match-quality` loads; cards + table match API.
2. Non-admin session → error alert (not blank page).
3. Logged out → redirect to `/` with `next` param.
4. `npm test` — page spec + middleware path.

---

## Tests (agent 1 + 2)

**Page** (`page.spec.tsx`, vitest + jsdom):

- [ ] Mock summary + list → cards show `8`, `62.5%`, `3` reporters (example fixtures)
- [ ] Table renders `matchProfileId` + negative count + audit link href
- [ ] `feedbackCount: 0` → “No feedback yet” empty state
- [ ] API throws `admin_forbidden` → authorization error message
- [ ] Window 30 → mock called with `windowDays=30`

**Middleware / gate** (extend existing specs):

- [ ] `/admin/match-quality` prod 404 default
- [ ] Unauthenticated → redirect with `next=/admin/match-quality`

**API client** (optional unit):

- [ ] Builds correct query string; maps 403 to `admin_forbidden`

Mirror patterns from `me-matches/page.spec.tsx` (`vi.mock` API module, mock `next/link`).

---

## Docs updates (agent 1)

**MATCH_QUALITY_RUNBOOK.md** — Weekly ritual step 2:

> Postgres metrics: run SQL pack **or** open `/admin/match-quality` on gated staging (Story 3).

**ADMIN_ACCESS.md** — Enable checklist smoke line includes `/admin/match-quality`.

---

## Manual smoke (story §)

1. Log in as admin on staging → `/admin/match-quality`.
2. Summary cards match `GET .../summary?windowDays=7`.
3. Table row **View audit** → navigates to `/admin/match-quality/{id}` (404 OK until Story 4).

---

## Open questions / blockers

- None.

**Story 4 dependency:** drill-down page at dynamic route; Story 3 only ships list + links.

---

## Next agent

```text
--agent 1 sprint 11 story 3
```

**Notes for dev:**

- Copy `admin-reports-api.ts` error handling verbatim.
- Do not add adoption % card without API support.
- Extend middleware/gate tests — prefix gate already covers route; tests document it.
- `positiveRate` from API is 0–1; UI multiplies ×100 for display only.
