# Story 01 — FCM Push Notifications Infrastructure

**Sprint:** 67  
**Effort:** 3-4 days  
**Risk:** 🟠 MEDIUM (new infrastructure, external dependencies)  
**Status:** Done

---

## Objective

Build complete FCM push notification infrastructure so Android users receive notifications for messages and matches when app is backgrounded or closed.

**Deliverable:** Backend can send FCM notifications; device tokens registered and stored.

---

## Current State

**No push infrastructure exists:**
- No device token storage
- No FCM service or Bull queue
- No notification preferences
- Android WebSocket dies when app backgrounded → users miss everything

---

## Target State

```typescript
// User opens Android app
POST /api/v1/me/devices
{ "token": "fcm-token-...", "platform": "android" }

// Someone sends message
→ Bull job: FCM notification
→ User's Android shows "New message from John"

// Mutual match happens
→ Bull job: FCM notification  
→ User's Android shows "You matched with Sarah!"
```

---

## SOLID/OOP/KISS Principles for This Story

### ✅ Single Responsibility Principle (SRP)
- **DON'T:** Add FCM logic to existing `MessagingService`
- **DO:** Create dedicated modules:
  - `NotificationService` (domain logic: when to notify)
  - `FCMProvider` (infrastructure: how to send)
  - `DeviceTokenRepository` (data: storage)

### ✅ Dependency Inversion Principle (DIP)
- **DON'T:** Import `firebase-admin` directly in services
- **DO:** Define ports, inject adapters:
  ```typescript
  // Port
  export interface IPushNotificationProvider {
    send(deviceToken: string, payload: PushPayload): Promise<void>;
  }
  
  // Adapter
  export class FCMPushProvider implements IPushNotificationProvider { ... }
  
  // Service depends on abstraction
  constructor(@Inject('PushProvider') private push: IPushNotificationProvider)
  ```

### ✅ Keep It Simple, Stupid (KISS)
- **DON'T:** Build retry/fallback/multi-provider on day 1
- **DO:** 
  1. Single FCM provider
  2. Fire-and-forget (log failures, don't retry yet)
  3. Bull queue for async sends
  4. Add complexity later if needed

### ✅ Avoid God Classes
- **DON'T:** One `NotificationService` with 15 methods for every notification type
- **DO:** Keep `NotificationService` thin (~100 LOC):
  - Delegate to `MessageNotifier`, `MatchNotifier`, etc.
  - Each notifier = single concern (1 event type)

---

## Implementation Steps

### 1. Create Database Schema

**File:** `prisma/schema.prisma`

```prisma
model DeviceToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique  // FCM registration token
  platform  String   // 'android', 'ios', 'web'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([platform])
  @@map("device_tokens")
}

model NotificationPreference {
  id               String   @id @default(cuid())
  userId           String   @unique
  messagesEnabled  Boolean  @default(true)
  matchesEnabled   Boolean  @default(true)
  marketingEnabled Boolean  @default(false)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("notification_preferences")
}
```

**Run migration:**
```bash
npx prisma migrate dev --name add_push_notifications
```

---

### 2. Create Push Notification Port (DIP)

**File:** `src/notifications/push-notification.port.ts`

```typescript
export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
}

export interface IPushNotificationProvider {
  send(deviceToken: string, payload: PushPayload): Promise<void>;
  sendBatch(deviceTokens: string[], payload: PushPayload): Promise<void>;
}

export const PUSH_NOTIFICATION_PROVIDER = 'IPushNotificationProvider';
```

---

### 3. Create FCM Adapter

**File:** `src/notifications/providers/fcm-push.provider.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { IPushNotificationProvider, PushPayload } from '../push-notification.port';

@Injectable()
export class FCMPushProvider implements IPushNotificationProvider {
  private readonly logger = new Logger(FCMPushProvider.name);
  private firebaseApp: admin.app.App;

  constructor() {
    // Initialize Firebase Admin SDK
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FCM_PROJECT_ID,
        privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FCM_CLIENT_EMAIL,
      }),
    });
  }

  async send(deviceToken: string, payload: PushPayload): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            ...(payload.badge && { badge: payload.badge.toString() }),
          },
        },
      };

      await admin.messaging(this.firebaseApp).send(message);
      this.logger.log(`Push sent to ${deviceToken.substring(0, 10)}...`);
    } catch (error) {
      this.logger.error(`Failed to send push: ${error.message}`);
      // Fire-and-forget for now - don't throw
    }
  }

  async sendBatch(deviceTokens: string[], payload: PushPayload): Promise<void> {
    const message: admin.messaging.MulticastMessage = {
      tokens: deviceTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
    };

    try {
      const response = await admin.messaging(this.firebaseApp).sendMulticast(message);
      this.logger.log(`Batch push: ${response.successCount}/${deviceTokens.length} sent`);
    } catch (error) {
      this.logger.error(`Batch push failed: ${error.message}`);
    }
  }
}
```

---

### 4. Create Device Token Repository

**File:** `src/notifications/repositories/device-token.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IDeviceTokenRepository {
  upsert(userId: string, token: string, platform: string): Promise<void>;
  findByUserId(userId: string): Promise<Array<{ token: string; platform: string }>>;
  delete(token: string): Promise<void>;
}

@Injectable()
export class PrismaDeviceTokenRepository implements IDeviceTokenRepository {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
  }

  async findByUserId(userId: string): Promise<Array<{ token: string; platform: string }>> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });
    return tokens;
  }

  async delete(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }
}

export const DEVICE_TOKEN_REPOSITORY = 'IDeviceTokenRepository';
```

---

### 5. Create Notification Service (Thin Orchestrator)

**File:** `src/notifications/notification.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IPushNotificationProvider, PUSH_NOTIFICATION_PROVIDER } from './push-notification.port';
import { IDeviceTokenRepository, DEVICE_TOKEN_REPOSITORY } from './repositories/device-token.repository';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(PUSH_NOTIFICATION_PROVIDER) private pushProvider: IPushNotificationProvider,
    @Inject(DEVICE_TOKEN_REPOSITORY) private deviceTokenRepo: IDeviceTokenRepository,
  ) {}

  async notifyNewMessage(recipientUserId: string, senderName: string, messagePreview: string): Promise<void> {
    const devices = await this.deviceTokenRepo.findByUserId(recipientUserId);
    
    if (devices.length === 0) {
      return; // No devices registered
    }

    const tokens = devices.map(d => d.token);
    await this.pushProvider.sendBatch(tokens, {
      title: `New message from ${senderName}`,
      body: messagePreview,
      data: {
        type: 'new_message',
        senderId: senderName,
      },
    });
  }

  async notifyMutualMatch(userId: string, matchedUserName: string): Promise<void> {
    const devices = await this.deviceTokenRepo.findByUserId(userId);
    
    if (devices.length === 0) {
      return;
    }

    const tokens = devices.map(d => d.token);
    await this.pushProvider.sendBatch(tokens, {
      title: 'New Match! 💕',
      body: `You matched with ${matchedUserName}`,
      data: {
        type: 'mutual_match',
        matchedUserName,
      },
    });
  }
}
```

**LOC:** ~60 (thin, delegates to provider)

---

### 6. Create Device Token Controller

**File:** `src/notifications/notification.controller.ts`

```typescript
import { Controller, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IDeviceTokenRepository, DEVICE_TOKEN_REPOSITORY } from './repositories/device-token.repository';
import { Inject } from '@nestjs/common';

@Controller('api/v1/me/devices')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY) private deviceTokenRepo: IDeviceTokenRepository,
  ) {}

  @Post()
  async registerDevice(
    @Req() req,
    @Body() body: { token: string; platform: 'android' | 'ios' | 'web' },
  ) {
    const userId = req.user.userId;
    await this.deviceTokenRepo.upsert(userId, body.token, body.platform);
    return { success: true };
  }

  @Delete()
  async unregisterDevice(@Body() body: { token: string }) {
    await this.deviceTokenRepo.delete(body.token);
    return { success: true };
  }
}
```

---

### 7. Create Bull Queue for Async Sends

**File:** `src/notifications/notification.processor.ts`

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationService } from './notification.service';

@Processor('notifications')
export class NotificationProcessor {
  constructor(private notificationService: NotificationService) {}

  @Process('new-message')
  async handleNewMessage(job: Job<{ recipientUserId: string; senderName: string; messagePreview: string }>) {
    await this.notificationService.notifyNewMessage(
      job.data.recipientUserId,
      job.data.senderName,
      job.data.messagePreview,
    );
  }

  @Process('mutual-match')
  async handleMutualMatch(job: Job<{ userId: string; matchedUserName: string }>) {
    await this.notificationService.notifyMutualMatch(job.data.userId, job.data.matchedUserName);
  }
}
```

---

### 8. Enqueue Notifications on Events

**File:** `src/me-profile/me-conversation-messages.service.ts`

```typescript
// After message send succeeds:
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

constructor(
  // ... existing injections
  @InjectQueue('notifications') private notificationQueue: Queue,
) {}

async sendMessage(senderId: string, conversationId: string, text: string) {
  // ... existing send logic
  
  const message = await this.messageRepo.create({ senderId, conversationId, text });
  
  // Enqueue push notification
  const recipientId = await this.getRecipientId(conversationId, senderId);
  const senderName = await this.getUserName(senderId);
  
  await this.notificationQueue.add('new-message', {
    recipientUserId: recipientId,
    senderName,
    messagePreview: text.substring(0, 100),
  });
  
  return message;
}
```

**File:** `src/me-profile/repositories/prisma-match.repository.ts`

```typescript
// After mutual match created:
async upsertActionAndDetectMutual(...) {
  // ... existing logic
  
  if (mutualMatch) {
    // Enqueue notifications for both users
    await this.notificationQueue.add('mutual-match', {
      userId: userId1,
      matchedUserName: await this.getUserName(userId2),
    });
    
    await this.notificationQueue.add('mutual-match', {
      userId: userId2,
      matchedUserName: await this.getUserName(userId1),
    });
  }
}
```

---

### 9. Wire Up Module

**File:** `src/notifications/notification.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { FCMPushProvider } from './providers/fcm-push.provider';
import { PrismaDeviceTokenRepository, DEVICE_TOKEN_REPOSITORY } from './repositories/device-token.repository';
import { PUSH_NOTIFICATION_PROVIDER } from './push-notification.port';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    {
      provide: PUSH_NOTIFICATION_PROVIDER,
      useClass: FCMPushProvider,
    },
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useClass: PrismaDeviceTokenRepository,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
```

---

### 10. Add Environment Variables

**File:** `.env.example`

```bash
# FCM Push Notifications
FCM_PROJECT_ID="your-firebase-project-id"
FCM_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## Testing

### Unit Tests

**File:** `src/notifications/notification.service.spec.ts`

```typescript
describe('NotificationService', () => {
  let service: NotificationService;
  let pushProvider: IPushNotificationProvider;
  let deviceTokenRepo: IDeviceTokenRepository;

  beforeEach(() => {
    pushProvider = {
      send: jest.fn(),
      sendBatch: jest.fn(),
    };
    deviceTokenRepo = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    };
    service = new NotificationService(pushProvider, deviceTokenRepo);
  });

  it('sends push for new message', async () => {
    (deviceTokenRepo.findByUserId as jest.Mock).mockResolvedValue([
      { token: 'token1', platform: 'android' },
    ]);

    await service.notifyNewMessage('user123', 'John', 'Hello!');

    expect(pushProvider.sendBatch).toHaveBeenCalledWith(['token1'], {
      title: 'New message from John',
      body: 'Hello!',
      data: { type: 'new_message', senderId: 'John' },
    });
  });

  it('does not send if no devices registered', async () => {
    (deviceTokenRepo.findByUserId as jest.Mock).mockResolvedValue([]);

    await service.notifyNewMessage('user123', 'John', 'Hello!');

    expect(pushProvider.sendBatch).not.toHaveBeenCalled();
  });
});
```

---

### Integration Tests

**File:** `src/notifications/notification.integration.spec.ts`

```typescript
describe('Push Notifications (e2e)', () => {
  it('POST /api/v1/me/devices registers token', async () => {
    const { authCookie } = await helper.createUser('user@example.com');

    await request(app.getHttpServer())
      .post('/api/v1/me/devices')
      .set('Cookie', authCookie)
      .send({
        token: 'fcm-token-xyz',
        platform: 'android',
      })
      .expect(200);

    // Verify in DB
    const tokens = await prisma.deviceToken.findMany({ where: { token: 'fcm-token-xyz' } });
    expect(tokens).toHaveLength(1);
  });

  it('enqueues push notification on message send', async () => {
    // Create conversation
    // Send message
    // Check Bull queue has 'new-message' job
  });
});
```

---

## SOLID/OOP/KISS Checklist

- [x] `PushDispatchService` thin (orchestrates prefs/devices/provider only; Agent 0 name vs story draft)
- [x] `FcmPushProvider` isolated behind `PushNotificationProvider` port
- [x] `DeviceTokenRepository` handles DB, not mixed with business logic
- [x] No god classes (each class <200 LOC)
- [x] Queue handlers: one path per event kind (`new_message` / `mutual_match`)
- [x] DIP: Services depend on ports, not concrete Firebase SDK
- [x] KISS: Fire-and-forget for now, no retry complexity yet
- [x] No leaked abstractions (Firebase details not in service layer)

---

## Files Changed/Created

**New files (~15 total):**
- `prisma/migrations/*_add_push_notifications.sql`
- `src/notifications/notification.module.ts`
- `src/notifications/notification.service.ts`
- `src/notifications/notification.controller.ts`
- `src/notifications/notification.processor.ts`
- `src/notifications/push-notification.port.ts`
- `src/notifications/providers/fcm-push.provider.ts`
- `src/notifications/repositories/device-token.repository.ts`
- `src/notifications/notification.service.spec.ts`
- `src/notifications/notification.integration.spec.ts`

**Modified files:**
- `src/me-profile/me-conversation-messages.service.ts` (enqueue on send)
- `src/me-profile/repositories/prisma-match.repository.ts` (enqueue on match)
- `src/app.module.ts` (import NotificationModule)
- `.env.example` (add FCM vars)

---

## Success Criteria

- [x] Device token registration endpoint works (`POST/DELETE /api/v1/me/devices`)
- [x] Push enqueued/sent on message (backend); **Android lock-screen receive deferred to FE-06** (Agent 0 out-of-DoD)
- [x] Push enqueued/sent on mutual match (backend)
- [x] Bull queue processing notifications (inline degrade without Redis)
- [x] No god classes created (all <200 LOC)
- [x] DIP pattern followed (port + adapter)
- [x] Tests pass (Agent 2: 69; Agent 2.5: device cap coverage)
- [x] Integration test: devices HTTP + enqueue wiring (physical FCM → FE-06)

---

## Effort Estimate

- Schema + migration: 1 hour
- Port + adapter + repo: 4 hours
- Service + controller: 3 hours
- Bull queue + processor: 3 hours
- Enqueue on events: 2 hours
- Testing: 6 hours
- Integration testing (Android): 4 hours

**Total:** 23 hours (~3 days)
