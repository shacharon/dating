import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function trimOrUndefined(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t === '' || t == null ? undefined : t;
}

@Injectable()
export class PushNotificationConfigService {
  constructor(private readonly config: ConfigService) {}

  /** `fcm` sends via Firebase; anything else uses noop. */
  get provider(): 'fcm' | 'disabled' {
    const raw = this.config.get<string>('PUSH_PROVIDER')?.trim().toLowerCase();
    return raw === 'fcm' ? 'fcm' : 'disabled';
  }

  get fcmProjectId(): string | undefined {
    return trimOrUndefined(this.config.get<string>('FCM_PROJECT_ID'));
  }

  get fcmClientEmail(): string | undefined {
    return trimOrUndefined(this.config.get<string>('FCM_CLIENT_EMAIL'));
  }

  get fcmPrivateKey(): string | undefined {
    const raw = trimOrUndefined(this.config.get<string>('FCM_PRIVATE_KEY'));
    return raw?.replace(/\\n/g, '\n');
  }

  get hasFcmCredentials(): boolean {
    return !!(this.fcmProjectId && this.fcmClientEmail && this.fcmPrivateKey);
  }

  get isSendingEnabled(): boolean {
    return this.provider === 'fcm' && this.hasFcmCredentials;
  }
}
