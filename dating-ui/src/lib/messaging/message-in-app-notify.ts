import { getActiveConversationId } from '@/lib/messaging/conversation-focus';
import type { MessageDto } from '@/lib/api/conversations-api';

let cachedInAppEnabled = true;

export function setInAppNotificationsEnabledPreference(enabled: boolean): void {
  cachedInAppEnabled = enabled;
}

export function isInAppNotificationsEnabled(): boolean {
  return cachedInAppEnabled;
}

/** Proactive in-app alerts: toast + nav live bump */
export function shouldShowInAppAlert(
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

export function shouldShowMessageToast(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  return shouldShowInAppAlert(msg, sessionUserId);
}

export function shouldBumpUnreadForMessage(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  return shouldShowInAppAlert(msg, sessionUserId);
}
