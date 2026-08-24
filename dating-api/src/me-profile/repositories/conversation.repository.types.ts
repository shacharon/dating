import type {
  MessageStatus,
  MutualMatchStatus,
  Prisma,
  ProfileGender,
} from '@prisma/client';

export type ActiveMatchRow = {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: Date;
  user1LastReadAt: Date | null;
  user2LastReadAt: Date | null;
};

export type MatchRow = ActiveMatchRow & {
  status: MutualMatchStatus;
};

export type ConversationProfileRow = {
  id: string;
  userId: string;
  nickname: string | null;
  gender: ProfileGender;
  birthDate: Date | null;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
  desiredPartnerGenders: Prisma.JsonValue;
  photos: Array<{ id: string; isPrimary: boolean }>;
};

export type UnreadCountSpec = {
  conversationId: string;
  otherUserId: string;
  lastReadAt: Date | null;
};

export type LastMessageRow = {
  conversationId: string;
  text: string;
  senderId: string;
  createdAt: Date;
};

export type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  clientMessageId: string | null;
  createdAt: Date;
  status: MessageStatus;
};

export type CreateSentMessageResult = {
  row: MessageRow;
  created: boolean;
};

export type InboxListPageRow = {
  id: string;
  userId1: string;
  userId2: string;
  matchedAt: Date;
  user1LastReadAt: Date | null;
  user2LastReadAt: Date | null;
  unreadCount: number;
};

export type InboxListPageResult = {
  rows: InboxListPageRow[];
  hasMore: boolean;
};
