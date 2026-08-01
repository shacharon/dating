# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_message_violation_context.md](../../STORY_01_message_violation_context.md)  
**Sprint:** sprint-32-moderation-ops  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Schema + wire message gate + admin list DTO enrichment. **Skip Agent 4** (unit + existing admin HTTP specs).

---

## Summary

- Persist **`conversationId`** + **`recipientUserId`** on message violations (nullable for profile).
- API `conversationId` **is** `MutualMatch.id` (same as `Message.conversationId`) — no separate Conversation table.
- Extend `recordViolation` + message moderation call site; enrich admin list with recipient email/nickname.
- Light UI: show recipient columns on existing `/admin/content-violations` table (blocked-users queue stays Story 02).

**Out of scope:** Blocked-users table (Story 02), soft policy (Story 03), cron (Story 04), backfill of old rows, full flagged text (still preview-only).

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | `UserContentViolation` + User recipient relation |
| `prisma/migrations/20260801153000_add_content_violation_message_context/` | migration |
| `src/content-moderation/content-violation.service.ts` (+ spec) | optional context on `recordViolation` |
| `src/me-profile/me-conversation-messages.service.ts` (+ spec) | pass conversation + recipient |
| `src/admin/admin-content-violations/*` (+ specs) | list DTO + joins |
| `dating-ui/.../admin-content-violations-api.ts` + page client | types + recipient columns |

---

## Decisions (do not reverse without discussion)

### 1. Schema (locked)

```prisma
model UserContentViolation {
  // ... existing fields ...
  conversationId   String?
  conversation     MutualMatch? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  recipientUserId  String?
  recipient        User?        @relation("ContentViolationRecipient", fields: [recipientUserId], references: [id], onDelete: SetNull)

  @@index([recipientUserId, createdAt(sort: Desc)])
  @@index([conversationId, createdAt(sort: Desc)])
}
```

On `User`, add opposite relation:

```prisma
contentViolationsAsRecipient UserContentViolation[] @relation("ContentViolationRecipient")
```

On `MutualMatch`, add:

```prisma
contentViolations UserContentViolation[]
```

| Field | Required | FK | onDelete |
|-------|----------|-----|----------|
| `conversationId` | no | `MutualMatch.id` | **SetNull** (keep violation if match removed) |
| `recipientUserId` | no | `User.id` | **SetNull** |
| `userId` (offender) | yes | `User.id` | keep **Cascade** (unchanged) |

**Naming:** keep API/DB column name `conversationId` for parity with messaging routes — even though the Prisma model is `MutualMatch`.

**Do not** invent a Conversation table. **Do not** FK to `MatchAction` / other match types.

Migration folder (locked name):

`20260801153000_add_content_violation_message_context`

No backfill.

### 2. `recordViolation` (locked)

```ts
async recordViolation(args: {
  userId: string;
  surface: ContentViolationSurface;
  flaggedText: string;
  category: string;
  score: number;
  action: ContentViolationAction;
  /** Message surface only — MutualMatch id */
  conversationId?: string | null;
  recipientUserId?: string | null;
}): Promise<void>
```

- Persist optional fields when provided (null/omit → DB null).
- **Do not** validate that recipient is the other participant inside the violation service (caller owns correctness).
- Observability: still **no** raw text; optional ids OK:  
  `surface=message conversationId=… recipientUserId=…` on existing `CONTENT_VIOLATION_RECORDED` / flagged traces if easy — **do not** log emails.

### 3. Message gate (locked)

In `MeConversationMessagesService.sendMessage`:

1. After `assertActiveConversationParticipant` → have `match`.
2. `recipientUserId = sessionUserId === match.userId1 ? match.userId2 : match.userId1`.
3. Pass into moderation:

```ts
await this.moderateMessageText(sessionUserId, trimmed, {
  conversationId,
  recipientUserId,
});
```

4. On flag, `recordViolation({ …, surface: 'message', conversationId, recipientUserId })`.

Profile `moderateProfileTextFields` — **unchanged** (context fields stay null).

### 4. Admin list (locked)

Extend `AdminContentViolationListItemDto`:

```ts
conversationId: string | null;
recipientUserId: string | null;
recipientEmail: string | null;
recipientNickname: string | null;
```

Prisma list `include`:

```ts
user: { /* existing select */ },
recipient: {
  select: {
    email: true,
    profile: { select: { nickname: true } },
  },
},
```

Mapping: if `recipient` null → all recipient fields null; `conversationId` from row as-is.

Preview still **≤100** chars — Story 02 may add full text.

### 5. UI (locked — minimal)

- Update TS types in `admin-content-violations-api.ts`.
- Add table columns: **Conversation** (mono id truncated/copyable) and **To** (email / nickname) when present; show `—` for profile rows.
- No new page/tab (Story 02).

### 6. Tests (locked)

| Spec | Cover |
|------|-------|
| `content-violation.service.spec.ts` | `recordViolation` writes conversationId + recipientUserId when passed; omit → null |
| `me-conversation-messages.service.spec.ts` | flagged path calls `recordViolation` with conversationId + other participant |
| `admin-content-violations.service.spec.ts` | list maps recipient email/nickname |
| `admin-content-violations-http.integration.spec.ts` | list body includes new fields (null or populated via mock) |

Skip Playwright / Agent 4.

### 7. Agent 4

**Skip.**

---

## Runtime topology

```text
sendMessage
  → assert participant (MutualMatch)
  → recipient = other userId
  → moderate → recordViolation(+ conversationId, recipientUserId)
  → admin GET list joins recipient User
```

---

## Open questions / blockers

- None blocking Agent 1.

---

## Next agent

```text
--agent 1 sprint 32 story 1
```

**Notes for next agent:**

1. Migration + Prisma generate first; then `recordViolation`; then message service; then admin + UI.
2. `onDelete: SetNull` for conversation/recipient — not Cascade.
3. Profile paths must not pass fake conversation ids.
4. Commit with story message; write `agent-1-dev.md`.
