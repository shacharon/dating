import type { ConversationListItemDto } from '@/lib/api/conversations-api';

export function sumUnreadCounts(
  conversations: ConversationListItemDto[],
): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

export function bumpUnreadTotal(
  currentTotal: number,
  _conversationId: string,
): number {
  return currentTotal + 1;
}
