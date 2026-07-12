# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_admin_feedback_aggregates_api.md](../../STORY_02_admin_feedback_aggregates_api.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Admin read APIs** for match feedback aggregates — `GET summary` + `GET negative-candidates`; reuse `AuthGuard` + `AdminGuard` + existing `AdminModule`.
- **Metrics align with** [MATCH_QUALITY_RUNBOOK.md](../../../analytics/MATCH_QUALITY_RUNBOOK.md) — Postgres-backed fields only; **no `adoptionRate`** in v1 (logs-only per Story 1).
- **No schema change required** for v1 — query existing `MatchFeedback` + indexes; optional `@@index([sentiment, createdAt])` migration if ops sees slow scans (defer unless needed).
- **Negative-candidates list** — aggregated `GROUP BY matchProfileId` where `sentiment = NEGATIVE`; **offset pagination** (not id cursor — grouped rows have no stable report id).
- **Story 3** consumes these endpoints from `/admin/match-quality` (UI story).

---

## Artifacts

| Path | Change |
|------|--------|
| **API — admin match quality (new)** | |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.controller.ts` | **created** — GET summary, GET negative-candidates |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.ts` | **created** |
| `dating-api/src/admin/admin-match-quality/dto/match-quality-window-query.dto.ts` | shared `windowDays` validation |
| `dating-api/src/admin/admin-match-quality/dto/match-quality-summary.dto.ts` | response type |
| `dating-api/src/admin/admin-match-quality/dto/list-negative-candidates-query.dto.ts` | `windowDays`, `limit`, `offset` |
| `dating-api/src/admin/admin-match-quality/dto/list-negative-candidates.dto.ts` | list response + row type |
| `dating-api/src/admin/admin-match-quality/admin-match-quality-http.integration.spec.ts` | integration tests |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.spec.ts` | unit tests (window math, positiveRate null) |
| `dating-api/src/admin/admin.module.ts` | register controller + service |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_MATCH_QUALITY_SUMMARY_FETCHED` |
| **Docs** | |
| `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` | add API endpoints § (agent 1) |
| `dating-api/docs/ops/ADMIN_ACCESS.md` | note new admin routes behind same policy |
| **UI** | none (Story 3) |
| **Prisma** | no migration (v1) |

---

## Decisions (do not reverse without discussion)

### 1. Module placement — extend `AdminModule` (subfolder `admin-match-quality/`)

Same pattern as `admin-photos/` and `admin-reports/`. Single `@Controller('api/v1/admin')` per controller file.

### 2. Auth

```typescript
@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminMatchQualityController { ... }
```

Non-admin → **403** `{ error: 'admin_forbidden' }` (existing guard).

### 3. Window semantics

| Param | Default | Validation |
|-------|---------|------------|
| `windowDays` | `7` | `@IsInt() @Min(1) @Max(90)` |

```typescript
function windowStart(windowDays: number): Date {
  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
}
```

All aggregates: `createdAt >= windowStart` (inclusive). Use UTC `Date` — consistent with Prisma `DateTime`.

### 4. `GET /api/v1/admin/match-quality/summary`

**Query:** `MatchQualityWindowQueryDto` — optional `windowDays`.

**Response `MatchQualitySummaryDto`:**

```typescript
export type MatchQualitySummaryDto = {
  windowDays: number;
  windowStart: string; // ISO — reproducibility for ops
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null; // null when feedbackCount === 0
  distinctReporters: number;
  distinctCandidates: number; // distinct matchProfileId with any sentiment in window
};
```

**Locked queries (Prisma):**

```typescript
const where = { createdAt: { gte: windowStart } };

const [feedbackCount, grouped, distinctReporters, distinctCandidates] =
  await Promise.all([
    prisma.matchFeedback.count({ where }),
    prisma.matchFeedback.groupBy({
      by: ['sentiment'],
      where,
      _count: { _all: true },
    }),
    prisma.matchFeedback.findMany({
      where,
      distinct: ['userId'],
      select: { userId: true },
    }).then((r) => r.length),
    prisma.matchFeedback.findMany({
      where,
      distinct: ['matchProfileId'],
      select: { matchProfileId: true },
    }).then((r) => r.length),
  ]);
```

**Alternative for distinct counts:** `_count` with raw query if Prisma distinct perf poor — acceptable either way for v1 cohort size.

**positiveRate:**

```typescript
positiveRate =
  feedbackCount === 0
    ? null
    : positiveCount / feedbackCount;
```

Return JSON number (0–1), not percent — Story 3 UI multiplies ×100 for display.

**Observability (summary only):**

```typescript
this.obs.info({
  message: 'admin match quality summary fetched',
  errorCode: ErrorCodes.ADMIN_MATCH_QUALITY_SUMMARY_FETCHED,
  meta: { adminUserId, windowDays, feedbackCount },
});
```

No product analytics event (admin ops, not funnel).

### 5. `GET /api/v1/admin/match-quality/negative-candidates`

**Query `ListNegativeCandidatesQueryDto`:**

| Field | Default | Validation |
|-------|---------|------------|
| `windowDays` | `7` | 1–90 |
| `limit` | `20` | 1–100 |
| `offset` | `0` | 0–500 |

**Response:**

```typescript
export type NegativeCandidateRowDto = {
  matchProfileId: string;
  negativeCount: number;
  distinctViewers: number;
  lastNegativeAt: string; // ISO
};

export type ListNegativeCandidatesResponseDto = {
  windowDays: number;
  items: NegativeCandidateRowDto[];
  total: number; // total grouped rows (for pagination UI)
  limit: number;
  offset: number;
};
```

**Locked aggregation** — prefer `$queryRaw` or `groupBy` + filter:

```typescript
// groupBy approach
const groups = await prisma.matchFeedback.groupBy({
  by: ['matchProfileId'],
  where: {
    sentiment: MatchFeedbackSentiment.NEGATIVE,
    createdAt: { gte: windowStart },
  },
  _count: { _all: true },
  _max: { createdAt: true },
  orderBy: { _count: { matchProfileId: 'desc' } }, // verify Prisma orderBy on _count — may need raw SQL
});
```

**If Prisma `orderBy` on `_count` is awkward:** use raw SQL matching runbook:

```sql
SELECT
  "matchProfileId",
  COUNT(*)::int AS "negativeCount",
  COUNT(DISTINCT "userId")::int AS "distinctViewers",
  MAX("createdAt") AS "lastNegativeAt"
FROM "MatchFeedback"
WHERE sentiment = 'NEGATIVE' AND "createdAt" >= $1
GROUP BY "matchProfileId"
ORDER BY "negativeCount" DESC, "matchProfileId" ASC
LIMIT $2 OFFSET $3;
```

Separate count query for `total` (subquery or `COUNT(*) FROM (GROUP BY ...)`).

**distinctViewers** in groupBy: Prisma `groupBy` cannot `COUNT(DISTINCT userId)` per group in one call — **use raw SQL** for this endpoint (architect lock for correct semantics).

**PII:** response ids only — no join to `User` / `UserProfile` text fields.

### 6. Pagination — offset (not report-style cursor)

Grouped aggregates have no natural `id` cursor. **Offset pagination** is acceptable for ops scale (tens–hundreds of negative candidates).

Story 3 table uses `limit=20&offset=0`; “Load more” increments offset.

### 7. No adoption % in API v1

Runbook adoption remains CloudWatch / log grep. Do not add `adoptionRate` to summary DTO.

### 8. Empty window

All counts `0`, `positiveRate: null`, `items: []`, `total: 0` — **200** (not 404).

### 9. Optional index (defer)

If integration tests + local smoke are fast, skip migration. If slow:

```prisma
@@index([createdAt])
@@index([sentiment, createdAt])
```

---

## API contract (copy-paste)

### `GET /api/v1/admin/match-quality/summary?windowDays=7`

| | |
|--|--|
| Auth | Session + `ADMIN_USER_IDS` |
| 200 | `MatchQualitySummaryDto` |
| 403 | `admin_forbidden` |

### `GET /api/v1/admin/match-quality/negative-candidates?windowDays=7&limit=20&offset=0`

| | |
|--|--|
| Auth | Session + `ADMIN_USER_IDS` |
| 200 | `ListNegativeCandidatesResponseDto` |
| 403 | `admin_forbidden` |

---

## Service signatures

```typescript
@Injectable()
export class AdminMatchQualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  getSummary(adminUserId: string, windowDays: number): Promise<MatchQualitySummaryDto>;

  listNegativeCandidates(
    windowDays: number,
    limit: number,
    offset: number,
  ): Promise<ListNegativeCandidatesResponseDto>;
}
```

Controller passes `adminUserId` from `@CurrentUser()` to `getSummary` for observability only.

---

## Prisma / migrations

**No migration required for story gate.**

Existing model:

```prisma
model MatchFeedback {
  id             String                 @id @default(cuid())
  userId         String
  matchProfileId String
  sentiment      MatchFeedbackSentiment // POSITIVE | NEGATIVE
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
  @@unique([userId, matchProfileId])
  @@index([userId, createdAt])
  @@index([matchProfileId])
}
```

---

## Tests (agent 1 + 2)

**Integration** (`admin-match-quality-http.integration.spec.ts`):

- [ ] Non-admin → 403 on both routes
- [ ] Admin + empty DB → summary zeros, `positiveRate: null`
- [ ] Seed: 5 POSITIVE + 3 NEGATIVE on profile `p1`, 3 NEGATIVE on `p2` → `positiveRate ≈ 0.625`, `p2` first in negative list
- [ ] `windowDays=90` accepted; `windowDays=0` → 400

**Unit:**

- [ ] `positiveRate` null when count 0
- [ ] `windowStart` helper

Mirror setup from `admin-reports-http.integration.spec.ts` (`ADMIN_USER_IDS`, session cookie helper).

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | Browser → `NEXT_PUBLIC_API_URL` + `/api/v1/admin/match-quality/*` with credentials |
| Auth | Same session cookie + allowlist as `/admin/reports` |
| UI | Story 3 — not this story |
| Prod | API routes follow [ADMIN_ACCESS.md](../../../ops/ADMIN_ACCESS.md) — WAF on public API host |

**Dev smoke:** admin session + `GET summary` → 200 after seeding `MatchFeedback` rows.

---

## Manual smoke (story §)

1. Seed feedback rows (integration fixture or staging).
2. `GET /api/v1/admin/match-quality/summary?windowDays=7`
3. `GET /api/v1/admin/match-quality/negative-candidates?windowDays=7`

---

## Open questions / blockers

- None.

**Story 3 dependency:** Story 2 must merge before UI; UI only needs these two GETs.

---

## Next agent

```text
--agent 1 sprint 11 story 2
```

**Notes for dev:**

- Use **raw SQL** for negative-candidates aggregation if Prisma `groupBy` cannot express `COUNT(DISTINCT userId)` per `matchProfileId`.
- Register routes on existing admin prefix; do not create top-level `MatchQualityModule` outside `AdminModule`.
- Update runbook with live endpoint paths after implementation.
- `npx prisma migrate deploy` — N/A unless optional index added.
