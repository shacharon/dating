import { Injectable, Logger } from '@nestjs/common';
import {
  type App,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PushNotificationConfigService } from '../push-notification-config.service';
import type {
  PushNotificationProvider,
  PushPayload,
} from '../push-notification.port';

const FCM_APP_NAME = 'piza-fcm';

function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

@Injectable()
export class FcmPushProvider implements PushNotificationProvider {
  private readonly logger = new Logger(FcmPushProvider.name);
  private app: App | null = null;

  constructor(private readonly config: PushNotificationConfigService) {}

  private ensureApp(): App | null {
    if (this.app) {
      return this.app;
    }
    const projectId = this.config.fcmProjectId;
    const clientEmail = this.config.fcmClientEmail;
    const privateKey = this.config.fcmPrivateKey;
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('FCM credentials incomplete — send skipped');
      return null;
    }
    const existing = getApps().find((a) => a.name === FCM_APP_NAME);
    if (existing) {
      this.app = existing;
      return this.app;
    }
    this.app = initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      FCM_APP_NAME,
    );
    return this.app;
  }

  async send(deviceToken: string, payload: PushPayload): Promise<void> {
    await this.sendBatch([deviceToken], payload);
  }

  async sendBatch(deviceTokens: string[], payload: PushPayload): Promise<void> {
    const tokens = deviceTokens.map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      return;
    }
    const app = this.ensureApp();
    if (!app) {
      return;
    }
    try {
      const response = await getMessaging(app).sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default' },
        },
      });
      this.logger.log(
        `FCM batch type=${payload.data?.type ?? 'unknown'} success=${response.successCount}/${tokens.length} prefix=${tokenPrefix(tokens[0]!)}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `FCM batch failed type=${payload.data?.type ?? 'unknown'}: ${msg}`,
      );
    }
  }
}
