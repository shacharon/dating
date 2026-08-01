# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_violation_enforcement.md](../../STORY_04_violation_enforcement.md)  
**Sprint:** sprint-30-content-safety  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Refactor only — move threshold/mute writes into `ContentViolationService`; thin profile/message callers. **Skip Agent 4** (unit specs sufficient; HTTP already covers gates).

---

## Summary

- Consolidate **profile 3-strike** and **message mute ladder** into `ContentViolationService.enforceViolationThreshold`.
- Add **`isUserBlocked`**, **`clearExpiredMutes`**, **`getViolationStats`**.
- Simplify `MeProfileService` / `MeConversationMessagesService` — no duplicated count/threshold/status-write logic.
- Fix STORY_04 draft bugs: use **`surfacePrefix: 'profile_'`** (not `surface: 'profile_'`); **never overwrite `contentViolationCount`**.

**Out of scope:** Admin UI (Story 05), new cron worker (batch method only; on-demand clear stays), changing HTTP error shapes from Stories 02/03.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/content-moderation/content-moderation.types.ts` | `EnforcementResult`, `EnforcementSurface`, `ViolationStats` types |
| `src/content-moderation/content-violation.service.ts` | new methods |
| `src/content-moderation/content-violation.service.spec.ts` | threshold / mute / clear / stats / isUserBlocked |
| `src/me-profile/me-profile.service.ts` (+ spec) | call `enforce` / `isUserBlocked`; remove inline strike |
| `src/me-profile/me-conversation-messages.service.ts` (+ spec) | call `enforce` / `isUserBlocked`; remove inline ladder |
| `src/logging/error-codes.ts` | `CONTENT_MUTES_EXPIRED` |

---

## Decisions (do not reverse without discussion)

### 1. Keep existing APIs (locked)

Do **not** remove or break:

- `recordViolation`
- `getViolationCount` (incl. `surfacePrefix` — already Story 02)
- `getUserViolationStatus` — **do not** invent a parallel `getUserBlockStatus`; callers use this (optionally re-export typed alias if desired, not required)

### 2. New API (locked)

```ts
export type EnforcementSurface = 'profile' | 'message';

export type EnforcementReason =
  | 'under_threshold'
  | '3_profile_violations'
  | '3_hourly'
  | '10_daily'
  | '20_lifetime';

export type EnforcementResult = {
  shouldBlock: boolean;
  /** Set when message mute applied: Date for temporary; `null` for indefinite. Omit when under threshold. */
  mutedUntil?: Date | null;
  reason: EnforcementReason;
  /** Human label for message 400 `details.muted`: '1 hour' | '24 hours' | 'indefinitely'. Omit if no mute. */
  muteLabel?: string;
};

async enforceViolationThreshold(
  userId: string,
  surface: EnforcementSurface,
): Promise<EnforcementResult>;

async isUserBlocked(
  userId: string,
  surface: EnforcementSurface,
): Promise<boolean>;

/** Batch clear temporary messaging mutes that have expired. Does not touch indefinite (`mutedUntil` null). */
async clearExpiredMutes(): Promise<number>;

async getViolationStats(): Promise<ViolationStats>;
```

`ViolationStats` shape (locked):

```ts
{
  totalViolations: number;
  violationsByCategory: Record<string, number>;
  violationsBySurface: Record<string, number>;
  blockedProfileUsers: number;
  mutedMessageUsers: number;
  mutedMessageUsersTemporary: number;
  mutedMessageUsersIndefinite: number;
}
```

Prefer Prisma `groupBy` / `count` over loading all violation rows if practical.

### 3. `enforceViolationThreshold` behavior (locked)

**Call after `recordViolation` succeeded** (counts include the just-recorded row).

| Surface | Count | On threshold | Status write | Log |
|---------|-------|--------------|--------------|-----|
| `profile` | `getViolationCount(userId, { surfacePrefix: 'profile_' })` ≥ 3 | `shouldBlock: true`, reason `3_profile_violations` | `contentViolationStatus = 'profile_edit_blocked'` only | `CONTENT_USER_BLOCKED` |
| `message` | exact `surface: 'message'` windows | see ladder | `messaging_muted` + `contentViolationMutedUntil` | `CONTENT_USER_MUTED` |

**Message ladder (precedence lifetime → daily → hourly):**

| Condition | `mutedUntil` | `muteLabel` | `reason` |
|-----------|--------------|-------------|----------|
| lifetime ≥ 20 | `null` | `indefinitely` | `20_lifetime` |
| else daily ≥ 10 | now+24h | `24 hours` | `10_daily` |
| else hourly ≥ 3 | now+1h | `1 hour` | `3_hourly` |
| else | — | omit | `under_threshold`, `shouldBlock: false` |

**Forbidden:** writing `contentViolationCount` in enforce (recordViolation owns increments).

**Do not** throw HTTP exceptions from this service — return `EnforcementResult` only.

### 4. `isUserBlocked` (locked)

| Surface | True when |
|---------|-----------|
| `profile` | `status === 'profile_edit_blocked'` |
| `message` | `status === 'messaging_muted'` and (`mutedUntil == null` **or** `mutedUntil > now`) |

If `messaging_muted` and temporary mute expired → clear that user to `ok` / `mutedUntil: null`, return **false**.

`profile_edit_blocked` does **not** make `isUserBlocked(..., 'message')` true (and vice versa).

### 5. `clearExpiredMutes` (locked)

```ts
updateMany where:
  contentViolationStatus = 'messaging_muted'
  contentViolationMutedUntil != null AND <= now
data: status ok, mutedUntil null
```

Log `CONTENT_MUTES_EXPIRED` when `count > 0`.  
**No cron required this story** — method ready for Story 05/ops; on-demand path via `isUserBlocked` remains primary.

### 6. Caller simplification (locked)

**`MeProfileService.assertProfileEditAllowed`:**

```ts
if (await this.contentViolations.isUserBlocked(userId, 'profile')) {
  // existing ForbiddenException + CONTENT_PROFILE_EDIT_BLOCKED trace
}
```

**`moderateProfileTextFields` after `recordViolation`:**

```ts
await this.contentViolations.enforceViolationThreshold(userId, 'profile');
// then throw BadRequest as today (always on flag)
```

**`MeConversationMessagesService.assertMessagingAllowed`:**

```ts
if (await this.contentViolations.isUserBlocked(userId, 'message')) {
  const s = await this.contentViolations.getUserViolationStatus(userId);
  // existing ForbiddenException + details.mutedUntil + CONTENT_MESSAGING_MUTED
}
```

**`moderateMessageText` after `recordViolation`:**

```ts
const enforcement = await this.contentViolations.enforceViolationThreshold(userId, 'message');
throw BadRequestException({
  ...
  details: {
    category,
    suggestion: '...',
    ...(enforcement.muteLabel ? { muted: enforcement.muteLabel } : {}),
  },
});
```

Remove local `HOUR_MS`/`DAY_MS` threshold math from message service once moved (constants live in violation service or types).

HTTP error codes/bodies from Stories 02/03 **unchanged**.

### 7. Observability codes (locked)

| Code | When |
|------|------|
| `CONTENT_MUTES_EXPIRED` | **Add** — `clearExpiredMutes` cleared ≥1 |
| `CONTENT_USER_BLOCKED` | Keep — profile enforce transition |
| `CONTENT_USER_MUTED` | Keep — message enforce transition |
| `CONTENT_PROFILE_EDIT_BLOCKED` / `CONTENT_MESSAGING_MUTED` | Keep — preflight 403 in callers |

**Do not** add redundant `CONTENT_ENFORCEMENT_*` aliases (STORY_04 draft optional — drop).

### 8. Tests (locked)

| Spec | Cover |
|------|-------|
| `content-violation.service.spec.ts` | profile under/over 3; message under / 3h / 10d / 20 life; isUserBlocked profile/message + expiry clear; clearExpiredMutes count; getViolationStats shape (mocked prisma) |
| `me-profile.service.spec.ts` | Still 3rd strike / blocked / flagged — via mocks of `enforce` / `isUserBlocked` (or real service if unit-instantiated) |
| `me-conversation-messages.service.spec.ts` | Mute tiers move to violation service tests; message service asserts `enforceViolationThreshold` called + `muteLabel` mapped into 400 |

No new HTTP suite required if existing Story 02/03 HTTP still pass with real service methods (mocks may need `enforceViolationThreshold` / `isUserBlocked` stubs).

### 9. Agent 4

**Skip.**

---

## Runtime topology

```text
Flagged content
  → recordViolation
  → enforceViolationThreshold(profile|message)
       → maybe status write + obs
  → caller throws 400

Preflight create/patch/send
  → isUserBlocked(...)
       → maybe clear expired mute
       → caller throws 403
```

---

## Open questions / blockers

- None blocking Agent 1.
- Cron wiring deferred; `clearExpiredMutes` is API-only this story.

---

## Next agent

```text
--agent 1 sprint 30 story 4
```

**Notes for next agent:**

1. Move threshold math first + tests; then thin callers.
2. Use `surfacePrefix: 'profile_'`; never overwrite count.
3. Keep HTTP shapes identical.
4. Commit with story message; write `agent-1-dev.md`.
