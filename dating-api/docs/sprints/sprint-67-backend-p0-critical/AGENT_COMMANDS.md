# Agent Commands — Sprint 67 (Backend P0 Critical Fixes)

Quick-reference commands for AI agents executing Sprint 67 stories.

**IMPORTANT:** All agents must follow SOLID/OOP/KISS principles. See guidance below.

---

## SOLID/OOP/KISS Enforcement for All Stories

### Before Starting ANY Story

**Read these principles. They are MANDATORY for all code changes:**

#### ✅ Single Responsibility Principle (SRP)
- Each class/service has ONE reason to change
- If a class does "A and B", split into ClassA + ClassB
- Max 10 public methods per service
- Max 200 LOC per service class (aim for <150)

#### ✅ Open/Closed Principle (OCP)
- Extend behavior via interfaces, not modification
- Use dependency injection for swappable implementations
- Prefer composition over inheritance

#### ✅ Liskov Substitution Principle (LSP)
- Interfaces/ports must have contracts that all implementations can honor
- Don't leak implementation details into abstractions

#### ✅ Interface Segregation Principle (ISP)
- Split fat interfaces into focused ones
- Clients shouldn't depend on methods they don't use
- Example: Don't inject full `PrismaService` when you only need `prisma.user.findUnique`

#### ✅ Dependency Inversion Principle (DIP)
- High-level modules depend on abstractions (ports), not concretions
- Infrastructure adapters implement ports
- NEVER import `firebase-admin`, `@aws-sdk/*`, `openai` directly in services
- ALWAYS create port (interface) + adapter pattern

#### ✅ KISS (Keep It Simple, Stupid)
- Start with simplest solution that works
- Don't add retry/fallback/multi-provider on day 1
- Don't build state machines when if/else suffices
- Don't create abstractions until you need them (YAGNI)

#### ✅ No God Classes/Files
- No class >200 LOC
- No file >500 LOC (except data files like translations, regex config)
- If class grows >150 LOC, extract helpers or split responsibilities
- If file grows >400 LOC, review for SRP violation

#### ✅ Clean Code
- Descriptive names (no abbreviations like `svc`, `repo`, `mgr`)
- Small methods (<30 lines, <3 levels of nesting)
- No duplicate code (DRY)
- No magic numbers/strings (use named constants)
- No console.log (use NestJS Logger)

---

## Paste commands (Cursor)

Paste **one line at a time** in order: `-1 → 0 → 1 → 2 → (4 if listed) → 3`

```text
--agent -1 sprint 67 story 1
--agent 0 sprint 67 story 1
--agent 1 sprint 67 story 1
--agent 2 sprint 67 story 1
--agent 3 sprint 67 story 1

--agent -1 sprint 67 story 2
--agent 0 sprint 67 story 2
--agent 1 sprint 67 story 2
--agent 2 sprint 67 story 2
--agent 3 sprint 67 story 2

--agent -1 sprint 67 story 3
--agent 0 sprint 67 story 3
--agent 1 sprint 67 story 3
--agent 2 sprint 67 story 3
--agent 3 sprint 67 story 3

--agent -1 sprint 67 story 4
--agent 0 sprint 67 story 4
--agent 1 sprint 67 story 4
--agent 2 sprint 67 story 4
--agent 3 sprint 67 story 4
```

---

## Story descriptions

**Story 1:** FCM Push Notifications Infrastructure  
- Create port: `IPushNotificationProvider`
- Create adapter: `FCMPushProvider` (DIP pattern)
- Create repo: `DeviceTokenRepository`
- Create service: `NotificationService` (thin, <100 LOC)
- Add Bull queue for async sends
- **SOLID focus:** DIP (port+adapter), SRP (thin service), ISP (focused repo interface)

**Story 2:** Match State Consistency Fixes  
- Fix PASS/BLOCK → UNMATCH conversation
- Fix rematch → REACTIVATE conversation
- Transaction boundaries (atomic updates)
- **SOLID focus:** Transaction atomicity, no god methods, clean logic flow

**Story 3:** Production Infrastructure Validation  
- Redis fail-fast (no silent continue)
- Photo storage require S3 in prod
- Photo moderation require Rekognition in prod
- Boot-time checks (throw if misconfigured)
- **SOLID focus:** KISS (simple validation), fail-fast principle

**Story 4:** Multi-Audience Google OAuth  
- Accept string[] for client IDs
- Support web + Android + iOS
- **SOLID focus:** OCP (extend without modifying service), KISS (config-only change)

---

## Agent Instructions (Paste into Each Story)

When running agent commands, include this prompt for EVERY story:

```
You are implementing Sprint 67 Story [N].

MANDATORY REQUIREMENTS:

1. SOLID Principles:
   - SRP: One responsibility per class
   - DIP: Use ports (interfaces) for external dependencies
   - ISP: Focused interfaces, no fat abstractions
   - OCP: Extend via injection, not modification
   - LSP: Honor contracts

2. Clean Code:
   - No god classes (max 200 LOC per service)
   - No god methods (max 30 LOC per method)
   - Descriptive names (no abbreviations)
   - No duplicate code
   - No console.log (use Logger)

3. Architecture:
   - Port + Adapter for external services (FCM, S3, etc.)
   - Repository pattern for data access
   - Thin services (orchestrate, don't contain logic)
   - Bull queues for async work

4. Testing:
   - Unit tests for business logic
   - Integration tests for data flow
   - Mock external dependencies via ports

Read the full story doc before starting.
Follow the implementation steps exactly.
Check the SOLID/OOP/KISS checklist at the end.
```

---

## Order

Run **sequentially:** Story 1 → Story 2 → Story 3 → Story 4

**Story 1** is longest (3-4 days) - start it first.  
**Stories 2-4** can run in parallel after Story 1 completes.

---

## Code Review Checklist (For Each Story)

Before marking complete, verify:

- [ ] No classes >200 LOC
- [ ] No methods >30 LOC
- [ ] No files >500 LOC (except data files)
- [ ] All external services behind ports (DIP)
- [ ] No direct imports of `firebase-admin`, `@aws-sdk`, etc. in services
- [ ] Services use `@Inject(TOKEN)` for dependencies
- [ ] Repository interfaces defined separately from implementations
- [ ] No console.log in production code
- [ ] Logger used for all logging
- [ ] Tests cover happy path + error cases
- [ ] Integration tests for data flow
- [ ] No duplicate code (DRY)

---

## Common Anti-Patterns to AVOID

### ❌ God Service
```typescript
// DON'T: 400-line service with 15 methods
export class NotificationService {
  sendMessageNotification() { ... }
  sendMatchNotification() { ... }
  sendReminderNotification() { ... }
  sendMarketingNotification() { ... }
  // ... 11 more methods
}
```

### ✅ Thin Service + Delegators
```typescript
// DO: Thin orchestrator
export class NotificationService {
  constructor(
    private messageNotifier: MessageNotifier,
    private matchNotifier: MatchNotifier,
  ) {}

  async notifyNewMessage(...) {
    return this.messageNotifier.send(...);
  }

  async notifyMutualMatch(...) {
    return this.matchNotifier.send(...);
  }
}

// Separate focused classes
export class MessageNotifier { ... } // <100 LOC
export class MatchNotifier { ... }   // <100 LOC
```

---

### ❌ Direct External Dependency
```typescript
// DON'T: Import Firebase directly
import * as admin from 'firebase-admin';

export class NotificationService {
  async send() {
    await admin.messaging().send(...); // Tightly coupled!
  }
}
```

### ✅ Port + Adapter (DIP)
```typescript
// DO: Define port
export interface IPushProvider {
  send(token: string, payload: Payload): Promise<void>;
}

// Inject abstraction
export class NotificationService {
  constructor(
    @Inject('IPushProvider') private push: IPushProvider
  ) {}

  async send() {
    await this.push.send(...); // Decoupled!
  }
}

// Adapter implements port
export class FCMPushProvider implements IPushProvider {
  async send(...) {
    const admin = require('firebase-admin'); // Only in adapter
    await admin.messaging().send(...);
  }
}
```

---

### ❌ Fat Repository Interface
```typescript
// DON'T: Repository exposes 20 methods
export interface IDeviceTokenRepo {
  findById(), findByUserId(), findByToken(), findByPlatform(),
  findActiveTokens(), findExpiredTokens(), countByUser(),
  create(), createBatch(), update(), updateBatch(),
  delete(), deleteBatch(), deleteExpired(), upsert(),
  // ... 6 more
}
```

### ✅ Focused Interface (ISP)
```typescript
// DO: Only what clients need
export interface IDeviceTokenRepo {
  upsert(userId: string, token: string, platform: string): Promise<void>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
  delete(token: string): Promise<void>;
}
// If you need more methods later, add them then (YAGNI)
```

---

## See also

- [README.md](./README.md) — Sprint overview
- [STORY_01_fcm_push_notifications.md](./STORY_01_fcm_push_notifications.md)
- [STORY_02_match_state_consistency.md](./STORY_02_match_state_consistency.md)
- [STORY_03_production_validation.md](./STORY_03_production_validation.md)
- [STORY_04_multi_audience_oauth.md](./STORY_04_multi_audience_oauth.md)
- [GO_LIVE_CHECKLIST.md](../../GO_LIVE_CHECKLIST.md)
