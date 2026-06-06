# Handoff: Agent 0 — Architect — Story 6

**Agent:** 0 architect  
**Story:** [STORY_06_launch_ux_polish.md](../../STORY_06_launch_ux_polish.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Analysis waiting UX** — new progress panel on `/dating/analysis` for `SUBMITTED` / `ANALYZING` (and pre-result first submit); interval poll with backoff; **auto-redirect to `/dating/me-matches`** when `ANALYZED` only during an active wait session (do not redirect users browsing completed results).
- **Empty match list** — replace generic copy with cohort-liquidity message + action links (prefs, profile, invite/copy link); optional city from `fetchMyProfile()` (no API change).
- **Settings profile routes** — server **redirects** to existing edit surfaces (no duplicate forms).
- **Match detail layout** — human-first reorder: hero → name/location → one-line takeaway → chips; **de-emphasize** numeric score (small inline badge, not hero box).
- **Launch runbook** — new `LAUNCH_COHORT_RUNBOOK.md` (cohort ops, moderation checklist, CloudWatch snippets).
- **Prod internal routes** — middleware **404** for `/profiles`, `/evaluate`, `/auto-matches`, `/dev/*` when `NODE_ENV=production` (escape hatch env flag).
- **No API changes** — UI + middleware + docs only.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/analysis/analysis-progress-poll.ts` | **created** — poll intervals, backoff, helpers |
| `dating-ui/src/app/dating/analysis/analysis-progress-poll.spec.ts` | unit tests for backoff / stop conditions |
| `dating-ui/src/app/dating/analysis/analysis-run-ux.ts` | extend status labels + waiting copy (or merge into poll module) |
| `dating-ui/src/components/analysis-progress-panel.tsx` | **created** — stepper UI + wait copy + profile/photo links |
| `dating-ui/src/components/analysis-progress-panel.spec.tsx` | renders states SUBMITTED / ANALYZING |
| `dating-ui/src/app/dating/analysis/page.tsx` | waiting panel + poll + conditional auto-redirect |
| `dating-ui/src/app/dating/analysis/page.spec.tsx` | waiting states; redirect on ANALYZED when wait session |
| `dating-ui/src/components/match-list-empty-state.tsx` | **created** — cohort copy + action buttons |
| `dating-ui/src/components/match-list-empty-state.spec.tsx` | actions render |
| `dating-ui/src/app/dating/me-matches/page.tsx` | use `MatchListEmptyState` |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | empty state actions |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | reorder detail sections; de-emphasize score |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | takeaway before score; score de-emphasized |
| `dating-ui/src/app/(authenticated)/settings/profile/page.tsx` | `redirect('/dating/profile')` |
| `dating-ui/src/app/(authenticated)/settings/profile/basic/page.tsx` | `redirect('/onboarding/basic?edit=1')` |
| `dating-ui/src/app/(authenticated)/settings/profile/story/page.tsx` | `redirect('/onboarding/texts?edit=1')` |
| `dating-ui/src/middleware.ts` | prod block internal route prefixes |
| `dating-ui/src/middleware.spec.ts` | prod 404 for `/evaluate`, `/profiles`; dev allows |
| `dating-ui/src/lib/internal-routes-gate.ts` | **created** — shared prefix list + `isInternalRouteBlocked()` |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `analysisProgress`, `launch.emptyMatches`, `launch.invite` |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | **created** — ops runbook |

**Optional quick fix (same PR if trivial):** `nav-auth.tsx` — replace disabled “Match Preferences (TODO)” with link to `/settings/preferences` (Story 3 shipped; stale menu item).

**No changes:** `dating-api/*`, Prisma, match engine scoring.

---

## Decisions (do not reverse without discussion)

### 1. Analysis page — waiting vs results (two modes)

| Mode | When | UI |
|------|------|-----|
| **Waiting** | `profile.status ∈ { SUBMITTED, ANALYZING }` OR (`!evaluationId` && status not `ANALYZED` && not `DRAFT`) | `AnalysisProgressPanel` (stepper + poll) |
| **Results** | `profile.status === ANALYZED` && `evaluationId` present on mount **without** active wait session | Existing insight cards (unchanged content) |

**Problem today:** After onboarding submit, user lands on `/dating/analysis` with `SUBMITTED` and no `evaluationId` — page shows “No analysis yet” + edit button, not progress. Re-run UX uses one-shot 45s/90s checks without redirect.

**Locked behavior:**

```typescript
// On mount after load:
const startedInFlight = isAnalysisInFlight(profile?.status);
const startedAwaitingFirstResult =
  !latest.evaluationId && profile?.status !== 'ANALYZED' && profile?.status !== 'DRAFT';
const autoRedirectOnComplete = startedInFlight || startedAwaitingFirstResult;
```

- When `autoRedirectOnComplete`, start poll (see §2).
- When poll observes `profile.status === 'ANALYZED'`, `router.replace('/dating/me-matches')` (matches page handles `no_photo` → profile per Story 2).
- When poll observes `FAILED`, show error panel + “Try again” (calls existing submit) + edit profile links.
- When user opens analysis with **already** `ANALYZED` + `evaluationId` on mount → **do not** set `autoRedirectOnComplete`; show results (current behavior).

Re-run analysis button: set `autoRedirectOnComplete = true` when submit succeeds (same poll + redirect path).

---

### 2. Analysis polling — replace 45s/90s for wait sessions

| Rejected | Verdict |
|----------|---------|
| Keep only 45s/90s one-shot checks | **Rejected** — story AC requires progress + redirect |
| WebSocket push for analysis | **Out of scope** |
| **Interval poll with backoff** | **Chosen** |

New module `analysis-progress-poll.ts`:

```typescript
export const ANALYSIS_POLL_INITIAL_MS = 5_000;
export const ANALYSIS_POLL_MAX_MS = 10_000;
export const ANALYSIS_POLL_BACKOFF = 1.5;
export const ANALYSIS_POLL_MAX_DURATION_MS = 600_000; // 10 min safety stop

export function nextPollDelayMs(priorDelayMs: number): number {
  return Math.min(
    Math.round(priorDelayMs * ANALYSIS_POLL_BACKOFF),
    ANALYSIS_POLL_MAX_MS,
  );
}
```

Hook pattern in page (or `useAnalysisProgressPoll`):

- Poll `fetchMyProfile()` (+ optionally `fetchMyLatestAnalysis()` when status becomes `ANALYZED`).
- Stop polling on: `ANALYZED`, `FAILED`, unmount, or max duration.
- **Do not** poll when not in waiting mode.

Progress stepper labels (i18n `analysisProgress`):

| Status | Step label |
|--------|------------|
| `SUBMITTED` | Submitted — queued |
| `ANALYZING` | Analyzing your profile… |
| (implicit next) | Redirecting to matches… |

Body copy: **“Usually a few minutes.”** (replace/extend `RUN_FEEDBACK.inProgress`).

Action links on waiting panel:

| Link | Target |
|------|--------|
| Edit profile | `/dating/profile` |
| Add or change photo | `/dating/profile#profile-photos` |
| Edit basics (optional secondary) | `/onboarding/basic?edit=1` |

---

### 3. Empty match list — `MatchListEmptyState`

Replace inline block in `me-matches/page.tsx` (lines ~198–210).

**Copy pattern (i18n `launch.emptyMatches`):**

- Title: “No matches to show right now”
- Body: cohort liquidity — if `profile.locationLabel` or `profile.city` set, interpolate: “More people are joining in **{place}**.” Else generic: “More people are joining — check back soon.”
- Subtext: filters may narrow the pool (one line, non-alarming).

**Actions (required by AC):**

| Action | Implementation |
|--------|----------------|
| Edit preferences | `<Link href="/settings/preferences">` |
| Edit profile | `<Link href="/dating/profile">` |
| Invite a friend | Primary: **Copy invite link** button → `navigator.clipboard.writeText(origin + '/')` + `role="status"` confirmation; Secondary optional: `mailto:` with prefilled subject/body using same URL |

Component fetches profile once on mount (`fetchMyProfile()`) for city/locationLabel only when rendered (empty list).

`data-testid="match-list-empty-state"` + per-action testids.

---

### 4. Settings profile pages — redirects (not embed)

| Route | Verdict |
|-------|---------|
| Duplicate profile summary in settings | **Rejected** — `/dating/profile` already complete (Story 2 hints/banner) |
| **Server redirect** | **Chosen** |

```typescript
// settings/profile/page.tsx
import { redirect } from 'next/navigation';
export default function SettingsProfilePage() {
  redirect('/dating/profile');
}
```

| Path | Redirect |
|------|----------|
| `/settings/profile` | `/dating/profile` |
| `/settings/profile/basic` | `/onboarding/basic?edit=1` |
| `/settings/profile/story` | `/onboarding/texts?edit=1` |

Use `redirect()` in **server components** (remove TODO placeholder copy). No client shell needed.

Nav menu already links onboarding edit paths directly — settings redirects cover bookmarked/deep links only.

---

### 5. Match detail — human-first layout

**Current order:** hero → header → **large score box** + chips → traits → takeaway.

**Locked order:**

1. `MatchPhoto` hero (unchanged — Story 1)
2. Header: name + `matchDetailSubtitle` (location/meta)
3. **One-line takeaway** — prefer `recommendation.primaryTakeaway`, else `explainability.reasonShort` (prominent `text-base`, not uppercase label first)
4. **Compatibility chips** — positive + tension (unchanged styling)
5. **Score** — de-emphasized: remove 2xl bordered box; show as small inline badge e.g. `Match score · 72` (`text-sm text-zinc-500`) **after** takeaway/chips, or omit when `matchScore == null`
6. Traits + recommendation caution + actions (unchanged order relative to each other)

Do **not** change API DTOs or action/report/block behavior.

---

### 6. Prod internal routes — middleware 404

Centralize in `internal-routes-gate.ts`:

```typescript
export const INTERNAL_ROUTE_PREFIXES = [
  '/profiles',
  '/evaluate',
  '/auto-matches',
  '/dev',
] as const;

export function isInternalRouteBlocked(pathname: string): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES === '1') return false;
  if (process.env.NODE_ENV !== 'production') return false;
  return INTERNAL_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
```

In `middleware.ts`, **before** auth check:

```typescript
if (isInternalRouteBlocked(pathname)) {
  return new NextResponse(null, { status: 404 });
}
```

Extend `middleware.config.matcher` to include:

```typescript
'/profiles', '/profiles/:path*',
'/evaluate', '/evaluate/:path*',
'/auto-matches', '/auto-matches/:path*',
'/dev', '/dev/:path*',
```

| Route | Prod behavior |
|-------|---------------|
| `/profiles/*` | 404 |
| `/evaluate` | 404 |
| `/auto-matches` | 404 |
| `/dev/*` | 404 (belt; pages may also call `notFound()`) |
| `/matches` (legacy compare UI) | **Not blocked** in v1 — document as dev-only in runbook; optional follow-up |

Escape hatch: `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` for prod-like debugging (document in runbook, not `.env.example` unless ops asks).

---

### 7. Launch runbook doc

Create `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md`:

**Sections (locked outline):**

1. **Cohort launch checklist** — seed N users per city, verify photos stub-approved, manual photo spot-check
2. **Cohort size targets** — placeholder table (e.g. min 20 analyzed profiles per city for non-empty lists); ops fills after baseline week
3. **Manual moderation** — stub auto-approve + daily ops review of new photos/reports
4. **Funnel KPIs** — copy CloudWatch Insights queries from [PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md); weekly review cadence
5. **Internal routes** — list blocked prefixes + escape flag
6. **Manual smoke** — cross-ref story + sprint README smoke steps
7. **Incident contacts** — placeholder ops section

No PostHog/automated email (explicit out of scope).

---

### 8. i18n

Add sections to `AppCopySchema` (en + es):

```typescript
analysisProgress: {
  title: string;
  submittedStep: string;
  analyzingStep: string;
  waitHint: string; // "Usually a few minutes."
  editProfileLink: string;
  addPhotoLink: string;
  failedTitle: string;
  retryButton: string;
};
launch: {
  emptyMatches: {
    title: string;
    bodyWithPlace: (place: string) => string;
    bodyGeneric: string;
    filterHint: string;
    editPreferences: string;
    editProfile: string;
    inviteCopyLink: string;
    inviteCopied: string;
  };
};
```

---

## Runtime topology

| Item | Value |
|------|--------|
| Analysis poll | Client-only; `GET /api/v1/me/profile` (+ latest analysis when needed) |
| Empty state profile | Client `fetchMyProfile()` on empty list render |
| Redirect after analysis | UI → `/dating/me-matches` → may redirect `/dating/profile` if `no_photo` |
| Prod gate | `middleware.ts` at UI edge; `NODE_ENV=production` |
| API | Unchanged |

---

## Tests / verification

**UI**

- [ ] `analysis-progress-poll.spec.ts` — backoff cap, max duration stop
- [ ] `analysis-progress-panel.spec.tsx` — SUBMITTED vs ANALYZING labels
- [ ] `analysis/page.spec.tsx` — waiting panel visible when ANALYZING; `replace('/dating/me-matches')` when poll returns ANALYZED + wait session
- [ ] `match-list-empty-state.spec.tsx` — three action links/buttons
- [ ] `me-matches/page.spec.tsx` — empty state testids
- [ ] `me-matches/[id]/page.spec.tsx` — takeaway appears before score; score not 2xl box
- [ ] `middleware.spec.ts` — **+2** prod 404 for `/evaluate`, `/profiles`; dev passes through
- [ ] Commands: `cd dating-ui && npm test`; `cd dating-ui && npm run build` (prod middleware)

**Manual smoke (story file)**

1. Submit → analysis progress → auto-redirect matches when analyzed
2. Empty pool → actionable empty state
3. `/settings/profile` → lands on editable profile (no TODO)
4. `npm run build && npm run start` → `/evaluate` → 404

---

## Open questions / blockers

- None blocking agent 1.

Optional (not blocking DoD):

- Wire nav “Match Preferences (TODO)” → `/settings/preferences`
- Block `/matches` legacy compare in prod (same middleware pattern)
- Coalesce duplicate photo fetches on profile page (Story 2 follow-up)

---

## Next agent

```text
--agent 1 sprint 9 story 6
```

**Notes for next agent:**

1. Implement `analysis-progress-poll.ts` + `AnalysisProgressPanel` first; wire page before touching results layout.
2. Guard auto-redirect — regression test for “ANALYZED user browsing results” is mandatory.
3. Empty state component before match detail reorder (isolated PR sections ok in one commit).
4. Settings pages: three-line server redirects — quick win early.
5. Middleware + runbook doc before close; run full UI suite + `npm run build`.
