import { getActiveConversationId } from '@/lib/conversation-focus';
import type { MessageDto } from '@/lib/conversations-api';

/** Story 3: wire from AuthUser.inAppNotificationsEnabled */
export function isInAppNotificationsEnabled(): boolean {
  return true;
}

export function shouldShowMessageToast(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  if (!sessionUserId || msg.senderId === sessionUserId) {
    return false;
  }
  if (msg.conversationId === getActiveConversationId()) {
    return false;
  }
  if (!isInAppNotificationsEnabled()) {
    return false;
  }
  return true;
}
