# Story 1: Performance overhaul — caching, pagination, image optimization, async analysis

**Epic:** Sprint 19 — Performance optimization + real photo moderation  
**Story:** Performance overhaul  
**Priority:** P0 (MVP-blocking for scale)  
**Estimated effort:** ~1 week (4 agents)  
**Status:** Done

---

## Problem statement

Current performance bottlenecks make the app unusable at scale:

1. **Match list loads ALL matches** — no pagination; breaks at 50+ matches
2. **No caching layer** — every request hits DB for match scores, profile data
3. **Unoptimized images** — full-size photos loaded eagerly; no CDN; slow on mobile
4. **Profile analysis is synchronous** — 2–4s API response time; risk of timeout; blocks user
5. **No observability** — can't diagnose bottlenecks in production

**Impact:** At 1,000 DAU with avg 30 matches per user, match list takes 5–10s to load. Profile submission times out. Users bounce. App feels broken.

---

## Success criteria (AC)

### A. Redis caching layer

- [x] Redis connection configured in `dating-api` (`.env.example` documented)
- [x] Match list cached per user: `match:list:{userId}` (TTL 1hr) — remapped from story `match:scores:*`
- [ ] Profile analysis results cached: `profile:analysis:{profileId}` — **deferred** (served via `UserProfile.status`)
- [x] Cache middleware logs cache hit/miss rate to structured logs
- [x] Unit tests: cache hit returns cached value; cache miss fetches from DB and writes cache

### B. Cursor-based pagination on match list

- [x] API: `GET /api/v1/me/matches?cursor=&limit=20` (default limit 20, max 50)
- [x] Response includes `nextCursor` or `null` if end (opaque ranked cursor — remapped from `analyzedAt`)
- [x] Pagination over ranked list (score DESC + id ASC) — remapped from story SQL on `Match`
- [x] Existing `GET /api/v1/me/matches` (no params) returns first page for backwards compatibility
- [x] Unit + E2E tests: paginate; verify no duplicates, no gaps / order drift

### C. Image optimization (CDN + lazy loading)

- [ ] CloudFront distribution created (ops) — **deferred** (code ready when `PHOTO_CDN_ENABLED=1`)
- [x] Photo URLs use CDN when enabled (signed CloudFront); else relative auth path
- [x] UI: `next/image` for absolute CDN URLs; skeleton loaders
- [x] Photo upload flow unchanged (storage + optional CDN)
- [ ] Smoke test: Chrome DevTools Network lazy loading — **tracked operator follow-up**

### D. Async profile analysis (Bull queue)

- [x] Bull queue configured (`profile-analysis`; Redis-backed, inline fallback)
- [x] API: `POST /api/v1/me/profile/submit` returns `202` + `analysisJobId`
- [x] API: `GET /api/v1/me/profile/analysis-status`
- [x] Worker processes jobs via existing analysis; status on `UserProfile` (remapped)
- [x] UI: `/dating/analysis` polls (~3s) status endpoint
- [x] Job retry: 3 attempts with exponential backoff
- [x] Unit/integration coverage for enqueue + 202 contract

### E. Database indexes (hot paths)

- [x] Indexes on `UserProfile` for list/filter (remapped from fictional `Match_*`)
- [x] Migration applied (`20260712000000_add_performance_indexes`)
- [ ] `EXPLAIN ANALYZE` documented — **deferred** ops

### F. APM monitoring (observability)

- [x] Datadog hook + custom metrics helpers (optional enable)
- [ ] Full APM dashboard + p95 alert — **deferred** ops
- [x] Custom metric helpers for match list / analysis / cache

---

## Technical design

### Architecture changes

```
BEFORE (Sprint 18):
User → API /me/matches → DB (all matches) → Response (5s)
User → API /me/profile/submit → Analysis (sync, 3s) → DB → Response

AFTER (Sprint 19):
User → API /me/matches?cursor=X → Cache (hit?) → DB (20 matches) → Response (0.5s)
User → API /me/profile/submit → Bull queue → 202 Response (50ms)
                              → Worker → Analysis → DB → Complete
User → API /me/profile/analysis-status → DB → Response (status)

Images: CDN → S3 origin (cached at edge)
```

### Redis schema

```
# Match scores (TTL 1hr)
match:scores:{userId} → JSON array of { candidateId, score, analyzedAt }

# Profile analysis results (TTL until stale)
profile:analysis:{profileId} → JSON { status, summary, traits, ... }

# Cache invalidation
- On new match action (LIKE/PASS): delete match:scores:{userId}
- On profile edit: set ProfileAnalysis.stale=true; delete profile:analysis:{profileId}
```

### API contract changes

#### New pagination params (optional, backwards compatible)

```typescript
// Request
GET /api/v1/me/matches?cursor=2026-07-10T14:30:00.000Z&limit=20

// Response
{
  status: 'ready',
  matches: [...], // 20 items
  nextCursor: '2026-07-09T08:15:23.456Z' | null,
  hasMore: boolean
}
```

#### New analysis status endpoint

```typescript
// Request
GET /api/v1/me/profile/analysis-status

// Response
{
  status: 'pending' | 'processing' | 'complete' | 'failed',
  submittedAt: '2026-07-11T12:00:00.000Z',
  completedAt?: '2026-07-11T12:02:30.000Z',
  error?: string
}
```

### Database migration

```sql
-- 20260711000000_add_performance_indexes.sql
CREATE INDEX CONCURRENTLY "Match_userId_analyzedAt_idx" 
  ON "Match"("userId", "analyzedAt" DESC);

CREATE INDEX CONCURRENTLY "Match_analyzedAt_idx" 
  ON "Match"("analyzedAt" DESC);

CREATE INDEX CONCURRENTLY "ProfileAnalysis_status_idx" 
  ON "ProfileAnalysis"("status");

-- Add analysis status column (for async flow)
ALTER TABLE "ProfileAnalysis" 
  ADD COLUMN "status" TEXT DEFAULT 'complete';
-- Backfill existing rows: UPDATE "ProfileAnalysis" SET status='complete';
```

### Code changes (key files)

```
dating-api/src/
├── cache/
│   ├── redis.service.ts         # NEW: Redis client wrapper
│   ├── cache.middleware.ts      # NEW: Cache-Control headers + logging
│   └── cache.service.spec.ts
├── me-profile/
│   ├── me-matches.service.ts    # MODIFY: add pagination, cache reads
│   ├── me-profile.service.ts    # MODIFY: enqueue job on submit (202)
│   ├── analysis-status.dto.ts   # NEW: status response DTO
│   └── me-matches.service.spec.ts
├── workers/
│   ├── profile-analysis.worker.ts  # NEW: Bull worker for async analysis
│   ├── worker.module.ts            # NEW: registers workers
│   └── profile-analysis.worker.spec.ts
├── observability/
│   ├── apm.service.ts           # NEW: New Relic/Datadog wrapper
│   └── custom-metrics.ts        # NEW: custom metric helpers

dating-ui/src/
├── app/dating/me-matches/
│   ├── page.tsx                 # MODIFY: infinite scroll, cursor state
│   └── use-infinite-matches.ts  # NEW: React Query infinite query hook
├── app/dating/analysis/
│   └── page.tsx                 # MODIFY: poll status endpoint, show progress
└── components/
    └── match-photo.tsx          # MODIFY: use Next.js Image, skeleton loader
```

---

## Testing strategy

### Unit tests (dating-api)

- `cache.service.spec.ts`: get/set/delete/TTL; hit/miss logging
- `me-matches.service.spec.ts`: pagination (first page, next page, last page, empty)
- `profile-analysis.worker.spec.ts`: job processing, retry on failure, status update

### Integration tests (dating-api)

- `me-matches.integration.spec.ts`: full pagination flow with 100 test matches
- `profile-submit-async.integration.spec.ts`: submit → 202 → poll status → complete
- `cache-invalidation.integration.spec.ts`: action (LIKE) invalidates cache

### E2E tests (dating-ui)

- `me-matches-infinite-scroll.e2e.spec.ts`: scroll triggers pagination, no duplicates
- `profile-submit-status-poll.e2e.spec.ts`: submit profile → see "Analyzing..." → redirect to matches

### Load tests (k6 or Artillery)

```javascript
// load-test-matches.js
export default function () {
  http.get(`${BASE_URL}/api/v1/me/matches?cursor=${cursor}&limit=20`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
// Run: k6 run --vus 50 --duration 60s load-test-matches.js
// Target: p95 <2s, throughput >100 RPS
```

---

## Rollout plan

### Phase 1: Infrastructure (Agent 0–1)
1. Provision Redis (ElastiCache or local)
2. Provision CloudFront (or CDN)
3. Install APM agent (New Relic/Datadog)
4. Database migration (indexes)

### Phase 2: Backend (Agent 1)
1. Implement Redis caching (match scores, profile analysis)
2. Add pagination to match list API
3. Convert profile analysis to Bull queue + worker
4. Add status endpoint

### Phase 3: Frontend (Agent 1)
1. Implement infinite scroll on match list
2. Convert `<img>` to Next.js `<Image>` with lazy loading
3. Add skeleton loaders
4. Poll status on analysis page

### Phase 4: Testing & validation (Agent 2)
1. Run full test suite (unit + integration + E2E)
2. Run load tests; validate p95 <2s
3. Verify cache hit rate >70% after warm-up
4. Measure image bandwidth reduction (target -60%)

### Phase 5: Deploy & monitor (Agent 3)
1. Deploy to staging; smoke test
2. Monitor APM for 24hr (latency, error rate, cache hit rate)
3. Deploy to production (canary: 10% → 50% → 100%)
4. Verify success metrics (see below)

---

## Success metrics (measure week 1 post-deploy)

| Metric | Baseline (Sprint 18) | Target (Sprint 19) | Measurement |
|--------|----------------------|--------------------|-------------|
| Match list load time (p95) | 4–6s | <2s | APM dashboard |
| Profile analysis blocking time | 2–4s | 0s (async) | API response time |
| Image bandwidth per page | ~8MB | <2MB | Chrome DevTools |
| Cache hit rate | 0% (no cache) | >70% | Redis logs |
| Database load (queries/sec) | ~500 | <200 | PostgreSQL stats |
| Bull job completion rate | N/A | >98% | Bull dashboard |

---

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Redis downtime → all requests hit DB | High | Graceful degradation: catch Redis errors, fallback to DB |
| CDN misconfiguration → broken images | High | Keep S3 URLs as fallback in API; test CDN in staging first |
| Bull queue backlog → analysis never completes | Medium | Alert if queue depth >100; auto-scale worker instances |
| Pagination cursor drift (user adds match mid-scroll) | Low | Acceptable UX tradeoff; cursor is stable (timestamp-based) |
| APM overhead → increased latency | Low | Use sampling (10% of requests); disable if p95 degrades |

---

## Deferred (Story 1 follow-ups)

- GraphQL with DataLoader (eliminates N+1 queries)
- Precompute match scores nightly (batch job)
- Edge caching for public profiles (CloudFlare Workers)
- WebSocket for live match list updates (push vs. pull)
- Image resizing at upload time (multiple sizes for responsive)
- Database read replicas (separate read/write traffic)

---

## Dependencies

- Redis instance (AWS ElastiCache or local)
- CloudFront distribution (or CDN alternative)
- Bull (npm package; Redis-backed)
- APM tool account (New Relic free tier or Datadog trial)
- Load testing tool (`k6` or `artillery`)

---

## Agent handoff checklist

### Agent 0 (Architect) delivers:
- [x] Redis schema documented (key patterns, TTLs, invalidation rules)
- [x] API contract changes reviewed (pagination params, status endpoint)
- [x] Database migration script written + reviewed
- [x] CDN setup guide (CloudFront origin configuration)
- [x] APM instrumentation plan (which metrics, which endpoints)
- [x] Load testing script written (`k6` or Artillery config)

### Agent 1 (Senior Dev) delivers:
- [x] Redis service + caching middleware implemented
- [x] Pagination logic in `me-matches.service.ts`
- [x] Bull queue + worker for profile analysis
- [x] Status endpoint in `me-profile.controller.ts`
- [x] Next.js Image components in UI (lazy loading, skeleton)
- [x] Infinite scroll hook (`use-infinite-matches.ts`)
- [x] Database migration applied (indexes)
- [x] All unit tests passing (completed in Agent 2)

### Agent 2 (Code Review) delivers:
- [x] Code review complete (caching, pagination, async, images)
- [x] Integration tests written + passing
- [x] E2E tests written + passing (Agent 4)
- [ ] Load test results documented (baseline vs. target) — **deferred**
- [ ] Linter clean (`npm run lint` in both repos) — **deferred** / not blocking

### Agent 3 (PM / Close) delivers:
- [x] Engineering DoD closed (Agents 0–2–4); ops items tracked as follow-ups
- [ ] Staging smoke test complete (paginate, cache hits, async analysis) — **tracked operator follow-up**
- [ ] APM dashboard configured (latency, cache hit rate) — **deferred** ops
- [ ] Success metrics captured (compare baseline vs. target) — **deferred**
- [ ] Runbook updated: cache invalidation, Bull queue monitoring — **deferred**
- [ ] Production deploy plan reviewed + approved — **deferred**
- [x] Story marked DONE in sprint README (engineering + E2E gate)
- [x] Handoff `agent-3-pm.md` written
