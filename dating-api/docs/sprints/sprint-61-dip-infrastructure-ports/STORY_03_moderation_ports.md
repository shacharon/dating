# Story 03 — Moderation Ports (Text + Rekognition)

**Sprint:** 61  
**Effort:** 2 days  
**Risk:** ⚠️ MEDIUM (messaging send path + photo pipeline)  
**Status:** Done

---

## Objective

1. Messaging / profile text moderation depend on a **port**, not concrete `OpenAIModerationClient`.
2. Photo moderation uses Nest-provided **`RekognitionPort`**, not `new RekognitionClient` in the service constructor.

---

## Current offenders

| Area | Path |
|------|------|
| Message send | `me-profile/me-conversation-messages.service.ts` → `OpenAIModerationClient` |
| Profile text | `me-profile/profile/profile-moderation.service.ts` → `OpenAIModerationClient` |
| OpenAI SDK | `content-moderation/openai-moderation.client.ts` → `new OpenAI(...)` (OK **inside** adapter) |
| Photo / Rekognition | `photo-storage/photo-moderation.service.ts` → constructor `new RekognitionClient` |
| Photo consumers | `admin-photos.service.ts`, `photo-moderation.worker.ts`, `photo-sla.cron.ts` |

**Already good:** `RekognitionPort` type exists but is not Nest-wired as the default.

---

## Design

### Text moderation

```typescript
export const CONTENT_MODERATION = Symbol('CONTENT_MODERATION');

export interface ContentModerationPort {
  checkText(content: string): Promise<ModerationResult>; // shape = current client result
}
```

- `OpenAIModerationClient` implements the port (or thin adapter wraps it).
- Module: `{ provide: CONTENT_MODERATION, useClass: OpenAIModerationClient }` (or `useExisting`).
- Inject `@Inject(CONTENT_MODERATION)` in messages + profile moderation services.
- Tests: bind noop / allow-all fake.

### Rekognition

```typescript
export const REKOGNITION = Symbol('REKOGNITION');
// RekognitionPort already typed in photo-moderation — Nest-provide AWS adapter
```

- Factory builds `RekognitionClient` once in module (credentials from config).
- `PhotoModerationService` injects `@Inject(REKOGNITION) private readonly rekognition: RekognitionPort`.
- Keep `decideFromScores` pure where possible.

---

## Tasks

1. Introduce `CONTENT_MODERATION` token + migrate 2 injectors.
2. Nest-provide `REKOGNITION` / `RekognitionPort`; remove constructor SDK construction.
3. Update `ContentModerationModule` / `PhotoStorageModule` (or photo moderation module) exports.
4. Specs: message send moderation gate, profile moderation, photo moderation unit (fake port).

---

## Success

- [x] No Nest product service injects `OpenAIModerationClient` by concrete type (adapter OK)
- [x] No `new RekognitionClient` in `PhotoModerationService` constructor default path
- [x] Workers/admin still work via same service + ports
- [x] All related tests green

---

## Follow-up

Sprint 62 — Prisma repositories (Match → Conversation → Violations/Reports → Profile photos).

Known noise (not S03): match-list integration/E2E harness mocks missing `prisma.matchListRank` → some `GET /me/matches` cases 500; track outside this story if desired.

---

## Shipped

`feature/sprint-61-story-3` @ `b2f365a`

- `a5e3219` — feat: moderation ports CONTENT_MODERATION + REKOGNITION
- `ec79b07` — test: guard moderation ports wiring
- `b2f365a` — chore: close sprint 61 story 3

**Pipeline:** `-1 → 0 → 1 → 2 → 4 → 3` (Agent 4 = moderation regression smoke; matching eligibility N/A)
