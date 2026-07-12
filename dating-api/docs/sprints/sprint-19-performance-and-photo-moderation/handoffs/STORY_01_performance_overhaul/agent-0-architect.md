# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_performance_overhaul.md](../../STORY_01_performance_overhaul.md)  
**Sprint:** sprint-19-performance-and-photo-moderation  
**Date:** 2026-07-12  
**Status:** complete  

---

## Summary

- **Branch gate (blocking for Agent 1):** Product APIs live on `sprint17` (Prisma, `me-profile`, photos, Redis WS). Current `main` is the engine/JSON POC and **must not** be the implementation base. Create `sprint-19` (or similar) **from `sprint17`**, then bring Sprint 19 docs from this working tree.
- **No `Match` / `ProfileAnalysis` tables** — remap Story 1 ACs onto `UserProfile` + `UserProfileEvaluation` + computed `MeMatchesService.list`. Do **not** add story-named models.
- **Pagination** is over the **already-ranked** match list (score DESC), not `analyzedAt`. Cursor = opaque token over a Redis-cached ranked array.
- **Analysis is already async fire-and-forget** (`SUBMITTED` → worker → `ANALYZING` → `ANALYZED|FAILED`). Upgrade to **Bull + 202**; status maps from existing `UserProfile.status` (no new status column).
- **CDN must preserve photo auth** — Sprint 9 rejected public URLs. Use **CloudFront signed URLs** (or keep same-origin file route + cache headers until S3+CDN is ready).
- **Agent 4 required** — matches list contract + ranking order change surface.

---

## Branch / workspace gate (read first)

| Fact | Detail |
|------|--------|
| Product HEAD | `sprint17` — Nest + Prisma + `/api/v1/me/*` + dating UI |
| Current `main` | Engine POC (JSON profiles/matches). **No** Prisma, **no** `me-matches` |
| Skills | `.cursor/skills/*` exist on `sprint17` only; restore before Agent 1 |
| Sprint 19 docs | Present on this tree under `dating-api/docs/sprints/sprint-19-…` |

**Agent 1 first steps:**

```text
1. git checkout sprint17
2. git checkout -b sprint-19
3. Bring Sprint 19 story/README/handoff docs onto the branch
4. Restore .cursor/skills from sprint17 if missing
5. Implement against product codebase
```

---

## Current baseline (product / `sprint17`)

### Match list

| Item | Today |
|------|--------|
| Endpoint | `GET /api/v1/me/matches` → `MeMatchesService.list(userId)` |
| Pagination | **None** — loads all photo-eligible `ANALYZED` candidates, scores in process, returns full array |
| Sort | Eligible by `matchScore` DESC; hard-blocked existing appended (score DESC) |
| Photo URL | Relative auth path: `/api/v1/me/matches/{profileId}/photos/{photoId}/file` |
| DTO | `MeMatchesListResponseDto` / `MeMatchItemDto` (includes `analyzedAt`, `primaryPhotoUrl`, `hardBlocked?`) |

### Profile analysis

| Item | Today |
|------|--------|
| Submit | `POST /api/v1/me/profile/submit` → **200** + profile DTO (`status: SUBMITTED`) |
| Worker | `void this.analysis.runForUser(userId)` fire-and-forget (no Bull) |
| Lifecycle | `SUBMITTED` → `ANALYZING` → `ANALYZED` \| `FAILED` on `UserProfile` |
| UI poll | `/dating/analysis` polls profile status (5s → 10s backoff), not a dedicated status endpoint |

### Cache / Redis / photos / APM

| Item | Today |
|------|--------|
| Redis | Used for socket.io adapter + WS rate limit (`REDIS_URL`); **no** match-list cache module |
| Bull | **Absent** |
| Photo storage | `local` implemented; `S3PhotoStorage` **stub throws** |
| Match photos UI | `<img>` via `MatchPhoto` (Sprint 9 intentionally avoided `next/image` for cookie auth) |
| APM | Structured logs only — no New Relic / Datadog agent |

---

## Artifacts (Agent 1 implements)

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | Add indexes only (see migration) — **no** new models |
| `dating-api/prisma/migrations/20260712000000_add_performance_indexes/` | New migration |
| `dating-api/src/cache/redis-cache.module.ts` | **New** — shared Redis client for app cache (not socket pub/sub) |
| `dating-api/src/cache/redis-cache.service.ts` | **New** — get/set/del + hit/miss logging |
| `dating-api/src/cache/match-list-cache.ts` | **New** — key helpers + ranked payload type |
| `dating-api/src/me-profile/me-matches.service.ts` | Cache-aside ranked list; paginate; invalidate hooks |
| `dating-api/src/me-profile/me-profile.controller.ts` | Submit → **202**; add `GET profile/analysis-status`; matches query `cursor`/`limit` |
| `dating-api/src/me-profile/me-profile.service.ts` | Enqueue Bull job instead of `void runForUser` |
| `dating-api/src/me-profile/dto/me-matches-list-query.dto.ts` | **New** — `cursor?`, `limit?` |
| `dating-api/src/me-profile/dto/analysis-status-response.dto.ts` | **New** |
| `dating-api/src/workers/profile-analysis.queue.ts` | **New** — Bull queue name `profile-analysis` |
| `dating-api/src/workers/profile-analysis.worker.ts` | **New** — calls existing `MeProfileAnalysisService.runForUser` |
| `dating-api/src/workers/worker.module.ts` | **New** |
| `dating-api/src/observability/apm.ts` | **New** — Datadog `dd-trace` init + custom metrics helpers |
| `dating-api/src/photo-storage/s3-photo-storage.service.ts` | Implement real S3 (prerequisite for CDN origin) |
| `dating-api/src/photo-storage/cdn-url.ts` | **New** — signed CloudFront URL builder (feature-flagged) |
| `dating-api/.env.example` | `REDIS_URL`, Bull, CDN, Datadog keys |
| `dating-ui/src/app/dating/me-matches/use-infinite-matches.ts` | **New** — cursor infinite scroll |
| `dating-ui/src/app/dating/me-matches/page.tsx` | Infinite scroll |
| `dating-ui/src/components/match-photo.tsx` | Skeleton + `next/image` **only when** URL is CDN/signed (see Decision 5) |
| `dating-ui/src/app/dating/analysis/*` | Prefer status endpoint; keep profile-status fallback |
| `dating-api/docs/sprints/sprint-19-…/load-test-matches.js` | k6 script (below) |

**Do not change (this story):**

| Path | Reason |
|------|--------|
| Holy-grail eligibility / ranking math | Out of scope — only **when**/how list is served |
| Photo moderation ML (Rekognition) | Story 2 |
| Public unauthenticated photo URLs | Privacy / Sprint 9 decision |

---

## Decisions (do not reverse without discussion)

### 1. Remap story schema names → real models (locked)

| Story wording | Actual |
|---------------|--------|
| `Match.analyzedAt` cursor / indexes | **No Match row for browse list.** Candidates are `UserProfile` rows scored in `MeMatchesService` |
| `ProfileAnalysis.status` | Use existing `UserProfile.status` (`SUBMITTED` \| `ANALYZING` \| `ANALYZED` \| `FAILED`) |
| `match:scores:{userId}` | Redis key `match:list:{userId}` → full **ranked** payload (items + list meta) |
| `profile:analysis:{profileId}` | Optional cache of latest evaluation **read model** for status/summary; invalidate when `UserProfile.updatedAt` advances or new `UserProfileEvaluation` inserted |
| Migration `Match_*_idx` | Replace with `UserProfile` indexes below |

### 2. Pagination: ranked-list cursor, not `analyzedAt` (locked)

Story AC text (`ORDER BY analyzedAt DESC`) **conflicts** with product sort (`matchScore` DESC + hard-block bucket). Product sort wins.

**Algorithm:**

1. Cache-aside: build full ranked `MeMatchItemDto[]` (same logic as today) → store in Redis `match:list:{userId}` TTL **3600s**.
2. Serve page from cached array (or build+write on miss).
3. Query: `GET /api/v1/me/matches?cursor={opaque}&limit=20` (default 20, max 50).
4. No cursor → first page (backwards compatible when `limit` omitted: **still paginate** with default 20 — document breaking change for clients that assumed full list; UI is the only product client).

**Cursor format (opaque, base64url JSON):**

```typescript
type MatchListCursor = {
  /** 0 = eligible bucket, 1 = hard-blocked bucket */
  b: 0 | 1;
  /** Last item matchScore (null → -1) */
  s: number;
  /** Last item UserProfile.id */
  id: string;
};
```

Page slice: continue after cursor within same sort comparator used today. Response:

```typescript
{
  status: 'ready' | 'not_ready';
  // ...existing not_ready / ready meta fields unchanged...
  matches?: MeMatchItemDto[]; // ≤ limit
  nextCursor: string | null;
  hasMore: boolean;
}
```

**Compute note:** v1 still scores all candidates on cache miss (fixes payload + repeat-load latency; full scoring cost moves behind cache). True DB-side score pagination is deferred (needs precomputed scores table — out of scope).

### 3. Redis cache schema + invalidation (locked)

```text
match:list:{userId}
  → JSON {
      version: 1,
      builtAt: ISO,
      statusMeta: { viewerProfileId, viewerGender, ...ready fields },
      matches: MeMatchItemDto[]
    }
  TTL: 3600 seconds

profile:eval:{profileId}
  → JSON { evaluationId, createdAt, summary? }  // optional; TTL 3600 or until invalidate
```

**Invalidate `match:list:{userId}` when:**

- Viewer LIKE / PASS / BLOCK / undo toward anyone
- Viewer profile re-submitted / analysis completes or fails
- Viewer photo set changes approved primary (gate)
- Optional: candidate analysis updates are **not** fan-out invalidated in v1 (TTL handles staleness); document as known tradeoff

**Fail-open:** Redis errors → log `match_list_cache_degraded` + compute from DB (same as Sprint 7 WS rate-limit pattern). Dedicated cache client — **do not** reuse socket.io pub/sub clients.

**Hit/miss logging:** structured field `cache.event=hit|miss|set|del` + key prefix + latency ms.

### 4. Async analysis → Bull (locked)

Keep status machine on `UserProfile`. Replace fire-and-forget with Bull.

| Concern | Choice |
|---------|--------|
| Queue name | `profile-analysis` |
| Redis | Same `REDIS_URL` (Bull prefix `bull:`) |
| Job data | `{ userId: string, profileId: string }` |
| Retries | 3 attempts; backoff 60s / 300s / 900s |
| Worker body | Existing `MeProfileAnalysisService.runForUser(userId)` |
| Submit HTTP | **202 Accepted** + body below |
| Local/dev without Redis | If `REDIS_URL` unset: keep current in-process `void runForUser` + still return 202 (document degraded mode) |

**Submit response (202):**

```typescript
{
  analysisJobId: string; // Bull job id, or `inline:{profileId}` in degraded mode
  profile: MeProfileResponseDto; // status SUBMITTED
}
```

**Status endpoint:**

```http
GET /api/v1/me/profile/analysis-status
Auth: session
```

```typescript
{
  status: 'pending' | 'processing' | 'complete' | 'failed',
  submittedAt: string | null,
  completedAt?: string | null, // analyzedAt when ANALYZED
  error?: string | null,       // lastAnalysisError when FAILED
  profileStatus: UserProfileStatus // raw enum for UI debugging
}
```

Map:

| `UserProfile.status` | API `status` |
|----------------------|--------------|
| `SUBMITTED` | `pending` |
| `ANALYZING` | `processing` |
| `ANALYZED` | `complete` |
| `FAILED` | `failed` |
| `DRAFT` | treat as no active job → `complete` only if prior analysis exists, else 404/empty — mirror current analysis page rules |

UI: analysis page may switch poll target to status endpoint every **3s** while in flight (story AC); keep existing backoff helpers if preferred but document chosen interval in Agent 1 handoff.

### 5. Image delivery / CDN (locked)

| Approach | Verdict |
|----------|---------|
| Public CloudFront URLs for all photos | **Rejected** (auth + privacy; Sprint 9) |
| Signed CloudFront URLs (TTL ≤ 1h) on list/detail DTOs | **Accepted** when `PHOTO_CDN_ENABLED=1` and S3 origin live |
| Keep relative `/api/v1/me/.../file` when CDN off | **Default for local/dev** |

**Agent 1 order:**

1. Implement real `S3PhotoStorage` (env: bucket, region, credentials).
2. Add optional `primaryPhotoUrl` rewrite via signed CDN when enabled; file proxy remains for non-CDN and for download auth fallback.
3. UI: use `next/image` **only** for absolute `https://` CDN URLs; keep `<img>` for same-origin relative paths (cookie). Skeleton: `animate-pulse` placeholder in `MatchPhoto` while loading.

**CDN setup guide (ops):**

1. S3 bucket = photo origin (private).
2. CloudFront distribution; origin = S3; **restrict bucket to OAI/OAC**.
3. Trusted key group for signed URLs; API holds private key (`PHOTO_CDN_KEY_PAIR_ID`, `PHOTO_CDN_PRIVATE_KEY`).
4. Cache policy: honor query string / signed params; default TTL aligned with signature TTL.
5. Smoke: list DTO URLs host = CloudFront domain; DevTools shows lazy load on scroll.

### 6. Database indexes (locked)

Prisma additions (names illustrative):

```prisma
// UserProfile
@@index([status, analyzedAt(sort: Desc)])
@@index([status, userId]) // support “all ANALYZED except self” plans

// already exists — keep:
// UserProfilePhoto @@index([status, createdAt])
// UserProfileEvaluation @@index([profileId, createdAt(sort: Desc)])
```

SQL migration notes:

- Prefer `CREATE INDEX CONCURRENTLY` in raw SQL for prod; Prisma migrate may need non-concurrent in transaction — follow existing repo migration style on `sprint17`.
- **No** `Match_*` indexes; **no** `ProfileAnalysis.status` column.
- Verify with `EXPLAIN ANALYZE` on `UserProfile` where `status = 'ANALYZED' AND userId <> $1` (+ photo exists subquery).

Rollback: drop new indexes only.

### 7. APM (locked)

| Choice | Datadog (`dd-trace` + `DD_API_KEY` / `DD_AGENT_HOST`) |
|--------|------------------------------------------------------|
| Why | Aligns with AWS services already in sprint (CloudFront / later Rekognition); redis + HTTP auto-instrumentation |
| Custom metrics | `match.list.load_time` (ms), `profile.analysis.duration` (ms), `cache.hit_rate` (ratio or hit/miss counters) |
| Dashboard | p50/p95/p99 for `GET /api/v1/me/matches` |
| Alert | match list p95 > 3s for 5 min → ops channel (configure in Datadog UI; document in runbook) |
| Sampling | Start 100% staging / 10% prod if overhead shows |

Init in `main.ts` **before** Nest bootstrap (`dd-trace/init`).

### 8. Module placement (locked)

```text
CacheModule (global) → RedisCacheService
MeProfileModule imports CacheModule, BullModule.registerQueue('profile-analysis')
WorkerModule (same app process v1) → ProfileAnalysisProcessor
Observability: dd-trace side-effect import; helpers in observability/custom-metrics.ts
```

Service signatures:

```typescript
// MeMatchesService
list(userId: string, query?: { cursor?: string; limit?: number }): Promise<MeMatchesListResponseDto>

// MeProfileService
submitForUser(userId: string): Promise<{ analysisJobId: string; profile: MeProfileResponseDto }>
getAnalysisStatusForUser(userId: string): Promise<AnalysisStatusResponseDto>

// RedisCacheService
get<T>(key: string): Promise<T | null>
set(key: string, value: unknown, ttlSeconds: number): Promise<void>
del(key: string): Promise<void>

// ProfileAnalysisProcessor
process(job: Job<{ userId: string; profileId: string }>): Promise<void>
```

---

## API contracts (copy-paste ready)

### Match list (extends existing)

```http
GET /api/v1/me/matches?cursor={opaque}&limit=20
Auth: SessionGuard
```

| Param | Rules |
|-------|--------|
| `limit` | optional, default **20**, max **50**, min **1** |
| `cursor` | optional opaque string from prior `nextCursor` |

**200** — same `status: ready | not_ready` envelope; when `ready`, include `nextCursor`, `hasMore`.

### Submit (behavior change)

```http
POST /api/v1/me/profile/submit
Auth: SessionGuard
→ 202 Accepted
{
  "analysisJobId": "…",
  "profile": { /* MeProfileResponseDto, status SUBMITTED */ }
}
```

Existing 4xx rules unchanged (not found, invalid status, missing gender, etc.).

### Analysis status (new)

```http
GET /api/v1/me/profile/analysis-status
Auth: SessionGuard
→ 200 AnalysisStatusResponseDto
→ 404 if no profile
```

---

## Migration plan

**Forward**

1. Add `UserProfile` indexes (see Decision 6).
2. Deploy API with cache/pagination behind Redis; CDN flag off.
3. Enable Bull when Redis present.
4. Enable `PHOTO_CDN_ENABLED` after S3 + CloudFront verified in staging.

**Backfill:** none (indexes only; statuses already correct).

**Rollback**

1. Feature-flag off CDN → relative URLs.
2. If Bull broken: set env to inline degraded mode.
3. Drop indexes via reverse migration if needed.
4. Clients ignore unknown `nextCursor` fields — safe.

---

## Runtime topology (photos / proxy)

| Concern | Rule |
|---------|------|
| REST browser target | Same-origin via Next rewrite (`/api/*` → API) unless `NEXT_PUBLIC_API_URL` set |
| Photo URL when CDN off | Relative `/api/v1/me/.../file` — cookie auth on API host |
| Photo URL when CDN on | Absolute signed CloudFront HTTPS — **no** session cookie required for GET; signature is auth |
| Cookie host | Keep `localhost` vs `127.0.0.1` alignment (existing auth rule) |
| Expected Network | Match list: one REST call per page; images lazy; no WS involvement |

---

## E2E verification plan (Agent 4)

| Item | Plan |
|------|------|
| Baseline specs | Keep green **unmodified** where possible: `me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts`, hard-block / dealbreaker specs |
| Ranking | Pagination must **not** reorder relative to full ranked list — Agent 4 asserts page1+page2 concatenation equals unpaginated order for a fixed fixture |
| Eligibility | Unchanged gating; only delivery shape changes |
| New scenarios | (1) 100 candidates → 5 pages no dupes/gaps (2) cache hit second request (3) submit → 202 → status pending→complete |
| Affects | Ranking **order stability** under pagination + matches endpoint contract → **Agent 4 required** |

---

## Load testing script (k6)

Save as `dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/load-test-matches.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/me/matches?limit=20`, {
    headers: { Cookie: TOKEN },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'has body': (r) => r.body && r.body.length > 2,
  });
  sleep(1);
}
```

Run (staging only): `k6 run -e SESSION_COOKIE='…' -e BASE_URL='…' load-test-matches.js`

Capture baseline **before** enabling cache in staging; re-run after.

---

## APM instrumentation plan

| Signal | Where |
|--------|-------|
| HTTP | Auto via `dd-trace` |
| Prisma | Auto / `pg` plugin |
| Redis cache ops | Wrap `RedisCacheService` with timing + hit/miss counters |
| Bull jobs | `profile.analysis.duration` around `runForUser` |
| Match list | Timer around `MeMatchesService.list` → `match.list.load_time` |

---

## Tests / verification (architect — not run)

- [ ] Unit/integration: not run (design only)
- [ ] `prisma migrate deploy`: N/A this step
- [ ] Browser Network smoke: N/A this step
- [ ] Socket transport: N/A

---

## Open questions / blockers

1. **Branch:** Agent 1 blocked until worktree is based on `sprint17` (not `main`).
2. **Full-list client break:** Defaulting to `limit=20` changes `GET /me/matches` payload size — intentional; confirm no other first-party clients need `limit=100` escape hatch (optional `limit=50` max is enough).
3. **CDN key management:** Ops must provision CloudFront key pair before enabling `PHOTO_CDN_ENABLED` in staging.
4. **Precomputed scores table:** Deferred — call out if cache-miss scoring still exceeds p95 under load after indexes + pagination UI.

---

## Next agent

```text
--agent 1 sprint 19 story 1
```

**Notes for next agent:**

- Read this handoff end-to-end; treat Decisions as locked.
- Switch to product branch (`sprint17` → `sprint-19`) before coding.
- Restore `.cursor/skills` from `sprint17` if absent on disk.
- Implement Redis cache + pagination first (biggest user-visible win), then Bull 202/status, then S3/CDN flag, then Datadog.
- Do not invent `Match` / `ProfileAnalysis` tables.
- Agent 4 will own deep matches E2E after Agent 2.
