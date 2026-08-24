import type {
  ConversationListItemDto,
  MessageDto,
} from '@/lib/api/conversations-api';

export function sortConversationsUnreadFirst(
  items: ConversationListItemDto[],
): ConversationListItemDto[] {
  return [...items].sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    if (a.matchedAt !== b.matchedAt) {
      return b.matchedAt.localeCompare(a.matchedAt);
    }
    return a.id.localeCompare(b.id);
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

export function applyIncomingMessageToConversationList(
  items: ConversationListItemDto[],
  msg: Pick<MessageDto, 'conversationId' | 'senderId' | 'text' | 'createdAt'>,
  opts: { bumpUnread: boolean },
): ConversationListItemDto[] {
  if (!items.some((c) => c.id === msg.conversationId)) {
    return items;
  }

  const updated = items.map((c) => {
    if (c.id !== msg.conversationId) return c;
    return {
      ...c,
      unreadCount: opts.bumpUnread ? c.unreadCount + 1 : c.unreadCount,
      lastMessage: {
        text: msg.text,
        senderId: msg.senderId,
        sentAt: msg.createdAt,
      },
    };
  });

  return opts.bumpUnread ? sortConversationsUnreadFirst(updated) : updated;
}
