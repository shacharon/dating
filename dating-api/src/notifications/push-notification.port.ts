export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export interface PushNotificationProvider {
  send(deviceToken: string, payload: PushPayload): Promise<void>;
  sendBatch(deviceTokens: string[], payload: PushPayload): Promise<void>;
}

export const PUSH_NOTIFICATION_PROVIDER = Symbol('PUSH_NOTIFICATION_PROVIDER');
