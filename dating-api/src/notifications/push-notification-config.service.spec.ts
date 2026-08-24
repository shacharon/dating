import { PushNotificationConfigService } from './push-notification-config.service';
import type { ConfigService } from '@nestjs/config';

describe('PushNotificationConfigService', () => {
  function make(env: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new PushNotificationConfigService(config);
  }

  it('defaults to disabled without PUSH_PROVIDER=fcm', () => {
    const svc = make({});
    expect(svc.provider).toBe('disabled');
    expect(svc.isSendingEnabled).toBe(false);
  });

  it('requires all FCM credentials for isSendingEnabled', () => {
    const incomplete = make({
      PUSH_PROVIDER: 'fcm',
      FCM_PROJECT_ID: 'p',
      FCM_CLIENT_EMAIL: 'e@x.com',
    });
    expect(incomplete.provider).toBe('fcm');
    expect(incomplete.isSendingEnabled).toBe(false);

    const complete = make({
      PUSH_PROVIDER: 'fcm',
      FCM_PROJECT_ID: 'p',
      FCM_CLIENT_EMAIL: 'e@x.com',
      FCM_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----',
    });
    expect(complete.isSendingEnabled).toBe(true);
    expect(complete.fcmPrivateKey).toContain('\nABC\n');
  });
});
