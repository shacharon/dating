import { Injectable } from '@nestjs/common';
import type {
  PushNotificationProvider,
  PushPayload,
} from '../push-notification.port';

@Injectable()
export class NoopPushProvider implements PushNotificationProvider {
  async send(_deviceToken: string, _payload: PushPayload): Promise<void> {}

  async sendBatch(
    _deviceTokens: string[],
    _payload: PushPayload,
  ): Promise<void> {}
}
