import { Inject, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationConfigService } from './push-notification-config.service';
import {
  PUSH_NOTIFICATION_PROVIDER,
  type PushNotificationProvider,
  type PushPayload,
} from './push-notification.port';
import {
  DEVICE_TOKEN_REPOSITORY,
  type IDeviceTokenRepository,
} from './repositories/device-token.repository';

@Injectable()
export class PushDispatchService {
  constructor(
    private readonly config: PushNotificationConfigService,
    @Inject(PUSH_NOTIFICATION_PROVIDER)
    private readonly pushProvider: PushNotificationProvider,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokens: IDeviceTokenRepository,
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      if (!this.config.isSendingEnabled) {
        this.obs.trace(
          `push skipped provider disabled userId=${userId} type=${payload.data?.type ?? 'unknown'}`,
          ErrorCodes.PUSH_SKIPPED_PROVIDER_DISABLED,
        );
        return;
      }

      const gate = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { inAppNotificationsEnabled: true },
      });
      if (!gate?.inAppNotificationsEnabled) {
        this.obs.trace(
          `push skipped prefs off userId=${userId} type=${payload.data?.type ?? 'unknown'}`,
          ErrorCodes.PUSH_SKIPPED_PREFS_DISABLED,
        );
        return;
      }

      const devices = await this.deviceTokens.findByUserId(userId);
      if (devices.length === 0) {
        this.obs.trace(
          `push skipped no devices userId=${userId} type=${payload.data?.type ?? 'unknown'}`,
          ErrorCodes.PUSH_SKIPPED_NO_DEVICES,
        );
        return;
      }

      await this.pushProvider.sendBatch(
        devices.map((d) => d.token),
        payload,
      );
      this.obs.trace(
        `push send ok userId=${userId} type=${payload.data?.type ?? 'unknown'} devices=${devices.length}`,
        ErrorCodes.PUSH_SEND_OK,
      );
    } catch (err) {
      this.obs.error(
        `push send failed userId=${userId} type=${payload.data?.type ?? 'unknown'}`,
        ErrorCodes.PUSH_SEND_FAILED,
        err,
      );
    }
  }
}
