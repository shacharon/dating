export const PUSH_NOTIFICATION_QUEUE = 'push-notifications';

export type PushNewMessageJobData = {
  kind: 'new_message';
  recipientUserId: string;
  senderUserId: string;
  conversationId: string;
  messagePreview: string;
};

export type PushMutualMatchJobData = {
  kind: 'mutual_match';
  userId: string;
  otherUserId: string;
  conversationId: string;
};

export type PushNotificationJobData =
  | PushNewMessageJobData
  | PushMutualMatchJobData;

/** Truncate message preview for FCM notification body (≤100 code points). */
export function truncatePushPreview(text: string, max = 100): string {
  const chars = [...text.trim()];
  if (chars.length <= max) {
    return chars.join('');
  }
  return `${chars.slice(0, max).join('')}…`;
}
