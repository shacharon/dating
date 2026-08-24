import type { ConversationListCursorPayload } from '../conversations/me-conversations-list-cursor';
import type {
  ActiveMatchRow,
  ConversationProfileRow,
  CreateSentMessageResult,
  InboxListPageResult,
  LastMessageRow,
  MatchRow,
  MessageRow,
  UnreadCountSpec,
} from './conversation.repository.types';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface IConversationRepository {
  listInboxPage(args: {
    sessionUserId: string;
    cursor: ConversationListCursorPayload | null;
    limit: number;
  }): Promise<InboxListPageResult>;
  findActiveMatchesForUser(userId: string): Promise<ActiveMatchRow[]>;
  findMatchById(conversationId: string): Promise<MatchRow | null>;
  updateLastReadAt(
    conversationId: string,
    field: 'user1LastReadAt' | 'user2LastReadAt',
    at: Date,
  ): Promise<void>;
  markUnmatched(
    conversationId: string,
    byUserId: string,
    at: Date,
  ): Promise<void>;
  findProfilesByUserIds(userIds: string[]): Promise<ConversationProfileRow[]>;
  findProfileByUserId(userId: string): Promise<ConversationProfileRow | null>;
  batchUnreadCounts(specs: UnreadCountSpec[]): Promise<Map<string, number>>;
  countUnreadMessages(args: {
    conversationId: string;
    otherUserId: string;
    lastReadAt: Date | null;
  }): Promise<number>;
  batchLastMessagesByConversationIds(
    conversationIds: string[],
  ): Promise<Map<string, LastMessageRow>>;
  findSentMessageCursor(
    conversationId: string,
    messageId: string,
  ): Promise<{ id: string; createdAt: Date } | null>;
  listSentMessagesAfterCursor(args: {
    conversationId: string;
    cursor: { id: string; createdAt: Date };
    limit: number;
  }): Promise<MessageRow[]>;
  listSentMessagesHistory(args: {
    conversationId: string;
    limit: number;
    beforeCursor?: { id: string; createdAt: Date };
  }): Promise<MessageRow[]>;
  createSentMessage(args: {
    conversationId: string;
    senderId: string;
    text: string;
    clientMessageId?: string | null;
  }): Promise<CreateSentMessageResult>;
  findSentMessageByClientKey(args: {
    conversationId: string;
    senderId: string;
    clientMessageId: string;
  }): Promise<MessageRow | null>;
}
