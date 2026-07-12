# Handoff: Agent 0 — Architect — Story 6

**Agent:** 0 architect  
**Story:** [STORY_06_engine_change_validation.md](../../STORY_06_engine_change_validation.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Compare API** — `GET /api/v1/admin/match-quality/compare` with two disjoint time windows → before/after summary blocks + deltas.
- **Refactor Story 2 aggregates** — extract `aggregatePeriodSummary(start, end)`; `getSummary(windowDays)` becomes a thin wrapper (no duplicate Prisma).
- **CLI** — `scripts/match-quality-compare.ts` + `npm run match-quality:compare` calling same service logic as API.
- **Docs** — runbook post-deploy §, `ENGINE_CHANGE_APPROVAL.md` §6 compare curl + field mapping.
- **No auto-rollback**, no ranking changes, no UI v1.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — extend admin match quality** | |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.controller.ts` | **update** — GET `match-quality/compare` |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.ts` | **update** — `aggregatePeriodSummary`, `compareMatchQuality`; refactor `getSummary` |
| `dating-api/src/admin/admin-match-quality/match-quality-window.ts` | **update** — `resolveCompareWindows`, `computeCompareDeltas` (pure) |
| `dating-api/src/admin/admin-match-quality/dto/match-quality-compare-query.dto.ts` | **created** — ISO or shorthand query |
| `dating-api/src/admin/admin-match-quality/dto/match-quality-compare.dto.ts` | **created** — response type |
| `dating-api/src/admin/admin-match-quality/validators/compare-windows.constraint.ts` | **created** — disjoint / mode mutual exclusion |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.spec.ts` | delta math + window resolution |
| `dating-api/src/admin/admin-match-quality/admin-match-quality-http.integration.spec.ts` | compare 403/200/400 |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_MATCH_QUALITY_COMPARE_FETCHED` |
| **CLI** | |
| `dating-api/scripts/match-quality-compare.ts` | **created** — Nest context + service |
| `dating-api/package.json` | `"match-quality:compare": "ts-node ..."` |
| **Docs** | |
| `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` | post-deploy validation § |
| `dating-api/docs/engine/ENGINE_CHANGE_APPROVAL.md` | §6 compare API instructions |
| `dating-api/docs/engine/examples/2026-06-10-no-op-week.md` | optional §6 dry-run line (agent 1) |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/README.md` | sprint outcome / Story 6 row (agent 1) |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/STORY_06_*.md` | status |
| **UI** | none |
| **Prisma** | N/A |

---

## Decisions (do not reverse without discussion)

### 1. Window semantics (locked)

**Interval notation:** `[start, end)` — inclusive `start`, **exclusive** `end` (`createdAt >= start AND createdAt < end`).

| Mode | Params | Resolution |
|------|--------|------------|
| **Shorthand** (default ops path) | `beforeDays`, `afterDays` | `after`: `[now - afterDays, now)` · `before`: `[now - afterDays - beforeDays, now - afterDays)` |
| **ISO** (deploy-aligned) | `beforeStart`, `beforeEnd`, `afterStart`, `afterEnd` | Parse ISO → four `Date` bounds as `[beforeStart, beforeEnd)` and `[afterStart, afterEnd)` |

**Mutual exclusion:** either shorthand pair **or** ISO quartet — never mix. Missing mode → **400** `compare_window_required`.

**Validation:**

| Rule | Error |
|------|-------|
| Each param `beforeDays`/`afterDays` | `@IsInt() @Min(1) @Max(90)` |
| ISO strings | `@IsISO8601()` |
| `beforeEnd <= afterStart` (disjoint or touching) | **400** `compare_windows_overlap` |
| Each window span ≤ 90 days | **400** `compare_window_too_long` |
| `start < end` per window | **400** `compare_window_invalid` |

Shorthand example `beforeDays=7&afterDays=7`:

```
before: [now-14d, now-7d)
after:  [now-7d,  now)
```

Deploy should align near `now-7d` boundary when using shorthand post-deploy.

### 2. `GET /api/v1/admin/match-quality/compare`

**Auth:** `AuthGuard` + `AdminGuard` (same as Story 2–5).

**Response `MatchQualityCompareDto`:**

```typescript
export type MatchQualityPeriodSummaryDto = {
  rangeStart: string; // ISO
  rangeEnd: string;   // ISO — exclusive upper bound
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};

export type MatchQualityCompareDto = {
  comparedAt: string; // ISO
  before: MatchQualityPeriodSummaryDto;
  after: MatchQualityPeriodSummaryDto;
  deltas: {
    positiveRateDelta: number | null; // after - before; null if either rate null
    feedbackCountDelta: number;       // after - before
  };
  notes: {
    adoptionComparison: 'logs_only';
    rollbackHint: 'positive_rate_drop_gt_0.10_with_stable_adoption';
  };
};
```

**Delta math (pure — unit tested):**

```typescript
export function computeCompareDeltas(
  before: Pick<MatchQualityPeriodSummaryDto, 'positiveRate' | 'feedbackCount'>,
  after: Pick<MatchQualityPeriodSummaryDto, 'positiveRate' | 'feedbackCount'>,
): { positiveRateDelta: number | null; feedbackCountDelta: number } {
  return {
    positiveRateDelta:
      before.positiveRate === null || after.positiveRate === null
        ? null
        : after.positiveRate - before.positiveRate,
    feedbackCountDelta: after.feedbackCount - before.feedbackCount,
  };
}
```

**PII:** same as summary — aggregates only.

**Observability:**

```typescript
this.obs.trace(
  `event=admin_match_quality_compare_fetched adminUserId=${adminUserId} beforeStart=${...} afterEnd=${...} feedbackCountDelta=${deltas.feedbackCountDelta}`,
  ErrorCodes.ADMIN_MATCH_QUALITY_COMPARE_FETCHED,
);
```

**Do not** emit `ADMIN_MATCH_QUALITY_SUMMARY_FETCHED` twice on compare path — only compare event (+ refactor `getSummary` to call shared aggregate without double trace on compare).

### 3. Service refactor (required)

Extract shared Prisma aggregate:

```typescript
private async aggregatePeriodSummary(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Omit<MatchQualityPeriodSummaryDto, 'rangeStart' | 'rangeEnd'>> {
  const where = { createdAt: { gte: rangeStart, lt: rangeEnd } };
  // same count / groupBy / distinct queries as getSummary today
}

async getSummary(adminUserId: string, windowDays: number): Promise<MatchQualitySummaryDto> {
  const rangeStart = computeWindowStart(windowDays);
  const rangeEnd = new Date();
  const metrics = await this.aggregatePeriodSummary(rangeStart, rangeEnd);
  this.obs.trace(...SUMMARY_FETCHED...);
  return { windowDays, windowStart: rangeStart.toISOString(), ...metrics };
}

async compareMatchQuality(
  adminUserId: string,
  windows: { before: { start: Date; end: Date }; after: { start: Date; end: Date } },
): Promise<MatchQualityCompareDto> { ... }
```

`getSummary` behavior unchanged for callers except `windowStart` semantics now explicitly paired with implicit `now` as `rangeEnd` (equivalent to v1 for live rolling window).

### 4. Query DTO + validator

`MatchQualityCompareQueryDto` — all fields optional at class level; `@Validate(CompareWindowsConstraint)` on class:

- If any of `beforeStart|beforeEnd|afterStart|afterEnd` present → all four required; `beforeDays`/`afterDays` must be absent.
- If `beforeDays` or `afterDays` present → both required; ISO fields absent.
- Else → validation fail.

Controller resolves DTO → `{ before, after }` Date pairs via `resolveCompareWindows(query)` in `match-quality-window.ts`.

### 5. CLI `scripts/match-quality-compare.ts`

Pattern: same as `scripts/match-quality-audit.ts` — `NestFactory.createApplicationContext(AppModule)`.

**Args:**

```
--before-days <n> --after-days <n>
# OR
--before-start <iso> --before-end <iso> --after-start <iso> --after-end <iso>
```

**Output:** pretty-printed JSON to stdout (same shape as API).

**package.json:**

```json
"match-quality:compare": "ts-node --project tsconfig.json scripts/match-quality-compare.ts"
```

CLI uses `AdminMatchQualityService.compareMatchQuality('cli', windows)` — adminUserId for logs only.

### 6. Runbook post-deploy (agent 1)

New § **Post-deploy validation (Story 6)** after Engine approval:

1. **Wait** — ≥ **7 days** after deploy **or** ≥ **30** feedback rows in the after window (whichever later; document N=30 as ops default).
2. **Compare** — shorthand `GET .../compare?beforeDays=7&afterDays=7` or ISO windows bracketing deploy timestamp.
3. **Adoption** — check logs manually; rollback rule needs stable adoption (same runbook ≥15% proxy).
4. **Rollback trigger** — `positiveRateDelta < -0.10` (10 percentage points on 0–1 scale) with adoption stable → revert + fill approval §6 **Revert**.
5. **Record** — paste compare JSON into `ENGINE_CHANGE_APPROVAL.md` §6 or `docs/engine/approvals/`.

Update escalation row: “run Story 6 validation” → link compare endpoint.

### 7. `ENGINE_CHANGE_APPROVAL.md` §6 (agent 1)

Add under §6:

- Compare curl (shorthand + ISO example).
- Map `before`/`after`/`deltas` to table columns.
- Note adoption still manual from logs.

### 8. No UI, no auto-rollback

- Dashboard compare card deferred (curl/CLI sufficient for v1).
- No webhook/CI on `positiveRateDelta`.
- No feedback-weighted ranking (Sprint 12+).

### 9. Route ordering

Register `GET match-quality/compare` next to `export` (static paths before `candidates/:profileId`).

---

## API contract (copy-paste)

### `GET /api/v1/admin/match-quality/compare?beforeDays=7&afterDays=7`

| | |
|--|--|
| Auth | Session + `ADMIN_USER_IDS` |
| 200 | `MatchQualityCompareDto` |
| 400 | `compare_window_required` \| `compare_windows_overlap` \| `compare_window_invalid` \| `compare_window_too_long` |
| 403 | `admin_forbidden` |

### `GET /api/v1/admin/match-quality/compare?beforeStart=2026-05-20T00:00:00.000Z&beforeEnd=2026-05-27T00:00:00.000Z&afterStart=2026-05-27T00:00:00.000Z&afterEnd=2026-06-03T00:00:00.000Z`

| | |
|--|--|
| 200 | Same response shape |
| 400 | Same validation errors |

---

## Tests (agent 1 + 2)

**Unit (`match-quality-window` / service):**

- [ ] `resolveCompareWindows` shorthand `7+7` → disjoint bounds
- [ ] `computeCompareDeltas` — `0.6` vs `0.5` → `+0.1`; null when either rate null
- [ ] `computeCompareDeltas` feedback count `12` vs `8` → `+4`
- [ ] Overlapping ISO windows → validator throws / 400

**Integration:**

- [ ] non-admin → 403
- [ ] shorthand 200 — `before`/`after`/`deltas` present
- [ ] ISO disjoint windows — delta matches seeded feedback
- [ ] overlapping ISO → 400
- [ ] `getSummary` still passes existing tests after refactor

---

## Runtime topology

| Step | Tool |
|------|------|
| Pre-deploy | Story 5 export + approval §1–5 |
| Deploy | Engine change (Sprint 12+ actual work) |
| Post-deploy wait | 7d or 30 feedback rows |
| Verify | `compare` API or `npm run match-quality:compare` |
| Record | Approval §6 Keep / Revert / Iterate |

---

## Manual smoke (story §)

1. Seed `MatchFeedback` in two disjoint ranges (e.g. 80% positive before, 50% after).
2. `GET compare` (ISO matching ranges) → `positiveRateDelta ≈ -0.3`.
3. Fill §6 on dry-run approval doc from response.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 11 story 6
```

**Notes for dev:**

- Refactor `getSummary` — do not fork aggregate SQL.
- Compare path: one `ADMIN_MATCH_QUALITY_COMPARE_FETCHED` trace only.
- Pure delta/window helpers in `match-quality-window.ts` (or sibling `match-quality-compare.ts`) for easy unit tests.
- CLI must use `AdminMatchQualityService`, not raw Prisma in script body.
