import { conversationPrimaryLabel } from '@/app/dating/conversations/conversation-display';
import type { ConversationListItemDto } from '@/lib/conversations-api';

export type PeerLabelIndex = Map<string, string>;

export function buildPeerLabelIndex(
  conversations: ConversationListItemDto[],
): PeerLabelIndex {
  const map = new Map<string, string>();
  for (const c of conversations) {
    map.set(c.otherUser.id, conversationPrimaryLabel(c.otherUser));
  }
  return map;
}

export function resolvePeerLabel(
  index: PeerLabelIndex,
  senderId: string,
): string {
  return index.get(senderId)?.trim() || 'Someone';
}
