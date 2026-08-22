import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationConfigService } from './push-notification-config.service';
import type { PushNotificationProvider } from './push-notification.port';
import { FcmPushProvider } from './providers/fcm-push.provider';
import { NoopPushProvider } from './providers/noop-push.provider';

@Injectable()
export class PushProviderResolver {
  private readonly logger = new Logger(PushProviderResolver.name);

  constructor(
    private readonly config: PushNotificationConfigService,
    private readonly fcm: FcmPushProvider,
    private readonly noop: NoopPushProvider,
  ) {}

  resolve(): PushNotificationProvider {
    if (this.config.provider === 'fcm' && this.config.hasFcmCredentials) {
      return this.fcm;
    }
    if (this.config.provider === 'fcm' && !this.config.hasFcmCredentials) {
      this.logger.warn(
        'PUSH_PROVIDER=fcm but FCM credentials missing — using noop',
      );
    }
    return this.noop;
  }
}
