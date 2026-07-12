# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_feedback_audit_drilldown.md](../../STORY_04_feedback_audit_drilldown.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **API + UI story** — `GET .../candidates/:profileId/audit` wraps existing `buildMatchQualityAuditJson` (V1 `MeMatchesService.getById` path only); admin UI at `/admin/match-quality/[profileId]`.
- **Viewer resolution** — optional `viewerUserId` query; if omitted, auto-pick up to **3** distinct negative reporters (newest feedback first) until audit build succeeds.
- **`feedbackSummary`** — windowed counts on candidate (`negativeCount`, `positiveCount`, `lastSentiment`) — separate from audit JSON.
- **No MeMatchesService changes** — when `getById` throws `NotFoundException` for all candidate viewers, return **200** with `audit: null` + `auditUnavailable` (not 500).
- **Story 3** drill-down links land on this page.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — extend admin match quality** | |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.controller.ts` | **update** — GET `candidates/:profileId/audit` |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.ts` | **update** — `getCandidateAudit` |
| `dating-api/src/admin/admin-match-quality/dto/candidate-audit-query.dto.ts` | **created** — `windowDays`, optional `viewerUserId` |
| `dating-api/src/admin/admin-match-quality/dto/candidate-audit-response.dto.ts` | **created** — response type |
| `dating-api/src/admin/admin.module.ts` | **update** — `import MeProfileModule` |
| `dating-api/src/logging/error-codes.ts` | `ADMIN_MATCH_QUALITY_AUDIT_FETCHED` |
| `dating-api/src/admin/admin-match-quality/admin-match-quality.service.spec.ts` | viewer resolution, feedbackSummary, auditUnavailable |
| `dating-api/src/admin/admin-match-quality/admin-match-quality-http.integration.spec.ts` | audit route 403/404/200 |
| **UI** | |
| `dating-ui/src/lib/admin-match-quality-api.ts` | **update** — `getCandidateAudit` + types |
| `dating-ui/src/lib/admin-match-quality-api.spec.ts` | audit fetch |
| `dating-ui/src/app/admin/match-quality/[profileId]/page.tsx` | **created** — drill-down |
| `dating-ui/src/app/admin/match-quality/[profileId]/page.spec.tsx` | **created** |
| **Docs** | |
| `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` | step 4 → admin drill-down UI |
| `dating-api/docs/match-quality-audit-manual-review.md` | link to admin UI |
| **Prisma** | no migration |

---

## Decisions (do not reverse without discussion)

### 1. Scoring path — `buildMatchQualityAuditJson` only

```typescript
import { buildMatchQualityAuditJson } from '../../me-profile/match-quality-audit';
import { MeMatchesService } from '../../me-profile/me-matches.service';
```

- **Do not** call `compareWithStatus`, `MeProfileMatchesService`, or legacy list services from admin code.
- `includeListContext: true` for ops (rank in list when viewer list is `ready`).
- `engineReadNormalized`: `process.env.ENGINE_READ_NORMALIZED === '1'` (same as CLI script).

**AdminModule** must import `MeProfileModule` and inject `MeMatchesService`.

### 2. `GET /api/v1/admin/match-quality/candidates/:profileId/audit`

**Auth:** `AuthGuard` + `AdminGuard` (existing).

**Query `CandidateAuditQueryDto`:**

| Field | Default | Validation |
|-------|---------|------------|
| `windowDays` | `7` | `@IsInt() @Min(1) @Max(90)` |
| `viewerUserId` | omitted | optional `@IsString()` cuid-like id |

**404 `candidate_not_found`:** `UserProfile` row missing for `:profileId`.

**422 `viewer_required`:** no `viewerUserId` query **and** no `MatchFeedback` rows for candidate (any sentiment) to infer viewers.

### 3. Viewer resolution (locked)

```typescript
async resolveViewerCandidates(
  profileId: string,
  explicitViewerUserId?: string,
): Promise<string[]> {
  if (explicitViewerUserId?.trim()) {
    return [explicitViewerUserId.trim()];
  }
  const rows = await prisma.matchFeedback.findMany({
    where: {
      matchProfileId: profileId,
      sentiment: MatchFeedbackSentiment.NEGATIVE,
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
    select: { userId: true },
    take: 3,
  });
  return rows.map((r) => r.userId);
}
```

**Build loop:** for each `viewerUserId` in order, call `buildMatchQualityAuditJson(...)`. On success → use that report. On `NotFoundException` → try next viewer.

If all fail → **200** with `audit: null` and:

```typescript
auditUnavailable: {
  code: 'match_not_visible_to_viewer',
  message: 'Match detail not available for resolved viewer(s). Try another viewerUserId query param or CLI audit.',
}
```

Still include `feedbackSummary` and `viewerUserId` = last attempted viewer.

### 4. `feedbackSummary` (windowed)

Same `windowStart` helper as Story 2 (`computeWindowStart`).

```typescript
const where = {
  matchProfileId: profileId,
  createdAt: { gte: windowStart },
};

// negativeCount, positiveCount via groupBy or two counts
// lastSentiment: sentiment of row with MAX(createdAt) in window, or null if none
```

**Response wrapper** (audit JSON nested — do not flatten `MatchQualityAuditReport`):

```typescript
export type CandidateAuditResponseDto = {
  candidateProfileId: string;
  viewerUserId: string; // viewer used for successful audit, or last attempted
  windowDays: number;
  feedbackSummary: {
    negativeCount: number;
    positiveCount: number;
    lastSentiment: 'POSITIVE' | 'NEGATIVE' | null;
  };
  audit: MatchQualityAuditReport | null;
  auditUnavailable?: {
    code: string;
    message: string;
  };
};
```

When audit succeeds, `audit` is the full `MatchQualityAuditReport` from `buildMatchQualityAuditJson` (includes `compare.outcome`, `matchScore`, chips, etc.).

### 5. Observability

On successful audit build:

```typescript
this.obs.trace(
  `event=admin_match_quality_audit_fetched candidateProfileId=${profileId} viewerUserId=${viewerUserId} outcome=${audit.compare.outcome}`,
  ErrorCodes.ADMIN_MATCH_QUALITY_AUDIT_FETCHED,
);
```

### 6. Admin UI — `/admin/match-quality/[profileId]`

**Pattern:** client page like Story 3; `useParams().profileId`; default `windowDays=7` (match list page window or local 7/30 toggle — **reuse 7/30 buttons** for consistency).

**Layout:**

| Section | Content |
|---------|---------|
| Back link | `← Match quality` → `/admin/match-quality` |
| Title | `Candidate audit` + monospace `profileId` (truncated + `title`) |
| Feedback summary | 3 small cards: negative count, positive count, last sentiment |
| Audit panel | `compare.outcome`, `matchScore` (or `—`), top `explainability.positiveChips` (first 5), `recommendation.primaryTakeaway`, `recommendation.suggestedNextAction` |
| `auditUnavailable` | Yellow/info box with message + CLI hint |
| Viewer | Show `viewer.userId` from audit when present |
| Optional link | `Open in app (your session)` → `/dating/me-matches/{profileId}` `target="_blank"` — **admin's own session**, not impersonation; subtitle explains limitation |

**No raw JSON dump** in v1 — formatted read-only fields only.

**Loading / errors:** same as Story 3 (`admin_forbidden`, 404 candidate).

**i18n:** en only.

### 7. API client (UI)

```typescript
export async function getCandidateAudit(
  profileId: string,
  windowDays?: number,
  viewerUserId?: string,
): Promise<CandidateAuditResponse>;
```

403 → `admin_forbidden`; 404 → throw `candidate_not_found` or generic message.

### 8. PII

- Response may include `viewer.userId`, `evaluationSummary` text from match detail — **admin-only**, same trust as CLI audit JSON.
- No email, phone, or full profile bios in new fields.

### 9. Prisma

**No migration** — `MatchFeedback` + existing profiles only.

---

## API contract (copy-paste)

### `GET /api/v1/admin/match-quality/candidates/:profileId/audit?windowDays=7&viewerUserId=optional`

| | |
|--|--|
| Auth | Session + `ADMIN_USER_IDS` |
| 200 | `CandidateAuditResponseDto` |
| 403 | `admin_forbidden` |
| 404 | `{ error: 'candidate_not_found' }` — unknown profile id |
| 422 | validation / `viewer_required` |

---

## Service signature

```typescript
@Injectable()
export class AdminMatchQualityService {
  // existing getSummary, listNegativeCandidates ...

  getCandidateAudit(
    adminUserId: string,
    candidateProfileId: string,
    windowDays: number,
    viewerUserId?: string,
  ): Promise<CandidateAuditResponseDto>;
}
```

Inject: `PrismaService`, `StructuredObservabilityService`, `MeMatchesService`.

---

## Tests (agent 1 + 2)

**Service unit:**

- [ ] `feedbackSummary` counts for window
- [ ] `lastSentiment` from latest row in window
- [ ] explicit `viewerUserId` passed to builder
- [ ] auto-pick tries second viewer when first `getById` throws
- [ ] all viewers fail → `audit: null` + `auditUnavailable`

**HTTP integration:**

- [ ] non-admin → 403
- [ ] unknown `profileId` → 404
- [ ] mocked `buildMatchQualityAuditJson` / `MeMatchesService` → 200 with `audit.compare.outcome`
- [ ] seeded negative feedback → auto viewer resolution

**UI `page.spec.tsx`:**

- [ ] renders feedback summary + matchScore + chips from mock
- [ ] `auditUnavailable` message
- [ ] `admin_forbidden` error
- [ ] back link to `/admin/match-quality`

**Regression:** existing `match-quality-audit.v1-path.spec.ts` unchanged.

---

## Runtime topology

| Item | Value |
|------|--------|
| List → drill-down | Story 3 **View audit** → `/admin/match-quality/{profileId}` |
| API | `GET .../candidates/{profileId}/audit` |
| Engine | Same as `GET /api/v1/me/matches/:id` for resolved viewer |
| CLI fallback | `scripts/match-quality-audit.ts` remains for edge cases |

**Dev smoke:**

1. Seed negative feedback user A → candidate B.
2. Admin opens `/admin/match-quality/{B}`.
3. See `negativeCount ≥ 1`, audit with score/chips or `auditUnavailable`.

---

## Docs updates (agent 1)

**MATCH_QUALITY_RUNBOOK.md** § Weekly ritual step 4:

> Sample negatives via **View audit** on `/admin/match-quality` (Story 4) or CLI below.

Rename § "Drill-down (CLI until Story 4 admin UI)" → **Drill-down (admin UI + CLI)**.

---

## Manual smoke (story §)

1. User A thumbs down candidate B on staging.
2. Admin drill-down for B → negative count ≥ 1 + audit panel.
3. One-sentence hypothesis in weekly notes.

---

## Open questions / blockers

- None.

**Out of scope:** impersonation, prod “view as user”, editing feedback.

---

## Next agent

```text
--agent 1 sprint 11 story 4
```

**Notes for dev:**

- Import `MeProfileModule` in `AdminModule` — watch `forwardRef` if circular with `AuthModule`.
- Reuse `computeWindowStart` from `match-quality-window.ts`.
- Do not duplicate audit builder logic — single call to `buildMatchQualityAuditJson`.
- Catch `NotFoundException` from Nest when wrapping builder (viewer loop only).
