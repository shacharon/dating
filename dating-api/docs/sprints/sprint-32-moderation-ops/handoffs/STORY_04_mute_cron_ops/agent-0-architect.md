# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_mute_cron_ops.md](../../STORY_04_mute_cron_ops.md)  
**Sprint:** sprint-32-moderation-ops  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Schedule `clearExpiredMutes` via in-process enforcer (match Photo SLA). Ops polish: admin **userStatus** + **hasRecipient** filters + copyable conversation id. **Skip Agent 4**.

---

## Summary

- Add **`MuteExpiryEnforcer`** (`setInterval`, `WorkerModule`) calling existing `ContentViolationService.clearExpiredMutes()`.
- Keep lazy clear in `isUserBlocked` as safety net.
- Do **not** introduce Nest ScheduleModule, ECS cron, or Bull repeatable jobs.
- Ops polish (locked): violations list filters `userStatus` + `hasRecipient`; UI filters + click-to-copy conversation id.
- Skip persisted `opsNote` / new audit table (Unblock `reason` stays log-only).

**Out of scope:** User appeal portal, soft policy changes, Redis leader election, changing mute ladder thresholds, clearing `profile_edit_blocked` via cron.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/workers/mute-expiry.cron.ts` | **create** — `MuteExpiryEnforcer` |
| `src/workers/mute-expiry.cron.spec.ts` | **create** |
| `src/workers/worker.module.ts` | import `ContentModerationModule`; provide enforcer |
| `src/content-moderation/content-violation.service.spec.ts` | assert indefinite (`mutedUntil` null) **not** cleared (strengthen if missing) |
| `src/admin/.../list-admin-content-violations.dto.ts` | `userStatus?`, `hasRecipient?` |
| `src/admin/.../admin-content-violations.service.ts` (+ specs) | where clauses |
| `src/admin/.../admin-content-violations.controller.ts` | pass filters |
| `dating-ui/.../admin-content-violations-api.ts` | filter params |
| `dating-ui/.../content-violations-page-client.tsx` | Status / Has recipient filters; copy conversation id |
| `.env.example` | `CONTENT_MUTE_EXPIRY_INTERVAL_MS` |

No Prisma migration.

---

## Decisions (do not reverse without discussion)

### 1. Scheduler pattern (locked)

Mirror `PhotoSlaEnforcer`:

```ts
@Injectable()
export class MuteExpiryEnforcer implements OnModuleInit, OnModuleDestroy {
  // setInterval → void this.tick()
  // running re-entrancy guard
  // timer.unref() when available
  // on destroy: clearInterval
}
```

| Rule | Lock |
|------|------|
| Location | `src/workers/mute-expiry.cron.ts` |
| Registration | `WorkerModule` providers |
| Module import | `ContentModerationModule` into `WorkerModule` (inject `ContentViolationService`) |
| Interval default | **15 minutes** (`15 * 60 * 1000`) |
| Env override | `CONTENT_MUTE_EXPIRY_INTERVAL_MS` — positive int ms; invalid/empty → 15m; **`0` / `off` / `false`** → **do not start timer** (local/test escape) |
| Tick body | `await this.violations.clearExpiredMutes()` — no extra logging in enforcer when count=0 (service already logs `CONTENT_MUTES_EXPIRED` when count > 0) |
| Errors | `Logger.warn` on tick failure (same style as photo SLA); do not crash process |
| Immediate run on boot | **No** (match SLA — interval only) |
| Multi-instance | Accepted: N API tasks → N ticks; `updateMany` idempotent. No distributed lock this story. |

**Do not** add `@nestjs/schedule`, EventBridge, or Bull repeatable.

### 2. `clearExpiredMutes` contract (locked — no behavior change)

Existing query stays:

```ts
where: {
  contentViolationStatus: 'messaging_muted',
  contentViolationMutedUntil: { not: null, lte: new Date() },
}
data: { contentViolationStatus: 'ok', contentViolationMutedUntil: null }
```

| Case | Cron effect |
|------|-------------|
| Temp mute, `mutedUntil` ≤ now | Cleared → `ok` |
| Temp mute, still in future | Untouched |
| Indefinite (`mutedUntil` null) | **Untouched** |
| `profile_edit_blocked` | **Untouched** |

Lazy `isUserBlocked` path **remains** (do not remove).

### 3. Ops polish (locked)

Ship **all three** small items (still 0.5d together):

#### 3a. Admin list filters

`ListAdminContentViolationsQueryDto` + service:

| Query | Rules |
|-------|--------|
| `userStatus?` | optional string; trim; exact match on `user.contentViolationStatus` via Prisma relation filter: `user: { contentViolationStatus: value }` |
| `hasRecipient?` | string query; truthy via same helper pattern as `includeFullText` (`1`/`true`/`yes`) → `recipientUserId: { not: null }` |

Combine with existing `surface` / `category` / `userId` / `action` / `includeFullText` (AND).

Allowed `userStatus` values for UI: `ok` | `profile_edit_blocked` | `messaging_muted` (API accepts any trimmed string; empty = no filter).

#### 3b. Admin UI filters

On `/admin/content-violations` violations section: **Status** select + **Has recipient** select (`All` / `Yes`). Wire into `listAdminContentViolations`.

#### 3c. Copyable conversation id

In blocked-users + violations tables: conversation cell shows truncated id; **click copies full id** to clipboard (`navigator.clipboard.writeText`) with brief “Copied” affordance or `title` hint “Click to copy”. Keep truncation.

### 4. Explicitly out (locked)

| Item | Disposition |
|------|-------------|
| Persist Unblock `opsNote` / audit table | **Out** — keep log-only `reason` |
| Call `clearExpiredMutes` from list/stats | **Out** — cron only (+ lazy send) |
| Disable ContentModeration when mute cron off | Independent — interval `0` only stops enforcer |

### 5. Tests (locked)

| Spec | Cover |
|------|-------|
| `mute-expiry.cron.spec.ts` | starts interval when enabled; `tick` / public run calls `clearExpiredMutes`; re-entrancy skips overlap; disabled env does not set interval |
| `content-violation.service.spec.ts` | existing clearExpiredMutes; add/keep assertion indefinite mute **not** in `updateMany` where (or separate test that where includes `not: null`) |
| Admin unit + HTTP | `userStatus` + `hasRecipient=1` applied to Prisma where |

Skip Playwright / Agent 4.

### 6. Agent 4

**Skip.**

---

## Runtime topology

```text
API process (WorkerModule)
  → MuteExpiryEnforcer every 15m (configurable)
       → clearExpiredMutes()
            → updateMany expired temp messaging_muted → ok
            → CONTENT_MUTES_EXPIRED if count > 0

Send path (unchanged)
  → isUserBlocked → may clear one expired user lazily
```

---

## Open questions / blockers

- None blocking Agent 1.

---

## Next agent

```text
--agent 1 sprint 32 story 4
```

**Notes for next agent:**

1. Implement enforcer + WorkerModule wiring first; then admin filters; then UI copy.
2. Do not change `clearExpiredMutes` where clause semantics.
3. Commit + write `agent-1-dev.md`.
