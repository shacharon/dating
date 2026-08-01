# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_admin_violations.md](../../STORY_05_admin_violations.md)  
**Sprint:** sprint-30-content-safety  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** New admin API + dating-ui page. Reuse Story 04 `getViolationStats` / status fields. **Skip Agent 4** (HTTP integration + unit specs; no Playwright).

---

## Summary

- Admin **list / stats / unblock** for content violations under existing `/api/v1/admin` + `AuthGuard` + `AdminGuard`.
- UI at `/admin/content-violations` following photos/reports lazy-client pattern.
- Fix STORY_05 draft bugs: **no `AdminAuthGuard`** (use `AdminGuard`); controller base path **`api/v1/admin`** (not a nested controller path); use **`@CurrentUser() admin`**.
- Unblock clears status + mute only — **never** zero `contentViolationCount`.

**Out of scope:** Cron for `clearExpiredMutes`, user appeal flow, dedicated audit table, returning full `flaggedText` (preview only), new Prisma models.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/admin/admin-content-violations/admin-content-violations.controller.ts` | new |
| `src/admin/admin-content-violations/admin-content-violations.service.ts` | new |
| `src/admin/admin-content-violations/admin-content-violations.service.spec.ts` | unit |
| `src/admin/admin-content-violations/admin-content-violations-http.integration.spec.ts` | HTTP (mirror reports) |
| `src/admin/admin-content-violations/dto/*` | list query, unblock body, response types |
| `src/admin/admin.module.ts` | register controller/service; import `ContentModerationModule` |
| `src/logging/error-codes.ts` | `ADMIN_CONTENT_UNBLOCK` |
| `dating-ui/src/lib/admin-content-violations-api.ts` | fetch helpers |
| `dating-ui/src/app/admin/content-violations/page.tsx` | thin dynamic shell |
| `dating-ui/src/app/admin/content-violations/content-violations-page-client.tsx` | UI |
| `dating-ui/src/app/admin/page.tsx` | index link |

---

## Decisions (do not reverse without discussion)

### 1. Auth (locked) — fix story draft

```ts
@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
```

- **Not** `AdminAuthGuard` (does not exist).
- Admin identity: `@CurrentUser() admin: AuthMeResponseDto` → `admin.id`.
- Same model as photos / reports / match-quality (`ADMIN_USER_IDS`).

### 2. Routes (locked)

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/v1/admin/content-violations` | list |
| `GET` | `/api/v1/admin/content-violations/stats` | stats |
| `POST` | `/api/v1/admin/content-violations/unblock/:userId` | unblock |

Register **`stats` and `unblock` routes before any `:id` route** if you add one later; today no `:id` list detail.

Keep **POST** for unblock (explicit action; story contract). Do not switch to PATCH unless product asks.

### 3. DTOs (locked)

**List query** (`ListAdminContentViolationsQueryDto`):

| Field | Rules |
|-------|--------|
| `surface?` | optional string |
| `category?` | optional string |
| `userId?` | optional string (exact match) |
| `limit?` | int, default **50**, min 1, max **200** |
| `offset?` | int, default **0**, min 0 |

Offset pagination is intentional for this surface (reports use cursor — do not mix).

**Unblock body** (`UnblockContentViolationDto`):

| Field | Rules |
|-------|--------|
| `reason` | required string, trim, min 1, **MaxLength(500)** |

Mutation: `@UsePipes(MeProfileValidationPipe)` on unblock.

### 4. List response (locked)

```ts
{
  violations: Array<{
    id: string;
    userId: string;
    userEmail: string;
    userNickname: string | null;
    /** Current User.contentViolationStatus at list time */
    userStatus: string;
    userMutedUntil: string | null; // ISO or null
    surface: string;
    category: string;
    flaggedTextPreview: string; // slice(0, 100) only — never full text
    score: number | null;
    action: string;
    createdAt: string; // ISO
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

**Why `userStatus` / `userMutedUntil`:** UI disables Unblock when `userStatus === 'ok'` without a second round-trip. Story draft omitted these — **include them**.

Prisma: `findMany` + `count` with same `where`; `include: { user: { select: { email, contentViolationStatus, contentViolationMutedUntil, profile: { select: { nickname } } } } }`; `orderBy: { createdAt: 'desc' }`.

### 5. Stats (locked)

```ts
async getStats() {
  return this.violations.getViolationStats(); // Story 04 shape unchanged
}
```

Do **not** reimplement aggregations. Do **not** call `clearExpiredMutes` from stats/list (cron still deferred).

### 6. Unblock (locked)

```ts
async unblockUser(adminUserId: string, userId: string, reason: string): Promise<{
  success: true;
  userId: string;
  previousStatus: string;
  clearedAt: string; // ISO
}>
```

Behavior:

1. Load user; missing → `NotFoundException`.
2. Capture `previousStatus = contentViolationStatus ?? 'ok'`.
3. Update: `contentViolationStatus: 'ok'`, `contentViolationMutedUntil: null`.
4. **Forbidden:** changing `contentViolationCount` or deleting `UserContentViolation` rows.
5. Idempotent if already `ok` (still succeeds; log with `previousStatus=ok`).
6. Obs:

```ts
this.obs.trace(
  `admin content unblock userId=${userId} adminUserId=${adminUserId} previousStatus=${previousStatus} reason=${reason}`,
  ErrorCodes.ADMIN_CONTENT_UNBLOCK,
);
```

No DB audit table (match photos/reports).

### 7. Service placement (locked)

- New `AdminContentViolationsService` owns list/unblock Prisma + obs.
- Inject `ContentViolationService` **only** for `getViolationStats`.
- Do **not** add `unblock` onto `ContentViolationService` this story (admin concerns stay in admin module).

Wire: `AdminModule` imports `ContentModerationModule`; register controller + service.

### 8. Observability code (locked)

Add `ADMIN_CONTENT_UNBLOCK` to `error-codes.ts`. No other new codes required.

### 9. Frontend (locked)

Follow reports/photos:

- `page.tsx` → `dynamic(..., { ssr: false })` → `content-violations-page-client.tsx`
- API client: `dating-ui/src/lib/admin-content-violations-api.ts` — `credentials: 'include'`, map 403 → `admin_forbidden`
- English-only admin copy (same as other admin pages)
- Visual language: match existing admin zinc/emerald tables (not a new marketing design)
- Index link on `/admin`
- Middleware / `admin-routes-gate` already covers `/admin/*` — no new gate logic
- Stats cards: totalViolations, blockedProfileUsers, mutedMessageUsersTemporary, mutedMessageUsersIndefinite
- Filters: surface, category, userId; table columns per story + Unblock when `userStatus !== 'ok'`
- Unblock UX: prompt/modal for required reason (min 1 char); refresh list + stats after success
- **No** “View user profile” link unless an admin user detail route already exists (it does not) — show email/nickname/userId only

### 10. Tests (locked)

| Spec | Cover |
|------|-------|
| `admin-content-violations.service.spec.ts` | list filters/mapping/preview length; stats delegates; unblock clears + obs; 404; idempotent ok |
| `admin-content-violations-http.integration.spec.ts` | non-admin 403; admin list + stats 200; unblock 200 body; validation 400 on empty reason |

Skip Playwright / Agent 4.

### 11. Agent 4

**Skip.**

---

## Runtime topology

```text
Admin UI /admin/content-violations
  → GET content-violations (+ filters)
  → GET content-violations/stats  → ContentViolationService.getViolationStats
  → POST content-violations/unblock/:userId { reason }
       → status ok + mutedUntil null
       → ADMIN_CONTENT_UNBLOCK trace
```

---

## Open questions / blockers

- None blocking Agent 1.
- Ops: document that admins see flagged text previews — already noted in Story 00/ops; no new legal story.

---

## Next agent

```text
--agent 1 sprint 30 story 5
```

**Notes for next agent:**

1. Copy reports controller/module wiring patterns; fix story’s `AdminAuthGuard` / `@Req().user`.
2. Include `userStatus` / `userMutedUntil` on list rows.
3. Preview ≤100 chars; never return full `flaggedText`.
4. Never touch `contentViolationCount` on unblock.
5. Commit with story message; write `agent-1-dev.md`.
