# Handoff: Agent 0 — Architect — Story 6

**Agent:** 0 architect  
**Story:** [STORY_06_throttle_last_seen.md](../../STORY_06_throttle_last_seen.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Throttle `UserSession.lastSeenAt` updates inside `validateSessionToken`. Skip Agent 4 if unit specs cover skip vs write. Redis session cache is **out of scope**.

---

## Summary

Every authenticated request hits [`SessionService.validateSessionToken`](../../../../../src/session/session.service.ts): `findUnique` + **unconditional** `userSession.update({ lastSeenAt })`. That write is the cheap win for this story. AuthGuard / OptionalAuthGuard / `AuthService` already funnel through this one method — change only here.

---

## Current path (must preserve)

| Step | Behavior |
|------|----------|
| Missing/blank token, no pepper | `null` |
| No row / revoked / expired (`expiresAt <= now`) | `null` |
| Valid | Return `{ sessionId, userId, expiresAt }`; swallow update races |
| Session cookie / TTL / revoke | **Unchanged** |

`lastSeenAt` is `DateTime?` on `UserSession`; create does not set it.

---

## Decisions (do not reverse without discussion)

### 1. Threshold (locked)

```ts
/** Skip lastSeenAt write if already updated within this window. */
export const SESSION_LAST_SEEN_THROTTLE_MS = 5 * 60_000; // 5 minutes
```

- Place in a small `session.constants.ts` (or next to existing session module files).
- No env knob required this story.
- Matches story example + `SCALE_READINESS_CR` “>5min old”.

### 2. Skip logic (locked) — JS gate after `findUnique`

After the row is validated (not revoked / not expired), **before** update:

```ts
const shouldTouchLastSeen =
  row.lastSeenAt == null ||
  now.getTime() - row.lastSeenAt.getTime() >= SESSION_LAST_SEEN_THROTTLE_MS;

if (shouldTouchLastSeen) {
  try {
    await this.prisma.userSession.update({
      where: { id: row.id },
      data: { lastSeenAt: now },
    });
  } catch {
    /* row may race-delete; validation still stands */
  }
}
```

| Case | Update? |
|------|---------|
| `lastSeenAt` null (first touch) | **Yes** |
| Age ≥ 5 min | **Yes** |
| Age < 5 min | **No** (skip Prisma update entirely) |

- Decision uses the **already-loaded row** — no extra read.
- Multi-task: concurrent requests that both see a stale `lastSeenAt` may both write once — acceptable; still cuts steady-state write rate.
- Do **not** use a fire-and-forget write that always hits the DB.

### 3. Redis session cache (locked OUT)

- **Out of scope** this story (story default + SCALE stretch).
- Still one `findUnique` per validated request; only the `update` is throttled.
- Do not add Redis session lookup/caching here.

### 4. Call sites (locked)

| Touch | Change |
|-------|--------|
| `SessionService.validateSessionToken` | Throttle only |
| `AuthGuard` / `OptionalAuthGuard` / `AuthService` | **No** API changes |
| `ValidatedSession` shape | **Unchanged** |
| Create / revoke / revoke-all | **Unchanged** |

### 5. Tests (locked)

Update `session.service.spec.ts`:

1. Valid + `lastSeenAt: null` → **update** called.
2. Valid + `lastSeenAt` within threshold (e.g. `now - 1s`) → **update not** called; still returns session.
3. Valid + `lastSeenAt` older than threshold (e.g. `now - throttle - 1`) → **update** called.
4. Keep existing null/revoked/expired cases (no update expected).

Use fake timers or fixed `Date`s so threshold math is stable. Include `lastSeenAt` on `findUnique` mocks where relevant.

### 6. Agent 4

- **Skip** if §5 lands (no HTTP e2e required for this write skip).

---

## Artifacts

| Path | Change |
|------|--------|
| `session.constants.ts` (new) | `SESSION_LAST_SEEN_THROTTLE_MS` |
| `session.service.ts` | Conditional `lastSeenAt` update |
| `session.service.spec.ts` | Skip vs write cases |

---

## Out of scope

- Redis / in-memory session cache  
- Sliding session TTL / extending `expiresAt` on activity  
- Changing how `lastSeenAt` is exposed to clients (if at all)  
- AuthGuard user-lookup optimization  

---

## Agent 1 instructions

1. Add constant + gate in `validateSessionToken` per §1–2.
2. Specs per §5; `npm run build` + `session.service.spec`.
3. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
perf(auth): throttle lastSeenAt writes on the request path

Sprint 28 Story 6
```

---

## Agent 2 instructions

- [ ] Within window → no `userSession.update`
- [ ] Null / aged `lastSeenAt` → update
- [ ] Validity / return shape / revoke unchanged
- [ ] No Redis session cache added
- [ ] Specs cover skip vs write
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README (Stories 1–6 Done → sprint complete unless follow-ups).
- Write `agent-3-pm.md`.

---

## Open risks

1. Ops dashboards that assumed near-real-time `lastSeenAt` now lag up to ~5 minutes — acceptable for presence-ish telemetry.
2. Specs that mock session rows without `lastSeenAt` may need the field added (undefined/`null` both trigger write — fine).
