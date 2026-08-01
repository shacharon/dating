# Scale Readiness Code Review — High-Level Design & Architecture

**Date:** 2026-07-31  
**Scope:** Full-stack architecture, infrastructure, database, matching engine, frontend  
**Goal:** Identify blockers and prioritize improvements for 10x–100x user growth

---

## Executive Summary

### Current State
The product is **feature-complete for MVP** with solid code quality, comprehensive observability patterns, and thoughtful sprint documentation. However, **scale readiness is blocked on two critical paths:**

1. **Deployment infrastructure** (Sprint 20) — code complete (Docker/Terraform/CI); live AWS apply still PENDING_INFRA
2. **Match-list architecture** performs O(N) full-pool scans with N+1 database queries on every cache miss — see **Sprint 27** (`docs/sprints/sprint-27-match-list-performance/`)

### Scale Blockers Summary

| Area | P0 Blockers | Quick Wins | Major Refactors |
|------|-------------|------------|-----------------|
| **Infrastructure** | No Docker/Terraform/CI/CD; ephemeral photo storage | Execute Sprint 20 Stories 1-4 | Separate workers; auto-scaling |
| **Backend API** | Unauthenticated LLM endpoints; N+1 evals; co-located workers | Lock endpoints; batch queries; pool limits | Match precomputation; CDN photos |
| **Database** | Unbounded candidate scans; N+1 evaluation loads | Batch latest evals; add indexes | Materialized rankings; partitioning |
| **Matching Engine** | Full-pool O(N) rebuild on miss; sequential eval queries | SQL gender/age prefilter; eval batch | Async rebuild; pair score table |
| **Frontend** | 3s polling default; unpaginated conversations; no cache | Enable WebSocket; paginate; add TanStack Query | RSC data loading; virtualization |

---

## P0 Critical Blockers (Must Fix Before Scale)

### 1. Infrastructure: Sprint 20 Not Executed
**Status:** Fully planned, zero implementation  
**Impact:** Cannot deploy multi-instance to cloud; manual deploys reintroduce L1-L10 failures

**Blockers:**
- No `dating-api/Dockerfile` or `dating-ui/Dockerfile`
- No Terraform/CloudFormation for VPC, ECS, RDS, Redis, S3
- No GitHub Actions CI/CD pipeline
- Local photos would be lost on restart/scale (no S3 in cloud)
- Redis + ALB stickiness required for >1 API task (WebSocket fan-out)

**Action:** Execute Sprint 20 Stories 1-4 before adding more product features

**Reference:** [Infrastructure analysis](a53d42f3-4c04-4aff-8b58-5fda1ddac949)

---

### 2. Match List: Full-Pool O(N) Rebuild on Cache Miss
**Problem:** `MeMatchesService.buildFullRankedList` loads ALL `ANALYZED` profiles with photos, then runs N sequential `latestEvaluationForProfile` queries

**Code:**
```typescript
// dating-api/src/me-profile/me-matches.service.ts ~463-480
const candidateRows = await this.prisma.userProfile.findMany({
  where: this.matchCandidatePhotoEligibleWhere(userId),
  select: this.candidateSelect, // NO LIMIT
});

// dating-api/src/me-profile/me-profile-analysis.service.ts ~215-233
for (const profileId of unique) {
  const row = await latestEvaluationForProfile(prisma, profileId); // N queries
}
```

**Impact:**
- At 10k users: ~10k DB queries + multi-second latency
- At 50k users: timeout/pool exhaustion
- Redis payload grows unbounded
- Cursor pagination is in-memory AFTER full rank

**Quick Fixes (Days):**
1. Batch latest evaluations with `DISTINCT ON (profileId)` or window function → 1 query
2. SQL prefilter: gender ∈ viewer prefs, DOB in age range → before loading signals/text
3. Slim `candidateSelect`: drop free-text for list (load only for detail)
4. Cap pool (e.g., top 1000 by `analyzedAt` DESC) until proper precomputation exists

**Major Refactor (Weeks):**
- Materialized match score table (viewer × candidate × eval_ids × score)
- Async rebuild job (Bull) triggered on analysis complete
- List reads from precomputed store; true DB cursor pagination

**References:** 
- [Backend analysis](e94050a6-a019-40e2-886c-914d7307a4ec)
- [Database analysis](c71807a7-d916-4719-984d-ac86265ffdfd)
- [Matching Engine analysis](d4dbe5af-1bc1-4aeb-b956-8d4695d4c23c)

---

### 3. Unauthenticated Expensive Endpoints
**Problem:** Open endpoints can exhaust DB connections, LLM quotas, CPU independently of product traffic

| Endpoint | Risk |
|----------|------|
| `POST /api/evaluate/*` | Unbounded LLM cost/latency |
| `POST /api/v1/matches/rebuild` | Full match rebuild, no auth |
| `CRUD /api/v1/user-profiles` | Open profile API |

**Action:** 
- Add auth guard or delete these legacy/internal endpoints
- Move to admin-only with IP/WAF protection per `docs/ops/ADMIN_ACCESS.md`

**Reference:** [Backend analysis](e94050a6-a019-40e2-886c-914d7307a4ec)

---

### 4. Workers Co-Located with API
**Problem:** Bull processors and `PhotoSlaEnforcer` cron run inside every API process

**Impact:**
- Horizontal scale multiplies workers/cron (5 API tasks = 5 SLA cron jobs)
- Request latency spikes when inline LLM analysis runs
- Uneven load distribution

**Action:**
- Extract `WorkerModule` into separate deployable
- API only enqueues; workers only consume
- Single leader for cron (or distributed lock)

**Reference:** [Backend analysis](e94050a6-a019-40e2-886c-914d7307a4ec), [Infrastructure analysis](a53d42f3-4c04-4aff-8b58-5fda1ddac949)

---

### 5. Frontend: Realtime Defaults to 3s Polling
**Problem:** `NEXT_PUBLIC_REALTIME` unset → every open conversation polls `/messages?after=` every 3s

**Impact:**
- N open tabs × 1/3 req/s = steady-state load spike
- Stale conversations list (no live unread updates in poll mode)

**Code:**
```typescript
// dating-ui/src/lib/realtime-mode.ts
export function getRealtimeMode(): RealtimeMode {
  const raw = process.env.NEXT_PUBLIC_REALTIME?.trim().toLowerCase();
  if (raw === 'ws') return 'ws';
  return 'poll'; // DEFAULT
}
```

**Action:** 
- Change default to `'ws'` or set `NEXT_PUBLIC_REALTIME=ws` in all envs
- Keep poll as explicit fallback only

**Reference:** [Frontend analysis](254963e3-cef9-422e-b475-185891896052)

---

### 6. Unpaginated Conversations List
**Problem:** `GET /api/v1/me/conversations` returns full inbox; unread badge + list page + tab-focus all refetch

**Impact:** Users with 100+ conversations × tab switches = repeated large payloads + CPU

**Action:**
- Add cursor pagination to conversations API
- Create `/api/v1/me/conversations/unread-total` endpoint (lightweight aggregate)
- Stop full-list refetch for badge-only updates

**Reference:** [Frontend analysis](254963e3-cef9-422e-b475-185891896052)

---

## P1 High-Priority Improvements (Performance Wins)

### Backend / Database

1. **Auth path: 2-3 DB hits per request**
   - `AuthGuard` → session lookup + `lastSeenAt` update + user lookup
   - **Fix:** Redis session cache; throttle `lastSeenAt` writes (update only if >5min old)

2. **Conversations list: N COUNT(*) queries for unread**
   - One `message.count` per conversation
   - **Fix:** Single grouped SQL or denormalized `unreadCount` on `MutualMatch`

3. **Prisma pool unconfigured**
   - No `connection_limit`, timeouts, or PgBouncer guidance
   - **Fix:** Add `?connection_limit=10` to `DATABASE_URL`; document PgBouncer for multi-instance

4. **Missing indexes**
   - `Message (conversationId, status, createdAt)` for unread counts
   - `MatchFeedback (sentiment, createdAt)` for admin negative-candidate queries
   - Photo `(status, profileId)` partial index for EXISTS gate
   - **Fix:** Add via Prisma migration with `CONCURRENTLY`

5. **HTTP rate limiting gaps**
   - Message rate limit is in-memory only (per-process)
   - No global throttle for REST endpoints
   - **Fix:** Move message RL to Redis; add `@nestjs/throttler` globally

6. **Photo serving via API buffers**
   - Photos loaded into process memory before streaming
   - **Fix:** Serve from CDN with signed URLs; stop proxying bytes through Nest

7. **Data retention missing**
   - `Message`, `UserProfileEvaluation`, `MatchAction`, `UserSession` grow unbounded
   - **Fix:** Archive/purge jobs; Message partitioning by `createdAt`

### Frontend

1. **No shared client cache → redundant refetches**
   - Every page owns its own `useState` + mount fetch
   - **Fix:** Add TanStack Query (or SWR) with keyed caches, `staleTime`, deduped requests

2. **Images use `unoptimized` flag**
   - Full-resolution photos on list tiles waste bandwidth
   - **Fix:** Configure `images.remotePatterns`, remove `unoptimized`, use responsive `sizes`

3. **Auth waterfall gates product**
   - Root `AuthProvider` blocks chrome until `/auth/me` resolves client-side
   - **Fix:** Server-forward session cookie for initial RSC data; stream shell + Suspense

4. **No code splitting**
   - Zero `next/dynamic` / `React.lazy` usage
   - **Fix:** Lazy-load admin, analysis results, report dialog, celebration modal, legal markdown

5. **Lists without virtualization**
   - Messages and matches render full DOM
   - **Fix:** Add `@tanstack/react-virtual` for long threads/match lists

---

## P2 Long-Term Architecture Evolution

### Infrastructure
- Separate worker service (queues currently die when API tasks = 0)
- Auto-scaling policies (CPU/RPS/queue depth)
- Redis HA / Multi-AZ ElastiCache
- Blue/green or canary deploys
- Circuit breakers for OpenAI/Rekognition
- Edge DDoS/WAF beyond admin path
- Multi-region / DR

### Backend
- Incremental/precomputed match lists (async rank job)
- Candidate prefilter in SQL (gender reciprocity, age bands)
- Match detail narrative async (return detail without narrative; fill via job/WS)
- CDN-only photos (drop Nest file proxy)
- Pair score table (viewer × candidate × eval_ids × score)

### Database
- Message partitioning by `createdAt`
- Evaluation retention + `latestEvaluationId` pointer on `UserProfile`
- `ConversationParticipant` junction to eliminate `MutualMatch` OR
- Use denormalized `sig*`/`interestsTop` for coarse filters
- Migrate indexes with `CONCURRENTLY`; expand/contract for schema changes

### Frontend
- RSC + cookie-forwarding BFF for first paint
- TanStack Query as single data layer with optimistic updates
- Realtime as first-class (analysis completion via push)
- Route-based code splitting for admin/heavy UI
- Granular error boundaries around messaging/match actions
- i18n locale splitting (dynamic import per locale)

---

## Recommended Sprint Priority

### Sprint 27: Deploy to Cloud (Critical Path)
**Goal:** Execute Sprint 20 Stories 1-4

**Stories:**
1. Containerize API + UI (`Dockerfile`, compose with Redis)
2. Terraform/IaC for ECS, RDS, ElastiCache, S3, CloudFront
3. Secrets management (SSM/Secrets Manager)
4. CI/CD pipeline (GitHub Actions: build → test → ECR → deploy → health gate)
5. Smoke test + k6 load test against live `dev` URL

**Acceptance:** Shared `dev` environment on AWS with containers, IaC, automated deploys

---

### Sprint 28: Match List Performance (Scale Blocker)
**Goal:** Fix O(N) full-pool rebuild

**Stories:**
1. Batch latest evaluations (replace sequential loop with `DISTINCT ON` or window SQL)
2. SQL gender/age prefilter (push viewer prefs into WHERE before loading signals)
3. Slim `candidateSelect` (drop free-text for list; load only for detail)
4. Cap candidate pool (top 1000 by `analyzedAt` DESC as stopgap)
5. Add observability: instrument `candidates_loaded`, `eval_query_ms`, `score_cpu_ms`

**Acceptance:** Match list cache miss <2s at 10k analyzed users; k6 p95 baseline

---

### Sprint 29: Frontend Realtime + Cache
**Goal:** Fix polling + redundant fetches

**Stories:**
1. Default `NEXT_PUBLIC_REALTIME=ws` (change code default or set env)
2. Paginate conversations API + add `/me/conversations/unread-total`
3. Add TanStack Query with shared cache
4. Enable real `next/image` optimization (remotePatterns, remove `unoptimized`)
5. Lazy-load admin + heavy UI (dynamic imports)

**Acceptance:** No 3s polling in prod; conversations paginated; images optimized; admin code-split

---

### Sprint 30: Auth & DB Hardening
**Goal:** Quick backend wins

**Stories:**
1. Lock/delete unauthenticated expensive endpoints
2. Redis session cache + throttle `lastSeenAt` writes
3. Batch unread counts (single grouped SQL)
4. Add missing indexes (`Message`, `MatchFeedback`, partial photo index)
5. Configure Prisma pool (`connection_limit` + timeouts)
6. Move message rate limit to Redis

**Acceptance:** Auth path <3 DB queries; unread counts batched; pool configured

---

### Sprint 31: Workers + Observability
**Goal:** Separate workers; wire monitoring

**Stories:**
1. Extract `WorkerModule` into separate deployable
2. Wire Sentry + CloudWatch in `dev` (DSN, alarms)
3. Add readiness checks + synthetic login/matches canary
4. Graceful shutdown (Nest `enableShutdownHooks` + drain Bull/WS)
5. HTTP rate limiting (global throttle)

**Acceptance:** Workers run separately; API only enqueues; alarms on 0 healthy tasks

---

### Sprint 32+: Async Match Rebuild (Major Refactor)
**Goal:** Move match ranking off request path

> **Repo status (2026-08):** Implemented as **[Sprint 31 — Async Match Materialization](./sprints/sprint-31-match-materialization/README.md)** (Stories 1–5). Default list path is `MatchListRank` after Story 5 cutover; see [OPS_CUTOVER.md](./sprints/sprint-31-match-materialization/OPS_CUTOVER.md). SCALE numbering below is historical.

**Stories:**
1. Design materialized match score table (viewer × candidate × score)
2. Create Bull job for incremental rank updates
3. Trigger rebuild on analysis complete
4. List endpoint reads from precomputed store with DB cursor pagination
5. Deprecate in-memory full-pool build

**Acceptance:** Match list always reads from cache/DB; no O(N) rebuild on miss

---

## Cross-Cutting Themes

### 1. Observability
- Already strong: structured logging, `emitProductLog`, `UiErrorCodes`, `custom-metrics.ts`
- Gaps: No CloudWatch alarms/dashboards provisioned; hit-rate metrics not visualized
- Action: Wire Sentry/Datadog in cloud; create dashboards for cache hit rate, match list latency, queue depth

### 2. Testing
- Already strong: Jest, integration specs, smoke scripts, k6 load test
- Gaps: No automated cloud gate; local compose lacks Redis
- Action: Add Redis to local compose; run k6 as CD gate

### 3. Documentation
- Already strong: Sprint handoffs, runbooks (`DEPLOY_AWS_DEV.md`, `DEV.md`)
- Gaps: No architecture diagram; match-list algorithm not documented standalone
- Action: Create `docs/ARCHITECTURE.md` with system diagram; extract Holy Grail explainer

### 4. Security
- Already strong: HttpOnly sessions, pepper, CORS, admin defense-in-depth docs
- Gaps: WAF/rate-limit not deployed; secret rotation undefined
- Action: Deploy AWS WAF for admin paths; document secret rotation procedure

---

## Success Metrics

| Metric | Current | Target (10k users) | Target (50k users) |
|--------|---------|--------------------|--------------------|
| Match list p95 latency (miss) | Untested | <2s | <2s |
| Match list cache hit rate | Unknown | >90% | >95% |
| API p95 latency | Untested | <500ms | <500ms |
| DB connection pool usage | Unknown | <80% | <80% |
| Message delivery latency (WS) | Unknown | <200ms | <200ms |
| Frontend LCP | Unknown | <2.5s | <2.5s |
| Error rate | Unknown | <0.1% | <0.1% |
| Deploy frequency | Manual | Daily | Daily |
| Deploy rollback time | Manual | <5min | <5min |

---

## Conclusion

**The product is architecturally sound and MVP-ready.** Code quality, observability patterns, and sprint discipline are strong. However, **scale readiness is blocked on infrastructure (Sprint 20) and match-list architecture (O(N) rebuild).**

**Recommended path:**
1. Execute Sprint 20 (Deploy to Cloud) as next priority
2. Fix match-list O(N) rebuild before 1000+ users
3. Address frontend polling + cache gaps concurrently
4. Harden auth/DB with quick wins (batching, indexes, pooling)
5. Separate workers + wire monitoring
6. Plan async match precomputation for long-term scale

Sprint 26 (UI architecture cleanup) was a success — applying the same systematic approach to Sprints 27-32 will unblock scale.
