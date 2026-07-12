import type { ConversationListItemDto } from '@/lib/conversations-api';

export function sortConversationsUnreadFirst(
  items: ConversationListItemDto[],
): ConversationListItemDto[] {
  return [...items].sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    return b.matchedAt.localeCompare(a.matchedAt);
  });
}

export function incrementUnreadForConversation(
  items: ConversationListItemDto[],
  conversationId: string,
): ConversationListItemDto[] {
  if (!items.some((c) => c.id === conversationId)) {
    return items;
  }

  const updated = items.map((c) =>
    c.id === conversationId
      ? { ...c, unreadCount: c.unreadCount + 1 }
      : c,
  );
  return sortConversationsUnreadFirst(updated);
}
