# Story 01 — OpenAI moderation client + violation storage

**Sprint 30 · Status: 🟡 IN PROGRESS — Agent 2 CR PASS → run Agent 3**  
**Priority:** P0  
**Estimated effort:** 0.5 day  
**Dependencies:** Story 00 Done (disclosure); code can proceed in parallel with ops DPA  
**Handoffs:** [architect](./handoffs/STORY_01_moderation_client/agent-0-architect.md)

---

## Objective

Create reusable OpenAI Moderation API client service + Prisma schema for tracking violations. Foundation for Stories 02-05.

---

## Scope / tasks

1. **Prisma migration:**
   - Add `UserContentViolation` table
   - Add columns to `User`: `contentViolationStatus`, `contentViolationMutedUntil`, `contentViolationCount`
   - Add indexes for fast violation lookups

2. **OpenAI moderation client:**
   - Create `src/content-moderation/openai-moderation.client.ts`
   - Single method: `checkContent(text: string): Promise<ModerationResult>`
   - Returns `{ flagged: boolean, categories: string[], scores: Record<string, number> }`
   - Uses `OPENAI_API_KEY` from env (same key as existing GPT-4 usage)
   - Timeout: 5s (fail-open on timeout — log error, return `flagged: false`)

3. **Violation service:**
   - Create `src/content-moderation/content-violation.service.ts`
   - `recordViolation(userId, surface, text, category, score, action)`
   - `getViolationCount(userId, surface?, sinceDate?): Promise<number>`
   - `getUserViolationStatus(userId): Promise<User['contentViolationStatus']>`

4. **Module wiring:**
   - Create `src/content-moderation/content-moderation.module.ts`
   - Export both services for injection in profile/messaging modules

5. **Config/env:**
   - No new env vars needed (`OPENAI_API_KEY` already exists)
   - Optional: `CONTENT_MODERATION_ENABLED` feature flag (default `true` in prod, `false` in local dev)

6. **Tests:**
   - Unit test for moderation client (mock OpenAI response)
   - Unit test for violation service (Prisma mocks)
   - Integration test: save violation → read count

---

## Acceptance criteria

- [x] Prisma migration runs cleanly (`npx prisma migrate dev`)
- [x] `OpenAIModerationClient.checkContent()` returns expected shape for sample text
- [x] `ContentViolationService.recordViolation()` creates row in DB
- [x] `ContentViolationService.getViolationCount()` returns correct count filtered by surface/date
- [x] Unit + integration tests green
- [x] Module exports services for injection

---

## Technical details

### Prisma schema additions

```prisma
model UserContentViolation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  surface     String   // 'profile_aboutMe' | 'profile_aboutPartner' | 'profile_aboutRelationship' | 'message'
  flaggedText String   @db.Text
  category    String   // 'sexual' | 'hate' | 'harassment' | 'violence' | etc.
  score       Float?
  action      String   // 'warned' | 'blocked'
  createdAt   DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([surface, createdAt(sort: Desc)])
}

model User {
  // ... existing fields ...
  contentViolationStatus    String?   // 'ok' | 'profile_edit_blocked' | 'messaging_muted'
  contentViolationMutedUntil DateTime?
  contentViolationCount     Int       @default(0)
  contentViolations         UserContentViolation[]
}
```

### OpenAI API request shape

```typescript
POST https://api.openai.com/v1/moderations
Headers: {
  "Authorization": "Bearer sk-...",
  "Content-Type": "application/json"
}
Body: {
  "input": "user text here"
}

Response: {
  "id": "modr-...",
  "model": "text-moderation-007",
  "results": [{
    "flagged": true,
    "categories": {
      "sexual": true,
      "hate": false,
      "harassment": false,
      "self-harm": false,
      "sexual/minors": false,
      "hate/threatening": false,
      "violence/graphic": false,
      "self-harm/intent": false,
      "self-harm/instructions": false,
      "harassment/threatening": false,
      "violence": false
    },
    "category_scores": {
      "sexual": 0.98,
      "hate": 0.01,
      // ...
    }
  }]
}
```

### Violation service interface

```typescript
interface ModerationResult {
  flagged: boolean;
  categories: string[]; // ['sexual', 'hate']
  primaryCategory: string | null; // highest-scoring category
  score: number; // highest score
}

class ContentViolationService {
  async recordViolation(args: {
    userId: string;
    surface: 'profile_aboutMe' | 'profile_aboutPartner' | 'profile_aboutRelationship' | 'message';
    flaggedText: string;
    category: string;
    score: number;
    action: 'warned' | 'blocked';
  }): Promise<void>;

  async getViolationCount(
    userId: string,
    options?: {
      surface?: string;
      since?: Date;
    }
  ): Promise<number>;

  async shouldBlockUser(userId: string, surface: 'profile' | 'message'): Promise<boolean>;
}
```

---

## Observability

- Log every moderation check: `obs.trace('content moderation check surface={} flagged={} category={}', ErrorCodes.CONTENT_MODERATION_CHECK)`
- Log violations: `obs.trace('content violation recorded userId={} surface={} category={}', ErrorCodes.CONTENT_VIOLATION_RECORDED)` (no raw text in logs)
- Log blocks: `obs.trace('user content blocked userId={} reason={}', ErrorCodes.CONTENT_USER_BLOCKED)`

---

## Notes / gotchas

- **Fail-open on timeout:** If OpenAI API is down/slow, don't block all user activity — log error, allow content through, queue for async review later
- **Text truncation:** OpenAI moderation API has token limits (~4k tokens) — if text is longer, truncate to first 3k tokens before sending
- **No PII in logs:** Never log raw flagged text in traces (only length + category)
- **Rate limit:** OpenAI moderation API has rate limits (typically 3k/min) — if we hit it, fail-open + alert ops

---

## Deliverables

- `prisma/migrations/YYYYMMDDHHMMSS_add_content_moderation/migration.sql`
- `src/content-moderation/openai-moderation.client.ts`
- `src/content-moderation/openai-moderation.client.spec.ts`
- `src/content-moderation/content-violation.service.ts`
- `src/content-moderation/content-violation.service.spec.ts`
- `src/content-moderation/content-moderation.module.ts`
- `src/logging/error-codes.ts` (add new codes)

---

## Commit message

```
feat(moderation): add OpenAI moderation client + violation storage

Add reusable moderation client service and violation tracking
schema for Sprint 30 content safety gate.

Sprint 30 Story 1
```
