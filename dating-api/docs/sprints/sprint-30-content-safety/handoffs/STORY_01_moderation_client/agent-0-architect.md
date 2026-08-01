# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_moderation_client.md](../../STORY_01_moderation_client.md)  
**Sprint:** sprint-30-content-safety  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Greenfield foundation (schema + client + violation service). **Skip Agent 4** (unit + Prisma integration specs sufficient; no public HTTP surface in this story).

---

## Summary

- Add Prisma **`UserContentViolation`** + User status fields for progressive enforcement (Stories 02–04 consume).
- Add Nest module **`content-moderation/`** with:
  - `OpenAIModerationClient` — Moderation API via official `openai` SDK (`moderations.create`), **5s** timeout, **fail-open**
  - `ContentViolationService` — persist + count + read status (threshold **enforcement** stays Story 04)
  - `isContentModerationEnabled()` helper for Stories 02–03
- Wire module into `AppModule`; delete violation rows on account scrub in `MeAccountService` (DATA_RETENTION).
- **Do not** gate profile/messages yet (Stories 02–03).

---

## Artifacts

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | `UserContentViolation` + User fields + relation |
| `prisma/migrations/*_add_content_moderation/` | migration |
| `src/content-moderation/openai-moderation.client.ts` | **create** |
| `src/content-moderation/openai-moderation.client.spec.ts` | **create** |
| `src/content-moderation/content-violation.service.ts` | **create** |
| `src/content-moderation/content-violation.service.spec.ts` | **create** |
| `src/content-moderation/content-moderation.types.ts` | surfaces, result types, enabled helper |
| `src/content-moderation/content-moderation.module.ts` | **create**; export client + violation service |
| `src/content-moderation/content-violation.integration.spec.ts` | record → count (real Prisma if suite pattern allows) |
| `src/app.module.ts` | import `ContentModerationModule` |
| `src/me-account/me-account.service.ts` | `deleteMany` violations in account-delete txn |
| `src/me-account/me-account.service.spec.ts` | assert violations deleted |
| `src/logging/error-codes.ts` | moderation codes |
| `.env.example` (if present) | document `CONTENT_MODERATION_ENABLED` |

**Out of scope Story 1:** MeProfile / message gates, admin UI, `enforceViolationThreshold`, deleting placeholder profanity file.

---

## Decisions (do not reverse without discussion)

### 1. Module placement (locked)

```text
src/content-moderation/
  content-moderation.module.ts
  content-moderation.types.ts
  openai-moderation.client.ts
  content-violation.service.ts
  *.spec.ts
```

- **Do not** fold into `llm/openai/openai.client.ts` (that client is chat/completions JSON). Keep Moderation as a separate injectable.
- Import `PrismaModule` + `StructuredLoggingModule` (or whatever existing obs module name is — match peer services).
- Inject API key via existing **`LLM_CONFIG`** token (`config.openai.apiKey`) — same key as GPT. Import `LlmModule` **or** re-provide `LLM_CONFIG` carefully:
  - **Preferred:** import `LlmModule` only if it exports `LLM_CONFIG`. Today `LlmModule` exports **only** `LLMRouterService`.
  - **Locked workaround:** ContentModerationModule provides its own thin factory that calls `loadLLMConfig()` from `llm/llm.config.ts` **or** injects `ConfigService` / `process.env.OPENAI_API_KEY` with the same trim rules as `loadLLMConfig`.
  - Simplest lock: **read `loadLLMConfig().openai.apiKey` inside `OpenAIModerationClient` constructor** (no Nest cycle with LlmModule). Document that boot already requires `OPENAI_API_KEY` via LlmModule.

### 2. Prisma schema (locked)

```prisma
model UserContentViolation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  surface     String
  flaggedText String   @db.Text
  category    String
  score       Float?
  action      String
  createdAt   DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([surface, createdAt(sort: Desc)])
  @@index([userId, surface, createdAt(sort: Desc)])
}

model User {
  // existing fields...
  contentViolationStatus     String    @default("ok")
  contentViolationMutedUntil DateTime?
  contentViolationCount      Int       @default(0)
  contentViolations          UserContentViolation[]
}
```

| Field | Lock |
|-------|------|
| `surface` | String (TS union): `profile_aboutMe` \| `profile_aboutPartner` \| `profile_aboutRelationship` \| `message` |
| `action` | String: `warned` \| `blocked` (Story 1 recorders use `blocked` when gate rejects; `warned` reserved) |
| `contentViolationStatus` | **Non-null** `@default("ok")` — values: `ok` \| `profile_edit_blocked` \| `messaging_muted` |
| Prisma enums | **Not required** this story — strings match story + prefix queries in Story 04 |

**Account delete:** soft-delete keeps `User` row → `onDelete: Cascade` alone is insufficient. Agent 1 **must** add:

```ts
await tx.userContentViolation.deleteMany({ where: { userId } });
```

inside `MeAccountService` delete transaction (alongside other hard deletes).

### 3. `OpenAIModerationClient` (locked)

```ts
export type ModerationResult = {
  flagged: boolean;
  categories: string[];       // keys where categories[k] === true
  primaryCategory: string | null; // max category_scores among all scores (or among flagged only if any flagged)
  score: number;              // that max score; 0 if empty
  failOpen: boolean;          // true if timed out / errored / empty key → treated as not flagged
};

checkContent(text: string): Promise<ModerationResult>
```

| Concern | Lock |
|---------|------|
| SDK | `new OpenAI({ apiKey }).moderations.create({ input })` (package already installed) |
| Timeout | **5000 ms** — `AbortSignal` / SDK timeout option; on abort → fail-open |
| Fail-open | Network/4xx/5xx/parse/missing key → `{ flagged: false, categories: [], primaryCategory: null, score: 0, failOpen: true }` + `obs.trace` / `error` with `CONTENT_MODERATION_FAIL_OPEN` (no raw text) |
| Empty / whitespace input | Return `{ flagged: false, ..., failOpen: false }` without calling API |
| Truncation | If `text.length > 12_000`, send `text.slice(0, 12_000)` (~3k tokens budget) |
| Rate limits | Fail-open (same as errors) |

**primaryCategory:** argmax of `category_scores`; if `flagged`, prefer argmax among **true** category keys when possible.

### 4. Feature flag (locked)

```ts
// content-moderation.types.ts
export function isContentModerationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.CONTENT_MODERATION_ENABLED?.trim().toLowerCase();
  if (raw === undefined || raw === '') return true; // default ON when unset
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}
```

- Story 1 client **always callable**; Stories 02–03 skip checks when flag false.
- Document in `.env.example` if the file exists: `CONTENT_MODERATION_ENABLED=true`.

### 5. `ContentViolationService` (locked)

**Implement in Story 1:**

```ts
recordViolation(args: {
  userId: string;
  surface: ContentViolationSurface;
  flaggedText: string;
  category: string;
  score: number;
  action: 'warned' | 'blocked';
}): Promise<void>
// create row; increment User.contentViolationCount by 1 (atomic update)

getViolationCount(
  userId: string,
  options?: { surface?: string; since?: Date },
): Promise<number>
// surface exact match if provided; if surface ends with `_` prefix convention for Story 04 —
// LOCK Story 1: exact match only. Story 04 may add `surfacePrefix` option.

getUserViolationStatus(userId: string): Promise<{
  status: string;
  mutedUntil: Date | null;
  violationCount: number;
}>
```

**Defer to Story 04:** `enforceViolationThreshold`, `shouldBlockUser` (threshold logic), `clearExpiredMutes`, `getViolationStats`.

Do **not** set `contentViolationStatus` / `mutedUntil` in Story 1 (except leaving defaults). Recording only increments count + inserts row.

### 6. Observability (locked)

Add to `error-codes.ts`:

| Code | When |
|------|------|
| `CONTENT_MODERATION_CHECK` | Optional per-check trace (may be noisy — prefer only fail-open + recorded) |
| `CONTENT_MODERATION_FAIL_OPEN` | Timeout / API error / empty key |
| `CONTENT_VIOLATION_RECORDED` | After successful `recordViolation` |

Log fields: `userId`, `surface`, `category`, `textLength`, `failOpen` — **never** `flaggedText` / raw message body.

### 7. Tests (locked)

| Spec | Must cover |
|------|------------|
| `openai-moderation.client.spec.ts` | Mock SDK: flagged true → primaryCategory; timeout/error → failOpen + not flagged; truncate long input |
| `content-violation.service.spec.ts` | record creates row + increments count; getViolationCount filters `since` / `surface` |
| Integration (preferred) | Real DB: create user → recordViolation → count === 1 |
| `me-account.service.spec.ts` | delete removes violation rows |

No live OpenAI calls in CI — mock `moderations.create`.

### 8. Agent 4

**Skip.**

---

## Runtime topology

```text
Future Stories 02–03
  → isContentModerationEnabled()?
  → OpenAIModerationClient.checkContent(text)
       → openai.moderations.create (5s)
       → fail-open on error
  → if flagged: ContentViolationService.recordViolation(...)
  → throw 400 (Stories 02–03)

Story 1 alone: no HTTP change; module bootstraps with AppModule.
```

---

## Open questions / blockers

- None blocking Agent 1.
- Ops: Story 0 DPA still pending before **prod** moderation enable (orthogonal to this story’s code).

---

## Next agent

```text
--agent 1 sprint 30 story 1
```

**Notes for next agent:**

1. Prisma migrate first; then Nest module + services + specs.
2. Use `openai` SDK `moderations.create` — do not reinvent HTTP unless SDK lacks timeout (then wrap with AbortSignal).
3. Wire `MeAccountService` `deleteMany` for violations.
4. Do **not** implement profile/message gates.
5. Commit with story message; write `agent-1-dev.md`.
