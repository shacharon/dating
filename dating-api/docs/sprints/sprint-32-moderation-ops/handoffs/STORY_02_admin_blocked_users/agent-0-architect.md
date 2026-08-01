# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_admin_blocked_users.md](../../STORY_02_admin_blocked_users.md)  
**Sprint:** sprint-32-moderation-ops  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Admin blocked/muted users queue + full-text review for that queue. Reuse Unblock. **Skip Agent 4** (unit + HTTP specs).

---

## Summary

- Add **`GET /api/v1/admin/content-violations/blocked-users`** — users in `profile_edit_blocked` | `messaging_muted` with **latest** violation + recipient (Story 01 fields).
- **Blocked-users** responses include **full** `flaggedText` (admin review queue). Existing violations list stays **preview-only** by default; optional `includeFullText=1`.
- UI: same page — **Blocked / muted** section (primary) + existing violations feed; Unblock refreshes both.
- No new Prisma migration required (Story 01 fields sufficient).

**Out of scope:** Soft policy (Story 03), mute cron (Story 04), ban/delete account, new audit table, changing Unblock contract.

---

## Artifacts

| Path | Change |
|------|--------|
| `admin-content-violations.controller.ts` | `GET content-violations/blocked-users` |
| `admin-content-violations.service.ts` (+ spec) | `listBlockedUsers` |
| `dto/list-admin-blocked-users.dto.ts` | query + response types |
| `dto/list-admin-content-violations.dto.ts` | optional `includeFullText`; optional `flaggedText` on items |
| `admin-content-violations-http.integration.spec.ts` | blocked-users + full-text + unblock clears list |
| `dating-ui/.../admin-content-violations-api.ts` | `listAdminBlockedUsers` |
| `dating-ui/.../content-violations-page-client.tsx` | blocked-users table/section |

---

## Decisions (do not reverse without discussion)

### 1. Auth / routing (locked)

Keep:

```ts
@Controller('api/v1/admin')
@UseGuards(AuthGuard, AdminGuard)
```

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `content-violations/blocked-users` | **New** — static path beside `stats` |
| `GET` | `content-violations` | Enrich with optional full text |
| `GET` | `content-violations/stats` | Unchanged |
| `POST` | `content-violations/unblock/:userId` | Unchanged |

Register `blocked-users` and `stats` as static routes (already the case for stats).

### 2. Blocked-users query (locked)

`ListAdminBlockedUsersQueryDto`:

| Field | Rules |
|-------|--------|
| `limit?` | int, default **50**, min 1, max **200** |
| `offset?` | int, default **0**, min 0 |

No status query param this story — always both blocked statuses:

```ts
contentViolationStatus: { in: ['profile_edit_blocked', 'messaging_muted'] }
```

### 3. `listBlockedUsers` Prisma shape (locked)

```ts
prisma.user.findMany({
  where: { contentViolationStatus: { in: ['profile_edit_blocked', 'messaging_muted'] } },
  orderBy: { updatedAt: 'desc' },
  take: limit,
  skip: offset,
  select: {
    id: true,
    email: true,
    contentViolationStatus: true,
    contentViolationMutedUntil: true,
    contentViolationCount: true,
    profile: { select: { nickname: true } },
    contentViolations: {
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: {
        id: true,
        surface: true,
        category: true,
        flaggedText: true,
        score: true,
        action: true,
        createdAt: true,
        conversationId: true,
        recipientUserId: true,
        recipient: {
          select: {
            email: true,
            profile: { select: { nickname: true } },
          },
        },
      },
    },
  },
});
// + count with same where
```

Uses existing `@@index([userId, createdAt(sort: Desc)])`. **No** new status index this story (volume small).

### 4. Blocked-users response (locked)

```ts
{
  users: Array<{
    userId: string;
    userEmail: string;
    userNickname: string | null;
    userStatus: string; // profile_edit_blocked | messaging_muted
    userMutedUntil: string | null; // ISO
    violationCount: number;
    latestViolation: null | {
      id: string;
      surface: string;
      category: string;
      flaggedTextPreview: string; // slice(0, 100) always
      flaggedText: string;        // FULL text — always on this endpoint
      score: number | null;
      action: string;
      createdAt: string;
      conversationId: string | null;
      recipientUserId: string | null;
      recipientEmail: string | null;
      recipientNickname: string | null;
    };
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

`latestViolation: null` if user has status but no rows (edge / data oddity) — still list the user.

### 5. Full text policy (locked)

| Endpoint | Default | Full `flaggedText` |
|----------|---------|---------------------|
| `GET .../blocked-users` | — | **Always** on `latestViolation` (review queue) |
| `GET .../content-violations` | preview only | Only if query `includeFullText=1` (truthy: `1` / `true`) |

When `includeFullText` set on violations list, add optional field `flaggedText` on each item; keep `flaggedTextPreview`. Default responses must **not** include `flaggedText` (preserve Story 05 tests).

Do **not** log full text in obs.

### 6. Unblock (locked)

Reuse existing `POST .../unblock/:userId` + `ADMIN_CONTENT_UNBLOCK`. No API change.

UI after success: reload **blocked-users** + **violations** (+ stats optional).

### 7. UI (locked)

Same `/admin/content-violations` page (zinc/emerald admin style):

1. Stats (unchanged)
2. **Section: Blocked / muted users** — table: User | Status | Muted until | Last phrase (full text, wrap/clamp) | To (recipient) | Conversation | Unblock
3. Existing filters + violations feed (preview; no need to pass `includeFullText` from UI this story unless trivial)

Simple vertical sections — **no** new route. Optional local toggle/tabs OK if cleaner; default = both visible (blocked section first).

Client: `listAdminBlockedUsers({ limit, offset })`.

### 8. Tests (locked)

| Spec | Cover |
|------|-------|
| `admin-content-violations.service.spec.ts` | `listBlockedUsers` filters statuses; maps latest + recipient; full `flaggedText` |
| `admin-content-violations-http.integration.spec.ts` | non-admin 403 on blocked-users; admin 200 shape; violations list without `includeFullText` omits `flaggedText`; with flag includes it; unblock then blocked list empty (mock) |

Skip Playwright / Agent 4.

### 9. Agent 4

**Skip.**

---

## Runtime topology

```text
Admin page
  → GET blocked-users (full latest phrase + recipient)
  → GET content-violations (preview)
  → POST unblock/:userId → refresh both
```

---

## Open questions / blockers

- None blocking Agent 1.

---

## Next agent

```text
--agent 1 sprint 32 story 2
```

**Notes for next agent:**

1. Implement `listBlockedUsers` + route first; then full-text opt-in on list; then UI section.
2. Do not change Unblock body/response.
3. Blocked-users always returns full text; violations list default stays preview-only.
4. Commit with story message; write `agent-1-dev.md`.
