import type { PushNewMessageJobData } from './push-notification.queue';

export const PUSH_NOTIFICATION_QUEUE_PORT = Symbol(
  'PUSH_NOTIFICATION_QUEUE_PORT',
);

export interface PushNotificationQueuePort {
  enqueueNewMessageBestEffort(
    data: Omit<PushNewMessageJobData, 'kind'>,
  ): Promise<string>;
  enqueueMutualMatchBestEffort(data: {
    match: { id: string; userId1: string; userId2: string };
  }): Promise<void>;
  isBullEnabled(): boolean;
}
