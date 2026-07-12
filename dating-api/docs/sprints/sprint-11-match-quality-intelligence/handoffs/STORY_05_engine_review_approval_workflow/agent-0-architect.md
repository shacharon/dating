# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_engine_review_approval_workflow.md](../../STORY_05_engine_review_approval_workflow.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Docs + export API** — harden `ENGINE_CHANGE_APPROVAL.md`, add `GET .../match-quality/export`, example approval in `docs/engine/examples/`, runbook + README policy links.
- **No ranking changes** — policy gate only; no CI blocker, no feature flags (Story 6).
- **Export reuses Story 2** — `getSummary` + `listNegativeCandidates(limit=20)` composed; no new Prisma queries.
- **Adoption %** — not in Postgres export; template + runbook instruct PM to paste from logs.
- **No export UI v1** — curl/download from API; optional dashboard link deferred.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — extend admin match quality** | |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.controller.ts` | **update** — GET `match-quality/export` |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.ts` | **update** — `exportMatchQuality` |
| `dating-api/src/admin/admin-match-quality/dto/match-quality-export-query.dto.ts` | **created** — `windowDays`, `format` |
| `dating-api/src/admin/admin-match-quality/dto/match-quality-export.dto.ts` | **created** — JSON response type |
| `dating-api/src/admin/admin-match-quality/match-quality-export-csv.ts` | **created** — CSV serializer (pure fn) |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.spec.ts` | export composition + CSV |
| `dating-api/src/admin/admin-match-quality/admin-match-quality-http.integration.spec.ts` | export 403/200 json/csv |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_MATCH_QUALITY_EXPORT_FETCHED` |
| **Docs** | |
| `dating-api/docs/engine/ENGINE_CHANGE_APPROVAL.md` | **update** — workflow, export link, copy instructions |
| `dating-api/docs/engine/examples/2026-06-10-no-op-week.md` | **created** — sanitized dry-run example |
| `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` | approval gate + export § |
| `dating-api/docs/sprints/sprint-10-trust-and-ops/STORY_04_match_feedback.md` | deferred row → Story 5 addressed |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/README.md` | engine policy § (agent 1) |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/STORY_05_*.md` | status |
| **UI** | none (API download only) |
| **Prisma** | N/A |

---

## Decisions (do not reverse without discussion)

### 1. Policy gate (locked)

| Rule | Enforcement |
|------|-------------|
| No matcher/scoring deploy without sign-off | **Docs + team process** — not CI in v1 |
| Sign-off artifact | Filled `ENGINE_CHANGE_APPROVAL.md` copy under `docs/engine/approvals/` OR sprint example |
| Post-deploy proof | Story 6 compare API — section 6 in template already reserved |

### 2. `GET /api/v1/admin/match-quality/export`

**Auth:** `AuthGuard` + `AdminGuard`.

**Query `MatchQualityExportQueryDto`:**

| Field | Default | Validation |
|-------|---------|------------|
| `windowDays` | `7` | `@IsInt() @Min(1) @Max(90)` |
| `format` | `json` | `@IsIn(['json', 'csv'])` |

**JSON response `MatchQualityExportDto`:**

```typescript
export type MatchQualityExportDto = {
  exportedAt: string; // ISO
  windowDays: number;
  windowStart: string;
  summary: {
    feedbackCount: number;
    positiveCount: number;
    negativeCount: number;
    positiveRate: number | null;
    distinctReporters: number;
    distinctCandidates: number;
  };
  negativeCandidates: Array<{
    matchProfileId: string;
    negativeCount: number;
    distinctViewers: number;
    lastNegativeAt: string;
  }>;
  notes: {
    adoptionRate: null;
    adoptionSource: 'logs_only'; // PM fills from runbook CloudWatch §
    drillDownHypotheses: 'manual'; // from Story 4 UI per candidate
  };
};
```

**Implementation:** call existing `getSummary(adminUserId, windowDays)` + `listNegativeCandidates(windowDays, 20, 0)`; map to export shape (drop duplicate `windowDays` nesting if desired — keep flat top-level + `summary` block per above).

**CSV (`format=csv`):**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="match-quality-export-{windowDays}d.csv"`
- Format:
  - Lines 1–6: `# key,value` comment rows for summary metrics (`# positiveRate,0.625` or empty when null)
  - Blank line
  - Header: `matchProfileId,negativeCount,distinctViewers,lastNegativeAt`
  - Data rows (top 20 negatives)

**JSON (`format=json`):**

- `Content-Type: application/json`
- Optional same `Content-Disposition` with `.json` for browser download

**PII:** ids + aggregates only — same as Story 2 list. **No** audit JSON, emails, or profile text.

**Observability:**

```typescript
this.obs.trace(
  `event=admin_match_quality_export_fetched adminUserId=${adminUserId} windowDays=${windowDays} format=${format}`,
  ErrorCodes.ADMIN_MATCH_QUALITY_EXPORT_FETCHED,
);
```

### 3. `ENGINE_CHANGE_APPROVAL.md` (harden, do not replace)

Existing template is the base. Agent 1 adds:

1. **When to use** — positive rate &lt; 50% with adoption ≥ 15%, or scheduled engine review per runbook escalation.
2. **Workflow** — ritual steps 1–4 → export → fill §1–2 → drill-down hypotheses (Story 4) → §3–5 sign-off → ticket engine work.
3. **Export command** — curl example with session cookie.
4. **File naming** — `docs/engine/approvals/YYYY-MM-DD-<slug>.md`.
5. **No deploy** rule restated with link to Story 6 post-validation.

Keep §6 post-validation table for Story 6 — do not implement compare in Story 5.

### 4. Example approval doc

`docs/engine/examples/2026-06-10-no-op-week.md`:

- Sanitized ids (`prof_example_a`, `user_reporter_1`)
- Realistic numbers (e.g. positive rate 0.68, 12 feedback rows)
- Proposed change: **“No engine change — dry run week”**
- Both sign-offs checked with placeholder names `PM Example` / `Eng Example`
- Serves as DoD “one completed example”

### 5. Sprint 10 deferred closure

Update `STORY_04_match_feedback.md` deferred table:

| Item | Target |
|------|--------|
| Weekly aggregate report for product | **Addressed** — [Story 5 export](../../sprint-11-match-quality-intelligence/STORY_05_engine_review_approval_workflow.md) + dashboard (Stories 2–3) |

### 6. Runbook updates

- § Weekly ritual step 5: link `ENGINE_CHANGE_APPROVAL.md` + export endpoint.
- § Engine approval: add export curl + “no deploy without sign-off”.
- New subsection under Admin API: `GET .../export`.

### 7. No UI in Story 5

Dashboard may add “Download export” in Story 6 or ops polish — **out of scope** for Story 5 AC. API + docs sufficient.

### 8. Service signature

```typescript
exportMatchQuality(
  adminUserId: string,
  windowDays: number,
  format: 'json' | 'csv',
): Promise<MatchQualityExportDto | string>; // string when csv body
```

Controller returns `res.json()` or sets headers + sends CSV string. Use `@Res()` only if needed; prefer returning object + interceptor OR dedicated method returning `{ body, contentType, filename }` — simplest: controller branch on format.

```typescript
@Get('match-quality/export')
@UsePipes(MeProfileValidationPipe)
async exportMatchQuality(@CurrentUser() admin, @Query() query, @Res({ passthrough: true }) res) {
  const result = await this.matchQuality.exportMatchQuality(...);
  if (query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="..."');
    return result; // string
  }
  return result; // MatchQualityExportDto
}
```

---

## API contract (copy-paste)

### `GET /api/v1/admin/match-quality/export?windowDays=7&format=json`

| | |
|--|--|
| Auth | Session + `ADMIN_USER_IDS` |
| 200 | `MatchQualityExportDto` |
| 403 | `admin_forbidden` |

### `GET /api/v1/admin/match-quality/export?windowDays=7&format=csv`

| | |
|--|--|
| 200 | `text/csv` attachment |
| 403 | `admin_forbidden` |

---

## Tests (agent 1 + 2)

**Unit:**

- [ ] `exportMatchQuality` composes summary + 20 negatives
- [ ] CSV contains `# positiveRate` line and header row
- [ ] `positiveRate: null` → CSV `# positiveRate,` empty or `null`

**Integration:**

- [ ] non-admin → 403
- [ ] `format=json` → 200 with `summary` + `negativeCandidates`
- [ ] `format=csv` → `Content-Type` csv, body includes `matchProfileId`

---

## Runtime topology

| Item | Value |
|------|--------|
| PM workflow | ritual → dashboard → drill-down → **export** → fill approval → sign-off |
| Export | `curl -b cookie "$API/api/v1/admin/match-quality/export?windowDays=7&format=csv" -o export.csv` |
| Story 6 | compare API fills §6 post-validation |

---

## Manual smoke (story §)

1. Export 7-day CSV → opens in spreadsheet (summary comments + table).
2. Fill approval template using export + one drill-down hypothesis.
3. Dry-run engineering review of sign-off section.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 11 story 5
```

**Notes for dev:**

- Reuse `getSummary` / `listNegativeCandidates` — do not duplicate SQL.
- Keep example approval doc **sanitized** (no real user ids from staging).
- Do not add compare endpoint (Story 6).
- `ENGINE_CHANGE_APPROVAL.md` already exists — extend, don’t fork a second template.
